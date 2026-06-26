# EF Core — Battle-tested Patterns

> Format: Context → Code → Lesson / Gotcha
> Cập nhật khi tìm ra pattern mới hoặc bị lỗi do pattern sai.

## 1. Projection với nested object (tránh N+1)
```csharp
// ✅ Load order + items trong 1 query
var order = await _ctx.Orders
    .AsNoTracking()
    .Where(o => o.Id == orderId)
    .Select(o => new OrderDetailDto
    {
        Id = o.Id,
        CustomerName = o.Customer.FullName,  // JOIN tự động
        Items = o.OrderItems.Select(i => new OrderItemDto
        {
            ProductName = i.Product.Name,
            Quantity = i.Quantity,
            UnitPrice = i.UnitPrice
        }).ToList()
    })
    .FirstOrDefaultAsync(ct);
// SQL: 1 query với JOIN, không phải N+1
```

## 2. Bulk update không load entity
```csharp
// ✅ EF Core 7+ ExecuteUpdateAsync
await _ctx.Orders
    .Where(o => o.Status == OrderStatus.Pending 
             && o.CreatedAt < DateTime.UtcNow.AddDays(-7))
    .ExecuteUpdateAsync(s => s
        .SetProperty(o => o.Status, OrderStatus.Expired)
        .SetProperty(o => o.UpdatedAt, DateTime.UtcNow),
        ct);
// SQL: UPDATE orders SET status=... WHERE ... (không load 1 record nào)
```

## 3. Batch insert (tránh SaveChanges per item)
```csharp
// ✅ Batch theo chunk, không insert all-at-once
const int batchSize = 1000;
var batches = items.Chunk(batchSize);

foreach (var batch in batches)
{
    _ctx.ChangeTracker.Clear(); // Reset tracker mỗi batch
    await _ctx.Items.AddRangeAsync(batch, ct);
    await _ctx.SaveChangesAsync(ct);
}
```

## 4. Streaming large result (tránh OOM)
```csharp
// ✅ IAsyncEnumerable — không load all vào memory
public async IAsyncEnumerable<ReportRowDto> StreamReportAsync(
    DateRange range,
    [EnumeratorCancellation] CancellationToken ct)
{
    await foreach (var row in _ctx.Orders
        .AsNoTracking()
        .Where(o => o.CreatedAt >= range.From && o.CreatedAt <= range.To)
        .OrderBy(o => o.CreatedAt)
        .Select(o => new ReportRowDto { ... })
        .AsAsyncEnumerable()
        .WithCancellation(ct))
    {
        yield return row;
    }
}

// Consumer:
await foreach (var row in _repo.StreamReportAsync(range, ct))
{
    await writer.WriteRowAsync(row, ct);
}
```

## 5. Optimistic Concurrency
```csharp
// Entity:
public class Order
{
    public uint Version { get; private set; } // xmin (PostgreSQL)
}

// Config:
builder.Property(o => o.Version)
    .IsRowVersion()
    .HasColumnName("xmin")
    .HasColumnType("xid");

// Handle conflict:
try
{
    await _ctx.SaveChangesAsync(ct);
}
catch (DbUpdateConcurrencyException ex)
{
    // Reload và retry, hoặc return conflict error
    throw new ConflictException("Order was modified by another request");
}
```

## 6. Raw SQL khi LINQ không đủ mạnh
```csharp
// ✅ Typed raw SQL (EF Core 8)
var results = await _ctx.Database
    .SqlQuery<RevenueByMonthDto>($"""
        SELECT 
            DATE_TRUNC('month', created_at) as month,
            SUM(total_amount) as revenue,
            COUNT(*) as order_count
        FROM orders
        WHERE tenant_id = {tenantId}
          AND created_at BETWEEN {from} AND {to}
        GROUP BY 1
        ORDER BY 1
        """)
    .ToListAsync(ct);
```

## 7. Global Query Filter — Soft delete & Multi-tenancy

```csharp
// DbContext — auto-apply cho mọi query trên entity
protected override void OnModelCreating(ModelBuilder builder)
{
    // Soft delete: tất cả query tự động filter IsDeleted = false
    builder.Entity<Order>().HasQueryFilter(o => !o.IsDeleted);

    // Multi-tenancy: tự động filter theo tenant hiện tại
    builder.Entity<Order>().HasQueryFilter(
        o => o.TenantId == _currentTenantService.TenantId);
}

// Bypass filter khi cần (admin query, migration):
var allOrders = await _ctx.Orders
    .IgnoreQueryFilters()
    .Where(o => o.IsDeleted)
    .ToListAsync(ct);
```
**Lesson learned:** Global filter invisible — dễ bị quên khi debug "tại sao query không trả về record". Luôn check IgnoreQueryFilters() khi admin report "không thấy data".

---

## 8. Compiled Query — Giảm overhead cho hot query

```csharp
// Định nghĩa 1 lần, reuse nhiều lần (skip query compilation overhead)
public static class CompiledQueries
{
    public static readonly Func<AppDbContext, Guid, Task<OrderDetailDto?>> GetOrderById =
        EF.CompileAsyncQuery((AppDbContext ctx, Guid id) =>
            ctx.Orders
                .AsNoTracking()
                .Where(o => o.Id == id)
                .Select(o => new OrderDetailDto
                {
                    Id = o.Id,
                    CustomerName = o.Customer.FullName,
                    TotalAmount = o.TotalAmount
                })
                .FirstOrDefault());
}

// Dùng:
var order = await CompiledQueries.GetOrderById(_ctx, orderId);
```
**Khi dùng:** Query chạy >100 lần/giây. Benchmark: compiled query ~30% nhanh hơn do skip model-to-SQL compilation.

---

## 9. Interceptor — Audit trail tự động

```csharp
// Tự động set CreatedAt/UpdatedAt khi SaveChanges
public class AuditInterceptor(ICurrentUserService currentUser) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData, InterceptionResult<int> result)
    {
        ApplyAudit(eventData.Context!);
        return base.SavingChanges(eventData, result);
    }

    private void ApplyAudit(DbContext ctx)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ctx.ChangeTracker.Entries<IAuditableEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.CreatedBy = currentUser.UserId;
            }
            if (entry.State is EntityState.Added or EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
                entry.Entity.UpdatedBy = currentUser.UserId;
            }
        }
    }
}

// Register:
services.AddDbContext<AppDbContext>((sp, opt) =>
    opt.UseNpgsql(connStr)
       .AddInterceptors(sp.GetRequiredService<AuditInterceptor>()));
```

---

## 10. Owned Entity — Value Object mapping

```csharp
// Domain: Value Object
public record Money(decimal Amount, string Currency);

// Entity:
public class Order
{
    public Money Price { get; private set; } = default!;
}

// EF Core config — map thành columns, không phải separate table
builder.Entity<Order>().OwnsOne(o => o.Price, money =>
{
    money.Property(m => m.Amount).HasColumnName("price_amount")
         .HasColumnType("numeric(18,4)").IsRequired();
    money.Property(m => m.Currency).HasColumnName("price_currency")
         .HasMaxLength(3).IsRequired();
});
// SQL: orders.price_amount, orders.price_currency — không có table riêng
```

---

**Master Lesson:** Chạy `context.Database.Log = Console.WriteLine` hoặc enable `EnableSensitiveDataLogging()` trong dev để thấy SQL thực tế. Không bao giờ assume LINQ → SQL mapping là đúng mà không verify.

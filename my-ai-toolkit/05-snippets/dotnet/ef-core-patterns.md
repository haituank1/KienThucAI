# EF Core — Battle-tested Patterns

## 1. Projection với nested object (tránh N+1)
```csharp
var order = await _ctx.Orders
    .AsNoTracking()
    .Where(o => o.Id == orderId)
    .Select(o => new OrderDetailDto
    {
        Id = o.Id,
        CustomerName = o.Customer.FullName,
        Items = o.OrderItems.Select(i => new OrderItemDto
        {
            ProductName = i.Product.Name,
            Quantity = i.Quantity,
            UnitPrice = i.UnitPrice
        }).ToList()
    })
    .FirstOrDefaultAsync(ct);
```

## 2. Bulk update không load entity (EF Core 7+)
```csharp
await _ctx.Orders
    .Where(o => o.Status == OrderStatus.Pending 
             && o.CreatedAt < DateTime.UtcNow.AddDays(-7))
    .ExecuteUpdateAsync(s => s
        .SetProperty(o => o.Status, OrderStatus.Expired)
        .SetProperty(o => o.UpdatedAt, DateTime.UtcNow), ct);
```

## 3. Batch insert
```csharp
const int batchSize = 1000;
foreach (var batch in items.Chunk(batchSize))
{
    _ctx.ChangeTracker.Clear(); // Reset tracker mỗi batch
    await _ctx.Items.AddRangeAsync(batch, ct);
    await _ctx.SaveChangesAsync(ct);
}
```

## 4. Streaming large result (tránh OOM)
```csharp
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
```

## 5. Optimistic Concurrency (PostgreSQL xmin)
```csharp
// Entity:
public uint Version { get; private set; } // xmin

// Config:
builder.Property(o => o.Version).IsRowVersion()
    .HasColumnName("xmin").HasColumnType("xid");

// Handle:
try { await _ctx.SaveChangesAsync(ct); }
catch (DbUpdateConcurrencyException)
{
    throw new ConflictException("Order was modified by another request");
}
```



## 7. Global Query Filter — Soft delete & Multi-tenancy
```csharp
protected override void OnModelCreating(ModelBuilder builder)
{
    builder.Entity<Order>().HasQueryFilter(o => !o.IsDeleted);
    builder.Entity<Order>().HasQueryFilter(
        o => o.TenantId == _currentTenantService.TenantId);
}

// Bypass (admin/migration):
var allOrders = await _ctx.Orders.IgnoreQueryFilters().ToListAsync(ct);
```
**Lesson learned:** Global filter invisible — khi admin "không thấy data", check IgnoreQueryFilters() trước.

## 8. Compiled Query — Hot query >100 req/s (~30% faster)
```csharp
public static class CompiledQueries
{
    public static readonly Func<AppDbContext, Guid, Task<OrderDetailDto?>> GetOrderById =
        EF.CompileAsyncQuery((AppDbContext ctx, Guid id) =>
            ctx.Orders.AsNoTracking()
                .Where(o => o.Id == id)
                .Select(o => new OrderDetailDto { Id = o.Id, CustomerName = o.Customer.FullName, TotalAmount = o.TotalAmount })
                .FirstOrDefault());
}

var order = await CompiledQueries.GetOrderById(_ctx, orderId);
```

## 9. Interceptor — Audit trail tự động
```csharp
public class AuditInterceptor(ICurrentUserService currentUser) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData, InterceptionResult<int> result)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in eventData.Context!.ChangeTracker.Entries<IAuditableEntity>())
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
        return base.SavingChanges(eventData, result);
    }
}

services.AddDbContext<AppDbContext>((sp, opt) =>
    opt.UseNpgsql(connStr).AddInterceptors(sp.GetRequiredService<AuditInterceptor>()));
```

## 10. Owned Entity — Value Object mapping
```csharp
public record Money(decimal Amount, string Currency);

// EF Core config — map thành columns, không phải separate table
builder.Entity<Order>().OwnsOne(o => o.Price, money =>
{
    money.Property(m => m.Amount).HasColumnName("price_amount")
         .HasColumnType("numeric(18,4)").IsRequired();
    money.Property(m => m.Currency).HasColumnName("price_currency")
         .HasMaxLength(3).IsRequired();
});
```

**Master Lesson:** Enable `EnableSensitiveDataLogging()` trong dev để thấy SQL thực tế — không assume LINQ → SQL mapping đúng mà không verify.

## EF Core — Typed Raw SQL `SqlQuery<T>`

```csharp
// Không cần Entity setup, {params} auto-parameterized (SQL injection safe)
public record RevenueByMonth(DateOnly Month, decimal Revenue, int OrderCount);

var results = await ctx.Database
    .SqlQuery<RevenueByMonth>($"""
        SELECT date_trunc('month', created_at)::date AS month,
               sum(total_amount)   AS revenue,
               count(*)::int       AS order_count
        FROM orders
        WHERE tenant_id = {tenantId} AND created_at BETWEEN {from} AND {to}
        GROUP BY 1 ORDER BY 1
        """)
    .ToListAsync(ct);
// LINQ composable sau: .Where(), .OrderBy(), .Skip().Take()
```

⚠️ Column alias PHẢI match property name (case-insensitive) · ⚠️ Không có compile-time validation · ❌ Không compose được với LINQ navigation property

---

# EF Core 8 Rules

---

## Query — Checklist bắt buộc

| Rule | Lý do |
|------|-------|
| `.AsNoTracking()` cho mọi read-only query | Tiết kiệm memory, tắt change tracking không cần |
| `.Select(x => new Dto{})` thay vì load full entity | Chỉ pull columns cần thiết từ DB |
| Explicit `.Include()` — không `virtual` navigation property | Tránh lazy loading N+1 ẩn |
| Pass `CancellationToken` vào mọi `*Async()` | Client cancel → query stop |
| Verify SQL bằng `.ToQueryString()` khi viết query mới | Tránh surprise client-side evaluation |

---

## Tracking vs No-Tracking

```csharp
// ❌ Load full entity + track khi chỉ cần read
var orders = await _ctx.Orders
    .Include(o => o.Items)        // load columns không cần
    .Include(o => o.Customer)     // N+1 risk nếu thiếu Include
    .ToListAsync(ct);             // track tất cả → memory waste

// ✅ Projection + no-tracking
var orders = await _ctx.Orders
    .AsNoTracking()
    .Where(o => o.CustomerId == customerId && o.Status == OrderStatus.Active)
    .Select(o => new OrderSummaryDto
    {
        Id = o.Id,
        CustomerName = o.Customer.FullName,   // EF tự JOIN
        TotalAmount = o.TotalAmount,
        ItemCount = o.Items.Count             // EF tự subquery/JOIN
    })
    .OrderByDescending(o => o.CreatedAt)
    .ToListAsync(ct);
// SQL: 1 query, chỉ SELECT columns cần thiết
```

---

## Bulk Operations — Không load entity để update/delete

```csharp
// ❌ Load entity rồi update từng cái — N+1 writes
var orders = await _ctx.Orders
    .Where(o => o.Status == OrderStatus.Pending && o.CreatedAt < cutoff)
    .ToListAsync(ct);
foreach (var o in orders) o.Status = OrderStatus.Expired; // track từng cái
await _ctx.SaveChangesAsync(ct); // nhiều UPDATE statements

// ✅ EF Core 7+: ExecuteUpdateAsync — 1 SQL UPDATE
await _ctx.Orders
    .Where(o => o.Status == OrderStatus.Pending && o.CreatedAt < cutoff)
    .ExecuteUpdateAsync(s => s
        .SetProperty(o => o.Status, OrderStatus.Expired)
        .SetProperty(o => o.UpdatedAt, DateTime.UtcNow), ct);

// ✅ ExecuteDeleteAsync — 1 SQL DELETE
await _ctx.AuditLogs
    .Where(l => l.CreatedAt < DateTime.UtcNow.AddYears(-1))
    .ExecuteDeleteAsync(ct);
```

---

## Batch Insert

```csharp
// ✅ Batch theo chunk, clear tracker giữa các batch
const int batchSize = 500; // PostgreSQL: 500-1000 optimal

foreach (var batch in items.Chunk(batchSize))
{
    _ctx.ChangeTracker.Clear(); // reset tracker — tránh memory tích lũy
    await _ctx.Items.AddRangeAsync(batch, ct);
    await _ctx.SaveChangesAsync(ct);
}

// ⚠️ Với số lượng rất lớn (>100K rows): cân nhắc COPY command qua Npgsql
// Benchmark: EF AddRange ~5K rows/s, Npgsql COPY ~100K rows/s
```

---

## Split Query — Khi Include nhiều collection

```csharp
// ❌ Cartesian explosion: Order × Items × Tags = nhiều rows trùng
var orders = await _ctx.Orders
    .Include(o => o.Items)   // collection
    .Include(o => o.Tags)    // collection → cartesian product
    .ToListAsync(ct);

// ✅ Split query — 3 SQL riêng biệt, tránh cartesian
var orders = await _ctx.Orders
    .Include(o => o.Items)
    .Include(o => o.Tags)
    .AsSplitQuery()          // ← thêm dòng này
    .ToListAsync(ct);

// Note: Split query không atomic — dữ liệu có thể inconsistent nếu có concurrent write
// Dùng khi: data volume lớn + read-only + eventual consistency chấp nhận được
```

---

## Global Query Filter — Soft delete, Multi-tenancy

```csharp
// DbContext:
protected override void OnModelCreating(ModelBuilder builder)
{
    // Soft delete filter — tự động apply cho mọi query
    builder.Entity<Order>().HasQueryFilter(o => !o.IsDeleted);

    // Multi-tenancy filter
    builder.Entity<Order>().HasQueryFilter(o => o.TenantId == _currentTenantId);
}

// Bypass filter khi cần (admin, migration):
var allOrders = await _ctx.Orders
    .IgnoreQueryFilters()
    .Where(o => o.IsDeleted)
    .ToListAsync(ct);
```

---

## Migration Rules

```
✅ Mỗi migration làm 1 việc — không mix schema + data migration
✅ Luôn implement Down() đúng để rollback được
✅ Review generated migration file trước khi commit
✅ Data migration: tách thành idempotent SQL script riêng
✅ Index lớn: thêm vào migration riêng, dùng CONCURRENTLY ở PostgreSQL
❌ Không rename column trực tiếp (EF hiểu là drop + add) — dùng .HasColumnName()
```

```csharp
// Migration với raw SQL (ví dụ: data backfill)
public partial class AddDefaultCurrencyToOrders : Migration
{
    protected override void Up(MigrationBuilder mb)
    {
        mb.AddColumn<string>("currency", "orders", maxLength: 3, nullable: false, defaultValue: "VND");

        // Data migration: idempotent
        mb.Sql("""
            UPDATE orders SET currency = 'VND' WHERE currency IS NULL OR currency = '';
            """);
    }

    protected override void Down(MigrationBuilder mb)
        => mb.DropColumn("currency", "orders");
}
```

---

## DbContext Lifetime & Concurrency

```csharp
// ✅ DbContext là NOT thread-safe — không share giữa các thread
// Web: Scoped (1 instance per request) — default đúng
services.AddDbContext<AppDbContext>(opt => ...); // Scoped by default

// ✅ Worker Service: tạo scope mới mỗi job
public class OrderProcessingWorker(IServiceScopeFactory scopeFactory) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            using var scope = scopeFactory.CreateScope();
            var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await ProcessPendingOrdersAsync(ctx, ct);
            await Task.Delay(TimeSpan.FromSeconds(30), ct);
        }
    }
}

// ❌ Parallel operations trên cùng DbContext instance
await Task.WhenAll(
    _ctx.Orders.ToListAsync(),    // ❌ concurrent ops trên cùng context
    _ctx.Products.ToListAsync()   // → InvalidOperationException
);
// ✅ Tạo 2 context riêng, hoặc query tuần tự
```

# EF Core 8 Rules

## Query Checklist

| Rule | Note |
|------|------|
| `.AsNoTracking()` on all read-only queries | Saves memory, disables change tracking |
| `.Select(x => new Dto{})` instead of full entity | Pulls only needed columns |
| Explicit `.Include()` — no `virtual` nav props | Prevents hidden lazy loading N+1 |
| Pass `CancellationToken` to all `*Async()` | Client cancel stops query |
| Verify SQL with `.ToQueryString()` on new queries | Catches surprise client-side eval |

## Tracking vs No-Tracking

```csharp
// ❌ Full entity + tracking for read-only
var orders = await _ctx.Orders.Include(o => o.Items).Include(o => o.Customer).ToListAsync(ct);

// ✅ Projection + no-tracking
var orders = await _ctx.Orders
    .AsNoTracking()
    .Where(o => o.CustomerId == customerId && o.Status == OrderStatus.Active)
    .Select(o => new OrderSummaryDto
    {
        Id = o.Id,
        CustomerName = o.Customer.FullName, // EF auto-JOINs
        TotalAmount = o.TotalAmount,
        ItemCount = o.Items.Count           // EF auto-subquery
    })
    .OrderByDescending(o => o.CreatedAt)
    .ToListAsync(ct);
```

## Bulk Operations

```csharp
// ❌ Load then update — N+1 writes
var orders = await _ctx.Orders.Where(...).ToListAsync(ct);
foreach (var o in orders) o.Status = OrderStatus.Expired;
await _ctx.SaveChangesAsync(ct);

// ✅ EF Core 7+: 1 SQL UPDATE
await _ctx.Orders
    .Where(o => o.Status == OrderStatus.Pending && o.CreatedAt < cutoff)
    .ExecuteUpdateAsync(s => s
        .SetProperty(o => o.Status, OrderStatus.Expired)
        .SetProperty(o => o.UpdatedAt, DateTime.UtcNow), ct);

// ✅ 1 SQL DELETE
await _ctx.AuditLogs.Where(l => l.CreatedAt < DateTime.UtcNow.AddYears(-1)).ExecuteDeleteAsync(ct);
```

## Batch Insert

```csharp
// ✅ Chunk + clear tracker between batches
const int batchSize = 500; // PostgreSQL optimal: 500-1000

foreach (var batch in items.Chunk(batchSize))
{
    _ctx.ChangeTracker.Clear(); // prevent memory accumulation
    await _ctx.Items.AddRangeAsync(batch, ct);
    await _ctx.SaveChangesAsync(ct);
}
// >100K rows: consider Npgsql COPY (~100K rows/s vs EF ~5K rows/s)
```

## Split Query

```csharp
// ❌ Cartesian explosion: Orders × Items × Tags = duplicate rows
var orders = await _ctx.Orders.Include(o => o.Items).Include(o => o.Tags).ToListAsync(ct);

// ✅ 3 separate SQLs, no cartesian
var orders = await _ctx.Orders.Include(o => o.Items).Include(o => o.Tags)
    .AsSplitQuery().ToListAsync(ct);
// Note: not atomic — data may be inconsistent under concurrent writes
// Use when: high volume + read-only + eventual consistency acceptable
```

## Global Query Filter

```csharp
protected override void OnModelCreating(ModelBuilder builder)
{
    builder.Entity<Order>().HasQueryFilter(o => !o.IsDeleted);         // soft delete
    builder.Entity<Order>().HasQueryFilter(o => o.TenantId == _currentTenantId); // multi-tenancy
}

// Bypass (admin/migration):
var allOrders = await _ctx.Orders.IgnoreQueryFilters().Where(o => o.IsDeleted).ToListAsync(ct);
```

## Migration Rules

```
✅ One migration = one concern — no mixing schema + data migration
✅ Always implement Down() correctly for rollback
✅ Review generated migration file before commit
✅ Data migration: separate idempotent SQL script
✅ Large index: separate migration, use CONCURRENTLY in PostgreSQL
❌ No direct column rename (EF treats as drop+add) — use .HasColumnName()
```

```csharp
public partial class AddDefaultCurrencyToOrders : Migration
{
    protected override void Up(MigrationBuilder mb)
    {
        mb.AddColumn<string>("currency", "orders", maxLength: 3, nullable: false, defaultValue: "VND");
        mb.Sql("UPDATE orders SET currency = 'VND' WHERE currency IS NULL OR currency = '';"); // idempotent
    }
    protected override void Down(MigrationBuilder mb) => mb.DropColumn("currency", "orders");
}
```

## DbContext Lifetime & Concurrency

```csharp
// DbContext is NOT thread-safe — never share across threads
// Web: Scoped (1 per request) — default is correct
services.AddDbContext<AppDbContext>(opt => ...);

// Worker Service: new scope per job
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

// ❌ Parallel ops on same DbContext → InvalidOperationException
await Task.WhenAll(_ctx.Orders.ToListAsync(), _ctx.Products.ToListAsync());
// ✅ Create 2 contexts, or query sequentially
```

# EF Core — Battle-tested Patterns

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

---
**Lesson learned:** Luôn gọi `.ToQueryString()` để verify SQL được generate khi implement query mới.

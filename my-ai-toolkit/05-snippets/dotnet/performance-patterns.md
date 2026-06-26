# .NET Performance Patterns

## 1. Span<T> — Zero-copy string/byte processing (~5-10x ít allocation)
```csharp
// ❌ Substring allocates new string
var prefix = input.Substring(0, 3);

// ✅ Span: slice không allocate
public static bool IsValidPrefix(ReadOnlySpan<char> input)
    => input.Length >= 3 && input[..3].SequenceEqual("ORD");

bool valid = IsValidPrefix(orderId.AsSpan()); // implicit conversion

public static Guid ParseOrderId(ReadOnlySpan<byte> bytes)
    => new Guid(bytes); // không allocate intermediate array
```

## 2. ArrayPool<T> — Reuse buffer trong hot path
```csharp
// ❌ new byte[4096] mỗi call = GC pressure
// ✅ Rent từ pool, always return in finally
public async Task<byte[]> CompressAsync(Stream input, CancellationToken ct)
{
    var buffer = ArrayPool<byte>.Shared.Rent(4096);
    try
    {
        var bytesRead = await input.ReadAsync(buffer.AsMemory(), ct);
        return ProcessBuffer(buffer.AsSpan(0, bytesRead)); // track actual size, not buffer.Length
    }
    finally { ArrayPool<byte>.Shared.Return(buffer, clearArray: false); }
}
// ⚠️ Rented buffer có thể lớn hơn requested — luôn track actual size
```

## 3. ObjectPool<T> — Reuse expensive objects
```csharp
private static readonly ObjectPool<StringBuilder> _sbPool =
    ObjectPool.Create(new StringBuilderPooledObjectPolicy());

public string BuildCsv(IEnumerable<Order> orders)
{
    var sb = _sbPool.Get();
    try
    {
        foreach (var o in orders) sb.AppendLine($"{o.Id},{o.Total}");
        return sb.ToString();
    }
    finally { _sbPool.Return(sb); }
}
```

## 4. Streaming Export — Memory O(1) thay vì O(n)
```csharp
// ❌ OOM với 1M rows
var orders = await _ctx.Orders.Where(...).ToListAsync(ct);

// ✅ Stream trực tiếp vào response
public async Task ExportToCsvAsync(Stream outputStream, DateRange range, CancellationToken ct)
{
    await using var writer = new StreamWriter(outputStream, leaveOpen: true);
    await writer.WriteLineAsync("Id,CustomerId,Total,CreatedAt");

    await foreach (var row in _ctx.Orders
        .AsNoTracking()
        .Where(o => o.CreatedAt >= range.From && o.CreatedAt <= range.To)
        .OrderBy(o => o.CreatedAt)
        .Select(o => new { o.Id, o.CustomerId, o.TotalAmount, o.CreatedAt })
        .AsAsyncEnumerable().WithCancellation(ct))
    {
        await writer.WriteLineAsync($"{row.Id},{row.CustomerId},{row.TotalAmount},{row.CreatedAt:O}");
    }
}

// Controller:
Response.ContentType = "text/csv";
Response.Headers.ContentDisposition = "attachment; filename=orders.csv";
await _service.ExportToCsvAsync(Response.Body, range, ct);
```

## 5. BenchmarkDotNet — Đo thực tế trước khi optimize
```csharp
[MemoryDiagnoser]
[SimpleJob(RuntimeMoniker.Net80)]
public class StringBenchmarks
{
    private readonly string[] _data = Enumerable.Range(0, 1000).Select(i => $"item-{i}").ToArray();

    [Benchmark(Baseline = true)]
    public string StringConcat() { var r = ""; foreach (var s in _data) r += s + ","; return r; }

    [Benchmark]
    public string StringBuilder() { var sb = new System.Text.StringBuilder(); foreach (var s in _data) sb.Append(s).Append(','); return sb.ToString(); }

    [Benchmark]
    public string StringJoin() => string.Join(",", _data);
}
// dotnet run -c Release — xem cột Mean + Allocated
```

## 6. Struct cho short-lived, small data
```csharp
// ❌ Class → heap allocation, GC pressure trong hot path
// ✅ Struct → stack/inline, contiguous memory, cache-friendly
public readonly record struct Point(double X, double Y);
var points = Enumerable.Range(0, 1_000_000).Select(i => new Point(i, i)).ToArray();

// ⚠️ struct >16 bytes bị copy nhiều → overhead; dùng 'in' để pass by ref
public double Distance(in Point a, in Point b)
    => Math.Sqrt(Math.Pow(b.X - a.X, 2) + Math.Pow(b.Y - a.Y, 2));
```
**Rule of thumb:** Struct tốt khi: <16 bytes, immutable, nhiều instance, short-lived.

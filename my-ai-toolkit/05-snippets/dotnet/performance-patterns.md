# .NET Performance Patterns

> Patterns giảm allocation, CPU, memory cho hot paths và data-heavy operations.
> Mỗi pattern có context "khi nào nên dùng" — không optimize sớm.

---

## 1. Span<T> / Memory<T> — Zero-copy string/byte processing

```csharp
// ❌ Substring allocates new string
public static bool IsValidPrefix(string input)
{
    var prefix = input.Substring(0, 3); // new string allocation
    return prefix == "ORD";
}

// ✅ Span: slice mà không allocate
public static bool IsValidPrefix(ReadOnlySpan<char> input)
{
    return input.Length >= 3 && input[..3].SequenceEqual("ORD");
}

// Gọi với string (implicit conversion):
bool valid = IsValidPrefix(orderId.AsSpan());

// ✅ Span cho byte processing (parsing, encoding)
public static Guid ParseOrderId(ReadOnlySpan<byte> bytes)
    => new Guid(bytes); // không allocate intermediate array
```
**Dùng khi:** Parsing, string validation, binary protocol. Benchmark: ~5-10x ít allocation.

---

## 2. ArrayPool<T> — Reuse buffer trong hot path

```csharp
// ❌ Allocate new array mỗi call — GC pressure
public async Task<byte[]> CompressAsync(Stream input, CancellationToken ct)
{
    var buffer = new byte[4096]; // allocation mỗi call
    // ...
}

// ✅ Rent từ pool, return sau khi dùng
public async Task<byte[]> CompressAsync(Stream input, CancellationToken ct)
{
    var buffer = ArrayPool<byte>.Shared.Rent(4096);
    try
    {
        var bytesRead = await input.ReadAsync(buffer.AsMemory(), ct);
        return ProcessBuffer(buffer.AsSpan(0, bytesRead));
    }
    finally
    {
        ArrayPool<byte>.Shared.Return(buffer, clearArray: false);
    }
}
```
**Dùng khi:** Buffer trong loop, file I/O, network handling.
**Gotcha:** Rented buffer có thể lớn hơn requested — luôn track actual size.

---

## 3. ObjectPool<T> — Reuse expensive objects

```csharp
// ❌ StringBuilder mới mỗi lần (nhỏ, nhưng trong hot path thì tích lũy)
public string BuildCsv(IEnumerable<Order> orders)
{
    var sb = new StringBuilder(); // allocation mỗi call
    foreach (var o in orders)
        sb.AppendLine($"{o.Id},{o.Total}");
    return sb.ToString();
}

// ✅ Pool StringBuilder
private static readonly ObjectPool<StringBuilder> _sbPool =
    ObjectPool.Create(new StringBuilderPooledObjectPolicy());

public string BuildCsv(IEnumerable<Order> orders)
{
    var sb = _sbPool.Get();
    try
    {
        foreach (var o in orders)
            sb.AppendLine($"{o.Id},{o.Total}");
        return sb.ToString();
    }
    finally
    {
        _sbPool.Return(sb);
    }
}
```

---

## 4. Streaming Export — Không load all vào memory

```csharp
// ❌ Load tất cả rồi write → OOM với 1M rows
public async Task<byte[]> ExportToCsvAsync(DateRange range, CancellationToken ct)
{
    var orders = await _ctx.Orders.Where(...).ToListAsync(ct); // OOM risk
    return CsvSerializer.Serialize(orders);
}

// ✅ Stream trực tiếp vào response — memory constant O(1)
public async Task ExportToCsvAsync(Stream outputStream, DateRange range, CancellationToken ct)
{
    await using var writer = new StreamWriter(outputStream, leaveOpen: true);
    await writer.WriteLineAsync("Id,CustomerId,Total,CreatedAt");

    await foreach (var row in _ctx.Orders
        .AsNoTracking()
        .Where(o => o.CreatedAt >= range.From && o.CreatedAt <= range.To)
        .OrderBy(o => o.CreatedAt)
        .Select(o => new { o.Id, o.CustomerId, o.TotalAmount, o.CreatedAt })
        .AsAsyncEnumerable()
        .WithCancellation(ct))
    {
        await writer.WriteLineAsync(
            $"{row.Id},{row.CustomerId},{row.TotalAmount},{row.CreatedAt:O}");
    }
}

// Controller:
Response.ContentType = "text/csv";
Response.Headers.ContentDisposition = "attachment; filename=orders.csv";
await _service.ExportToCsvAsync(Response.Body, range, ct);
```
**Memory usage:** ~constant (buffer size) thay vì O(n).

---

## 5. Benchmark với BenchmarkDotNet

```csharp
// Benchmark để đo thực tế trước khi optimize
[MemoryDiagnoser] // Hiển thị allocation
[SimpleJob(RuntimeMoniker.Net80)]
public class StringBenchmarks
{
    private const int N = 1000;
    private readonly string[] _data = Enumerable.Range(0, N)
        .Select(i => $"item-{i}").ToArray();

    [Benchmark(Baseline = true)]
    public string StringConcat()
    {
        var result = "";
        foreach (var s in _data) result += s + ",";
        return result;
    }

    [Benchmark]
    public string StringBuilder()
    {
        var sb = new System.Text.StringBuilder();
        foreach (var s in _data) sb.Append(s).Append(',');
        return sb.ToString();
    }

    [Benchmark]
    public string StringJoin() => string.Join(",", _data);
}

// Chạy: dotnet run -c Release
// Output: Mean | Allocated columns quan trọng nhất
```

---

## 6. Struct cho short-lived, small data

```csharp
// ❌ Class allocates trên heap — GC pressure trong hot path
public class Point { public double X; public double Y; }
var points = Enumerable.Range(0, 1_000_000).Select(i => new Point { X = i, Y = i }).ToList();

// ✅ Struct — allocated trên stack hoặc inline trong array
public readonly record struct Point(double X, double Y);
var points = Enumerable.Range(0, 1_000_000).Select(i => new Point(i, i)).ToArray();
// Array of struct: contiguous memory, cache-friendly, 0 GC overhead

// ⚠️ Gotcha: struct lớn (>16 bytes) và bị copy nhiều → overhead
// Dùng 'in' parameter để pass by reference:
public double Distance(in Point a, in Point b)
    => Math.Sqrt(Math.Pow(b.X - a.X, 2) + Math.Pow(b.Y - a.Y, 2));
```
**Rule of thumb:** Struct tốt khi: < 16 bytes, immutable, nhiều instance, short-lived.

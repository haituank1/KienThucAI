# C# / .NET 8 Rules

## Language Features — Use

```csharp
// Record for immutable DTO / Value Object
public record OrderDto(Guid Id, string CustomerName, decimal Total);
public record Money(decimal Amount, string Currency)
{
    public static Money operator +(Money a, Money b)
        => a.Currency == b.Currency ? new(a.Amount + b.Amount, a.Currency)
            : throw new InvalidOperationException("Currency mismatch");
}

// Primary constructor (C# 12)
public class OrderService(IOrderRepository repo, ILogger<OrderService> logger)
{
    public async Task<Result<OrderDto>> GetAsync(Guid id, CancellationToken ct)
        => await repo.GetByIdAsync(id, ct);
}

// Pattern matching over if-else chains
var message = order.Status switch
{
    OrderStatus.Pending   => "Waiting for payment",
    OrderStatus.Paid      => "Processing",
    OrderStatus.Shipped   => $"Shipped via {order.TrackingNumber}",
    OrderStatus.Cancelled => "Cancelled",
    _ => throw new ArgumentOutOfRangeException(nameof(order.Status))
};

// IAsyncEnumerable — streaming, avoids loading all into memory
public async IAsyncEnumerable<ReportRowDto> StreamReportAsync(
    DateRange range, [EnumeratorCancellation] CancellationToken ct)
{
    await foreach (var row in _ctx.Orders.AsNoTracking()
        .Where(o => o.CreatedAt >= range.From && o.CreatedAt <= range.To)
        .Select(o => new ReportRowDto { ... })
        .AsAsyncEnumerable().WithCancellation(ct))
        yield return row;
}
```

## Language Features — Avoid

```csharp
// ❌ dynamic — no type safety, performance penalty
dynamic result = GetData(); result.DoSomething();

// ❌ Mutable static state — thread safety nightmare
public static class OrderCache { public static Dictionary<Guid, Order> Cache = new(); }

// ❌ Task.Run wrapping sync I/O — not truly async, wastes thread pool
public async Task<string> GetDataAsync() => await Task.Run(() => File.ReadAllText("data.json"));
// ✅
public async Task<string> GetDataAsync(CancellationToken ct) => await File.ReadAllTextAsync("data.json", ct);
```

## Memory & Performance

```csharp
// ✅ Span<T> for string/byte processing without allocation
public static bool TryParseOrderId(ReadOnlySpan<char> input, out Guid id) => Guid.TryParse(input, out id);

// ✅ ArrayPool for temp buffers in hot paths
byte[] buffer = ArrayPool<byte>.Shared.Rent(4096);
try { int n = await stream.ReadAsync(buffer.AsMemory(0, 4096), ct); Process(buffer.AsSpan(0, n)); }
finally { ArrayPool<byte>.Shared.Return(buffer); }

// ✅ StringBuilder in loops
var sb = new StringBuilder();
foreach (var item in items) sb.AppendLine(item.ToString());

// ❌ String concat in loop — O(n²) allocations
string result = "";
foreach (var item in items) result += item.ToString() + "\n";

// ✅ using — dispose at right time
await using var stream = new FileStream(path, FileMode.Open);
```

## Collections

```csharp
// ✅ Pre-size when count is known
var results = new List<OrderDto>(expectedCount);

// ✅ Interface when exposing, concrete when instantiating
public IReadOnlyList<OrderDto> GetOrders() { var list = new List<OrderDto>(); ... return list.AsReadOnly(); }

// ❌ Multiple enumeration — iterates IEnumerable 2+ times
var count = orders.Count(); foreach (var o in orders) ...

// ✅ Materialize once
var orderList = orders.ToList(); var count = orderList.Count; foreach (var o in orderList) ...
```

## HttpClient

```csharp
// ❌ new HttpClient() directly — socket exhaustion after hours
using var client = new HttpClient(); // NEVER

// ✅ Typed HttpClient via IHttpClientFactory
// Program.cs:
services.AddHttpClient<PaymentGatewayClient>(client =>
{
    client.BaseAddress = new Uri(config["PaymentGateway:BaseUrl"]!);
    client.Timeout = TimeSpan.FromSeconds(30);
}).AddStandardResilienceHandler(); // Polly retry + circuit breaker (.NET 8 built-in)

// PaymentGatewayClient.cs:
public class PaymentGatewayClient(HttpClient client)
{
    public async Task<PaymentResult> ChargeAsync(ChargeRequest request, CancellationToken ct)
    {
        var response = await client.PostAsJsonAsync("/charge", request, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<PaymentResult>(ct)
            ?? throw new InvalidOperationException("Empty response from payment gateway");
    }
}
```

## Configuration

```csharp
// ✅ Strongly typed + validate at startup
public class DatabaseOptions
{
    public const string SectionName = "Database";
    [Required] public string ConnectionString { get; init; } = default!;
    [Range(1, 100)] public int MaxPoolSize { get; init; } = 20;
    public TimeSpan CommandTimeout { get; init; } = TimeSpan.FromSeconds(30);
}

// Program.cs:
services.AddOptions<DatabaseOptions>()
    .BindConfiguration(DatabaseOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart(); // fail fast on bad config

// ❌ IConfiguration in business logic
public class OrderService(IConfiguration config) { var connStr = config["Database:ConnectionString"]; }
```

## Nullable Reference Types

```csharp
// Enable in .csproj: <Nullable>enable</Nullable>

public record CreateOrderCommand(
    Guid CustomerId,
    string ShippingAddress,   // non-nullable — required
    string? PromoCode = null  // nullable — optional
);

var name = user?.FullName ?? "Guest";
var id = response.Data!.Id; // ! only when guaranteed non-null
```

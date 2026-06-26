# C# / .NET 8 Rules

---

## Language Features — Dùng

```csharp
// Record cho immutable DTO / Value Object
public record OrderDto(Guid Id, string CustomerName, decimal Total);
public record Money(decimal Amount, string Currency) // Value Object
{
    public static Money operator +(Money a, Money b)
        => a.Currency == b.Currency
            ? new Money(a.Amount + b.Amount, a.Currency)
            : throw new InvalidOperationException("Currency mismatch");
}

// Primary constructor (C# 12) — giảm boilerplate
public class OrderService(IOrderRepository repo, ILogger<OrderService> logger)
{
    public async Task<Result<OrderDto>> GetAsync(Guid id, CancellationToken ct)
        => await repo.GetByIdAsync(id, ct);
}

// Pattern matching — thay if-else chain
var message = order.Status switch
{
    OrderStatus.Pending   => "Waiting for payment",
    OrderStatus.Paid      => "Processing",
    OrderStatus.Shipped   => $"Shipped via {order.TrackingNumber}",
    OrderStatus.Cancelled => "Cancelled",
    _ => throw new ArgumentOutOfRangeException(nameof(order.Status))
};

// IAsyncEnumerable — streaming, không load all vào memory
public async IAsyncEnumerable<ReportRowDto> StreamReportAsync(
    DateRange range,
    [EnumeratorCancellation] CancellationToken ct)
{
    await foreach (var row in _ctx.Orders
        .AsNoTracking()
        .Where(o => o.CreatedAt >= range.From && o.CreatedAt <= range.To)
        .Select(o => new ReportRowDto { ... })
        .AsAsyncEnumerable().WithCancellation(ct))
    {
        yield return row;
    }
}
```

---

## Language Features — Tránh

```csharp
// ❌ dynamic — mất type safety, performance penalty
dynamic result = GetData();
result.DoSomething(); // Runtime error, không compile-time check

// ❌ Mutable static state — thread safety nightmare
public static class OrderCache
{
    public static Dictionary<Guid, Order> Cache = new(); // ❌ shared mutable state
}

// ❌ Task.Run bọc synchronous I/O — không thật sự async, waste thread pool
public async Task<string> GetDataAsync()
    => await Task.Run(() => File.ReadAllText("data.json")); // ❌

// ✅ Dùng async I/O thật
public async Task<string> GetDataAsync(CancellationToken ct)
    => await File.ReadAllTextAsync("data.json", ct); // ✅
```

---

## Memory & Performance

```csharp
// ✅ Span<T> cho xử lý string/byte không allocation
public static bool TryParseOrderId(ReadOnlySpan<char> input, out Guid id)
    => Guid.TryParse(input, out id);

// ✅ ArrayPool cho buffer tạm thời trong hot path
byte[] buffer = ArrayPool<byte>.Shared.Rent(4096);
try
{
    int bytesRead = await stream.ReadAsync(buffer.AsMemory(0, 4096), ct);
    Process(buffer.AsSpan(0, bytesRead));
}
finally
{
    ArrayPool<byte>.Shared.Return(buffer);
}

// ✅ StringBuilder trong loop
var sb = new StringBuilder();
foreach (var item in items)
    sb.AppendLine(item.ToString()); // ✅

// ❌ String concat trong loop — O(n²) allocation
string result = "";
foreach (var item in items)
    result += item.ToString() + "\n"; // ❌

// ✅ using statement — dispose đúng lúc
await using var stream = new FileStream(path, FileMode.Open);
// stream.Dispose() được gọi tự động khi ra khỏi block
```

---

## Collections

```csharp
// ✅ Khai báo capacity khi biết trước size
var results = new List<OrderDto>(expectedCount); // tránh resize

// ✅ Interface khi expose, concrete khi khởi tạo
public IReadOnlyList<OrderDto> GetOrders() // expose interface
{
    var list = new List<OrderDto>(); // khởi tạo concrete
    ...
    return list.AsReadOnly();
}

// ❌ Multiple enumeration — enumerate IEnumerable 2+ lần
public void Process(IEnumerable<Order> orders)
{
    var count = orders.Count();   // enumerate lần 1
    foreach (var o in orders) ... // enumerate lần 2 → ❌
}

// ✅ Materialize một lần
public void Process(IEnumerable<Order> orders)
{
    var orderList = orders.ToList(); // materialize một lần
    var count = orderList.Count;
    foreach (var o in orderList) ...
}
```

---

## HttpClient

```csharp
// ❌ new HttpClient() trực tiếp — socket exhaustion sau vài giờ
public async Task<string> CallApiAsync()
{
    using var client = new HttpClient(); // ❌ NEVER
    return await client.GetStringAsync("https://api.example.com");
}

// ✅ Typed HttpClient qua IHttpClientFactory
// Program.cs:
services.AddHttpClient<PaymentGatewayClient>(client =>
{
    client.BaseAddress = new Uri(config["PaymentGateway:BaseUrl"]!);
    client.Timeout = TimeSpan.FromSeconds(30);
})
.AddStandardResilienceHandler(); // Polly built-in retry + circuit breaker (.NET 8)

// PaymentGatewayClient.cs:
public class PaymentGatewayClient(HttpClient client)
{
    public async Task<PaymentResult> ChargeAsync(
        ChargeRequest request, CancellationToken ct)
    {
        var response = await client.PostAsJsonAsync("/charge", request, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<PaymentResult>(ct)
            ?? throw new InvalidOperationException("Empty response from payment gateway");
    }
}
```

---

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
    .ValidateOnStart(); // ← fail fast nếu config sai

// Inject:
public class OrderRepository(IOptions<DatabaseOptions> dbOptions)
{
    private readonly DatabaseOptions _db = dbOptions.Value;
}

// ❌ Đọc IConfiguration trực tiếp trong business logic
public class OrderService(IConfiguration config) // ❌ — config là infra concern
{
    var connStr = config["Database:ConnectionString"]; // ❌
}
```

---

## Nullable Reference Types

```csharp
// Bật trong .csproj:
// <Nullable>enable</Nullable>

// ✅ Rõ ràng về nullable
public record CreateOrderCommand(
    Guid CustomerId,
    string ShippingAddress,      // non-nullable — required
    string? PromoCode = null     // nullable — optional
);

// ✅ Null-coalescing và null-forgiving đúng chỗ
var name = user?.FullName ?? "Guest";
var id = response.Data!.Id; // ! chỉ khi chắc chắn không null
```

# .NET Gotchas — Những lỗi đã gặp

> Format: [Tên gotcha] → Triệu chứng → Root cause → Fix
> Thêm vào đây mỗi khi phát hiện gotcha mới từ thực tế.

## 1. Captured variable trong async loop
```csharp
// ❌ Bug: tất cả task cùng dùng 1 biến i
for (int i = 0; i < 10; i++)
{
    tasks.Add(Task.Run(() => Process(i))); // i bị capture by reference
}

// ✅ Fix: capture local copy
for (int i = 0; i < 10; i++)
{
    var localI = i;
    tasks.Add(Task.Run(() => Process(localI)));
}
// Hoặc dùng Parallel.ForEachAsync (tốt hơn)
```

## 2. ConfigureAwait trong library
```csharp
// ❌ Có thể deadlock trong ASP.NET classic hoặc WinForms
var result = GetDataAsync().Result; // deadlock nếu context bị captured

// ✅ Trong library code: ConfigureAwait(false)
public async Task<Data> GetDataAsync()
{
    var data = await _repo.FetchAsync().ConfigureAwait(false);
    return Transform(data);
}
```

## 3. DbContext trong background service
```csharp
// ❌ DbContext là Scoped — inject vào Singleton → captive dependency
public class MyBackgroundService : BackgroundService
{
    private readonly AppDbContext _ctx; // ❌ WRONG
}

// ✅ Tạo scope mới mỗi lần cần
public class MyBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            using var scope = _scopeFactory.CreateScope();
            var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await ProcessAsync(ctx, ct);
            await Task.Delay(TimeSpan.FromMinutes(1), ct);
        }
    }
}
```

## 4. HttpClient socket exhaustion
```csharp
// ❌ Tạo mới HttpClient mỗi request → socket exhaustion sau vài giờ
public async Task<string> GetAsync(string url)
{
    using var client = new HttpClient(); // ❌ NEVER DO THIS
    return await client.GetStringAsync(url);
}

// ✅ IHttpClientFactory
// DI: services.AddHttpClient<MyService>();
public class MyService
{
    private readonly HttpClient _client; // Injected, managed by factory
    public MyService(HttpClient client) => _client = client;
}
```

## 5. EF Core LEFT JOIN bị thành INNER JOIN
```csharp
// ❌ Bị thành INNER JOIN vì navigation property non-nullable
var orders = _ctx.Orders
    .Include(o => o.Coupon) // Coupon nullable, nhưng vẫn bị INNER JOIN
    .ToList();

// ✅ Fix: check relationship config
// modelBuilder: HasOne(o => o.Coupon).WithMany().IsRequired(false)
// Và verify với .ToQueryString()
```

## 6. Task.WhenAll không propagate tất cả exception
```csharp
// ❌ Chỉ catch 1 exception đầu tiên
try
{
    await Task.WhenAll(task1, task2, task3);
}
catch (Exception ex) // chỉ nhận 1 trong nhiều exception
{ }

// ✅ Catch AggregateException
var allTasks = Task.WhenAll(task1, task2, task3);
try { await allTasks; }
catch
{
    var allExceptions = allTasks.Exception?.InnerExceptions;
    // Handle tất cả
}
```

## 7. CancellationToken không được pass → request treo

```csharp
// ❌ Khi client cancel request, query vẫn chạy đến hết
var data = await _ctx.Orders.ToListAsync(); // Thiếu ct

// ✅ Luôn pass CancellationToken
var data = await _ctx.Orders.ToListAsync(cancellationToken);
```

---

## 8. IEnumerable bị enumerate nhiều lần — silent perf bug

```csharp
// ❌ orders bị enumerate 2 lần (mỗi lần query DB nếu là IQueryable)
public void Process(IEnumerable<Order> orders)
{
    if (!orders.Any())     // enumerate lần 1
        return;
    foreach (var o in orders) // enumerate lần 2
        Process(o);
}

// ✅ Materialize trước
public void Process(IEnumerable<Order> orders)
{
    var list = orders.ToList(); // enumerate 1 lần
    if (!list.Any()) return;
    foreach (var o in list) Process(o);
}
```
**Triệu chứng:** Query chạy 2 lần trong log, performance thấp hơn mong đợi.

---

## 9. SemaphoreSlim không được dispose — resource leak

```csharp
// ❌ Tạo SemaphoreSlim mỗi call nhưng không dispose
public async Task ProcessAsync()
{
    var semaphore = new SemaphoreSlim(1, 1); // ❌ leak nếu không dispose
    await semaphore.WaitAsync();
    try { ... }
    finally { semaphore.Release(); }
}

// ✅ Dùng class-level field và dispose đúng cách
public class MyService : IDisposable
{
    private readonly SemaphoreSlim _lock = new(1, 1);

    public async Task ProcessAsync(CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        try { ... }
        finally { _lock.Release(); }
    }

    public void Dispose() => _lock.Dispose();
}
```

---

## 10. DateTime.Now vs DateTime.UtcNow — timezone bug trên server

```csharp
// ❌ DateTime.Now bị ảnh hưởng bởi server timezone
// Nếu server ở UTC+7, DateTime.Now trả về giờ Việt Nam
// Khi deploy lên server UTC → behavior thay đổi
var createdAt = DateTime.Now; // ❌

// ✅ Luôn dùng UTC trong business logic
var createdAt = DateTime.UtcNow; // ✅

// ✅ Dùng ITimeProvider để testable (mock trong unit test)
public class OrderService(TimeProvider timeProvider)
{
    public void CreateOrder()
    {
        var now = timeProvider.GetUtcNow(); // mockable
    }
}
// Register: services.AddSingleton(TimeProvider.System);
```
**Lesson learned:** Bug thường xuất hiện khi deploy lên cloud server có timezone khác với dev machine.

---

## 11. JSON Serialization: System.Text.Json và case sensitivity

```csharp
// ❌ Deserialize fail silently nếu property name không match (case-sensitive by default)
var dto = JsonSerializer.Deserialize<OrderDto>(json);
// json: {"orderId": "123"} + dto: OrderId → dto.OrderId = null (không throw!)

// ✅ Configure case-insensitive hoặc dùng [JsonPropertyName]
var dto = JsonSerializer.Deserialize<OrderDto>(json, new JsonSerializerOptions
{
    PropertyNameCaseInsensitive = true
});

// Hoặc explicit mapping:
public record OrderDto([property: JsonPropertyName("orderId")] string OrderId);
```

---

## 12. Lazy DI Resolution — không fail fast khi service missing

```csharp
// ❌ GetService trả về null nếu không register, không throw
var service = serviceProvider.GetService<IMyService>(); // null nếu chưa register
service.DoWork(); // NullReferenceException ở runtime

// ✅ GetRequiredService — throw rõ ràng ngay khi resolve
var service = serviceProvider.GetRequiredService<IMyService>(); // throw nếu missing

// ✅✅ Tốt nhất: Constructor injection → fail at startup
public class MyController(IMyService service) // throw nếu không register
{ }
```

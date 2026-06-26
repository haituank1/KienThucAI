# .NET Gotchas — Những lỗi đã gặp

## 1. Captured variable trong async loop
```csharp
// ❌ tất cả task cùng dùng 1 biến i (capture by reference)
for (int i = 0; i < 10; i++)
    tasks.Add(Task.Run(() => Process(i)));

// ✅ capture local copy
for (int i = 0; i < 10; i++)
{
    var localI = i;
    tasks.Add(Task.Run(() => Process(localI)));
}
```

## 2. ConfigureAwait trong library
```csharp
// ❌ deadlock trong ASP.NET classic / WinForms
var result = GetDataAsync().Result;

// ✅ library code phải ConfigureAwait(false)
public async Task<Data> GetDataAsync()
{
    var data = await _repo.FetchAsync().ConfigureAwait(false);
    return Transform(data);
}
```

## 3. DbContext trong background service (captive dependency)
```csharp
// ❌ DbContext là Scoped — inject vào Singleton
public class MyBackgroundService : BackgroundService
{
    private readonly AppDbContext _ctx; // WRONG
}

// ✅ Tạo scope mỗi iteration
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
```

## 4. HttpClient socket exhaustion
```csharp
// ❌ socket exhaustion sau vài giờ
using var client = new HttpClient(); // NEVER DO THIS per request

// ✅ IHttpClientFactory
// DI: services.AddHttpClient<MyService>();
public class MyService(HttpClient client) { } // factory-managed
```

## 5. EF Core LEFT JOIN bị thành INNER JOIN
```csharp
// ❌ Coupon nullable nhưng Include vẫn tạo INNER JOIN
_ctx.Orders.Include(o => o.Coupon).ToList();

// ✅ Fix: check relationship config
// modelBuilder: HasOne(o => o.Coupon).WithMany().IsRequired(false)
// Verify bằng .ToQueryString()
```

## 6. Task.WhenAll chỉ propagate 1 exception
```csharp
// ❌ catch chỉ nhận exception đầu tiên
try { await Task.WhenAll(task1, task2, task3); }
catch (Exception ex) { }

// ✅ Lấy tất cả exception
var allTasks = Task.WhenAll(task1, task2, task3);
try { await allTasks; }
catch { var all = allTasks.Exception?.InnerExceptions; }
```

## 7. CancellationToken không được pass → request treo
```csharp
// ❌ query chạy đến hết dù client cancel
var data = await _ctx.Orders.ToListAsync();

// ✅
var data = await _ctx.Orders.ToListAsync(cancellationToken);
```

## 8. IEnumerable bị enumerate nhiều lần
```csharp
// ❌ IQueryable enumerate 2 lần = 2 DB queries
public void Process(IEnumerable<Order> orders)
{
    if (!orders.Any()) return;       // query 1
    foreach (var o in orders) ...;   // query 2
}

// ✅ Materialize trước
var list = orders.ToList();
if (!list.Any()) return;
foreach (var o in list) ...;
```

## 9. SemaphoreSlim — class-level, không tạo per-call
```csharp
// ❌ leak nếu tạo mỗi call
var semaphore = new SemaphoreSlim(1, 1); // per call = leak

// ✅
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

## 10. DateTime.Now vs DateTime.UtcNow
```csharp
// ❌ server timezone ảnh hưởng behavior
var createdAt = DateTime.Now;

// ✅ UTC + testable via TimeProvider
public class OrderService(TimeProvider timeProvider)
{
    public void CreateOrder() => var now = timeProvider.GetUtcNow();
}
// Register: services.AddSingleton(TimeProvider.System);
```
**Lesson learned:** Bug xuất hiện khi deploy lên cloud server timezone khác dev machine.

## 11. System.Text.Json — case sensitivity silent fail
```csharp
// ❌ {"orderId": "123"} → OrderDto.OrderId = null (không throw!)
var dto = JsonSerializer.Deserialize<OrderDto>(json);

// ✅
var dto = JsonSerializer.Deserialize<OrderDto>(json, new JsonSerializerOptions
{
    PropertyNameCaseInsensitive = true
});
// Hoặc: [property: JsonPropertyName("orderId")]
```

## 12. DI — GetService vs GetRequiredService
```csharp
// ❌ null nếu không register, throw sau ở runtime
var service = serviceProvider.GetService<IMyService>();

// ✅ throw rõ ràng ngay khi resolve
var service = serviceProvider.GetRequiredService<IMyService>();

// ✅✅ Constructor injection → fail at startup (tốt nhất)
public class MyController(IMyService service) { }
```

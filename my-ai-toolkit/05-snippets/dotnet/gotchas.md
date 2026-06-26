# .NET Gotchas — Những lỗi đã gặp

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

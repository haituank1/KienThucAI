# .NET Async Patterns — Battle-tested

## 1. Parallel Processing với bounded concurrency
```csharp
// ❌ 10K tasks chạy song song → connection pool exhausted
await Task.WhenAll(items.Select(item => ProcessAsync(item, ct)));

// ✅ Parallel.ForEachAsync (.NET 6+)
await Parallel.ForEachAsync(items,
    new ParallelOptions { MaxDegreeOfParallelism = 10, CancellationToken = ct },
    async (item, token) => await ProcessAsync(item, token));
```

## 2. Channel<T> — Producer/Consumer pipeline
```csharp
// Async, bounded, backpressure — tốt hơn BlockingCollection/ConcurrentQueue
var channel = Channel.CreateBounded<Order>(new BoundedChannelOptions(100)
{
    FullMode = BoundedChannelFullMode.Wait, // Producer wait khi channel đầy
    SingleReader = false,
    SingleWriter = true
});

async Task ProduceAsync(CancellationToken ct)
{
    await foreach (var order in _repo.StreamOrdersAsync(ct))
        await channel.Writer.WriteAsync(order, ct);
    channel.Writer.Complete();
}

async Task ConsumeAsync(CancellationToken ct)
{
    await foreach (var order in channel.Reader.ReadAllAsync(ct))
        await ProcessOrderAsync(order, ct);
}

var producer = ProduceAsync(ct);
var consumers = Enumerable.Range(0, 5).Select(_ => ConsumeAsync(ct));
await Task.WhenAll([producer, ..consumers]);
```

## 3. CancellationToken Timeout Wrapper
```csharp
// ❌ hang indefinitely nếu external service không respond
var result = await _httpClient.GetAsync(url, ct);

// ✅ Combine user cancellation + timeout
public async Task<string> CallExternalAsync(string url, CancellationToken ct)
{
    using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
    using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);
    try
    {
        return await _httpClient.GetStringAsync(url, linkedCts.Token);
    }
    catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested)
    {
        throw new TimeoutException($"Call to {url} timed out after 30s");
    }
}
```

## 4. Retry với Polly v8
```csharp
// HTTP client:
services.AddHttpClient<ExternalServiceClient>()
    .AddStandardResilienceHandler(opt =>
    {
        opt.Retry.MaxRetryAttempts = 3;
        opt.Retry.Delay = TimeSpan.FromSeconds(1);
        opt.Retry.BackoffType = DelayBackoffType.Exponential;
        opt.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
        opt.CircuitBreaker.FailureRatio = 0.5; // 50% fail → open circuit
    });

// Non-HTTP (e.g., DB):
var pipeline = new ResiliencePipelineBuilder()
    .AddRetry(new RetryStrategyOptions
    {
        MaxRetryAttempts = 3,
        Delay = TimeSpan.FromMilliseconds(500),
        BackoffType = DelayBackoffType.Exponential,
        ShouldHandle = new PredicateBuilder().Handle<DbException>(e => e.IsTransient)
    })
    .AddTimeout(TimeSpan.FromSeconds(30))
    .Build();

await pipeline.ExecuteAsync(async ct => await _repo.SaveAsync(ct), ct);
```

## 5. Graceful Shutdown trong BackgroundService
```csharp
public class OrderProcessingWorker(IServiceScopeFactory scopeFactory,
    ILogger<OrderProcessingWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var handler = scope.ServiceProvider.GetRequiredService<IProcessOrdersHandler>();
                await handler.ProcessBatchAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break; // Clean exit
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Worker error — will retry after delay");
            }

            try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
```

## 6. ValueTask vs Task
```csharp
// ValueTask: tối ưu khi result thường available synchronously (cache hit, no heap alloc)
// Task: general purpose

public async ValueTask<OrderDto?> GetOrderAsync(Guid id, CancellationToken ct)
{
    if (_cache.TryGetValue(id, out var cached))
        return cached; // synchronous, no allocation

    var order = await _db.Orders.FindAsync(id, ct);
    if (order != null) _cache.Set(id, order);
    return order;
}

// ⚠️ ValueTask không thể await nhiều lần
var vt = GetOrderAsync(id, ct);
var r1 = await vt; // OK
var r2 = await vt; // ❌ Undefined behavior — dùng .AsTask() nếu cần await nhiều lần
```

## CancellationToken: Patterns đúng và pitfalls trong .NET
> 2026-06-30 · 97%

CancellationToken là cooperative: method phải check hoặc pass token xuống.

// WRONG: CT không được pass xuống
public async Task<Order> CreateOrderAsync(CreateOrderDto dto, CancellationToken ct)
{
    var product = await _productSvc.GetAsync(dto.ProductId); // WRONG: mất CT
    return await _repo.CreateAsync(dto);                     // WRONG: mất CT
}

// RIGHT: pass CT xuống toàn bộ stack
public async Task<Order> CreateOrderAsync(CreateOrderDto dto, CancellationToken ct)
{
    var product = await _productSvc.GetAsync(dto.ProductId, ct);
    return await _repo.CreateAsync(dto, ct);
}

// Linked token: timeout + user cancel
public async Task<Result> ProcessWithTimeoutAsync(Request req, CancellationToken userCt)
{
    using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
    using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
        userCt, timeoutCts.Token);
    try
    {
        return await DoWorkAsync(req, linkedCts.Token);
    }
    catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested)
    {
        throw new TimeoutException("Operation timed out after 30 seconds");
    }
    // OperationCanceledException từ userCt sẽ propagate tự nhiên
}

// WRONG: swallow cancellation — NEVER
catch (OperationCanceledException) { return default; }

---

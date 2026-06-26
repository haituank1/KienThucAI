# .NET Async Patterns — Battle-tested

> Những pattern async/concurrency đã dùng trong production.
> Thêm vào khi tìm ra pattern mới hoặc bị burn bởi anti-pattern.

---

## 1. Parallel Processing với bounded concurrency

```csharp
// ❌ Task.WhenAll không giới hạn concurrency — overwhelm DB/external service
var tasks = items.Select(item => ProcessAsync(item, ct));
await Task.WhenAll(tasks); // 10K tasks chạy song song → connection pool exhausted

// ✅ Parallel.ForEachAsync — built-in degree of parallelism control (.NET 6+)
await Parallel.ForEachAsync(
    items,
    new ParallelOptions
    {
        MaxDegreeOfParallelism = 10, // max 10 concurrent
        CancellationToken = ct
    },
    async (item, token) => await ProcessAsync(item, token));
```

---

## 2. Channel<T> — Producer/Consumer pipeline

```csharp
// Pattern: 1 producer đọc data, N consumer xử lý
// Tốt hơn BlockingCollection, ConcurrentQueue vì: async, bounded, backpressure

var channel = Channel.CreateBounded<Order>(new BoundedChannelOptions(100)
{
    FullMode = BoundedChannelFullMode.Wait, // Producer wait khi channel đầy
    SingleReader = false,
    SingleWriter = true
});

// Producer
async Task ProduceAsync(CancellationToken ct)
{
    await foreach (var order in _repo.StreamOrdersAsync(ct))
    {
        await channel.Writer.WriteAsync(order, ct);
    }
    channel.Writer.Complete();
}

// Consumer (chạy N instance song song)
async Task ConsumeAsync(CancellationToken ct)
{
    await foreach (var order in channel.Reader.ReadAllAsync(ct))
    {
        await ProcessOrderAsync(order, ct);
    }
}

// Start:
var producer = ProduceAsync(ct);
var consumers = Enumerable.Range(0, 5)
    .Select(_ => ConsumeAsync(ct));
await Task.WhenAll([producer, ..consumers]);
```
**Dùng khi:** Export lớn, batch processing, pipeline có nhiều stage.

---

## 3. CancellationToken Timeout Wrapper

```csharp
// ❌ Gọi external service không có timeout → hang indefinitely
var result = await _httpClient.GetAsync(url, ct); // chỉ cancel khi request cancel

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

---

## 4. Retry với Polly (v8 pipeline)

```csharp
// Program.cs — register pipeline
services.AddHttpClient<ExternalServiceClient>()
    .AddStandardResilienceHandler(opt =>
    {
        opt.Retry.MaxRetryAttempts = 3;
        opt.Retry.Delay = TimeSpan.FromSeconds(1);
        opt.Retry.BackoffType = DelayBackoffType.Exponential;
        opt.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
        opt.CircuitBreaker.FailureRatio = 0.5; // 50% fail → open circuit
    });

// Manual pipeline cho non-HTTP:
var pipeline = new ResiliencePipelineBuilder()
    .AddRetry(new RetryStrategyOptions
    {
        MaxRetryAttempts = 3,
        Delay = TimeSpan.FromMilliseconds(500),
        BackoffType = DelayBackoffType.Exponential,
        ShouldHandle = new PredicateBuilder()
            .Handle<DbException>(e => e.IsTransient)
    })
    .AddTimeout(TimeSpan.FromSeconds(30))
    .Build();

await pipeline.ExecuteAsync(async ct => await _repo.SaveAsync(ct), ct);
```

---

## 5. Graceful Shutdown trong BackgroundService

```csharp
public class OrderProcessingWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<OrderProcessingWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Worker started");

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
                logger.LogInformation("Worker shutting down gracefully");
                break; // Clean exit
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Worker error — will retry after delay");
                // Không crash worker, tiếp tục sau delay
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break; // Shutdown during delay — OK
            }
        }

        logger.LogInformation("Worker stopped");
    }
}
```

---

## 6. ValueTask vs Task — Khi nào dùng cái nào

```csharp
// Task: general purpose, allocates on heap
// ValueTask: tối ưu khi result thường available synchronously (cache hit)

// ✅ ValueTask cho cache-first pattern
public async ValueTask<OrderDto?> GetOrderAsync(Guid id, CancellationToken ct)
{
    // Hot path: cache hit — không allocate Task
    if (_cache.TryGetValue(id, out var cached))
        return cached; // Synchronous return, no allocation

    // Cold path: cache miss — cần async
    var order = await _db.Orders.FindAsync(id, ct);
    if (order != null) _cache.Set(id, order);
    return order;
}

// ⚠️ Gotcha: ValueTask không thể await nhiều lần
var valueTask = GetOrderAsync(id, ct);
var result1 = await valueTask; // OK
var result2 = await valueTask; // ❌ Undefined behavior
// ✅ Fix: .AsTask() nếu cần await nhiều lần
```

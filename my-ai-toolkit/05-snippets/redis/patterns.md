# Redis Patterns Thực Chiến

## 1. Cache-Aside với lock tránh stampede
```csharp
public async Task<T?> GetOrSetAsync<T>(
    string key, 
    Func<Task<T?>> factory, 
    TimeSpan ttl,
    CancellationToken ct)
{
    // Try cache first
    var cached = await _redis.StringGetAsync(key);
    if (cached.HasValue)
        return JsonSerializer.Deserialize<T>(cached!);

    // Lock tránh cache stampede (nhiều request cùng miss cache)
    var lockKey = $"lock:{key}";
    var lockAcquired = await _redis.StringSetAsync(
        lockKey, "1", TimeSpan.FromSeconds(10), When.NotExists);

    if (!lockAcquired)
    {
        // Chờ lock giải phóng rồi retry
        await Task.Delay(100, ct);
        return await GetOrSetAsync(key, factory, ttl, ct);
    }

    try
    {
        var value = await factory();
        if (value is not null)
            await _redis.StringSetAsync(key, 
                JsonSerializer.Serialize(value), ttl);
        return value;
    }
    finally
    {
        await _redis.KeyDeleteAsync(lockKey);
    }
}
```

## 2. Distributed Lock cho critical section
```csharp
public async Task<bool> TryProcessOnceAsync(
    string resourceId, 
    Func<Task> action,
    CancellationToken ct)
{
    var lockKey = $"lock:process:{resourceId}";
    var lockValue = Guid.NewGuid().ToString();
    var ttl = TimeSpan.FromSeconds(30);

    var acquired = await _redis.StringSetAsync(
        lockKey, lockValue, ttl, When.NotExists);

    if (!acquired) return false;

    try
    {
        await action();
        return true;
    }
    finally
    {
        // Release chỉ nếu vẫn là lock của mình (Lua script atomic)
        const string releaseScript = @"
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            else return 0 end";
        await _redis.ScriptEvaluateAsync(releaseScript,
            new RedisKey[] { lockKey },
            new RedisValue[] { lockValue });
    }
}
```

## 3. Rate Limiting với sliding window
```csharp
public async Task<bool> IsAllowedAsync(string userId, int maxRequests, TimeSpan window)
{
    var key = $"ratelimit:{userId}:{DateTime.UtcNow:yyyyMMddHHmm}";
    var count = await _redis.StringIncrementAsync(key);
    
    if (count == 1) // First request in this window
        await _redis.KeyExpireAsync(key, window);
    
    return count <= maxRequests;
}
```

## 4. Pub/Sub cho invalidation
```csharp
// Publisher (khi data thay đổi)
await _redis.PublishAsync(
    RedisChannel.Literal("cache:invalidate:orders"), 
    orderId.ToString());

// Subscriber (cache node lắng nghe)
_subscriber.Subscribe(
    RedisChannel.Pattern("cache:invalidate:*"), 
    async (channel, message) =>
    {
        var entityType = channel.ToString().Split(':')[2];
        var entityId = message.ToString();
        await _localCache.RemoveAsync($"{entityType}:{entityId}");
    });
```

---
**Lesson learned:** 
- Set TTL ngắn hơn bạn nghĩ khi mới bắt đầu — dễ tăng sau khi có data thực tế
- Monitor memory usage Redis — eviction policy `allkeys-lru` tốt cho cache workload

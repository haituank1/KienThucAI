# Redis Patterns Thực Chiến

## 1. Cache-Aside với lock tránh stampede
```csharp
public async Task<T?> GetOrSetAsync<T>(string key, Func<Task<T?>> factory,
    TimeSpan ttl, CancellationToken ct)
{
    var cached = await _redis.StringGetAsync(key);
    if (cached.HasValue) return JsonSerializer.Deserialize<T>(cached!);

    var lockKey = $"lock:{key}";
    var lockAcquired = await _redis.StringSetAsync(lockKey, "1", TimeSpan.FromSeconds(10), When.NotExists);
    if (!lockAcquired)
    {
        await Task.Delay(100, ct);
        return await GetOrSetAsync(key, factory, ttl, ct); // retry
    }

    try
    {
        var value = await factory();
        if (value is not null)
            await _redis.StringSetAsync(key, JsonSerializer.Serialize(value), ttl);
        return value;
    }
    finally { await _redis.KeyDeleteAsync(lockKey); }
}
```

## 2. Distributed Lock — Lua script atomic release
```csharp
public async Task<bool> TryProcessOnceAsync(string resourceId, Func<Task> action)
{
    var lockKey = $"lock:process:{resourceId}";
    var lockValue = Guid.NewGuid().ToString();

    if (!await _redis.StringSetAsync(lockKey, lockValue, TimeSpan.FromSeconds(30), When.NotExists))
        return false;

    try { await action(); return true; }
    finally
    {
        // ⚠️ Phải dùng Lua để check-and-delete atomic — tránh xóa lock của người khác
        const string releaseScript = @"
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            else return 0 end";
        await _redis.ScriptEvaluateAsync(releaseScript,
            new RedisKey[] { lockKey }, new RedisValue[] { lockValue });
    }
}
```

## 3. Rate Limiting — Fixed window
```csharp
public async Task<bool> IsAllowedAsync(string userId, int maxRequests, TimeSpan window)
{
    var key = $"ratelimit:{userId}:{DateTime.UtcNow:yyyyMMddHHmm}";
    var count = await _redis.StringIncrementAsync(key);
    if (count == 1) await _redis.KeyExpireAsync(key, window); // set TTL on first hit
    return count <= maxRequests;
}
```

## 4. Pub/Sub — Cache invalidation
```csharp
// Publisher
await _redis.PublishAsync(RedisChannel.Literal("cache:invalidate:orders"), orderId.ToString());

// Subscriber
_subscriber.Subscribe(RedisChannel.Pattern("cache:invalidate:*"), async (channel, message) =>
{
    var entityType = channel.ToString().Split(':')[2];
    await _localCache.RemoveAsync($"{entityType}:{message}");
});
```

**Lesson learned:**
- Set TTL ngắn hơn khi mới bắt đầu — tăng sau khi có data thực tế
- eviction policy `allkeys-lru` tốt cho cache workload

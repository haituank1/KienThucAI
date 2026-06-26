# Redis Rules

## Key Design

```
# Pattern: {app}:{domain}:{identifier}[:{variant}]
orderapi:order:abc-123
orderapi:orders:customer:cust-456
orderapi:orders:list:pending:page:1
orderapi:product:sku-789:price
orderapi:lock:order:abc-123
orderapi:session:user:user-456
orderapi:ratelimit:api:user-456:2026-06

# Rules: lowercase, colon separator, specific enough for targeted invalidation
# Never: spaces, slashes, wildcards in key
```

## TTL — Always set, never permanent

| Cache type | TTL |
|-----------|-----|
| Session | 30-60 min |
| Single entity (order, product) | 5-15 min |
| List / search result | 1-5 min |
| Reference data (category, config) | 1-24 hr |
| Distributed lock | 10-30 sec |
| Rate limit counter | Window size (1 min, 1 hr) |

## Cache-Aside Pattern

```csharp
public async Task<OrderDetailDto?> GetOrderAsync(Guid orderId, CancellationToken ct)
{
    var key = $"orderapi:order:{orderId}";

    var cached = await _db.StringGetAsync(key);
    if (cached.HasValue) return JsonSerializer.Deserialize<OrderDetailDto>(cached!);

    var order = await ctx.Orders.AsNoTracking()
        .Where(o => o.Id == orderId).Select(o => new OrderDetailDto { ... }).FirstOrDefaultAsync(ct);

    if (order is not null)
        await _db.StringSetAsync(key, JsonSerializer.Serialize(order), TimeSpan.FromMinutes(10));

    return order;
}

// Invalidate on write
public async Task InvalidateOrderAsync(Guid orderId)
    => await _db.KeyDeleteAsync($"orderapi:order:{orderId}");
```

## Distributed Lock — Atomic acquire + release

```csharp
// SetNX — atomic, only sets if not exists
public async Task<bool> TryAcquireAsync(string resource, string lockId, TimeSpan expiry)
    => await _db.StringSetAsync($"orderapi:lock:{resource}", lockId, expiry, When.NotExists);

// Lua script for atomic check+release (prevents releasing another holder's lock)
private static readonly string ReleaseScript = """
    if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
    else
        return 0
    end
    """;

public async Task ReleaseAsync(string resource, string lockId)
    => await _db.ScriptEvaluateAsync(ReleaseScript,
        new RedisKey[] { $"orderapi:lock:{resource}" }, new RedisValue[] { lockId });

public async Task<bool> ExecuteWithLockAsync(string resource, Func<Task> action, TimeSpan expiry, CancellationToken ct)
{
    var lockId = Guid.NewGuid().ToString();
    if (!await TryAcquireAsync(resource, lockId, expiry)) return false;
    try { await action(); return true; }
    finally { await ReleaseAsync(resource, lockId); }
}
```

## Serialization

```csharp
// ✅ System.Text.Json — default, debug-friendly
var serialized = JsonSerializer.Serialize(dto, new JsonSerializerOptions
    { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = false });

// ✅ MessagePack — ~3x faster, ~50% smaller than JSON
// Use when: high-frequency cache, large objects. Trade-off: not human-readable.

// ❌ Never serialize: Exception, Task/ValueTask, IQueryable/DbContext, circular references
```

## Cache Invalidation Strategies

```csharp
// Strategy 1: Delete on write (simple, correct)
await _db.KeyDeleteAsync($"orderapi:order:{orderId}");

// Strategy 2: Version key — old keys expire naturally
var version = await _db.StringIncrementAsync($"orderapi:order:{orderId}:version");
var key = $"orderapi:order:{orderId}:v:{version}";

// Strategy 3: Event-driven (distributed systems)
await _redis.PublishAsync("cache:invalidate:order", orderId.ToString());
```

## Anti-patterns

```csharp
// ❌ Cache full aggregate with many nested objects (1 change = full invalidation)
// ✅ Cache small value objects/DTOs

// ❌ Object >100KB per key → chunk or reconsider caching

// ❌ Sync call in async code
var value = _db.StringGet(key);       // ❌ blocking
var value = await _db.StringGetAsync(key); // ✅

// ❌ KEYS * or FLUSHDB in production code — blocks server O(N)
// ✅ SCAN with MATCH pattern if needed
```

## Monitoring

```csharp
services.AddHealthChecks().AddRedis(redisConnectionString, name: "redis", timeout: TimeSpan.FromSeconds(3));
```

Metrics targets: cache hit ratio >80%, latency p99 <5ms (same-region), watch eviction rate.

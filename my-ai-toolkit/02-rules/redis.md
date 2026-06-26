# Redis Rules

---

## Key Design

```
# Pattern: {app}:{domain}:{identifier}[:{variant}]
orderapi:order:abc-123                    # single entity
orderapi:orders:customer:cust-456         # list by customer
orderapi:orders:list:pending:page:1       # paginated list
orderapi:product:sku-789:price            # specific field cache
orderapi:lock:order:abc-123               # distributed lock
orderapi:session:user:user-456            # user session
orderapi:ratelimit:api:user-456:2026-06   # rate limit counter

# Rules:
# - lowercase, colon separator
# - đủ cụ thể để invalidate targeted (không flush all)
# - không dùng space, slash, wildcard trong key
```

---

## TTL — Luôn set, không bao giờ để tồn tại vĩnh viễn

| Cache type | TTL | Lý do |
|-----------|-----|-------|
| Session | 30-60 phút | Inactivity timeout |
| Single entity (order, product) | 5-15 phút | Balance freshness vs hit rate |
| List / search result | 1-5 phút | Stale data risk cao hơn |
| Reference data (category, config) | 1-24 giờ | Ít thay đổi |
| Distributed lock | 10-30 giây | Auto-release nếu holder crash |
| Rate limit counter | Window size | 1 phút, 1 giờ, v.v. |

---

## Cache-Aside Pattern — Chuẩn, dùng phổ biến nhất

```csharp
public class OrderCacheService(
    IConnectionMultiplexer redis,
    AppDbContext ctx,
    ILogger<OrderCacheService> logger)
{
    private readonly IDatabase _db = redis.GetDatabase();

    public async Task<OrderDetailDto?> GetOrderAsync(Guid orderId, CancellationToken ct)
    {
        var key = $"orderapi:order:{orderId}";

        // 1. Try cache
        var cached = await _db.StringGetAsync(key);
        if (cached.HasValue)
        {
            logger.LogDebug("Cache HIT for order {OrderId}", orderId);
            return JsonSerializer.Deserialize<OrderDetailDto>(cached!);
        }

        // 2. Miss → DB
        logger.LogDebug("Cache MISS for order {OrderId}", orderId);
        var order = await ctx.Orders
            .AsNoTracking()
            .Where(o => o.Id == orderId)
            .Select(o => new OrderDetailDto { ... })
            .FirstOrDefaultAsync(ct);

        // 3. Set cache (chỉ khi có data)
        if (order is not null)
        {
            var serialized = JsonSerializer.Serialize(order);
            await _db.StringSetAsync(key, serialized, TimeSpan.FromMinutes(10));
        }

        return order;
    }

    // Invalidate on write — gọi sau khi update DB
    public async Task InvalidateOrderAsync(Guid orderId)
        => await _db.KeyDeleteAsync($"orderapi:order:{orderId}");
}
```

---

## Distributed Lock — Atomic acquire + release

```csharp
public class RedisDistributedLock(IConnectionMultiplexer redis)
{
    private readonly IDatabase _db = redis.GetDatabase();

    // Lua script để atomic check + release
    private static readonly string ReleaseScript = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        else
            return 0
        end
        """;

    public async Task<bool> TryAcquireAsync(
        string resource,
        string lockId,              // unique per holder (Guid.NewGuid())
        TimeSpan expiry)
        => await _db.StringSetAsync(
            $"orderapi:lock:{resource}",
            lockId,
            expiry,
            When.NotExists);        // SetNX — atomic, chỉ set khi chưa có

    public async Task ReleaseAsync(string resource, string lockId)
        => await _db.ScriptEvaluateAsync(
            ReleaseScript,
            new RedisKey[] { $"orderapi:lock:{resource}" },
            new RedisValue[] { lockId });

    // Helper: execute với lock
    public async Task<bool> ExecuteWithLockAsync(
        string resource,
        Func<Task> action,
        TimeSpan lockExpiry,
        CancellationToken ct)
    {
        var lockId = Guid.NewGuid().ToString();
        if (!await TryAcquireAsync(resource, lockId, lockExpiry))
            return false;

        try
        {
            await action();
            return true;
        }
        finally
        {
            await ReleaseAsync(resource, lockId);
        }
    }
}
```

---

## Serialization — JsonSerializer vs MessagePack

```csharp
// ✅ JsonSerializer (System.Text.Json) — readable, debug dễ, default choice
var serialized = JsonSerializer.Serialize(dto, new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = false // compact cho cache
});

// ✅ MessagePack — nhanh hơn ~3x, nhỏ hơn ~50% so với JSON
// Dùng khi: high-frequency cache, large objects, network-sensitive
// Trade-off: không readable khi debug

// ❌ Không serialize
// - Exception objects
// - Task / ValueTask
// - IQueryable / DbContext
// - Object với circular reference
```

---

## Cache Invalidation Strategies

```csharp
// Strategy 1: Delete on write (simple, correct)
// Sau khi update order:
await _db.KeyDeleteAsync($"orderapi:order:{orderId}");

// Strategy 2: Version key — invalidate nhiều keys liên quan
// Key: orderapi:order:{id}:v:{version}
// Tăng version → old keys tự expire (dù chưa xóa)
var version = await _db.StringIncrementAsync($"orderapi:order:{orderId}:version");
var key = $"orderapi:order:{orderId}:v:{version}";

// Strategy 3: Event-driven invalidation (distributed system)
// Publish event → subscribers invalidate local/distributed cache
await _redis.PublishAsync("cache:invalidate:order", orderId.ToString());
```

---

## Anti-patterns

```csharp
// ❌ Cache toàn bộ aggregate với nhiều nested objects
// Khi 1 nested item thay đổi → phải invalidate cả aggregate
// → Cache value object/DTO nhỏ, không cache full domain object

// ❌ Object quá lớn (>100KB per key)
// → Chunking, hoặc reconsider có cần cache không

// ❌ Sync Redis call trong async code
var value = _db.StringGet(key);     // ❌ blocking
var value = await _db.StringGetAsync(key); // ✅

// ❌ KEYS * hoặc FLUSHDB trong production code
await _db.ExecuteAsync("KEYS", "*"); // ❌ block Redis server, O(N)
// ✅ Scan với MATCH pattern nếu cần
```

---

## Monitoring — Health check

```csharp
// Program.cs
services.AddHealthChecks()
    .AddRedis(redisConnectionString, name: "redis", timeout: TimeSpan.FromSeconds(3));

// Metrics cần theo dõi:
// - Cache hit ratio (target: >80%)
// - Memory usage (eviction rate)
// - Connected clients
// - Latency p99 (<5ms cho same-region)
```

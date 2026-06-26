# 05-Snippets — Index
> Auto-generated. Đọc file này trước để navigate, rồi pull file cần thiết.  
> Last updated: 2026-06-27

---

## Cách dùng

```
"Xem snippets index: [paste INDEX.md]. Khi tôi hỏi về X, đọc file liên quan trước khi trả lời."
```

Hoặc trong CLAUDE.md: `Snippets: my-ai-toolkit/05-snippets/INDEX.md`

---

## dotnet/

| File | Sections | Dùng khi |
|------|---------|---------|
| [ef-core-patterns.md](dotnet/ef-core-patterns.md) | Projection N+1, Bulk update ExecuteUpdateAsync, Batch insert 1000/chunk, Streaming OOM, Optimistic Concurrency xmin, Raw SQL SqlQuery\<T\>, Global Query Filter, Compiled Query, Interceptor audit, Owned Entity | EF Core query, performance, ORM pattern |
| [gotchas.md](dotnet/gotchas.md) | Captured variable loop, ConfigureAwait, DbContext captive dependency, HttpClient socket exhaustion, LEFT JOIN→INNER JOIN, Task.WhenAll 1 exception, CancellationToken missing, IEnumerable double enumerate, SemaphoreSlim leak, DateTime.Now timezone, Json case sensitivity, DI GetService null | Debug lỗi lạ, review code, production issue |
| [async-patterns.md](dotnet/async-patterns.md) | Parallel.ForEachAsync bounded, Channel\<T\> producer/consumer, CancellationToken timeout wrapper, Polly v8, Graceful shutdown BackgroundService, ValueTask vs Task | Concurrency, pipeline, retry, background job |
| [performance-patterns.md](dotnet/performance-patterns.md) | Span\<T\> zero-copy, ArrayPool buffer, ObjectPool StringBuilder, Streaming export O(1) memory, BenchmarkDotNet, Struct <16 bytes | Memory optimization, hot path, export lớn |

---

## postgresql/

| File | Sections | Dùng khi |
|------|---------|---------|
| [query-patterns.md](postgresql/query-patterns.md) | Keyset pagination, Upsert ON CONFLICT, Window function RANK, Aggregation FILTER, CTE growth, Batch delete, SKIP LOCKED job queue, JSONB query GIN, Recursive CTE, Multi-row UPDATE VALUES | Query design, pagination, reporting, queue |
| [index-patterns.md](postgresql/index-patterns.md) | Composite index column order, Partial index, Covering index INCLUDE, Functional index, GIN Array/JSONB/FTS, BRIN time-series, Index monitoring unused, CONCURRENTLY | Index strategy, performance tuning |
| [gotchas.md](postgresql/gotchas.md) | Function wrap→no index, NULL NOT IN, TIMESTAMPTZ vs TIMESTAMP, OR→seq scan, LIKE leading wildcard, COUNT(*) slow, Deadlock ordering | Debug query chậm bất thường, data inconsistency |

---

## redis/

| File | Sections | Dùng khi |
|------|---------|---------|
| [patterns.md](redis/patterns.md) | Cache-Aside stampede lock, Distributed lock Lua script atomic, Rate limiting sliding window, Pub/Sub invalidation | Cache strategy, distributed lock, rate limit |

---

## rabbitmq/

| File | Sections | Dùng khi |
|------|---------|---------|
| [patterns.md](rabbitmq/patterns.md) | Outbox Pattern EF Core, Consumer idempotent Inbox, Retry + DLQ MassTransit, Republish DLQ | Message queue, event-driven, reliability |

---

## Thống kê

| Category | Files | Sections |
|----------|-------|---------|
| dotnet | 4 | 10+12+6+6 = 34 |
| postgresql | 3 | 10+8+7 = 25 |
| redis | 1 | 4 |
| rabbitmq | 1 | 4 |
| **Total** | **9** | **67** |

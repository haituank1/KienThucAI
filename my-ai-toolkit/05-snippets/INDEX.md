# 05-Snippets — Index
> **Auto-generated bởi DemoEngine** khi validate knowledge mới.
> Đọc file này trước để biết có gì, rồi AI tự navigate đến file cần thiết.
> Last updated: 2026-06-26 21:27 UTC

---

## Cách dùng với AI

Paste file này vào đầu session:
> "Xem snippets index: [paste INDEX.md]. Khi tôi hỏi về X, hãy đọc file liên quan trước khi trả lời."

Hoặc trong CLAUDE.md của project:
```
Snippets: my-ai-toolkit/05-snippets/INDEX.md — đọc index trước, pull file cần thiết.
```

---

## dotnet/

| File | Sections | Dùng khi |
|------|---------|---------|
| [async-patterns.md](dotnet/async-patterns.md) | Parallel Processing với bounded concurre…, Channel<T> — Producer/Consumer pipeline, CancellationToken Timeout Wrapper, Retry với Polly v8, Graceful Shutdown trong BackgroundServic…, ValueTask vs Task | Concurrency, pipeline, retry, background job |
| [ef-core-patterns.md](dotnet/ef-core-patterns.md) | Projection với nested object (tránh N+1), Bulk update không load entity (EF Core 7…, Batch insert, Streaming large result (tránh OOM), Optimistic Concurrency (PostgreSQL xmin), Raw SQL — Typed SqlQuery<T> (EF Core 8+), Global Query Filter — Soft delete & Mult…, Compiled Query — Hot query >100 req/s (~…, Interceptor — Audit trail tự động, Owned Entity — Value Object mapping, EF Core — Typed Raw SQL `SqlQuery<T>` | EF Core query, ORM pattern, performance |
| [gotchas.md](dotnet/gotchas.md) | Captured variable trong async loop, ConfigureAwait trong library, DbContext trong background service (capt…, HttpClient socket exhaustion, EF Core LEFT JOIN bị thành INNER JOIN, Task.WhenAll chỉ propagate 1 exception, CancellationToken không được pass → requ…, IEnumerable bị enumerate nhiều lần, SemaphoreSlim — class-level, không tạo p…, DateTime.Now vs DateTime.UtcNow, System.Text.Json — case sensitivity sile…, DI — GetService vs GetRequiredService | Debug lỗi lạ, review code, production issue |
| [performance-patterns.md](dotnet/performance-patterns.md) | Span<T> — Zero-copy string/byte processi…, ArrayPool<T> — Reuse buffer trong hot pa…, ObjectPool<T> — Reuse expensive objects, Streaming Export — Memory O(1) thay vì O…, BenchmarkDotNet — Đo thực tế trước khi o…, Struct cho short-lived, small data | Memory optimization, hot path, export lớn |

## postgresql/

| File | Sections | Dùng khi |
|------|---------|---------|
| [gotchas.md](postgresql/gotchas.md) | Index bị bỏ qua vì function wrap, NULL trong NOT IN → empty set, TIMESTAMP vs TIMESTAMPTZ, OR giữa columns khác nhau → Seq Scan, LIKE với leading wildcard → full table s…, COUNT(*) trên large table, Deadlock với concurrent updates | Debug query chậm, data inconsistency |
| [index-patterns.md](postgresql/index-patterns.md) | Composite Index — Thứ tự column, Partial Index — Chỉ 5% rows, size ~5% fu…, Covering Index (INCLUDE) — Index Only Sc…, Functional Index — Query có function wra…, GIN Index — Array, JSONB, Full-text, BRIN — Time-series, append-only (1% size…, Index Monitoring, CREATE INDEX CONCURRENTLY — Production s… | Index strategy, performance tuning, production |
| [query-patterns.md](postgresql/query-patterns.md) | Keyset Pagination (thay OFFSET), Upsert với ON CONFLICT, Window Function — Ranking, Aggregation với FILTER (thay nhiều subqu…, CTE — Complex query + MoM growth, Batch delete (tránh lock lâu + replicati…, SKIP LOCKED — Job queue pattern, JSONB Query, Recursive CTE — Hierarchical data, Multi-row UPDATE từ VALUES (1 round trip… | Query design, pagination, reporting, job queue |

## rabbitmq/

| File | Sections | Dùng khi |
|------|---------|---------|
| [patterns.md](rabbitmq/patterns.md) | Outbox Pattern với EF Core, Consumer Idempotent với Inbox, Retry + Dead Letter Queue, Republish từ DLQ | Message queue, event-driven, reliability |

## redis/

| File | Sections | Dùng khi |
|------|---------|---------|
| [patterns.md](redis/patterns.md) | Cache-Aside với lock tránh stampede, Distributed Lock — Lua script atomic rel…, Rate Limiting — Fixed window, Pub/Sub — Cache invalidation | Cache strategy, distributed lock, rate limit |

---

## Thống kê

| Category | Files | Tổng sections |
|----------|-------|--------------|
| dotnet | 4 | 35 |
| postgresql | 3 | 25 |
| rabbitmq | 1 | 4 |
| redis | 1 | 4 |
| **Total** | **9** | **68** |

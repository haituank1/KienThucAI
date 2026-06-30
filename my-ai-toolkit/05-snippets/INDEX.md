# 05-Snippets — Index
> **Auto-generated bởi DemoEngine** khi validate knowledge mới.
> Đọc file này trước để biết có gì, rồi AI tự navigate đến file cần thiết.
> Last updated: 2026-06-30 13:10 UTC

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
| [async-patterns.md](dotnet/async-patterns.md) | 1. Parallel Processing với bounded concu…, 2. Channel<T> — Producer/Consumer pipeli…, 3. CancellationToken Timeout Wrapper, 4. Retry với Polly v8, 5. Graceful Shutdown trong BackgroundSer…, 6. ValueTask vs Task, CancellationToken: Patterns đúng và pitf… | Concurrency, pipeline, retry, background job |
| [ef-core-patterns.md](dotnet/ef-core-patterns.md) | 1. Projection với nested object (tránh N…, 2. Bulk update không load entity (EF Cor…, 3. Batch insert, 4. Streaming large result (tránh OOM), 5. Optimistic Concurrency (PostgreSQL xm…, 7. Global Query Filter — Soft delete & M…, 8. Compiled Query — Hot query >100 req/s…, 9. Interceptor — Audit trail tự động, 10. Owned Entity — Value Object mapping, EF Core — Typed Raw SQL `SqlQuery<T>` | EF Core query, ORM pattern, performance |
| [gotchas.md](dotnet/gotchas.md) | 1. Captured variable trong async loop, 2. ConfigureAwait trong library, 3. DbContext trong background service (c…, 4. HttpClient socket exhaustion, 5. EF Core LEFT JOIN bị thành INNER JOIN, 6. Task.WhenAll chỉ propagate 1 exceptio…, 7. CancellationToken không được pass → r…, 8. IEnumerable bị enumerate nhiều lần, 9. SemaphoreSlim — class-level, không tạ…, 10. DateTime.Now vs DateTime.UtcNow, 11. System.Text.Json — case sensitivity …, 12. DI — GetService vs GetRequiredServic… | Debug lỗi lạ, review code, production issue |
| [performance-patterns.md](dotnet/performance-patterns.md) | 1. Span<T> — Zero-copy string/byte proce…, 2. ArrayPool<T> — Reuse buffer trong hot…, 3. ObjectPool<T> — Reuse expensive objec…, 4. Streaming Export — Memory O(1) thay v…, 5. BenchmarkDotNet — Đo thực tế trước kh…, 6. Struct cho short-lived, small data | Memory optimization, hot path, export lớn |

## postgresql/

| File | Sections | Dùng khi |
|------|---------|---------|
| [gotchas.md](postgresql/gotchas.md) | 1. Index bị bỏ qua vì function wrap, 2. NULL trong NOT IN → empty set, 3. TIMESTAMP vs TIMESTAMPTZ, 4. OR giữa columns khác nhau → Seq Scan, 5. LIKE với leading wildcard → full tabl…, 6. COUNT(*) trên large table, 7. Deadlock với concurrent updates | Debug query chậm, data inconsistency |
| [index-patterns.md](postgresql/index-patterns.md) | 1. Composite Index — Thứ tự column, 2. Partial Index — Chỉ 5% rows, size ~5%…, 3. Covering Index (INCLUDE) — Index Only…, 4. Functional Index — Query có function …, 5. GIN Index — Array, JSONB, Full-text, 6. BRIN — Time-series, append-only (1% s…, 7. Index Monitoring, 8. CREATE INDEX CONCURRENTLY — Productio… | Index strategy, performance tuning, production |
| [query-patterns.md](postgresql/query-patterns.md) | 1. Keyset Pagination (thay OFFSET), 2. Upsert với ON CONFLICT, 3. Window Function — Ranking, 4. Aggregation với FILTER (thay nhiều su…, 5. CTE — Complex query + MoM growth, 6. Batch delete (tránh lock lâu + replic…, 7. SKIP LOCKED — Job queue pattern, 8. JSONB Query, 9. Recursive CTE — Hierarchical data, 10. Multi-row UPDATE từ VALUES (1 round … | Query design, pagination, reporting, job queue |

## rabbitmq/

| File | Sections | Dùng khi |
|------|---------|---------|
| [patterns.md](rabbitmq/patterns.md) | 1. Outbox Pattern với EF Core, 2. Consumer Idempotent với Inbox, 3. Retry + Dead Letter Queue, 4. Republish từ DLQ | Message queue, event-driven, reliability |

## redis/

| File | Sections | Dùng khi |
|------|---------|---------|
| [patterns.md](redis/patterns.md) | 1. Cache-Aside với lock tránh stampede, 2. Distributed Lock — Lua script atomic …, 3. Rate Limiting — Fixed window, 4. Pub/Sub — Cache invalidation | Cache strategy, distributed lock, rate limit |

---

## Thống kê

| Category | Files | Tổng sections |
|----------|-------|--------------|
| dotnet | 4 | 35 |
| postgresql | 3 | 25 |
| rabbitmq | 1 | 4 |
| redis | 1 | 4 |
| **Total** | **9** | **68** |

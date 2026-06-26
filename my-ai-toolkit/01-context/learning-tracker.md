# Learning Tracker
> Theo dõi hành trình học — AI có thể dùng file này để hiểu bạn đang ở đâu
> và tránh giải thích thứ bạn đã biết hoặc bỏ qua thứ bạn chưa biết.
>
> Cập nhật khi: học xong một topic, phát hiện insight mới, hoặc thay đổi priority.

---

## AI & Tooling — Hành trình hiện tại

### Đã nắm vững ✅
- Dùng Claude trực tiếp qua chat — prompt engineering cơ bản
- Khái niệm RAG, prompt library, context injection
- Claude Code CLI cơ bản

### Đang học 🟡
- Xây dựng portable AI toolkit (my-ai-toolkit — đây là project hiện tại)
- Làm việc với AI agent theo workflow có cấu trúc
- CLAUDE.md — cách viết để AI follow convention tốt nhất

### Muốn học tiếp 📋
- MCP (Model Context Protocol) — kết nối AI với tools (Jira, GitHub, DB)
- Claude Code nâng cao: custom commands, sub-agents
- Tự build .NET AI agent với Semantic Kernel hoặc SDK trực tiếp
- RAG với pgvector — build knowledge base từ codebase

---

## .NET / C# — Deep Dives

### Đã nắm vững ✅
- EF Core: tracking, projection, migration, bulk operations
- LINQ to SQL: query translation, IQueryable vs IEnumerable
- Async/await: cancellation, ConfigureAwait, Task.WhenAll
- Clean Architecture + CQRS + MediatR
- FluentValidation, AutoMapper (biết nhưng hạn chế dùng AutoMapper)

### Đang học / củng cố 🟡
- Memory optimization: Span<T>, ArrayPool, object pooling
- IAsyncEnumerable cho streaming data
- Benchmark với BenchmarkDotNet

### Muốn học tiếp 📋
- Source Generator
- Native AOT compilation trade-offs
- .NET Aspire (orchestration cho dev environment)

---

## PostgreSQL — Deep Dives

### Đã nắm vững ✅
- Index design: B-tree, partial index, composite index
- EXPLAIN ANALYZE: đọc execution plan cơ bản
- Window functions, CTE
- Partitioning theo range

### Đang học / củng cố 🟡
- Advanced execution plan: buffer hits, cost estimation, planner hints
- Locking: row-level, advisory lock, deadlock prevention
- VACUUM, autovacuum tuning, table bloat

### Muốn học tiếp 📋
- pgvector cho AI use cases
- Logical replication
- Connection pooling deep dive (PgBouncer vs Npgsql pooling)

---

## Architecture & System Design

### Đã nắm vững ✅
- Clean Architecture, SOLID
- CQRS, Event-driven với RabbitMQ + MassTransit
- Cache-aside pattern với Redis
- Outbox pattern cho reliable messaging

### Muốn học tiếp 📋
- Saga pattern cho distributed transaction
- Event sourcing (hiểu concept, chưa implement thực tế)
- CQRS với separate read/write DB

---

## Insights & Lessons Learned

> Format: [YYYY-MM-DD] — Insight (context nếu cần)

- [2026-06] — Toolkit portable quan trọng hơn tích lũy code snippets đơn thuần. Context mới là thứ AI cần, không phải chỉ boilerplate.
- [2026-06] — Session-starter + CLAUDE.md giải quyết 80% vấn đề "AI không biết gì về project của tôi"
- [Thêm vào khi có insight mới]

---

## Resources đang theo dõi

| Resource | Type | Status | Ghi chú |
|----------|------|--------|---------|
| Anthropic docs (docs.claude.com) | Docs | Active | MCP, Claude Code |
| [Thêm book/course/blog] | | | |

# My Developer Profile
<!-- Long-term AI memory. Update when stack/level/prefs change. -->

## Identity
- **Name:** Tuan Nguyen | **Role:** Backend Developer | **Company:** sw.innova
- **Level:** Mid-Senior — treat as senior-to-senior, no tutoring

## Tech Stack

| Layer | Technology |
|---|---|
| Language | C# (.NET 8) |
| Web | ASP.NET Core |
| ORM | EF Core 8 |
| Pattern | Clean Architecture + CQRS + MediatR |
| DB | PostgreSQL (prod), SQLite (integration test) |
| Cache | Redis — StackExchange.Redis |
| MQ | RabbitMQ — MassTransit |
| Auth | JWT + ASP.NET Core Identity |
| Test | xUnit + Moq + FluentAssertions |
| Container | Docker |
| Frontend | React/JS/HTML/CSS (can read/review, not primary) |

## Strengths — Skip explaining these
Clean Architecture, SOLID, DI · EF Core tracking/projection/N+1/migration · LINQ-to-SQL query translation · PostgreSQL execution plans/index design/locking/partitioning · Async/await + CancellationToken + IAsyncEnumerable · Performance profiling/bottleneck analysis · Streaming/batching/parallel for large data

## Working Philosophy
- Production-first: code must work under real load, not just run
- Root cause over patch
- Trade-off aware — no silver bullet
- Simplicity > clever complexity
- AI accelerates, doesn't replace thinking

## AI Interaction Rules

**Do:**
- Skip basic concept explanations (async/await, DI, SOLID, CQRS)
- Give specific numbers for performance claims (estimates OK)
- Proactively warn on gotchas/risks even if not asked
- Suggest alternative if my approach is flawed — don't just comply
- Write complete code — no `// ... existing code`

**Don't:**
- Explain basic concepts
- Use pseudocode — real C# or no code
- List 5 options and say "up to you" — recommend 1 with reason
- Repeat my question before answering
- End with "Let me know if you need anything"

## Red Flags — Warn when generating these

| Pattern | Issue |
|---|---|
| `virtual` nav property | Lazy loading risk — comment required |
| `.ToList()` before filter | Should filter on IQueryable |
| `.Result` / `.Wait()` | Deadlock risk on async |
| `catch (Exception ex) { }` | Empty/overly broad catch |
| `new HttpClient()` | Use IHttpClientFactory |
| Hardcoded connection string/secret/magic number | Config violation |
| Async method missing `CancellationToken` | Missing cancellation support |
| `Thread.Sleep` | Use `Task.Delay` |

## Language
Reply in **Vietnamese**. Code and technical terms stay in English.

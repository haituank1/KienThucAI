# Team Conventions — [PROJECT NAME]

> Những convention riêng của project/team, KHÁC hoặc THÊM so với base conventions trong `02-rules/`.
> AI cần biết file này để generate code đúng với codebase.
> Điền khi onboard, cập nhật khi team thay đổi convention.

---

## Code Style Overrides

> Những gì project này làm khác với `02-rules/base-conventions.md`

```
[Để trống nếu follow base conventions hoàn toàn]

Hoặc ví dụ:
- Dùng var thay vì explicit type (project prefer terse syntax)
- Không dùng file-scoped namespace (team chưa adopt C# 10 style)  
- Method naming: Get[Entity]s (plural) thay vì List[Entity] (team convention cũ)
```

---

## Architecture Decisions (ADR summary)

> Những quyết định kiến trúc quan trọng — tóm tắt từ `04-specs/ADR_*.md`

| Decision | Tại sao | Since |
|----------|---------|-------|
| [Dùng Dapper cho reporting] | [EF Core không đủ flexible cho complex reporting query] | [2024-01] |
| [Không dùng AutoMapper] | [Team muốn explicit, tránh magic mapping] | [2023-06] |
| [Outbox pattern cho events] | [Consistency giữa DB write và event publish] | [2024-03] |

---

## Naming Project-Specific

```
Feature naming: [vd: "Features/Orders/Commands/CreateOrder/"]
Command suffix: [Command / UseCase / Request — team convention]
DTO suffix: [Dto / Response / Model]
Repository naming: [IOrderRepository / IOrderDataAccess]
```

---

## Error Handling Approach

```csharp
// Project này dùng: [Result<T> / Exception / ErrorOr<T> / FluentResults]
// Ví dụ pattern thực tế trong codebase:
[paste 1 ví dụ từ codebase]
```

---

## Testing Approach

| Type | Tool | Coverage target | Notes |
|------|------|----------------|-------|
| Unit | xUnit + Moq | >80% Application layer | - |
| Integration | TestContainers | Key repositories | - |
| E2E | [Playwright / Postman / none] | - | - |

**Conventions:**
- [Test data: fixture class / builder pattern / inline]
- [Shared test infrastructure: [mô tả nếu có WebApplicationFactory setup chung]]
- [Test database: [dedicated / shared / in-memory (avoid)]]

---

## Git Workflow

```
Branch naming:
  feature/TICKET-123-short-description
  fix/TICKET-456-bug-description
  hotfix/TICKET-789-critical-fix
  refactor/improve-order-query-performance
  chore/update-dependencies

Commit message: [Conventional Commits / Free-form]
  feat: add order export to CSV
  fix: correct order status transition logic
  perf: optimize order list query with covering index
  refactor: extract order pricing to value object

PR template: [link nếu có]
Required reviews: [N]
Auto-merge: [on green / manual]
```

---

## Database Conventions

```sql
-- Project này dùng:
-- Table naming: [snake_case / PascalCase]
-- Column naming: [snake_case / camelCase]  
-- Primary key: [uuid / bigserial / identity]
-- Timestamps: [created_at, updated_at / CreatedAt, UpdatedAt]
-- Soft delete: [is_deleted column / deleted_at / separate archive table / none]
-- Tenant: [tenant_id column / separate schema / none]
```

---

## Deployment Notes

```bash
# Pre-deploy checklist
- [ ] Migration reviewed
- [ ] No breaking API change (hoặc đã notify frontend team)
- [ ] Feature flag nếu cần gradual rollout
- [ ] Rollback plan ready

# Deploy command
[paste actual deploy command / pipeline name]

# Verify deploy
[curl command hoặc health check URL]
```

---

## Useful Internal Links

| Resource | URL / Path |
|----------|-----------|
| Jira board | [link] |
| Architecture doc | [link] |
| Runbook | [link] |
| Monitoring | [link] |
| Staging | [link] |
| Production | [link] |
| CI/CD Pipeline | [link] |

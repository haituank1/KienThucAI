# Workflow: Implement Feature Mới

> Workflow chuẩn từ nhận ticket → merge PR.
> Estimated time per phase ghi để bạn time-box.

---

## Phase 0 — Prepare (5 phút)

```bash
# 1. Sync main
git checkout main && git pull

# 2. Check CLAUDE.md còn up-to-date không
cat CLAUDE.md

# 3. Tạo branch
git checkout -b feature/[TICKET-123]-[short-description]
```

---

## Phase 1 — Spec & Design (15-30 phút)

**Nếu feature < S:** Skip spec, đi thẳng vào code.

**Nếu feature >= M:**

Dùng Claude Code hoặc paste vào Claude chat:
```
/spec [paste Jira ticket description]
```

Hoặc dùng `03-prompts/session-starters/new-feature.md`.

**Hỏi Claude TRƯỚC khi code:**
- Approach nào → discuss trade-off
- Schema thay đổi gì → plan migration
- Risk gì → mitigate trước

**→ Approve approach trước, rồi mới implement.**

---

## Phase 2 — Implement (bulk of time)

**Thứ tự layer — luôn theo chiều này:**

```
1. Domain
   ├── Entity methods (business logic)
   ├── Value Objects
   └── Domain Events

2. Application
   ├── Command / Query record
   ├── Handler
   ├── Validator (FluentValidation)
   └── DTO

3. Infrastructure
   ├── Repository implementation
   ├── EF Core config (nếu cần)
   ├── Migration
   └── External service client

4. API
   ├── Controller endpoint
   └── DI registration
```

**Prompt per layer:**
> "Implement [Domain/Application/Infrastructure/API] layer cho feature [tên].
> Follow CLAUDE.md conventions. Stack: .NET 8, EF Core 8, PostgreSQL."

**Sau mỗi layer:**
```bash
dotnet build  # verify compile
```

---

## Phase 3 — Test (20-30% total time)

```bash
# Chạy tests
dotnet test --filter "FullyQualifiedName~[FeatureName]"

# Xem coverage
dotnet test --collect:"XPlat Code Coverage"
```

**Generate tests nếu chưa có:**
```
/test [ClassName]
```

**Must cover:**
- Happy path
- Business rule violations
- Not found / validation error

---

## Phase 4 — Self Review (10 phút)

```bash
# Xem diff
git diff main...HEAD

# Claude review
/review
```

**Mental checklist:**
- [ ] N+1 query? (check EF Core log: `EnableSensitiveDataLogging()` trong dev)
- [ ] CancellationToken pass đúng chưa?
- [ ] Migration cần `CONCURRENTLY` không?
- [ ] Sensitive data bị log không?

---

## Phase 5 — PR & Update Toolkit

```bash
git push -u origin HEAD
# Create PR với description rõ ràng
```

**Update toolkit nếu học được gì mới:**
```bash
# Mở toolkit, thêm vào đúng file
# Gotcha mới → 05-snippets/[tech]/gotchas.md
# Pattern mới → 05-snippets/[tech]/[category].md
# Business rule mới → 06-projects/[company]/[project]/project-context.md
```

---

## PR Checklist

```
Code Quality:
- [ ] dotnet build  — không warning
- [ ] dotnet test   — pass
- [ ] /review       — không có Critical

Database:
- [ ] Migration SQL reviewed (không chỉ EF generated code)
- [ ] Index dùng CONCURRENTLY nếu table lớn
- [ ] Down() migration implement đúng

Architecture:
- [ ] Dependency rule không vi phạm
- [ ] Business logic ở đúng layer (Domain)
- [ ] Result<T> thay vì throw exception cho business case

API (nếu có):
- [ ] Response format dùng ApiResponse<T>
- [ ] HTTP status code đúng ngữ nghĩa
- [ ] Input validation đủ

Misc:
- [ ] Không hardcode secret / magic number
- [ ] Log đủ để debug production (correlation ID, key identifiers)
- [ ] CLAUDE.md / project-context.md update nếu cần
```

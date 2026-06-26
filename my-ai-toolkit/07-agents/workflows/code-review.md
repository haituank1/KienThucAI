# Workflow: Code Review

> Workflow khi bạn là REVIEWER — review PR của người khác.
> Mục tiêu: thorough, constructive, không block không cần thiết.

---

## Quick Scan (2-3 phút)

```bash
# Xem tổng quan PR
git fetch origin
git diff origin/main...origin/[branch] --stat

# Số files, lines changed
# Flag ngay nếu: >20 files hoặc >500 lines → yêu cầu tách nhỏ
```

**First impression checklist:**
- [ ] PR description có mô tả "what + why" không?
- [ ] Linked ticket không?
- [ ] Scope hợp lý (không quá lớn, không mix feature + refactor)?

---

## Deep Review với AI

```bash
# Trong Claude Code
git diff origin/main...HEAD | pbcopy  # copy diff

# Paste vào Claude với prompt:
```

> Review PR này. Stack: .NET 8, EF Core 8, PostgreSQL, Clean Architecture.
>
> [PASTE DIFF]
>
> Context: [Mô tả feature / bug fix ngắn gọn]
>
> Tìm theo thứ tự priority:
> 1. Bug / correctness issue
> 2. Performance problem (N+1, memory, locking)
> 3. Architecture violation
> 4. Security concern
> 5. Convention / style

---

## Manual Check — Không thể delegate cho AI

**Business logic:**
- [ ] Logic có đúng với requirement không? (AI không biết business rule)
- [ ] Edge case nào chưa handle?

**Database:**
- [ ] Migration có `CONCURRENTLY` cho index trên bảng lớn?
- [ ] Migration có `Down()` implement không?
- [ ] Generated SQL có N+1 không? (check `.ToQueryString()` trong test/log)

**Security:**
- [ ] Authorization check đúng không? (user chỉ xem data của mình)
- [ ] Input validation đủ chưa?
- [ ] Sensitive data bị expose trong response không?

**Test:**
- [ ] Test coverage tương xứng với thay đổi?
- [ ] Test tên mô tả đủ scenario?
- [ ] Test edge cases quan trọng?

---

## Review Comment Style

**Tiêu chí comment:**
```
🔴 Blocker    — phải fix trước merge (bug, security, arch violation)
🟡 Should fix — nên fix, có thể merge sau khi fix
💡 Suggestion — optional, improvement idea
❓ Question   — cần clarification, không phải issue
👍 Praise     — code tốt, acknowledge it
```

**Format comment tốt:**
```
🔴 N+1 query
Dòng 45: `order.Items` được access trong loop → N+1 queries
Fix: Thêm `.Include(o => o.Items)` hoặc dùng projection với Select

VS

"This is wrong" ← ❌ không constructive
```

---

## Approve Decision

**Approve khi:**
- Không có 🔴 Blocker
- 🟡 issues nhỏ hoặc author đã acknowledge + tạo follow-up ticket
- Logic correct với requirement

**Request Changes khi:**
- Có bất kỳ 🔴 Blocker nào
- Test thiếu cho critical path
- Migration risk cao chưa được address

**Chú ý:**
- Không block PR vì style preference (nếu không vi phạm convention)
- Nếu không chắc → hỏi, đừng assume và block
- Approve + comment nhỏ tốt hơn hold PR lâu

---

## Sau khi Merge

Nếu review phát hiện pattern / gotcha mới → thêm vào toolkit:
```
05-snippets/dotnet/gotchas.md
05-snippets/postgresql/gotchas.md
```

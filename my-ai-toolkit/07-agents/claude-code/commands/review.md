# Claude Code Custom Command: /review

> Đặt file này ở `.claude/commands/review.md` trong project repo
> Dùng: `/review` trong Claude Code

---

Hãy review code changes hiện tại (git diff) theo tiêu chí:

## 1. Correctness
- Logic có đúng không?
- Edge case nào bị miss?
- Null safety?

## 2. Performance
- N+1 query?
- Missing index?
- Memory allocation không cần thiết?
- Blocking async call?

## 3. Architecture
- Đúng layer chưa? (Domain/Application/Infrastructure/API)
- Dependency rule vi phạm?
- Business logic leak ra ngoài Domain?

## 4. Security
- Input validation?
- SQL injection? (raw query)
- Sensitive data logged?

## 5. Conventions
- Async suffix + CancellationToken?
- AsNoTracking() cho read query?
- Projection thay vì full entity load?

**Output format:**
```
## 🔴 Critical
## 🟡 Warning  
## 🟢 Suggestion
```

Nếu không có vấn đề nghiêm trọng, nói rõ: "Code looks good, ready to merge."

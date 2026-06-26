# Claude Code Custom Command: /review

> Đặt file này ở `.claude/commands/review.md` trong project repo.
> Dùng: `/review` trong Claude Code CLI — AI sẽ review `git diff` hiện tại.

---

Review code changes hiện tại theo tiêu chí sau. Stack: .NET 8, EF Core 8, PostgreSQL, Clean Architecture + CQRS.

Chỉ report những gì thực sự có vấn đề. Nếu code clean → nói thẳng "Ready to merge".

**🔴 Critical — Phải fix trước merge:**
- Logic sai / race condition / data corruption risk
- N+1 query ẩn (lazy loading, Select trong loop, missing Include)
- `.Result` / `.Wait()` trên async — deadlock risk
- Exception bị swallow (empty catch hoặc return null silently)
- SQL injection (string concatenation trong raw query)
- Memory leak (event handler không unsubscribe, DbContext không dispose)

**🟡 Warning — Nên fix:**
- Load full entity thay vì projection khi chỉ cần vài field
- Missing `.AsNoTracking()` trên read-only query
- CancellationToken không được pass qua call chain
- Business logic trong Handler/Controller thay vì Domain
- Missing input validation cho public API

**🟠 Architecture:**
- Dependency rule vi phạm (Application import Infrastructure)
- Repository trả về IQueryable ra ngoài Infrastructure
- Business rule nằm sai layer

**🟢 Suggestion — Optional:**
- Readability improvement
- Naming convention
- Test coverage gap

**Format mỗi issue:**
```
[Emoji] [Tên vấn đề]
File: [path], Line ~[N]
Vấn đề: [1 câu]
Fix: [code hoặc hướng fix]
```

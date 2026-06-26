# Claude Code Custom Command: /debug

> Đặt ở `.claude/commands/debug.md`
> Dùng: `/debug` — sau đó mô tả lỗi hoặc paste stack trace

---

Tôi cần debug vấn đề sau. Hãy phân tích theo thứ tự:

**Bước 1 — Xác định root cause**
- Đây là lỗi gì? (logic bug / N+1 / memory / concurrency / config)
- Tại sao xảy ra — cơ chế kỹ thuật

**Bước 2 — Locate**
- File và method nào gây ra?
- Đọc code liên quan trước khi kết luận

**Bước 3 — Fix**
- Fix minimal, ít side effect nhất
- Giải thích tại sao fix này đúng

**Bước 4 — Verify**
- Cách test để confirm fix hoạt động
- Edge case cần check thêm

**Bước 5 — Prevent**
- Thêm test / validation / guard clause gì để không tái phát

---
Context: .NET 8, EF Core 8, PostgreSQL 15, Clean Architecture.

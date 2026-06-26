# Claude Code Custom Command: /debug

> Đặt ở `.claude/commands/debug.md`
> Dùng: `/debug [mô tả lỗi]` — Claude sẽ đọc codebase và debug có hệ thống.

---

Stack: .NET 8, EF Core 8, PostgreSQL 15, Clean Architecture + CQRS.

Debug theo thứ tự này — không skip bước:

**1. Đọc code liên quan TRƯỚC khi đưa ra giả thuyết**
Dùng file tools để đọc: method bị lỗi, dependencies, entity config liên quan.

**2. Xác định root cause**
- Tầng nào gây ra: Domain / Application / Infrastructure / Config / External?
- Cơ chế kỹ thuật: tại sao error xảy ra, không chỉ "sai ở đây"
- Distinguish: bug trong code hay unexpected input?

**3. Fix — Minimal, safe**
- Thay đổi ít nhất có thể
- Không refactor cùng lúc với fix bug
- Giải thích tại sao fix này đúng (không chỉ "đổi X thành Y")

**4. Verify**
- Test cụ thể để confirm fix
- Check không break case nào khác

**5. Prevent**
- Test cho scenario này
- Guard clause / validation nếu cần
- Nếu là gotcha chung → đề xuất thêm vào `05-snippets/*/gotchas.md`

**Format output:**
```
## Root Cause
[1-2 câu kỹ thuật]

## Fix
[Code]

## Verify
[Test / command để confirm]

## Prevent
[Guard / test suggestion]
```

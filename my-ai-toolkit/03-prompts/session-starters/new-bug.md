# Session Starter: Debug Bug

> Copy toàn bộ file này → paste vào đầu session → điền [brackets].

---

## Context cố định (đừng xóa)

Stack: .NET 8, EF Core 8, PostgreSQL 15, Redis, RabbitMQ.
Pattern: Clean Architecture + CQRS + MediatR.

Quy tắc debug:
- Tìm root cause, không chỉ fix symptom
- Giải thích cơ chế kỹ thuật tại sao lỗi xảy ra
- Fix minimal — không refactor cùng lúc với fix bug
- Đề xuất test để verify fix

---

## Bug này

**Mô tả ngắn:** [1 câu — vd: "User không thể cancel order đã paid"]

**Expected behavior:** [điều lẽ ra phải xảy ra]
**Actual behavior:** [điều đang xảy ra]

**Reproduction steps:**
1. [step 1]
2. [step 2]
3. → [Bug xảy ra ở đây]

**Tần suất:** [luôn luôn / ~X% / chỉ khi X / intermittent]
**Environment:** [ ] Dev  [ ] Staging  [ ] Production

---

## Error Information

**Stack trace / Exception:**
```
[PASTE FULL STACK TRACE — bao gồm inner exception nếu có]
```

**Log liên quan:**
```
[PASTE log lines xung quanh lúc xảy ra lỗi — có correlation ID càng tốt]
```

**Request payload (nếu là API bug):**
```json
[PASTE]
```

---

## Code Suspect

```csharp
[PASTE — include full method, constructor, bất kỳ dependency nào liên quan]
```

**Entity / DB config liên quan (nếu là EF Core bug):**
```csharp
[PASTE]
```

---

## Đã thử

- [điền hoặc "chưa thử gì, cần hướng dẫn"]

---

## Tôi muốn

Phân tích theo thứ tự:
1. Root cause — không phải list mọi khả năng, tập trung vào probable cause nhất
2. Cơ chế kỹ thuật — tại sao bug xảy ra (không chỉ "đây là lỗi")
3. Fix — code cụ thể, minimal change
4. Verify — test / query để confirm fix đúng
5. Prevent — guard / test / validation gì để không tái phát

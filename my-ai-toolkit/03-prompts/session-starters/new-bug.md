# Session Starter: Debug Bug

Stack: .NET 8, EF Core 8, PostgreSQL 15, Redis, RabbitMQ. Pattern: Clean Architecture + CQRS + MediatR.

Quy tắc: Tìm root cause không chỉ symptom | Giải thích cơ chế kỹ thuật | Fix minimal — không refactor cùng lúc | Đề xuất test verify.

---

## Bug này

**Mô tả:** [1 câu — vd: "User không thể cancel order đã paid"]

**Expected:** [điều lẽ ra xảy ra]
**Actual:** [điều đang xảy ra]

**Reproduction:**
1. [step 1]
2. [step 2]
3. → [Bug xảy ra ở đây]

**Tần suất:** [luôn / ~X% / chỉ khi X / intermittent]
**Environment:** [ ] Dev  [ ] Staging  [ ] Production

---

## Error Information

**Stack trace:**
```
[PASTE FULL — bao gồm inner exception]
```

**Log liên quan:**
```
[PASTE log xung quanh lúc xảy ra — có correlation ID càng tốt]
```

**Request payload (nếu API bug):**
```json
[PASTE]
```

---

## Code Suspect

```csharp
[PASTE — full method + constructor + dependencies liên quan]
```

**Entity / DB config (nếu EF Core bug):**
```csharp
[PASTE]
```

**Đã thử:** [điền hoặc "chưa thử gì"]

---

Phân tích: 1) Root cause — probable cause nhất. 2) Cơ chế kỹ thuật — tại sao xảy ra. 3) Fix — code cụ thể, minimal. 4) Verify — test / query confirm fix. 5) Prevent — guard / test / validation.

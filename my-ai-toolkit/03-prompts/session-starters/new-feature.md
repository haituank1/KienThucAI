# Session Starter: Implement Feature Mới

> Copy toàn bộ file này → paste vào đầu session → điền [brackets].
> Sau khi paste xong, nói: "Đọc xong rồi. Tôi muốn bắt đầu."

---

## Context cố định (đừng xóa)

Stack: .NET 8, ASP.NET Core, EF Core 8, PostgreSQL 15, Redis, RabbitMQ (MassTransit).
Pattern: Clean Architecture + CQRS + MediatR. Test: xUnit + Moq + FluentAssertions.

Quy tắc:
- Code production-ready: CancellationToken, error handling, logging đúng chỗ
- Projection + AsNoTracking cho mọi read query
- Result<T> thay vì throw exception cho business error
- Cảnh báo proactive nếu thấy N+1, memory, locking risk

---

## Feature này

**Tên feature:** [ngắn gọn — vd: "Export báo cáo doanh thu ra Excel"]

**Mô tả:**
[2-3 câu — user làm gì, hệ thống làm gì, output là gì]

**Acceptance Criteria:**
- [ ] [criterion 1 — cụ thể, testable]
- [ ] [criterion 2]
- [ ] [criterion 3]

**Input:**
```
[API request body / event payload / trigger — với ví dụ cụ thể]
```

**Output:**
```
[API response / file / side effect — với ví dụ cụ thể]
```

---

## Technical Context

**Tables/Entities liên quan:**
```csharp
// Entity hoặc mô tả schema
[PASTE hoặc mô tả ngắn]
```

**Existing code tham khảo (nếu có pattern tương tự):**
```csharp
// Pattern đã dùng trong project, AI follow theo
[PASTE NẾU CÓ]
```

**Constraints:**
- Performance: [vd: "phải respond <500ms", "export 1M rows không OOM"]
- Scale: [vd: "~5K requests/day", "table có 50M rows"]
- Backward compat: [có / không cần]
- DB migration: [cho phép / không cho phép (production freeze)]

---

## Cách tôi muốn làm việc trong session này

1. **Propose approach trước** (không code ngay) — 1 paragraph + diagram ASCII nếu cần
2. **Tôi approve** (hoặc feedback)
3. **Implement theo thứ tự layer:** Domain → Application → Infrastructure → API
4. **Sau mỗi layer** — bạn tự review trước khi đưa tôi
5. **Sau khi code xong** — suggest unit test cases cho phần quan trọng nhất

Nếu tôi nói "đi thẳng vào code" — bỏ bước 1-2, implement thẳng nhưng vẫn theo layer order.

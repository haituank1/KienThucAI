# Session Starter: Implement Feature Mới

Stack: .NET 8, ASP.NET Core, EF Core 8, PostgreSQL 15, Redis, RabbitMQ (MassTransit).
Pattern: Clean Architecture + CQRS + MediatR. Test: xUnit + Moq + FluentAssertions.

Quy tắc: CancellationToken + error handling + logging đúng chỗ | Projection + AsNoTracking cho mọi read | Result<T> thay vì throw cho business error | Cảnh báo proactive nếu thấy N+1 / memory / lock risk.

---

## Feature này

**Tên:** [ngắn gọn]

**Mô tả:** [2-3 câu — user làm gì, hệ thống làm gì, output là gì]

**Acceptance Criteria:**
- [ ] [criterion 1 — cụ thể, testable]
- [ ] [criterion 2]

**Input:**
```
[API request / event payload / trigger — ví dụ cụ thể]
```

**Output:**
```
[API response / file / side effect — ví dụ cụ thể]
```

---

## Technical Context

**Tables/Entities:**
```csharp
[PASTE entity hoặc mô tả schema]
```

**Existing pattern tham khảo (nếu có):**
```csharp
[PASTE — AI follow theo]
```

**Constraints:**
- Performance: [vd: "<500ms", "export 1M rows không OOM"]
- Scale: [vd: "~5K req/day", "table 50M rows"]
- Backward compat: [có / không]
- DB migration: [cho phép / không]

---

## Cách làm trong session này

1. Propose approach trước (không code ngay) — 1 đoạn + ASCII diagram nếu cần
2. Tôi approve / feedback
3. Implement theo layer: Domain → Application → Infrastructure → API
4. Sau mỗi layer — tự review trước khi đưa tôi
5. Sau khi xong — suggest unit test cases cho phần quan trọng nhất

Nếu tôi nói "đi thẳng vào code" — bỏ bước 1-2, implement thẳng nhưng vẫn theo layer order.

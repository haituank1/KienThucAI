# Session Starter: Onboarding Project Mới

> Dùng trong tuần đầu tiên của project mới / công ty mới.
> Giúp AI hiểu nhanh codebase để hỗ trợ tốt hơn.

---

## Context cố định (đừng xóa)

Stack của tôi: .NET 8, EF Core 8, PostgreSQL, Clean Architecture + CQRS.
Tôi là mid-senior dev — không cần giải thích basic, focus vào cái đặc thù của project này.

---

## Project mới này

**Tên:** [Project / Company name]
**Domain:** [E-commerce / Fintech / Healthcare / SaaS / ...]
**Scale:** ~[N] users, ~[N] req/day, DB ~[N] rows trên table lớn nhất

**Tech stack thực tế (có thể khác stack quen của tôi):**
- Framework: [.NET version / Node / ...]
- ORM: [EF Core / Dapper / raw SQL]
- DB: [PostgreSQL version + schema name]
- Cache: [Redis / Memory / không có]
- Queue: [RabbitMQ / Kafka / không có]
- Auth: [JWT / Cookie / OAuth2 / ...]
- Deploy: [Docker / K8s / VM / ...]

**Folder structure:**
```
[PASTE output của: find src -type d | head -40]
```

**Entities chính (paste 2-3 entity quan trọng nhất):**
```csharp
[PASTE]
```

**Pain points tôi đã nhận ra:**
- [vd: "query chậm trên bảng orders 50M rows"]
- [vd: "code không có test"]
- [vd: "không rõ convention — mỗi người code một kiểu"]

---

## Task đầu tiên tôi cần làm

[Mô tả task — ticket đầu tiên, bug cần fix, hoặc feature cần implement]

---

## Tôi muốn bạn

Trong session này:
1. Hỏi tôi nếu thiếu context quan trọng trước khi đề xuất gì
2. Adapt theo tech stack thực tế của project (không phải stack quen của tôi)
3. Khi thấy code smell / antipattern trong codebase → mention nhưng không refactor nếu tôi không yêu cầu
4. Ưu tiên approach "fit với codebase hiện tại" hơn là "cách tốt nhất về mặt lý thuyết"

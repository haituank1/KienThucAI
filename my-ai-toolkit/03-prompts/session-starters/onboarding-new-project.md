# Session Starter: Onboarding Project Mới

Stack của tôi: .NET 8, EF Core 8, PostgreSQL, Clean Architecture + CQRS.
Level: mid-senior dev — không cần giải thích basic, focus vào đặc thù project này.

---

## Project này

**Tên:** [Project / Company name]
**Domain:** [E-commerce / Fintech / Healthcare / SaaS / ...]
**Scale:** ~[N] users | ~[N] req/day | DB ~[N] rows trên table lớn nhất

**Tech stack thực tế:**
- Framework: [.NET version / Node / ...]
- ORM: [EF Core / Dapper / raw SQL]
- DB: [PostgreSQL version]
- Cache: [Redis / Memory / không]
- Queue: [RabbitMQ / Kafka / không]
- Auth: [JWT / Cookie / OAuth2]
- Deploy: [Docker / K8s / VM]

**Folder structure:**
```
[PASTE: find src -type d | head -40]
```

**Entities chính:**
```csharp
[PASTE 2-3 entity quan trọng nhất]
```

**Pain points đã nhận ra:**
- [vd: "query chậm trên bảng orders 50M rows"]
- [vd: "không có test"]

---

## Task đầu tiên

[Mô tả task / ticket / bug / feature]

---

## Trong session này

1. Hỏi nếu thiếu context quan trọng trước khi đề xuất
2. Adapt theo tech stack thực tế (không phải stack quen của tôi)
3. Nếu thấy code smell → mention nhưng không refactor nếu tôi không yêu cầu
4. Ưu tiên "fit với codebase hiện tại" hơn "cách tốt nhất lý thuyết"

# Thiết kế API

Stack: ASP.NET Core .NET 8.

---

## Design API mới

**Feature:** [tên] — [mô tả 2-3 câu]

**Actors:**
- [ ] Web frontend (React)
- [ ] Mobile app
- [ ] Internal service / worker
- [ ] Third-party / public

**Use cases:** 1) [Use case 1]  2) [Use case 2]

**Business rules:** [rule 1] | [rule 2]

**Non-functional:** Auth [JWT/API Key/None] | Rate limiting [có/không] | Versioning [v1/không] | Pagination [cursor/offset/không]

Đề xuất:

1. **Endpoints:**
   ```
   POST   /api/v1/[resource]
   GET    /api/v1/[resource]/{id}
   ```

2. **Request/Response schema** cho từng endpoint:
   ```json
   // Request
   { }
   // Response 200/201
   { }
   // Response 4xx
   { }
   ```

3. **Error handling** — status code cho từng failure

4. **Những gì có thể bỏ sót** — edge case, security concern, breaking change risk

---

## Review API contract

```
[OpenAPI YAML / JSON / mô tả endpoint]
```

**Consumers:** [frontend / mobile / internal / public]

Tìm: 1) Breaking change risk. 2) Inconsistency (naming/casing/error format). 3) Missing validation. 4) Security gap (auth thiếu / over-expose data). 5) API design smell (verb trong URL, wrong status code). 6) Versioning concern.

---

## Pagination + Filtering

**Resource:** [tên] | Data ~[N] records, [X] columns | Consumer [web/mobile/internal]

Hãy design:
1. **Query params** — naming, types, defaults
2. **Response format** — metadata (total, pages, hasNext, ...)
3. **Keyset vs Offset** — recommend + lý do
4. **Filter design** — `?status=active` vs complex DSL
5. **Sort design** — `?sortBy=createdAt&sortDir=desc`
6. **EF Core implementation** — LINQ cho dynamic filter + sort
7. **Index** cần có

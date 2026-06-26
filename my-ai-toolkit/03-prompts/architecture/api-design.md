# Prompt: Thiết kế API

---

## TEMPLATE 1 — Design API mới cho feature

Tôi cần thiết kế REST API cho [tên feature]. Stack: ASP.NET Core .NET 8.

**Feature description:**
[Mô tả 2-3 câu]

**Actors (ai gọi API này):**
- [ ] Web frontend (React)
- [ ] Mobile app
- [ ] Internal service / worker
- [ ] Third-party / public API

**Use cases chính:**
1. [Use case 1]
2. [Use case 2]
3. [Use case 3]

**Business rules quan trọng:**
- [rule 1]
- [rule 2]

**Non-functional:**
- Authentication: [JWT / API Key / None]
- Rate limiting: [có / không]
- Versioning: [v1 / không cần]
- Pagination: [cursor / offset / không cần]

Hãy đề xuất:

1. **Endpoints** — method, path, brief description
   ```
   POST   /api/v1/[resource]
   GET    /api/v1/[resource]/{id}
   ...
   ```

2. **Request/Response schema** cho từng endpoint
   ```json
   // Request
   { }
   // Response 200
   { }
   // Response 4xx
   { }
   ```

3. **Error handling** — status code cho từng failure scenario

4. **Điều tôi có thể bỏ sót** — edge case, security concern, breaking change risk

---

## TEMPLATE 2 — Review API contract hiện tại

Review API contract sau trước khi release.

**API spec:**
```
[OpenAPI YAML / JSON / hoặc mô tả endpoint-by-endpoint]
```

**Consumers:** [frontend / mobile / internal / public]

Tìm vấn đề:
1. **Breaking change risk** — thứ gì sẽ break consumer khi thay đổi?
2. **Inconsistency** — naming / casing / error format không đồng nhất
3. **Missing validation** — input nào có thể gây lỗi nếu không validate?
4. **Security gap** — endpoint nào thiếu auth / over-expose data?
5. **API design smell** — verb trong URL, wrong status code, ...)
6. **Versioning concern** — endpoint nào sẽ khó version sau này?

---

## TEMPLATE 3 — Design pagination + filtering

Tôi cần implement pagination + filtering + sorting chuẩn cho resource [tên].

**Data:** ~[N] records, [X] columns, [complex filter / simple filter]
**Consumer:** [web / mobile / internal]

Hãy design:
1. **Query parameter convention** — naming, types, defaults
2. **Response format** — metadata (total, pages, hasNext, ...)
3. **Keyset vs Offset** — recommend cái nào cho case này và tại sao
4. **Filter design** — simple `?status=active` vs complex filter DSL
5. **Sort design** — `?sortBy=createdAt&sortDir=desc`
6. **EF Core implementation** — LINQ code cho dynamic filter + sort
7. **Index** cần có để support filter/sort patterns

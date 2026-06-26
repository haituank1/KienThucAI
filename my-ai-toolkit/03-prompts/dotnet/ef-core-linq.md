# Prompt: EF Core / LINQ Query Help

---

## TEMPLATE 1 — Viết LINQ query từ requirement

Viết EF Core LINQ query cho requirement sau.

**Requirement:**
[Mô tả rõ ràng — vd: "lấy 20 orders mới nhất của customer X, kèm tên product và tổng tiền, chỉ lấy orders đã paid hoặc shipped"]

**Entities liên quan:**
```csharp
[PASTE Entity classes hoặc DbContext config]
```

**Expected output DTO:**
```csharp
[PASTE DTO mình muốn nhận]
```

**Performance requirement:**
- [ ] Phải dùng AsNoTracking (read-only)
- [ ] Phải dùng projection (không load full entity)
- [ ] Kết quả phải paginated
- [ ] Phải pass CancellationToken

Hãy:
1. Viết LINQ query đúng yêu cầu
2. Paste SQL sẽ được generate (dùng `.ToQueryString()` comment)
3. Chỉ ra index nào cần có để query này chạy hiệu quả
4. Warn nếu có N+1 risk hoặc client-side evaluation

---

## TEMPLATE 2 — Debug LINQ bị sai hoặc chậm

LINQ query này cho kết quả sai / chậm hơn mong đợi.

**LINQ:**
```csharp
[PASTE]
```

**Generated SQL (lấy bằng .ToQueryString() hoặc log):**
```sql
[PASTE]
```

**Entity config:**
```csharp
[PASTE IEntityTypeConfiguration]
```

**Vấn đề:**
- [ ] Kết quả sai (expected vs actual: [mô tả])
- [ ] N+1 (N+1 queries thay vì 1 query)
- [ ] Client-side evaluation (xử lý ở C# thay vì SQL)
- [ ] Cartesian explosion (nhiều rows trùng do Include nhiều collection)
- [ ] Query chậm bất thường

Phân tích:
1. Root cause — tại sao query behave sai / chậm?
2. Fix LINQ + generated SQL sau fix
3. Nếu LINQ không express được → raw SQL approach

---

## TEMPLATE 3 — Convert raw SQL → LINQ hoặc ngược lại

**Hướng:** [ ] SQL → LINQ | [ ] LINQ → SQL tốt hơn

**SQL gốc:**
```sql
[PASTE]
```

**Hoặc LINQ gốc:**
```csharp
[PASTE]
```

**Entity context:**
```csharp
[PASTE]
```

Yêu cầu:
- Giữ nguyên logic hoàn toàn
- Nếu LINQ không express được SQL efficiently → dùng raw SQL với typed result (EF Core 8)
- Show SQL được generate sau convert để verify

---

## TEMPLATE 4 — Complex aggregation / reporting query

Cần viết query aggregation phức tạp bằng EF Core / LINQ.

**Business requirement:**
[Mô tả rõ — vd: "doanh thu theo tháng, group by danh mục sản phẩm, chỉ lấy tháng có doanh thu > 10M, sort theo doanh thu giảm dần"]

**Tables liên quan:**
```sql
[Mô tả schema hoặc paste DDL]
```

**DTO expected:**
```csharp
[PASTE]
```

Hãy:
1. LINQ query nếu EF Core translate được tốt
2. Raw SQL typed query (EF Core 8) nếu LINQ không đủ mạnh
3. Index cần có
4. Ước lượng performance với [N] rows

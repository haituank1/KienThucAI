# EF Core / LINQ Query

---

## Viết LINQ từ requirement

**Requirement:**
[Mô tả — vd: "lấy 20 orders mới nhất của customer X, kèm tên product và tổng tiền, chỉ orders đã paid/shipped"]

**Entities:**
```csharp
[PASTE Entity classes hoặc DbContext config]
```

**Expected DTO:**
```csharp
[PASTE]
```

**Performance:**
- [ ] AsNoTracking (read-only)
- [ ] Projection (không load full entity)
- [ ] Paginated
- [ ] Pass CancellationToken

Hãy: 1) LINQ query đúng yêu cầu. 2) SQL generated (`.ToQueryString()` comment). 3) Index cần có. 4) Warn nếu N+1 risk / client-side evaluation.

---

## Debug LINQ sai / chậm

**LINQ:**
```csharp
[PASTE]
```

**Generated SQL:**
```sql
[PASTE]
```

**Entity config:**
```csharp
[PASTE IEntityTypeConfiguration]
```

**Vấn đề:**
- [ ] Kết quả sai (expected vs actual: [mô tả])
- [ ] N+1
- [ ] Client-side evaluation
- [ ] Cartesian explosion
- [ ] Query chậm bất thường

Phân tích: 1) Root cause. 2) Fix LINQ + SQL sau fix. 3) Nếu LINQ không express được → raw SQL.

---

## Convert SQL ↔ LINQ

**Hướng:** [ ] SQL → LINQ | [ ] LINQ → SQL tốt hơn

**SQL:**
```sql
[PASTE]
```

**Hoặc LINQ:**
```csharp
[PASTE]
```

**Entity context:**
```csharp
[PASTE]
```

- Giữ nguyên logic hoàn toàn
- Nếu LINQ không efficient → raw SQL typed result (EF Core 8)
- Show SQL generated để verify

---

## Complex aggregation / reporting

**Requirement:**
[Mô tả — vd: "doanh thu theo tháng, group by danh mục, chỉ tháng > 10M, sort giảm dần"]

**Tables:**
```sql
[DDL hoặc mô tả schema]
```

**DTO:**
```csharp
[PASTE]
```

Hãy: 1) LINQ nếu EF Core translate tốt. 2) Raw SQL typed query (EF Core 8) nếu LINQ không đủ. 3) Index cần có. 4) Ước lượng performance với [N] rows.

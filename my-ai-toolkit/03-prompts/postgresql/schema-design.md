# Prompt: Thiết kế Schema PostgreSQL

---

## TEMPLATE 1 — Design schema mới

Tôi cần thiết kế PostgreSQL schema cho [tên feature / domain].

**Business requirement:**
- [req 1]
- [req 2]
- [req 3]

**Entities và relationship (mô tả ngắn):**
- [Entity A] có [quan hệ gì] với [Entity B]
- [Entity C] là [optional / required]

**Query patterns chính (quan trọng nhất):**
1. [Query 1 — vd: "lấy tất cả orders của customer, filter theo status, sort theo ngày"]
2. [Query 2 — vd: "tổng doanh thu theo tháng, group by product category"]
3. [Query 3]

**Scale estimate:**
- Writes: ~[N] records/ngày
- Total rows sau 1 năm: ~[N]
- Concurrent reads: ~[N] requests/s

**Existing tables liên quan (nếu có):**
```sql
[PASTE DDL hoặc mô tả]
```

Hãy đề xuất:
1. **Schema DDL** — với data types đúng (TIMESTAMPTZ, NUMERIC, UUID, JSONB, ...)
2. **Indexes** — loại index, lý do, thứ tự column
3. **Constraints** — NOT NULL, CHECK, UNIQUE, FK
4. **Partitioning** nếu cần (khi nào, theo column nào)
5. **Những gì tôi có thể regret** nếu không thiết kế đúng từ đầu

---

## TEMPLATE 2 — Review schema hiện tại

Review PostgreSQL schema sau cho tôi. Tìm vấn đề trước khi production.

**Schema hiện tại:**
```sql
[PASTE DDL]
```

**Query patterns sẽ có:**
- [query 1]
- [query 2]

**Scale dự kiến:**
- [N] rows, [N] writes/ngày

Hãy tìm:
1. **Missing index** — query nào sẽ chậm?
2. **Wrong data type** — sẽ gây vấn đề gì?
3. **Missing constraint** — data integrity risk?
4. **Schema antipattern** — EAV, JSON overuse, polymorphic association...
5. **Migration nightmare** — thứ gì khó thay đổi sau khi có data?

---

## TEMPLATE 3 — Thiết kế cho soft delete + multi-tenancy

Tôi cần implement soft delete + multi-tenancy cho bảng [tên bảng].

**Requirement:**
- Soft delete: record không bị xóa thật, chỉ đánh dấu
- Multi-tenancy: mỗi tenant chỉ thấy data của mình
- Audit trail: biết ai xóa, ai sửa, lúc nào

**Current table:**
```sql
[PASTE DDL]
```

Hãy đề xuất:
1. Schema changes cần thiết
2. Index strategy (partial index cho non-deleted, tenant-aware)
3. EF Core Global Query Filter setup
4. Trade-off: soft delete vs archive table vs partition

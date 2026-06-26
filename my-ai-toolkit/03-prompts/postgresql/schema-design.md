# Thiết kế Schema PostgreSQL

---

## Design schema mới

Thiết kế PostgreSQL schema cho [tên feature / domain].

**Business requirement:**
- [req 1]
- [req 2]

**Entities và relationship:**
- [Entity A] có [quan hệ] với [Entity B]

**Query patterns chính:**
1. [Query 1 — vd: "lấy orders của customer, filter theo status, sort theo ngày"]
2. [Query 2]

**Scale:** Writes ~[N]/ngày | Rows sau 1 năm ~[N] | Concurrent reads ~[N] req/s

**Existing tables (nếu có):**
```sql
[PASTE DDL]
```

Đề xuất: 1) Schema DDL (types đúng: TIMESTAMPTZ, NUMERIC, UUID, JSONB). 2) Indexes + lý do + thứ tự column. 3) Constraints (NOT NULL, CHECK, UNIQUE, FK). 4) Partitioning nếu cần. 5) Những gì có thể regret nếu không thiết kế đúng từ đầu.

---

## Review schema hiện tại

```sql
[PASTE DDL]
```

**Query patterns:**
- [query 1]

**Scale:** [N] rows, [N] writes/ngày

Tìm: 1) Missing index — query nào chậm? 2) Wrong data type. 3) Missing constraint. 4) Schema antipattern (EAV, JSON overuse, polymorphic). 5) Migration nightmare — thứ gì khó thay đổi khi có data?

---

## Soft delete + Multi-tenancy

Implement soft delete + multi-tenancy cho bảng [tên].

**Current table:**
```sql
[PASTE DDL]
```

Đề xuất: 1) Schema changes. 2) Index strategy (partial index cho non-deleted, tenant-aware). 3) EF Core Global Query Filter. 4) Trade-off: soft delete vs archive table vs partition.

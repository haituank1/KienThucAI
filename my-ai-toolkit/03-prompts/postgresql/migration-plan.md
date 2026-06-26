# Prompt: Lập kế hoạch Migration PostgreSQL

> Dùng khi cần thay đổi schema trên production — nơi downtime và data loss là không chấp nhận được.

---

## PROMPT

Tôi cần thực hiện migration PostgreSQL sau trên production database.

**Thay đổi cần làm:**
```sql
[Mô tả hoặc DDL thay đổi — vd: thêm column, rename, thêm index, thay đổi type]
```

**Current schema:**
```sql
[PASTE DDL hiện tại của table bị ảnh hưởng]
```

**Database stats:**
```sql
-- Chạy để lấy:
SELECT reltuples::bigint as rows,
       pg_size_pretty(pg_total_relation_size(oid)) as size
FROM pg_class WHERE relname = 'your_table';
```
```
[PASTE kết quả]
```

**Constraint:**
- Downtime cho phép: [không có / <X phút / maintenance window lúc X giờ]
- PostgreSQL version: [15 / 16 / ...]
- Replication: [standalone / primary + replica]
- Application: [có thể deploy lại ngay / deploy window riêng]

Hãy lập kế hoạch migration:

1. **Risk assessment**
   - Lock type và duration ước lượng
   - Replication lag risk
   - Data loss risk
   - Rollback có dễ không?

2. **Migration steps** — chi tiết từng bước
   ```sql
   -- Step 1: [mô tả]
   [SQL]

   -- Step 2: [mô tả]
   [SQL]
   ```

3. **Zero-downtime approach** (nếu cần)
   - Expand-Contract pattern
   - Blue-Green deployment consideration
   - Feature flag để cut-over dần

4. **Verification queries** — chạy sau migration để confirm
   ```sql
   [SQL để verify]
   ```

5. **Rollback plan** — nếu có vấn đề sau deploy
   ```sql
   [Rollback SQL]
   ```

---

## Reference — Common migration risks

```
ADD COLUMN NOT NULL (no default)
  → Lock toàn bộ bảng, rewrite tất cả rows
  → Fix: ADD COLUMN nullable trước, backfill, rồi SET NOT NULL

ADD COLUMN NOT NULL WITH DEFAULT (PG 11+)
  → Không rewrite nếu default là constant — safe

CREATE INDEX
  → Lock writes
  → Fix: CREATE INDEX CONCURRENTLY (không lock writes, chậm hơn)

DROP COLUMN
  → Fast (chỉ mark deleted), nhưng reclaim space cần VACUUM FULL

ALTER COLUMN TYPE
  → Rewrite toàn bộ bảng → lock lâu
  → Fix: add new column, backfill, swap, drop old

RENAME TABLE / COLUMN
  → Lock, nhưng fast
  → Risk: application code + views + functions reference tên cũ

ADD FOREIGN KEY
  → Scan toàn bộ bảng để validate → lock reads + writes
  → Fix: ADD CONSTRAINT ... NOT VALID (skip validation), rồi VALIDATE riêng
```

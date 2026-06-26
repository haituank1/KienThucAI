# Lập kế hoạch Migration PostgreSQL

Thực hiện migration PostgreSQL sau trên production. Downtime và data loss không chấp nhận.

**Thay đổi cần làm:**
```sql
[DDL thay đổi — thêm column, rename, thêm index, thay đổi type]
```

**Current schema:**
```sql
[PASTE DDL table bị ảnh hưởng]
```

**Database stats:**
```sql
SELECT reltuples::bigint as rows,
       pg_size_pretty(pg_total_relation_size(oid)) as size
FROM pg_class WHERE relname = 'your_table';
```
```
[PASTE kết quả]
```

**Constraint:**
- Downtime: [không có / <X phút / maintenance window X giờ]
- PostgreSQL: [15 / 16]
- Replication: [standalone / primary + replica]
- App deploy: [ngay / window riêng]

Lập kế hoạch:

1. **Risk assessment** — lock type + duration | replication lag | data loss risk | rollback dễ không?

2. **Migration steps:**
   ```sql
   -- Step 1: [mô tả]
   [SQL]
   ```

3. **Zero-downtime approach** (nếu cần) — Expand-Contract | Blue-Green | Feature flag

4. **Verification queries:**
   ```sql
   [SQL verify sau migration]
   ```

5. **Rollback plan:**
   ```sql
   [Rollback SQL]
   ```

---

## Reference — Common migration risks

```
ADD COLUMN NOT NULL (no default)
  → Lock toàn bộ bảng, rewrite tất cả rows
  → Fix: ADD COLUMN nullable → backfill → SET NOT NULL

ADD COLUMN NOT NULL WITH DEFAULT (PG 11+)
  → Không rewrite nếu default là constant — safe

CREATE INDEX
  → Lock writes
  → Fix: CREATE INDEX CONCURRENTLY

DROP COLUMN → Fast (mark deleted); reclaim space cần VACUUM FULL

ALTER COLUMN TYPE
  → Rewrite toàn bộ bảng → lock lâu
  → Fix: add new column → backfill → swap → drop old

RENAME TABLE / COLUMN → Lock fast; risk: app code + views reference tên cũ

ADD FOREIGN KEY
  → Scan toàn bộ bảng → lock
  → Fix: ADD CONSTRAINT ... NOT VALID → VALIDATE riêng
```

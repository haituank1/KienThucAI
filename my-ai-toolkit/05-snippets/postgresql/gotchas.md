# PostgreSQL Gotchas — Những lỗi đã gặp

## 1. Index không được dùng vì function wrap
```sql
-- ❌ Planner không dùng index trên email
WHERE UPPER(email) = 'TEST@EXAMPLE.COM'

-- ✅ Fix: functional index
CREATE INDEX ON users(UPPER(email));
-- Hoặc dùng citext extension
ALTER TABLE users ALTER COLUMN email TYPE citext;
```

## 2. NULL trong NOT IN làm mất kết quả
```sql
-- ❌ Nếu subquery trả về NULL, kết quả luôn là empty set
SELECT * FROM orders WHERE customer_id NOT IN (
    SELECT id FROM banned_customers  -- có thể có NULL
);

-- ✅ Dùng NOT EXISTS thay thế
SELECT * FROM orders o
WHERE NOT EXISTS (
    SELECT 1 FROM banned_customers b WHERE b.id = o.customer_id
);
```

## 3. TIMESTAMPTZ vs TIMESTAMP
```sql
-- ❌ TIMESTAMP không có timezone → hiển thị sai khi server thay đổi timezone
created_at TIMESTAMP  

-- ✅ TIMESTAMPTZ — lưu UTC, hiển thị theo session timezone
created_at TIMESTAMPTZ DEFAULT NOW()
```

## 4. Index không dùng được với OR
```sql
-- ❌ OR giữa các column khác nhau → seq scan
WHERE status = 'pending' OR created_at > '2024-01-01'

-- ✅ Dùng UNION ALL thay OR (nếu không overlap)
SELECT * FROM orders WHERE status = 'pending'
UNION ALL
SELECT * FROM orders WHERE created_at > '2024-01-01' AND status <> 'pending'
```

## 5. LIKE với leading wildcard
```sql
-- ❌ Leading wildcard → full table scan
WHERE name LIKE '%nguyen'

-- ✅ Option 1: trailing only (dùng được btree index)
WHERE name LIKE 'nguyen%'

-- ✅ Option 2: pg_trgm cho full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX ON users USING GIN(name gin_trgm_ops);
WHERE name LIKE '%nguyen%'  -- Dùng được GIN index
```

## 6. COUNT(*) trên large table chậm
```sql
-- ❌ COUNT(*) với điều kiện phức tạp → seq scan
SELECT COUNT(*) FROM orders WHERE status = 'completed';

-- ✅ Option 1: Partial index + index-only scan
CREATE INDEX ON orders(status) WHERE status = 'completed';

-- ✅ Option 2: Approximate count nếu chấp nhận được
SELECT reltuples::bigint FROM pg_class WHERE relname = 'orders';

-- ✅ Option 3: Maintain counter table với trigger (cho real-time accurate)
```

## 7. Deadlock với concurrent updates
```sql
-- ❌ Deadlock khi 2 transaction update cùng rows theo thứ tự khác nhau
-- TX1: UPDATE orders SET ... WHERE id IN (1, 2)  -- lock 1 trước
-- TX2: UPDATE orders SET ... WHERE id IN (2, 1)  -- lock 2 trước → deadlock

-- ✅ Fix: luôn lock theo thứ tự nhất định (order by id)
UPDATE orders SET status = 'processing'
WHERE id IN (SELECT id FROM orders WHERE ... ORDER BY id FOR UPDATE SKIP LOCKED)
```

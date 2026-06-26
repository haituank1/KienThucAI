# PostgreSQL Gotchas — Những lỗi đã gặp

## 1. Index bị bỏ qua vì function wrap
```sql
-- ❌ Seq Scan
WHERE UPPER(email) = 'TEST@EXAMPLE.COM'

-- ✅ Functional index
CREATE INDEX ON users(UPPER(email));
-- Hoặc: ALTER TABLE users ALTER COLUMN email TYPE citext;
```

## 2. NULL trong NOT IN → empty set
```sql
-- ❌ Nếu subquery trả về NULL → kết quả luôn empty
SELECT * FROM orders WHERE customer_id NOT IN (SELECT id FROM banned_customers);

-- ✅ NOT EXISTS safe với NULL
SELECT * FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM banned_customers b WHERE b.id = o.customer_id);
```

## 3. TIMESTAMP vs TIMESTAMPTZ
```sql
-- ❌ hiển thị sai khi server thay đổi timezone
created_at TIMESTAMP

-- ✅ lưu UTC, hiển thị theo session timezone
created_at TIMESTAMPTZ DEFAULT NOW()
```

## 4. OR giữa columns khác nhau → Seq Scan
```sql
-- ❌
WHERE status = 'pending' OR created_at > '2024-01-01'

-- ✅ UNION ALL (nếu không overlap)
SELECT * FROM orders WHERE status = 'pending'
UNION ALL
SELECT * FROM orders WHERE created_at > '2024-01-01' AND status <> 'pending'
```

## 5. LIKE với leading wildcard → full table scan
```sql
-- ❌
WHERE name LIKE '%nguyen'

-- ✅ trailing only (btree index)
WHERE name LIKE 'nguyen%'

-- ✅ pg_trgm cho LIKE '%keyword%'
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX ON users USING GIN(name gin_trgm_ops);
```

## 6. COUNT(*) trên large table
```sql
-- ❌ Seq Scan
SELECT COUNT(*) FROM orders WHERE status = 'completed';

-- ✅ Partial index → index-only scan
CREATE INDEX ON orders(status) WHERE status = 'completed';

-- ✅ Approximate (nếu chấp nhận được)
SELECT reltuples::bigint FROM pg_class WHERE relname = 'orders';

-- ✅ Counter table với trigger (real-time accurate)
```

## 7. Deadlock với concurrent updates
```sql
-- ❌ TX1 lock (1,2), TX2 lock (2,1) → deadlock
-- ✅ Luôn lock theo thứ tự nhất định (ORDER BY id)
UPDATE orders SET status = 'processing'
WHERE id IN (SELECT id FROM orders WHERE ... ORDER BY id FOR UPDATE SKIP LOCKED)
```

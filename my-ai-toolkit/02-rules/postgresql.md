# PostgreSQL Rules

---

## Index — Quyết định đúng từ đầu

```sql
-- ✅ 1. Index trên foreign key (PostgreSQL KHÔNG tự tạo như SQL Server)
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- ✅ 2. Partial index — nhỏ hơn, nhanh hơn full index
CREATE INDEX idx_orders_pending ON orders(created_at)
WHERE status = 'pending'; -- Chỉ index rows pending, không phải toàn bộ bảng

-- ✅ 3. Composite index — column order quan trọng
-- Rule: Equality conditions trước, range conditions sau
-- Query: WHERE customer_id = ? AND created_at > ?
CREATE INDEX idx_orders_customer_date ON orders(customer_id, created_at DESC);
-- ❌ Sai thứ tự: (created_at, customer_id) → không dùng được cho equality on customer_id

-- ✅ 4. Covering index (INCLUDE) — tránh table lookup
-- Query: SELECT id, status, total FROM orders WHERE customer_id = ?
CREATE INDEX idx_orders_customer_covering ON orders(customer_id)
INCLUDE (status, total_amount); -- Columns này không phải index key, chỉ stored in leaf

-- ✅ 5. Functional index khi dùng function trong WHERE
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
-- Sau đó query: WHERE LOWER(email) = 'test@example.com' → dùng được index

-- ❌ Tránh index trên low-cardinality column (standalone)
CREATE INDEX idx_orders_status ON orders(status); -- ❌ nếu chỉ có 5 status values
-- ✅ Dùng partial index thay
CREATE INDEX idx_orders_active ON orders(created_at) WHERE status IN ('pending', 'processing');
```

---

## Query Anti-patterns

```sql
-- ❌ Function wrap column → index không dùng được
WHERE EXTRACT(YEAR FROM created_at) = 2024 -- full scan

-- ✅ Range condition thay thế
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'

-- ❌ Implicit type cast → index không dùng được
WHERE customer_id = '123' -- customer_id là integer, cast ẩn

-- ✅ Match type chính xác
WHERE customer_id = 123

-- ❌ OR giữa các columns khác nhau → seq scan
WHERE status = 'pending' OR customer_id = 123

-- ✅ UNION ALL nếu không overlap
SELECT * FROM orders WHERE status = 'pending'
UNION ALL
SELECT * FROM orders WHERE customer_id = 123 AND status != 'pending'

-- ❌ NOT IN với nullable subquery → empty result set
WHERE id NOT IN (SELECT customer_id FROM banned) -- NULL trong subquery → toàn bộ FALSE

-- ✅ NOT EXISTS thay thế — safe với NULL
WHERE NOT EXISTS (SELECT 1 FROM banned b WHERE b.customer_id = orders.customer_id)
```

---

## Pagination

```sql
-- ❌ OFFSET lớn → scan + skip N rows, chậm tuyến tính
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 50000;
-- Performance: OFFSET 50000 phải đọc 50020 rows rồi bỏ đi 50000

-- ✅ Keyset pagination — O(log n) bất kể page nào
-- Lần đầu:
SELECT id, created_at, total_amount
FROM orders
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Các trang tiếp theo (dùng giá trị cuối từ page trước):
SELECT id, created_at, total_amount
FROM orders
WHERE (created_at, id) < (:last_created_at, :last_id) -- tuple comparison
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Index cần: CREATE INDEX ON orders(created_at DESC, id DESC);
```

---

## Locking Strategy

```sql
-- ✅ Optimistic concurrency — prefer cho low-contention
-- Dùng xmin (system column) làm rowversion
SELECT id, xmin::text as version FROM orders WHERE id = $1;
UPDATE orders SET status = 'processing'
WHERE id = $1 AND xmin::text = $2; -- Fail nếu ai update trước
-- Nếu 0 rows affected → conflict → retry

-- ✅ SELECT FOR UPDATE SKIP LOCKED — job queue pattern
BEGIN;
SELECT * FROM pending_jobs
WHERE status = 'pending'
ORDER BY created_at
LIMIT 10
FOR UPDATE SKIP LOCKED; -- Skip rows đang bị lock bởi worker khác
UPDATE pending_jobs SET status = 'processing' WHERE id = ANY($1);
COMMIT;

-- ❌ SELECT FOR UPDATE trên nhiều rows theo thứ tự khác nhau → deadlock
-- ✅ Luôn ORDER BY id hoặc primary key khi FOR UPDATE nhiều rows
SELECT * FROM orders WHERE id = ANY($1)
ORDER BY id  -- ← consistent ordering, tránh deadlock
FOR UPDATE;
```

---

## Data Types — Best Practices

| Use case | Correct type | Avoid |
|----------|-------------|-------|
| Primary key (UUID) | `UUID DEFAULT gen_random_uuid()` | SERIAL (sequential, predictable) |
| Timestamp | `TIMESTAMPTZ` (UTC stored) | `TIMESTAMP` (no timezone) |
| Money | `NUMERIC(18, 4)` | `FLOAT`, `DOUBLE PRECISION` (rounding error) |
| Boolean flag | `BOOLEAN NOT NULL DEFAULT false` | SMALLINT, CHAR(1) |
| JSON data | `JSONB` (binary, indexable, faster) | `JSON` (text, no index) |
| Enum | `TEXT + CHECK CONSTRAINT` | `CREATE TYPE AS ENUM` (khó ALTER) |
| Short text | `VARCHAR(n)` | `TEXT` khi cần limit |
| Long text | `TEXT` | `VARCHAR(MAX)` (không có trong PG) |

```sql
-- ✅ Enum với CHECK — dễ thêm value
ALTER TABLE orders ADD CONSTRAINT chk_orders_status
CHECK (status IN ('draft', 'pending', 'paid', 'shipped', 'cancelled'));
-- Thêm value mới: ALTER TABLE orders DROP CONSTRAINT chk_orders_status, ADD CONSTRAINT ...

-- ✅ JSONB index
CREATE INDEX idx_orders_metadata ON orders USING GIN(metadata);
-- Query: WHERE metadata @> '{"source": "mobile"}'
```

---

## EXPLAIN ANALYZE — Đọc execution plan

```sql
-- Chạy để phân tích:
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE customer_id = 123;

-- Những gì cần chú ý:
-- "Seq Scan" trên bảng lớn → cần index
-- "Rows Removed by Filter: N" lớn → index không selective
-- "Buffers: hit=X read=Y" → read cao → data không trong cache
-- "actual time=X..Y" rất cao → bottleneck ở node này
-- "Rows: X (estimated: Y)" chênh lệch lớn → statistics cũ, chạy ANALYZE
-- "Hash Join" vs "Nested Loop" — hash join tốt cho large sets, nested loop cho small

-- Refresh statistics sau khi load data lớn:
ANALYZE orders;
-- Hoặc specific column:
ANALYZE orders(customer_id, status, created_at);
```

---

## Connection & Pool

```
# appsettings.json / Npgsql connection string
"Host=localhost;Database=mydb;Username=app;Password=xxx;
 Maximum Pool Size=20;        ← max connections (tune theo server)
 Minimum Pool Size=2;         ← warm connections
 Connection Idle Lifetime=300; ← close idle connection sau 5 phút
 Command Timeout=30;          ← query timeout seconds
 Cancellation Token=true"     ← support CancellationToken

# Nếu dùng PgBouncer: thêm Multiplexing=true trong Npgsql
```

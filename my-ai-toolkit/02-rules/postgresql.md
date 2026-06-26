# PostgreSQL Rules

## Index

```sql
-- ✅ Foreign key index (PostgreSQL does NOT auto-create unlike SQL Server)
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- ✅ Partial index — smaller, faster than full index
CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending';

-- ✅ Composite index — equality conditions FIRST, range conditions LAST
-- Query: WHERE customer_id = ? AND created_at > ?
CREATE INDEX idx_orders_customer_date ON orders(customer_id, created_at DESC);
-- ❌ Wrong order: (created_at, customer_id) — can't use for equality on customer_id

-- ✅ Covering index — avoids table lookup
-- Query: SELECT id, status, total FROM orders WHERE customer_id = ?
CREATE INDEX idx_orders_customer_covering ON orders(customer_id) INCLUDE (status, total_amount);

-- ✅ Functional index when using functions in WHERE
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
-- Query: WHERE LOWER(email) = 'test@example.com'

-- ❌ Low-cardinality standalone index
CREATE INDEX idx_orders_status ON orders(status); -- only 5 values → use partial instead
-- ✅
CREATE INDEX idx_orders_active ON orders(created_at) WHERE status IN ('pending', 'processing');
```

## Query Anti-patterns

```sql
-- ❌ Function wrapping column → index unusable
WHERE EXTRACT(YEAR FROM created_at) = 2024
-- ✅
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'

-- ❌ Implicit type cast → index unusable
WHERE customer_id = '123'  -- customer_id is integer
-- ✅
WHERE customer_id = 123

-- ❌ OR across different columns → seq scan
WHERE status = 'pending' OR customer_id = 123
-- ✅ UNION ALL if no overlap
SELECT * FROM orders WHERE status = 'pending'
UNION ALL
SELECT * FROM orders WHERE customer_id = 123 AND status != 'pending'

-- ❌ NOT IN with nullable subquery → empty result (NULLs make all FALSE)
WHERE id NOT IN (SELECT customer_id FROM banned)
-- ✅ NOT EXISTS — safe with NULLs
WHERE NOT EXISTS (SELECT 1 FROM banned b WHERE b.customer_id = orders.customer_id)
```

## Pagination

```sql
-- ❌ OFFSET large → linear scan (reads N+limit rows, discards N)
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 50000;

-- ✅ Keyset pagination — O(log n) regardless of page
-- First page:
SELECT id, created_at, total_amount FROM orders ORDER BY created_at DESC, id DESC LIMIT 20;

-- Next pages (use last values from previous page):
SELECT id, created_at, total_amount FROM orders
WHERE (created_at, id) < (:last_created_at, :last_id)  -- tuple comparison
ORDER BY created_at DESC, id DESC LIMIT 20;

-- Required index: CREATE INDEX ON orders(created_at DESC, id DESC);
```

## Locking Strategy

```sql
-- ✅ Optimistic concurrency — prefer for low-contention
SELECT id, xmin::text as version FROM orders WHERE id = $1;
UPDATE orders SET status = 'processing' WHERE id = $1 AND xmin::text = $2;
-- 0 rows affected → conflict → retry

-- ✅ SELECT FOR UPDATE SKIP LOCKED — job queue pattern
BEGIN;
SELECT * FROM pending_jobs WHERE status = 'pending'
ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED;
UPDATE pending_jobs SET status = 'processing' WHERE id = ANY($1);
COMMIT;

-- ❌ FOR UPDATE on multiple rows in different orders → deadlock
-- ✅ Always ORDER BY id/PK for consistent lock order
SELECT * FROM orders WHERE id = ANY($1) ORDER BY id FOR UPDATE;
```

## Data Types

| Use case | Type | Avoid |
|----------|------|-------|
| Primary key UUID | `UUID DEFAULT gen_random_uuid()` | SERIAL (sequential, predictable) |
| Timestamp | `TIMESTAMPTZ` | `TIMESTAMP` (no timezone) |
| Money | `NUMERIC(18, 4)` | `FLOAT`/`DOUBLE PRECISION` (rounding errors) |
| Boolean | `BOOLEAN NOT NULL DEFAULT false` | SMALLINT, CHAR(1) |
| JSON | `JSONB` (binary, indexable) | `JSON` (text, no index) |
| Enum | `TEXT + CHECK CONSTRAINT` | `CREATE TYPE AS ENUM` (hard to ALTER) |

```sql
-- ✅ Enum with CHECK — easy to add values
ALTER TABLE orders ADD CONSTRAINT chk_orders_status
CHECK (status IN ('draft', 'pending', 'paid', 'shipped', 'cancelled'));

-- ✅ JSONB GIN index
CREATE INDEX idx_orders_metadata ON orders USING GIN(metadata);
-- Query: WHERE metadata @> '{"source": "mobile"}'
```

## EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT * FROM orders WHERE customer_id = 123;
```

| Output | Action |
|--------|--------|
| `Seq Scan` on large table | Add index |
| `Rows Removed by Filter: N` large | Index not selective enough |
| `Buffers: hit=X read=Y` — high read | Data not in cache |
| `actual time` very high | Bottleneck at this node |
| Estimated vs actual rows differ widely | Statistics stale → run `ANALYZE orders` |

## Connection Pool (Npgsql)

```
Maximum Pool Size=20       ← tune per server
Minimum Pool Size=2        ← warm connections
Connection Idle Lifetime=300 ← close idle after 5 min
Command Timeout=30         ← query timeout seconds
Cancellation Token=true    ← support CancellationToken

# PgBouncer: add Multiplexing=true
```

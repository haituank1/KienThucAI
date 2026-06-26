# PostgreSQL — Index Patterns

## 1. Composite Index — Thứ tự column
```sql
-- Rule: Equality TRƯỚC, range/sort SAU
-- Query: WHERE customer_id = ? AND status = ? AND created_at > ?

-- ✅ Đúng thứ tự
CREATE INDEX idx_orders_customer_status_date ON orders(customer_id, status, created_at DESC);

-- ❌ Sai: range ở giữa làm mất index sau nó
CREATE INDEX idx_wrong ON orders(customer_id, created_at, status);
-- Query WHERE customer_id=? AND status=? chỉ dùng được (customer_id)

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE customer_id = 'xxx' AND status = 'pending' AND created_at > '2024-01-01';
-- Kiểm tra: "Index Scan" hay "Seq Scan"?
```

## 2. Partial Index — Chỉ 5% rows, size ~5% full index
```sql
-- ✅ Query phải match EXACTLY condition WHERE của index
CREATE INDEX idx_orders_pending_created ON orders(created_at DESC) WHERE status = 'pending';

-- ✅ Dùng được:
SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC;
-- ❌ Không dùng được:
SELECT * FROM orders WHERE status = 'pending' OR status = 'processing';
```

## 3. Covering Index (INCLUDE) — Index Only Scan
```sql
-- Query: SELECT id, status, total_amount FROM orders WHERE customer_id = ?
-- ✅ INCLUDE thêm columns vào leaf pages, không phải search key
CREATE INDEX idx_orders_customer_covering ON orders(customer_id)
INCLUDE (status, total_amount, created_at);
-- Verify: EXPLAIN phải thấy "Index Only Scan"
-- trade-off: index lớn hơn
```

## 4. Functional Index — Query có function wrap
```sql
-- ❌ Seq Scan — index trên email không match LOWER(email)
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';

-- ✅
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
CREATE INDEX idx_orders_year ON orders(EXTRACT(YEAR FROM created_at));
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops); -- LIKE '%kw%'
```

## 5. GIN Index — Array, JSONB, Full-text
```sql
CREATE INDEX idx_orders_metadata ON orders USING GIN(metadata);   -- @>, ?, ?|, ?&
CREATE INDEX idx_products_tags ON products USING GIN(tags);        -- &&, @>, <@
CREATE INDEX idx_products_fts ON products
    USING GIN(to_tsvector('english', name || ' ' || description)); -- @@

-- pg_trgm (cần CREATE EXTENSION pg_trgm): LIKE '%kw%', ILIKE, similarity()
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);
```

## 6. BRIN — Time-series, append-only (1% size của B-tree)
```sql
-- Phù hợp: correlation cao với physical storage (log tables, time-series)
-- Không phù hợp: random access, update nhiều
-- B-tree 100MB → BRIN 1MB; B-tree O(log n) vs BRIN linear scan trong range
CREATE INDEX idx_audit_logs_created_brin ON audit_logs USING BRIN(created_at)
WITH (pages_per_range = 128);
```

## 7. Index Monitoring
```sql
-- Index không được dùng (cân nhắc drop)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%pkey%'
  AND indexname NOT LIKE '%unique%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Table scan nhiều — có thể thiếu index
SELECT schemaname, tablename, seq_scan, idx_scan,
    ROUND(seq_scan::numeric / NULLIF(seq_scan + idx_scan, 0) * 100, 1) as seq_pct
FROM pg_stat_user_tables WHERE seq_scan > 1000 ORDER BY seq_tup_read DESC;

-- Index size
SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes WHERE tablename = 'orders'
ORDER BY pg_relation_size(indexname::regclass) DESC;
-- index (a,b) làm (a) redundant
```

## 8. CREATE INDEX CONCURRENTLY — Production safe
```sql
-- ❌ Lock toàn bộ table
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- ✅ Không block reads/writes (~2x chậm hơn)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer ON orders(customer_id);
-- ⚠️ Không chạy trong transaction block
-- ⚠️ Nếu bị interrupt → INVALID index

-- Check INVALID:
SELECT indexname, indisvalid FROM pg_index
JOIN pg_class ON pg_class.oid = pg_index.indexrelid WHERE relname = 'idx_orders_customer';

-- Fix: DROP INDEX CONCURRENTLY, rồi CREATE lại
```

**Master Lesson:**
- Index mới không tự dùng nếu statistics cũ → `ANALYZE table` sau bulk load
- Index trên low-cardinality column (boolean, enum 3-4 values) thường không được dùng
- Mỗi write phải update tất cả index — cân nhắc kỹ trước khi thêm
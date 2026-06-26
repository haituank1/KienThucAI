# PostgreSQL — Index Patterns

> Quyết định index là quyết định performance dài hạn — sai từ đầu khó sửa.
> Mỗi pattern có context rõ ràng: khi nào dùng, trade-off gì.

---

## 1. Composite Index — Thứ tự column quan trọng

```sql
-- Rule: Equality conditions TRƯỚC, range/sort conditions SAU
-- Query: WHERE customer_id = ? AND status = ? AND created_at > ?

-- ✅ Đúng thứ tự: equality (customer_id, status) → range (created_at)
CREATE INDEX idx_orders_customer_status_date
ON orders(customer_id, status, created_at DESC);

-- ❌ Sai thứ tự: range ở giữa làm mất index sau nó
CREATE INDEX idx_wrong
ON orders(customer_id, created_at, status);
-- Query WHERE customer_id = ? AND status = ? chỉ dùng được (customer_id)

-- Test index usage:
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders
WHERE customer_id = 'xxx' AND status = 'pending' AND created_at > '2024-01-01';
-- Kiểm tra: "Index Scan" hay "Seq Scan"?
```

---

## 2. Partial Index — Nhỏ hơn, nhanh hơn khi query tập con

```sql
-- Chỉ 5% orders là 'pending' — không cần index toàn bộ bảng
-- ✅ Partial index: chỉ index rows thỏa condition
CREATE INDEX idx_orders_pending_created
ON orders(created_at DESC)
WHERE status = 'pending';
-- Size: ~5% so với full index

-- Lưu ý: Query phải match EXACTLY condition trong WHERE của index
-- ✅ Sẽ dùng được index:
SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC;
-- ❌ Không dùng được:
SELECT * FROM orders WHERE status = 'pending' OR status = 'processing';
```

---

## 3. Covering Index (INCLUDE) — Tránh table lookup

```sql
-- Query: SELECT id, status, total_amount FROM orders WHERE customer_id = ?
-- Nếu index chỉ có (customer_id): Index Scan + Heap Fetch cho mỗi row
-- INCLUDE: thêm columns vào index leaf pages, không phải search key

-- ✅ Covering index — Index Only Scan (không cần đọc table)
CREATE INDEX idx_orders_customer_covering
ON orders(customer_id)
INCLUDE (status, total_amount, created_at);

-- Verify bằng EXPLAIN: phải thấy "Index Only Scan"
-- trade-off: index lớn hơn (include columns tốn space)
```

---

## 4. Functional Index — Query có function wrap

```sql
-- ❌ Query dùng function → index bị bỏ qua
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';
-- → Seq Scan (index trên email không match LOWER(email))

-- ✅ Functional index trên expression
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
-- Bây giờ query WHERE LOWER(email) = 'test@example.com' dùng được index

-- Ví dụ khác:
CREATE INDEX idx_orders_year ON orders(EXTRACT(YEAR FROM created_at));
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);
-- Cho LIKE '%keyword%' search
```

---

## 5. GIN Index — Array, JSONB, Full-text search

```sql
-- JSONB containment search
CREATE INDEX idx_orders_metadata ON orders USING GIN(metadata);
-- Hỗ trợ: @>, ?, ?|, ?&

-- Array search
CREATE INDEX idx_products_tags ON products USING GIN(tags);
-- Hỗ trợ: && (overlap), @> (contains), <@ (contained by)

-- Full-text search
CREATE INDEX idx_products_fts ON products
USING GIN(to_tsvector('english', name || ' ' || description));
-- Query: WHERE to_tsvector('english', name) @@ to_tsquery('english', 'laptop')

-- pg_trgm cho LIKE search (cần: CREATE EXTENSION pg_trgm)
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);
-- Hỗ trợ: LIKE '%keyword%', ILIKE, similarity()
```

---

## 6. BRIN Index — Time-series, append-only data

```sql
-- BRIN (Block Range INdex): nhỏ hơn B-tree nhiều (1-2% size)
-- Phù hợp: cột có correlation cao với physical storage (log tables, time-series)
-- Không phù hợp: random access, update nhiều

CREATE INDEX idx_audit_logs_created_brin
ON audit_logs USING BRIN(created_at)
WITH (pages_per_range = 128);

-- So sánh với B-tree:
-- B-tree: 100MB index → BRIN: 1MB index
-- B-tree: O(log n) → BRIN: linear scan trong range
-- BRIN wins khi: query theo time range trên sorted-by-time table
```

---

## 7. Index Monitoring — Tìm index không được dùng / thiếu

```sql
-- Index không được dùng (cân nhắc drop)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%pkey%'   -- Giữ PK
  AND indexname NOT LIKE '%unique%' -- Giữ unique constraint
ORDER BY pg_relation_size(indexrelid) DESC;

-- Table scan nhiều — có thể thiếu index
SELECT schemaname, tablename,
       seq_scan, seq_tup_read,
       idx_scan, idx_tup_fetch,
       ROUND(seq_scan::numeric / NULLIF(seq_scan + idx_scan, 0) * 100, 1) as seq_pct
FROM pg_stat_user_tables
WHERE seq_scan > 1000
ORDER BY seq_tup_read DESC;

-- Index size
SELECT indexname,
       pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE tablename = 'orders'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- Duplicate/redundant indexes (prefix match)
-- index (a,b) makes index (a) redundant for most queries
```

---

## 8. CREATE INDEX CONCURRENTLY — Không lock writes trên production

```sql
-- ❌ Blocking: lock toàn bộ table suốt quá trình build index
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- ✅ CONCURRENTLY: không block reads/writes, chậm hơn ~2x
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer
ON orders(customer_id);

-- ⚠️ Gotcha: CONCURRENTLY không chạy trong transaction block
-- ⚠️ Nếu bị interrupt → index ở trạng thái INVALID
-- Check và cleanup:
SELECT indexname, indisvalid FROM pg_index
JOIN pg_class ON pg_class.oid = pg_index.indexrelid
WHERE relname = 'idx_orders_customer';

-- Fix INVALID index:
DROP INDEX CONCURRENTLY idx_orders_customer;
CREATE INDEX CONCURRENTLY idx_orders_customer ON orders(customer_id);
```

---

**Master Lesson:**
- Index mới KHÔNG tự động được dùng nếu statistics lỗi thời → `ANALYZE table` sau bulk load
- Index trên low-cardinality column (boolean, enum có 3-4 values) thường KHÔNG được dùng
- Index không free: mỗi write phải update tất cả index → cân nhắc kỹ trước khi thêm
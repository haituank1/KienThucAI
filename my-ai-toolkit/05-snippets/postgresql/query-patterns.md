# PostgreSQL — Query Patterns Thực Chiến

## 1. Keyset Pagination (thay OFFSET)
```sql
-- ❌ OFFSET chậm với large offset (scan + skip N rows)
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

-- ✅ Keyset pagination — stable, fast bất kể page nào
SELECT * FROM orders 
WHERE created_at < :last_seen_created_at  -- từ response trước
   OR (created_at = :last_seen_created_at AND id < :last_seen_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Index cần: CREATE INDEX ON orders(created_at DESC, id DESC);
```

## 2. Upsert với ON CONFLICT
```sql
INSERT INTO product_prices (product_id, price, updated_at)
VALUES (:product_id, :price, NOW())
ON CONFLICT (product_id) 
DO UPDATE SET 
    price = EXCLUDED.price,
    updated_at = EXCLUDED.updated_at
WHERE product_prices.price <> EXCLUDED.price; -- Chỉ update khi thay đổi
```

## 3. Window Function cho ranking
```sql
-- Top 3 sản phẩm bán chạy theo category
SELECT *
FROM (
    SELECT 
        product_id,
        category_id,
        total_sold,
        RANK() OVER (PARTITION BY category_id ORDER BY total_sold DESC) as rank
    FROM product_stats
) ranked
WHERE rank <= 3;
```

## 4. Aggregation với FILTER
```sql
-- Đếm theo nhiều condition trong 1 query (tránh nhiều subquery)
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    SUM(amount) FILTER (WHERE status = 'completed') as completed_revenue
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days';
```

## 5. CTE cho complex query
```sql
-- Rõ ràng hơn nested subquery
WITH monthly_revenue AS (
    SELECT 
        DATE_TRUNC('month', created_at) as month,
        SUM(total_amount) as revenue
    FROM orders
    WHERE status = 'completed'
    GROUP BY 1
),
growth AS (
    SELECT 
        month,
        revenue,
        LAG(revenue) OVER (ORDER BY month) as prev_revenue
    FROM monthly_revenue
)
SELECT 
    month,
    revenue,
    ROUND((revenue - prev_revenue) / prev_revenue * 100, 2) as growth_pct
FROM growth
WHERE prev_revenue IS NOT NULL
ORDER BY month;
```

## 6. Batch delete tránh lock lâu
```sql
-- ❌ Delete all at once → lock lâu, replication lag
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';

-- ✅ Batch delete
DO $$
DECLARE
    deleted_count INT;
BEGIN
    LOOP
        DELETE FROM audit_logs
        WHERE id IN (
            SELECT id FROM audit_logs 
            WHERE created_at < NOW() - INTERVAL '1 year'
            LIMIT 1000
        );
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        EXIT WHEN deleted_count < 1000;
        PERFORM pg_sleep(0.1); -- Nghỉ 100ms giữa các batch
    END LOOP;
END $$;
```

## 7. SKIP LOCKED — Job queue pattern

```sql
-- Worker lấy job mà không block worker khác
BEGIN;

SELECT id, payload
FROM pending_jobs
WHERE status = 'pending'
ORDER BY created_at
LIMIT 10
FOR UPDATE SKIP LOCKED; -- Skip rows đang locked bởi worker khác

-- Worker xử lý xong thì update:
UPDATE pending_jobs
SET status = 'processing', started_at = NOW(), worker_id = :worker_id
WHERE id = ANY(:job_ids);

COMMIT;
```
**Tốt hơn LISTEN/NOTIFY:** Simple, reliable, không cần infra thêm.
**Index cần:** `CREATE INDEX ON pending_jobs(status, created_at) WHERE status = 'pending'`

---

## 8. JSONB Query — Tìm kiếm trong JSON column

```sql
-- Schema: orders.metadata JSONB
-- Data: {"source": "mobile", "campaign": "sale2024", "tags": ["vip", "repeat"]}

-- Containment operator @> (dùng được GIN index)
SELECT * FROM orders
WHERE metadata @> '{"source": "mobile"}';

-- Array element check
SELECT * FROM orders
WHERE metadata -> 'tags' ? 'vip';

-- Nested path
SELECT * FROM orders
WHERE metadata #>> '{payment, method}' = 'credit_card';

-- Index:
CREATE INDEX idx_orders_metadata ON orders USING GIN(metadata);
-- Hoặc specific path:
CREATE INDEX idx_orders_source ON orders((metadata->>'source'));
```

---

## 9. Recursive CTE — Hierarchical data

```sql
-- Category tree: categories(id, parent_id, name)
-- Lấy toàn bộ subcategory của category_id = :root_id

WITH RECURSIVE category_tree AS (
    -- Base case: root category
    SELECT id, parent_id, name, 0 as depth
    FROM categories
    WHERE id = :root_id

    UNION ALL

    -- Recursive: children
    SELECT c.id, c.parent_id, c.name, ct.depth + 1
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
    WHERE ct.depth < 10 -- depth limit để tránh infinite loop
)
SELECT * FROM category_tree ORDER BY depth, name;
```

---

## 10. Multi-row UPDATE từ VALUES

```sql
-- ✅ Update nhiều rows với giá trị khác nhau — 1 query thay vì N queries
UPDATE products AS p
SET price = v.new_price,
    updated_at = NOW()
FROM (VALUES
    ('prod-001'::uuid, 150000::numeric),
    ('prod-002'::uuid, 250000::numeric),
    ('prod-003'::uuid, 75000::numeric)
) AS v(product_id, new_price)
WHERE p.id = v.product_id;

-- Performance: 1 round trip, 1 lock acquisition thay vì N
```

---

**Master Lesson:**
- Luôn EXPLAIN ANALYZE trên staging với production-size data trước khi deploy query mới
- `pg_stat_statements` là công cụ tốt nhất để tìm slow query trong production
- Sau khi bulk insert/delete: `ANALYZE table_name` để refresh statistics

# PostgreSQL — Query Patterns Thực Chiến

## 1. Keyset Pagination (thay OFFSET)
```sql
-- ❌ OFFSET scan + skip N rows — chậm với large offset
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

-- ✅ Stable, fast bất kể page nào
SELECT * FROM orders
WHERE created_at < :last_seen_created_at
   OR (created_at = :last_seen_created_at AND id < :last_seen_id)
ORDER BY created_at DESC, id DESC LIMIT 20;
-- Index: CREATE INDEX ON orders(created_at DESC, id DESC);
```

## 2. Upsert với ON CONFLICT
```sql
INSERT INTO product_prices (product_id, price, updated_at)
VALUES (:product_id, :price, NOW())
ON CONFLICT (product_id)
DO UPDATE SET price = EXCLUDED.price, updated_at = EXCLUDED.updated_at
WHERE product_prices.price <> EXCLUDED.price; -- chỉ update khi thay đổi
```

## 3. Window Function — Ranking
```sql
SELECT * FROM (
    SELECT product_id, category_id, total_sold,
        RANK() OVER (PARTITION BY category_id ORDER BY total_sold DESC) as rank
    FROM product_stats
) ranked WHERE rank <= 3;
```

## 4. Aggregation với FILTER (thay nhiều subquery)
```sql
SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    SUM(amount) FILTER (WHERE status = 'completed') as completed_revenue
FROM orders WHERE created_at >= NOW() - INTERVAL '30 days';
```

## 5. CTE — Complex query + MoM growth
```sql
WITH monthly_revenue AS (
    SELECT DATE_TRUNC('month', created_at) as month, SUM(total_amount) as revenue
    FROM orders WHERE status = 'completed' GROUP BY 1
),
growth AS (
    SELECT month, revenue, LAG(revenue) OVER (ORDER BY month) as prev_revenue
    FROM monthly_revenue
)
SELECT month, revenue,
    ROUND((revenue - prev_revenue) / prev_revenue * 100, 2) as growth_pct
FROM growth WHERE prev_revenue IS NOT NULL ORDER BY month;
```

## 6. Batch delete (tránh lock lâu + replication lag)
```sql
-- ❌ DELETE all at once → lock lâu
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';

-- ✅ Batch 1000 rows + sleep 100ms
DO $$
DECLARE deleted_count INT;
BEGIN
    LOOP
        DELETE FROM audit_logs WHERE id IN (
            SELECT id FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year' LIMIT 1000
        );
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        EXIT WHEN deleted_count < 1000;
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;
```

## 7. SKIP LOCKED — Job queue pattern
```sql
-- Simple, reliable — không cần LISTEN/NOTIFY infra
-- Index: CREATE INDEX ON pending_jobs(status, created_at) WHERE status = 'pending'
BEGIN;
SELECT id, payload FROM pending_jobs
WHERE status = 'pending' ORDER BY created_at LIMIT 10
FOR UPDATE SKIP LOCKED;

UPDATE pending_jobs
SET status = 'processing', started_at = NOW(), worker_id = :worker_id
WHERE id = ANY(:job_ids);
COMMIT;
```

## 8. JSONB Query
```sql
-- GIN index: CREATE INDEX ON orders USING GIN(metadata);
-- Specific path: CREATE INDEX ON orders((metadata->>'source'));

SELECT * FROM orders WHERE metadata @> '{"source": "mobile"}'; -- containment
SELECT * FROM orders WHERE metadata -> 'tags' ? 'vip';          -- array element
SELECT * FROM orders WHERE metadata #>> '{payment, method}' = 'credit_card'; -- nested
```

## 9. Recursive CTE — Hierarchical data
```sql
WITH RECURSIVE category_tree AS (
    SELECT id, parent_id, name, 0 as depth FROM categories WHERE id = :root_id
    UNION ALL
    SELECT c.id, c.parent_id, c.name, ct.depth + 1
    FROM categories c JOIN category_tree ct ON c.parent_id = ct.id
    WHERE ct.depth < 10 -- depth limit tránh infinite loop
)
SELECT * FROM category_tree ORDER BY depth, name;
```

## 10. Multi-row UPDATE từ VALUES (1 round trip thay vì N)
```sql
UPDATE products AS p SET price = v.new_price, updated_at = NOW()
FROM (VALUES
    ('prod-001'::uuid, 150000::numeric),
    ('prod-002'::uuid, 250000::numeric),
    ('prod-003'::uuid, 75000::numeric)
) AS v(product_id, new_price)
WHERE p.id = v.product_id;
```

**Master Lesson:**
- EXPLAIN ANALYZE trên staging với production-size data trước khi deploy
- `pg_stat_statements` để tìm slow query trong production
- Sau bulk insert/delete: `ANALYZE table_name` để refresh statistics

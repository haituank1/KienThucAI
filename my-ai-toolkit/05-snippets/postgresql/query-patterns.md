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

---
**Lesson learned:** Luôn test query với data size gần production. EXPLAIN ANALYZE trên staging với ~production data.

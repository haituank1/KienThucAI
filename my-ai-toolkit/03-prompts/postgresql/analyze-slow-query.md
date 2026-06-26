# Prompt: Phân tích Query PostgreSQL Chậm

## Prompt

Query PostgreSQL sau chạy chậm. Hãy phân tích và đề xuất giải pháp:

**Query:**
```sql
[PASTE QUERY]
```

**EXPLAIN ANALYZE output:**
```
[PASTE ĐẦY ĐỦ — chạy: EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) <query>]
```

**Table info:**
```sql
-- Chạy để lấy info:
-- \d+ table_name
-- SELECT reltuples FROM pg_class WHERE relname = 'table_name';
[PASTE OUTPUT]
```

**Indexes hiện có:**
```sql
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'table_name';
[PASTE]
```

**Context:**
- Row count: [ước lượng]
- Query này chạy: [tần suất — mỗi request / mỗi phút / batch job]
- Acceptable latency: [<100ms / <1s / best-effort]

**Phân tích cần:**
1. Bottleneck chính là gì (scan type, join method, sort, ...)
2. Tại sao planner chọn plan này (statistics, config)
3. Fix: thêm index nào, rewrite query thế nào
4. Ước lượng improvement
5. Có side effect gì không (lock, bloat, ...)

---

## Template chạy nhanh để lấy info
```sql
-- 1. Execution plan với buffer info
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
[YOUR QUERY];

-- 2. Table stats
SELECT 
    relname,
    reltuples::bigint as est_rows,
    pg_size_pretty(pg_total_relation_size(oid)) as total_size
FROM pg_class
WHERE relname IN ('table1', 'table2');

-- 3. Existing indexes
SELECT indexname, indexdef, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_indexes
JOIN pg_stat_user_indexes USING (indexrelname)
WHERE tablename = 'your_table'
ORDER BY idx_scan DESC;
```

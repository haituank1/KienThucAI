# Phân tích Query PostgreSQL Chậm

## Gather info trước

```sql
-- Execution plan đầy đủ
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
[YOUR QUERY];

-- Table stats
SELECT relname, reltuples::bigint AS est_rows,
       pg_size_pretty(pg_relation_size(oid)) AS table_size,
       pg_size_pretty(pg_total_relation_size(oid)) AS total_size_with_indexes
FROM pg_class WHERE relname IN ('your_table1', 'your_table2');

-- Indexes + usage
SELECT i.indexname, i.indexdef, s.idx_scan AS times_used,
       s.idx_tup_read AS tuples_read,
       pg_size_pretty(pg_relation_size(i.indexname::regclass)) AS index_size
FROM pg_indexes i
JOIN pg_stat_user_indexes s ON s.indexrelname = i.indexname
WHERE i.tablename = 'your_table' ORDER BY s.idx_scan DESC;

-- Statistics freshness (nếu estimate vs actual chênh lớn)
SELECT attname, n_distinct, correlation FROM pg_stats
WHERE tablename = 'your_table' AND attname IN ('column1', 'column2');
```

---

## Prompt

PostgreSQL query chậm. Stack: PostgreSQL [version], .NET 8 + EF Core 8.

**LINQ (nếu có):**
```csharp
[PASTE]
```

**Generated SQL:**
```sql
[PASTE]
```

**EXPLAIN ANALYZE:**
```
[PASTE ĐẦY ĐỦ — bao gồm Planning Time và Execution Time]
```

**Table stats:**
```
[PASTE kết quả queries trên]
```

**Context:**
- Latency: [X]s → target [<Xms]
- Chạy: [mỗi request / batch / scheduled]
- Scale: ~[N] rows, tăng [X]%/tháng

**Constraint:**
- [ ] Không thêm index mới
- [ ] Không thay đổi schema
- [ ] Downtime: [có / không]

Phân tích:
1. **Bottleneck chính** — node nào tốn thời gian nhất? Tại sao?
2. **Planner decision** — estimate vs actual chênh không?
3. **Fix theo priority:** quick win → index solution → query rewrite
4. **Ước lượng improvement** sau mỗi fix
5. **Side effect** (lock khi CREATE INDEX, write overhead, ...)

---

## Reference — Đọc plan nhanh

```
Seq Scan          → không dùng index, đọc toàn bộ bảng
Index Scan        → dùng index, vẫn đọc table (heap fetch)
Index Only Scan   → chỉ đọc index (covering index) — tốt nhất
Bitmap Heap Scan  → nhiều rows match, combine index + heap
Hash Join         → join bảng lớn với lớn
Nested Loop       → join bảng nhỏ (inner) vào lớn (outer)
Sort              → không có index support ORDER BY
Hash Aggregate    → GROUP BY không có index

"rows=X (actual: Y)" chênh lệch lớn → statistics lỗi thời → ANALYZE
"Buffers: hit=X read=Y" → read cao → data không trong shared_buffers
"Planning time: Xms" cao → query phức tạp, nhiều joins/subqueries
```

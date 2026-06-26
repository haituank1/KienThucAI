# Prompt: Phân tích Query PostgreSQL Chậm

---

## BƯỚC 1 — Gather info trước khi paste vào Claude

```sql
-- 1. Execution plan đầy đủ (chạy câu này, không chỉ EXPLAIN)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
[YOUR QUERY];

-- 2. Table stats
SELECT
    relname,
    reltuples::bigint            AS est_rows,
    pg_size_pretty(pg_relation_size(oid))       AS table_size,
    pg_size_pretty(pg_total_relation_size(oid)) AS total_size_with_indexes
FROM pg_class
WHERE relname IN ('your_table1', 'your_table2');

-- 3. Indexes + usage stats
SELECT
    i.indexname,
    i.indexdef,
    s.idx_scan        AS times_used,
    s.idx_tup_read    AS tuples_read,
    pg_size_pretty(pg_relation_size(i.indexname::regclass)) AS index_size
FROM pg_indexes i
JOIN pg_stat_user_indexes s ON s.indexrelname = i.indexname
WHERE i.tablename = 'your_table'
ORDER BY s.idx_scan DESC;

-- 4. Statistics freshness (nếu estimate vs actual chênh lệch lớn)
SELECT attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'your_table'
  AND attname IN ('column1', 'column2');
```

---

## PROMPT — Paste vào Claude sau khi có đủ info

PostgreSQL query chạy chậm. Stack: PostgreSQL [version], .NET 8 + EF Core 8.

**Query (LINQ nếu có):**
```csharp
[PASTE LINQ — để biết mapping]
```

**Generated SQL:**
```sql
[PASTE SQL]
```

**EXPLAIN ANALYZE output:**
```
[PASTE ĐẦY ĐỦ — bao gồm Planning Time và Execution Time]
```

**Table stats:**
```
[PASTE kết quả query ở trên]
```

**Context:**
- Latency hiện tại: [X]s
- Target: [<Xms]
- Query chạy: [mỗi request / batch / scheduled]
- Data scale: ~[N] rows, tăng [X]% mỗi tháng

**Constraint:**
- [ ] Không được thêm index mới (production freeze)
- [ ] Không được thay đổi schema
- [ ] Downtime cho maintenance: [có / không]

Phân tích:
1. **Bottleneck chính** — node nào trong plan tốn thời gian nhất? Tại sao?
2. **Planner decision** — tại sao planner chọn plan này? Estimate vs actual chênh lệch không?
3. **Fix theo priority:**
   - Quick win (không cần deploy, chỉ cần ANALYZE / hint)
   - Index solution (loại index, column order, partial/covering)
   - Query rewrite nếu cần
4. **Ước lượng improvement** sau mỗi fix
5. **Side effect** cần chú ý (lock khi CREATE INDEX, write overhead, ...)

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

"rows=X (actual: Y)" chênh lệch lớn → statistics lỗi thời → chạy ANALYZE
"Buffers: hit=X read=Y" → read cao → data không trong shared_buffers
"Planning time: Xms" cao → query phức tạp, nhiều joins/subqueries
```

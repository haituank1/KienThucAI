# Debug

Stack: .NET 8, EF Core 8, PostgreSQL.

---

## Runtime Exception / Logic Bug

Tôi gặp lỗi sau và cần tìm root cause, không chỉ cách fix.

**Error / Stack trace:**
```
[PASTE FULL STACK TRACE — bao gồm inner exception]
```

**Xảy ra khi:** [mô tả action trigger]
**Tần suất:** [luôn luôn / ~X% requests / intermittent]
**Environment:** [dev / staging / production]

**Code liên quan:**
```csharp
[PASTE — include full method + constructor dependencies]
```

**Đã thử:** [điền hoặc bỏ qua]

Phân tích: 1) Root cause — tầng nào gây ra? 2) Cơ chế kỹ thuật. 3) Fix + code cụ thể. 4) Test để verify. 5) Guard để prevent tái phát.

---

## Query / Database Chậm

**LINQ query:**
```csharp
[PASTE LINQ]
```

**Generated SQL:**
```sql
[PASTE SQL]
```

**EXPLAIN ANALYZE output:**
```
[EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) <query>;]
[PASTE KẾT QUẢ]
```

**Table info:**
```sql
SELECT relname, reltuples::bigint as est_rows,
       pg_size_pretty(pg_total_relation_size(oid)) as size
FROM pg_class WHERE relname IN ('ten_table');

SELECT indexname, indexdef, idx_scan
FROM pg_indexes
JOIN pg_stat_user_indexes USING(indexrelname)
WHERE tablename = 'ten_table';
```
```
[PASTE OUTPUT]
```

**Context:** Latency: [X]ms → target [<Xms] | Tần suất: [mỗi request / batch] | ~[N] rows

Phân tích: 1) Bottleneck node (seq scan? hash join? sort?). 2) Tại sao planner chọn plan này? 3) Fix: index / query rewrite. 4) Ước lượng latency sau fix. 5) Side effect.

---

## Memory / OutOfMemory

Ứng dụng .NET bị [OutOfMemoryException / memory tăng liên tục / GC pressure cao].

**Triệu chứng:**
- Memory: tăng từ [X]MB lên [Y]MB sau [Z phút / N requests]
- Xảy ra khi: [vd: "export báo cáo >100K rows"]
- GC: [Gen 2 collections cao / LOH fragmentation / ...]

**Code suspect:**
```csharp
[PASTE — vòng lặp, stream handling, cache, event handler]
```

**Data volume:** [N records / file size MB]

Phân tích: 1) Root cause khả năng nhất (top 1-2). 2) Cách confirm (profiling command). 3) Fix — ưu tiên streaming / batching / disposal. 4) Ước lượng memory improvement. 5) Pattern để tránh lặp lại.

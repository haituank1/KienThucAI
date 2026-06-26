# Prompt: Debug

> 3 template tương ứng 3 loại bug thường gặp. Copy đúng template → paste vào Claude.

---

## TEMPLATE 1 — Runtime Exception / Logic Bug

Stack: .NET 8, EF Core 8, PostgreSQL.

Tôi gặp lỗi sau và cần tìm root cause, không chỉ cách fix.

**Error / Stack trace:**
```
[PASTE FULL STACK TRACE — bao gồm inner exception]
```

**Xảy ra khi:** [mô tả action trigger — vd: "gọi POST /api/orders với payload có PromoCode"]
**Tần suất:** [luôn luôn / ~X% requests / chỉ khi... / intermittent]
**Environment:** [dev / staging / production]

**Code liên quan:**
```csharp
[PASTE — include full method + constructor dependencies]
```

**Đã thử:**
- [điền hoặc bỏ qua nếu chưa thử gì]

Phân tích theo thứ tự:
1. Root cause — tầng nào gây ra (DB, logic, config, infra)?
2. Cơ chế kỹ thuật — tại sao error này xảy ra?
3. Fix minimal + code cụ thể
4. Test để verify fix
5. Guard/validation gì để prevent tái phát?

---

## TEMPLATE 2 — Query / Database Chậm

PostgreSQL query chạy chậm. Cần phân tích bottleneck và fix.

**LINQ query (nếu dùng EF Core):**
```csharp
[PASTE LINQ]
```

**Generated SQL (lấy bằng .ToQueryString() hoặc DB log):**
```sql
[PASTE SQL]
```

**EXPLAIN ANALYZE output:**
```
[Chạy: EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) <query>;]
[PASTE KẾT QUẢ ĐẦY ĐỦ]
```

**Thông tin table:**
```sql
-- Chạy để lấy:
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

**Context:**
- Latency hiện tại: [X]ms / [X]s
- Target latency: [<Xms]
- Tần suất query: [mỗi request / mỗi phút / batch]
- Data scale: ~[N] rows trong table

Phân tích:
1. Bottleneck node trong execution plan (seq scan? hash join? sort?)
2. Tại sao planner chọn plan này (statistics lỗi thời? bad cardinality estimate?)
3. Fix: index nào cần thêm? query rewrite không?
4. Ước lượng latency sau fix
5. Side effect cần chú ý (lock khi thêm index, index bloat, ...)

---

## TEMPLATE 3 — Memory / OutOfMemory

Ứng dụng .NET bị [OutOfMemoryException / memory tăng liên tục / GC pressure cao].

**Triệu chứng cụ thể:**
- Memory: tăng từ [X]MB lên [Y]MB sau [Z phút / N requests]
- Xảy ra khi: [vd: "export báo cáo >100K rows", "sau vài giờ chạy worker"]
- GC: [Gen 2 collections cao / LOH fragmentation / ...]

**Code suspect:**
```csharp
[PASTE — thường là vòng lặp, stream handling, cache, event handler]
```

**Data volume:** [bao nhiêu records / file size bao nhiêu MB]

Phân tích:
1. Root cause khả năng nhất (không phải list tất cả — chỉ top 1-2)
2. Cách confirm (profiling command cụ thể để chạy)
3. Fix với code — ưu tiên streaming / batching / disposal
4. Ước lượng memory improvement sau fix
5. Pattern để tránh lặp lại

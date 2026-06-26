# Prompt: Debug

## Prompt — Debug lỗi runtime

Tôi gặp lỗi sau trong ứng dụng .NET 8 / PostgreSQL:

**Error:**
```
[PASTE FULL STACK TRACE]
```

**Context:**
- Xảy ra khi: [mô tả action trigger lỗi]
- Frequency: [luôn luôn / đôi khi / chỉ khi...]
- Environment: [dev / staging / production]
- Stack: .NET 8, EF Core 8, PostgreSQL 15

**Code liên quan:**
```csharp
[PASTE CODE]
```

**Tôi đã thử:**
- [Những gì đã thử]

Hãy phân tích:
1. Root cause (không chỉ symptom)
2. Tại sao error này xảy ra (explain cơ chế)
3. Fix chính xác với code
4. Cách prevent trong tương lai

---

## Prompt — Debug performance (query chậm)

Query PostgreSQL sau chạy chậm (~[X]s với [N] rows):

**SQL / LINQ:**
```sql
[PASTE QUERY]
```

**Execution Plan (nếu có):**
```
[PASTE EXPLAIN ANALYZE OUTPUT]
```

**Table info:**
- Row count: [ước lượng]
- Indexes hiện có: [liệt kê]
- Partitioned: [có/không]

Hãy phân tích theo thứ tự:
1. Bottleneck chính (seq scan? sort? hash join?)
2. Index nào nên thêm và tại sao (selectivity?)
3. Query rewrite nếu cần
4. Ước lượng improvement sau fix

---

## Prompt — Debug memory issue

Ứng dụng .NET bị [OutOfMemoryException / memory leak / high memory]:

**Triệu chứng:**
- Memory tăng từ [X]MB lên [Y]MB sau [Z] request/phút
- [Mô tả thêm]

**Code suspect:**
```csharp
[PASTE]
```

Phân tích:
1. Nguyên nhân khả năng nhất
2. Cách xác nhận (memory profiling hint)
3. Fix với giải thích tại sao fix được
4. Pattern tránh tương lai

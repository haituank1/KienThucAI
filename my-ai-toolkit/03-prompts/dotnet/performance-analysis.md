# Prompt: Phân tích Performance .NET

---

## TEMPLATE 1 — API Endpoint chậm

Stack: .NET 8, ASP.NET Core, EF Core 8, PostgreSQL.

Endpoint sau có latency cao và tôi cần tìm bottleneck.

**Endpoint:** `[METHOD] /api/[path]`
**Latency hiện tại:** ~[X]ms (P50) / ~[Y]ms (P99)
**Target:** <[Z]ms

**Full handler code:**
```csharp
[PASTE — bao gồm handler, dependencies, bất kỳ service nào được gọi]
```

**Profiling data (điền nếu có):**
- DB query time: [X]ms (Application Insights / EF Core slow query log)
- External HTTP call: [X]ms
- Serialization: [X]ms
- Business logic: [X]ms

**Load pattern:**
- Peak: ~[N] req/s
- Average: ~[N] req/s
- Concurrent users: ~[N]

Phân tích:
1. **Bottleneck theo thứ tự impact** — cái nào chiếm % thời gian lớn nhất?
2. **Quick wins** — thay đổi ít code, improvement ngay lập tức
3. **Giải pháp dài hạn** — cache, async streaming, DB optimization
4. **Ước lượng cụ thể** cho mỗi giải pháp (vd: "thêm cache → ~80% reduction")
5. **Risk** — giải pháp nào có side effect cần chú ý?

---

## TEMPLATE 2 — Memory / Allocation vấn đề

Code sau chạy trong hot path và gây GC pressure / allocation cao.

**Code:**
```csharp
[PASTE]
```

**BenchmarkDotNet result (nếu có):**
```
[PASTE — Method | Mean | Allocated]
```

**Triệu chứng:**
- Gen 0/1/2 GC collections: [X/s]
- Memory: [X MB per request / tăng liên tục]
- Xảy ra khi: [export lớn / concurrent requests / v.v.]

Phân tích:
1. Chỗ nào allocate nhiều nhất (new object trong loop? string concat? LINQ intermediate?)
2. Fix theo thứ tự impact:
   - Span<T> / Memory<T> thay byte array
   - ArrayPool<T> cho buffer tạm
   - StringBuilder cho string
   - Struct thay class nếu nhỏ và short-lived
3. Trade-off: readability vs performance cho từng fix
4. Viết lại hoàn chỉnh với allocation thấp hơn

---

## TEMPLATE 3 — Export / Import dữ liệu lớn

Đang xử lý [export/import] [N] records bị [chậm / OutOfMemoryException / timeout].

**Code hiện tại:**
```csharp
[PASTE]
```

**Data context:**
- Số records: ~[N]
- Kích thước record trung bình: ~[X] fields
- Format: [Excel / CSV / JSON / XML]
- Source: [PostgreSQL table / API / file]

**Vấn đề cụ thể:**
- [ ] OutOfMemoryException (load tất cả vào memory trước)
- [ ] Timeout (>30s)
- [ ] Chậm (mất [X]s cho [N] records)
- [ ] Blocking (user phải đợi download)

Hãy đề xuất:

1. **Streaming approach** — không load all vào memory
   - IAsyncEnumerable từ DB
   - Stream write trực tiếp ra response
   - Estimated memory usage

2. **Batch strategy**
   - Batch size optimal cho case này (PostgreSQL + EF Core)
   - Bulk read vs stream

3. **Background job approach** (nếu export > 30s)
   - Accept → queue job → notify khi xong
   - Pre-signed URL pattern

4. **Code hoàn chỉnh** cho approach được recommend

---

## TEMPLATE 4 — Concurrent / Thread Safety Issue

Code chạy fine single-threaded nhưng có vấn đề khi concurrent.

**Code:**
```csharp
[PASTE]
```

**Triệu chứng:**
- [Race condition / data corruption / deadlock / starvation]
- Xảy ra: [intermittent / chỉ dưới load cao / ...]

Phân tích:
1. Shared mutable state nào không được protect?
2. Lock granularity có đúng không? (quá coarse → bottleneck, quá fine → deadlock)
3. Fix: ConcurrentDictionary / Interlocked / SemaphoreSlim / Channel<T>?
4. Code fix với giải thích tại sao thread-safe
5. Test để reproduce issue (dùng Task.WhenAll + nhiều concurrent requests)

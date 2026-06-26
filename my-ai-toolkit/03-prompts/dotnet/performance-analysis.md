# Phân tích Performance .NET

Stack: .NET 8, ASP.NET Core, EF Core 8, PostgreSQL.

---

## API Endpoint chậm

**Endpoint:** `[METHOD] /api/[path]`
**Latency:** ~[X]ms (P50) / ~[Y]ms (P99) → target <[Z]ms

**Handler code:**
```csharp
[PASTE — bao gồm handler, dependencies, services được gọi]
```

**Profiling data (nếu có):** DB: [X]ms | HTTP: [X]ms | Serialization: [X]ms | Logic: [X]ms

**Load:** Peak ~[N] req/s | Average ~[N] req/s | Concurrent ~[N]

Phân tích: 1) Bottleneck theo thứ tự impact. 2) Quick wins. 3) Giải pháp dài hạn (cache, streaming, DB). 4) Ước lượng cụ thể mỗi giải pháp. 5) Risk / side effect.

---

## Memory / Allocation

**Code:**
```csharp
[PASTE — hot path]
```

**BenchmarkDotNet (nếu có):**
```
[Method | Mean | Allocated]
```

**Triệu chứng:** Gen 0/1/2: [X/s] | Memory: [X MB/request / tăng liên tục] | Khi: [...]

Phân tích: 1) Chỗ allocate nhiều nhất. 2) Fix theo impact: Span<T>/Memory<T> | ArrayPool<T> | StringBuilder | struct thay class. 3) Trade-off readability vs performance. 4) Code viết lại hoàn chỉnh.

---

## Export / Import dữ liệu lớn

Đang xử lý [export/import] [N] records bị [chậm / OOM / timeout].

**Code hiện tại:**
```csharp
[PASTE]
```

**Context:** Records ~[N] | Record size ~[X] fields | Format [Excel/CSV/JSON] | Source [PostgreSQL/API/file]

**Vấn đề:**
- [ ] OutOfMemoryException
- [ ] Timeout (>30s)
- [ ] Chậm ([X]s cho [N] records)
- [ ] Blocking (user phải đợi)

Đề xuất: 1) Streaming approach (IAsyncEnumerable + stream write). 2) Batch strategy + batch size optimal. 3) Background job nếu >30s (pre-signed URL). 4) Code hoàn chỉnh cho approach được chọn.

---

## Concurrent / Thread Safety

**Code:**
```csharp
[PASTE]
```

**Triệu chứng:** [Race condition / data corruption / deadlock / starvation] | Xảy ra: [intermittent / dưới load cao]

Phân tích: 1) Shared mutable state không protected. 2) Lock granularity đúng không? 3) Fix: ConcurrentDictionary / Interlocked / SemaphoreSlim / Channel<T>. 4) Code fix + giải thích thread-safe. 5) Test để reproduce (Task.WhenAll + concurrent requests).

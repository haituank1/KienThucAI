# Prompt: Phân tích Performance .NET

## Prompt — API endpoint chậm

API endpoint sau có latency cao (~[X]ms, target <[Y]ms):

**Endpoint:** `[METHOD] /api/path`

**Handler/Code:**
```csharp
[PASTE FULL HANDLER + DEPENDENCIES]
```

**Profiling data (nếu có):**
- [Application Insights / dotnet-trace / PerfView output]
- DB query time: [X]ms
- External call time: [X]ms
- CPU time: [X]ms

**Load:**
- [X] request/second peak
- [N] concurrent users

Phân tích:
1. Bottleneck theo thứ tự impact
2. Quick win (ít code change, high impact)
3. Giải pháp dài hạn
4. Ước lượng improvement cho mỗi giải pháp

---

## Prompt — Memory / Allocation

Code sau allocate quá nhiều memory trong hot path:

```csharp
[PASTE CODE]
```

**Benchmark hiện tại (nếu có BenchmarkDotNet):**
```
[PASTE BENCHMARK OUTPUT]
```

Phân tích:
1. Chỗ nào allocate nhiều nhất
2. Cách giảm allocation (Span<T>, ArrayPool, struct, v.v.)
3. Trade-off của từng optimization
4. Viết lại với allocation thấp hơn

---

## Prompt — Export/Import data lớn

Đang export [N] records ra [Excel/CSV/JSON], bị chậm hoặc OOM:

```csharp
[PASTE CODE HIỆN TẠI]
```

Hãy đề xuất giải pháp:
1. Streaming approach (không load all vào memory)
2. Batching strategy (batch size bao nhiêu là hợp lý)
3. Async/parallel nếu phù hợp
4. Ước lượng memory usage sau optimize

# Design Discussion

Stack: .NET 8, PostgreSQL, Clean Architecture + CQRS. Dùng trước khi code, không phải sau.

---

## Feedback approach của tôi

Tôi đang plan implement [tên feature] theo cách sau:

**Approach:**
[Mô tả — pseudo-code hoặc ASCII diagram]

```csharp
// Code sketch
[PASTE NẾU CÓ]
```

**Assumptions:**
- [assumption 1]

**Chưa chắc về:**
- [điểm không chắc]

Đánh giá: 1) Điểm mạnh. 2) Điểm yếu / risk. 3) Alternative + trade-off. 4) Recommendation nếu là tech lead.

Đừng ừ theo nếu có vấn đề — nói thẳng.

---

## So sánh 2 approach

**Vấn đề:** [tên]

**Approach A:** [Mô tả]

**Approach B:** [Mô tả]

**Context:**
- Scale: [N users / N req/s / N rows]
- Team: [N devs] | Maintenance: [long-term / short-term]
- Priority: [latency / throughput / memory]

So sánh: Performance | Complexity | Scalability | Testability | Khi nào A/B tốt hơn?

Recommendation cho context này + lý do.

---

## Review design trước khi implement

**Design cho [tên feature]:**
```
[ASCII diagram / schema SQL / API spec]
```

**Requirement:**
- [req 1]

Checklist:
- [ ] Đủ support requirement?
- [ ] Missing edge case?
- [ ] Performance bottleneck khi scale?
- [ ] Migration path nếu requirement thay đổi?
- [ ] Điều gì có thể regret sau 6 tháng?

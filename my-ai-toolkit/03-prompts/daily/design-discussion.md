# Prompt: Design Discussion

> Dùng khi cần tư vấn trước khi code, không phải sau khi code xong.
> Prompt này cho AI vai trò "senior reviewer" thay vì "code generator".

---

## TEMPLATE 1 — Tôi đang plan approach, cần feedback

Stack: .NET 8, PostgreSQL, Clean Architecture + CQRS.

Tôi đang plan implement [tên feature] theo cách sau:

**Approach của tôi:**
[Mô tả approach — có thể dùng pseudo-code hoặc diagram ASCII]

```csharp
// Code sketch (không cần hoàn chỉnh)
[PASTE NẾU CÓ]
```

**Assumptions:**
- [assumption 1]
- [assumption 2]

**Tôi chưa chắc về:**
- [điểm không chắc 1]
- [điểm không chắc 2]

Hãy đánh giá approach này:
1. Điểm mạnh — cái gì tôi đang làm đúng?
2. Điểm yếu / risk — cái gì có thể gây vấn đề?
3. Alternative — có approach tốt hơn không? So sánh trade-off.
4. Recommendation — nếu bạn là tech lead, bạn chọn cách nào và tại sao?

Đừng chỉ ừ theo approach của tôi nếu nó có vấn đề — nói thẳng.

---

## TEMPLATE 2 — So sánh 2 approach

Tôi đang cân nhắc giữa 2 approach cho [tên vấn đề]:

**Approach A:**
[Mô tả]

**Approach B:**
[Mô tả]

**Context:**
- Scale: [N users / N requests/s / N rows]
- Team size: [N devs]
- Maintenance: [long-term product / short-term project]
- Performance priority: [latency / throughput / memory]

So sánh theo:
1. Performance (latency, throughput, memory)
2. Complexity (implementation + maintenance)
3. Scalability
4. Testability
5. Khi nào A tốt hơn B và ngược lại?

Recommendation cuối: chọn cái nào cho context của tôi và tại sao?

---

## TEMPLATE 3 — Review design trước khi implement

Tôi vừa thiết kế schema / API / architecture cho [tên feature].

**Design:**
```
[Diagram ASCII, schema SQL, hoặc API spec]
```

**Requirement:**
- [req 1]
- [req 2]

Hãy review theo checklist:
- [ ] Schema/design có đủ để support requirement không?
- [ ] Có missing case / edge case nào không?
- [ ] Performance bottleneck ở đâu khi scale lên?
- [ ] Migration path nếu requirement thay đổi?
- [ ] Điều gì tôi có thể regret sau 6 tháng?

Nếu có vấn đề lớn → nói trước khi tôi code, không phải sau.

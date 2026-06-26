# Prompt: System Design Discussion

> Dùng khi thiết kế feature mới ở mức hệ thống — trước khi viết 1 dòng code.

---

## TEMPLATE 1 — Design feature mới end-to-end

Tôi cần thiết kế [tên feature] từ đầu.

**Business requirement:**
- [req 1]
- [req 2]

**Scale:**
- Users: ~[N]
- Requests: ~[N] req/s peak
- Data: ~[N] records, tăng [X]%/tháng

**Stack hiện tại:** .NET 8, PostgreSQL, Redis, RabbitMQ, Clean Architecture.

**Constraint:**
- [ ] Không downtime khi deploy
- [ ] Backward compatible API
- [ ] Budget cho infra: [giữ nguyên / có thể scale]
- [ ] Timeline: [X weeks]

Hãy đề xuất design:

1. **Architecture overview** — diagram ASCII hoặc mô tả flow

2. **Data model** — tables, relationships, indexing strategy

3. **API design** — endpoints, request/response shape

4. **Async processing** — có cần message queue không? Tại sao?

5. **Caching strategy** — cache gì, TTL, invalidation

6. **Failure scenarios** — điều gì xảy ra khi DB chậm? Queue down? External service timeout?

7. **Trade-offs** — những quyết định design có alternative và tôi nên biết

---

## TEMPLATE 2 — Scalability review

Feature hiện tại hoạt động tốt ở [N] users nhưng cần scale lên [X*N] users.

**Current design:**
```
[Mô tả hoặc diagram]
```

**Bottleneck nghi ngờ:**
- [ ] DB (read / write)
- [ ] Memory (in-process state)
- [ ] External API rate limit
- [ ] Session/auth
- [ ] File/blob storage

**Scale target:** [X] req/s với [P99 < Yms]

Phân tích:
1. Bottleneck thật sự ở đâu (không phải nghi ngờ)?
2. Giải pháp theo từng bottleneck với trade-off
3. Thứ tự ưu tiên: cái nào làm trước để impact cao nhất?
4. Load testing approach để validate

---

## TEMPLATE 3 — Decision: Monolith vs Microservice / Synchronous vs Async

Tôi đang cân nhắc [quyết định kiến trúc] cho [context cụ thể].

**Option A:** [Mô tả]
**Option B:** [Mô tả]

**Context:**
- Team size: [N devs]
- Deployment frequency: [mỗi ngày / mỗi tuần / ...]
- Domain complexity: [high / medium / low]
- Scale requirement: [N req/s]
- Current maturity: [startup / growth / enterprise]

So sánh theo:
1. Operational complexity (deploy, monitor, debug)
2. Development velocity (bao lâu để deliver feature)
3. Fault isolation (1 component chết có ảnh hưởng toàn bộ không?)
4. Data consistency (eventual vs strong consistency)
5. Team skill requirement

Recommendation cho context của tôi — với lý do cụ thể, không chung chung.

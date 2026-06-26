# System Design Discussion

Stack: .NET 8, PostgreSQL, Redis, RabbitMQ, Clean Architecture. Dùng trước khi viết 1 dòng code.

---

## Design feature mới end-to-end

**Feature:** [tên]

**Business requirement:**
- [req 1]
- [req 2]

**Scale:** Users ~[N] | Peak [N] req/s | Data ~[N] records tăng [X]%/tháng

**Constraint:**
- [ ] Không downtime khi deploy
- [ ] Backward compatible API
- [ ] Infra budget: [giữ nguyên / scale]
- [ ] Timeline: [X weeks]

Đề xuất: 1) Architecture overview (ASCII diagram / flow). 2) Data model (tables, relationships, indexing). 3) API design (endpoints, request/response). 4) Async processing — có cần queue không? Tại sao? 5) Caching strategy (cache gì, TTL, invalidation). 6) Failure scenarios (DB chậm / queue down / external timeout). 7) Trade-offs + alternatives.

---

## Scalability review

**Current design:**
```
[Mô tả hoặc diagram]
```

Hoạt động tốt ở [N] users, cần scale lên [X*N].

**Bottleneck nghi ngờ:**
- [ ] DB (read / write)
- [ ] Memory (in-process state)
- [ ] External API rate limit
- [ ] Session/auth
- [ ] File/blob storage

**Target:** [X] req/s, P99 < [Y]ms

Phân tích: 1) Bottleneck thật sự ở đâu. 2) Giải pháp + trade-off. 3) Thứ tự ưu tiên (impact cao nhất trước). 4) Load testing approach để validate.

---

## Monolith vs Microservice / Sync vs Async

**Option A:** [Mô tả]
**Option B:** [Mô tả]

**Context:**
- Team: [N devs] | Deploy: [mỗi ngày / tuần]
- Domain complexity: [high / medium / low]
- Scale: [N req/s] | Maturity: [startup / growth / enterprise]

So sánh: 1) Operational complexity. 2) Dev velocity. 3) Fault isolation. 4) Data consistency. 5) Team skill requirement.

Recommendation cho context này — lý do cụ thể, không chung chung.

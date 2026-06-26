# Postmortem Template

> Dùng sau mỗi production incident đáng kể (P0/P1).
> Mục đích: học từ lỗi, không blame người. "Blameless postmortem."
>
> Dùng: Copy → đổi tên `POSTMORTEM_[YYYY-MM-DD]_[ShortTitle].md`
> Điền trong vòng 48h sau khi incident resolved.

---

## Incident Summary

| Field | Value |
|-------|-------|
| Title | [1 câu mô tả — vd: "Payment webhook processing stopped for 2 hours"] |
| Date | [YYYY-MM-DD] |
| Duration | [HH:MM] – [HH:MM] ([X] giờ [Y] phút) |
| Severity | P0 / P1 / P2 |
| Status | Resolved |
| Author | Tuan Nguyen |

---

## Impact

- **Users affected:** ~[N] users / [X]% of traffic
- **Revenue impact:** ~[N] VND / [Mô tả impact]
- **Features down:** [Tên feature / endpoint]
- **Data loss:** [Có / Không / [N] records bị ảnh hưởng]
- **SLA breach:** [Có / Không] — uptime xuống còn [X]%

---

## Timeline

> Blameless — ghi event, không ghi "ai làm sai"

| Time | Event |
|------|-------|
| HH:MM | Deployment [version X] completed |
| HH:MM | First error alert triggered (Sentry / Application Insights) |
| HH:MM | On-call engineer acknowledged |
| HH:MM | Incident declared — team notified |
| HH:MM | Root cause identified: [1 câu] |
| HH:MM | Mitigation applied: [rollback / hotfix / config change] |
| HH:MM | Traffic recovery confirmed |
| HH:MM | Incident resolved |
| **TTD** | Time to Detect: [X phút] |
| **TTR** | Time to Resolve: [X phút] |

---

## Root Cause Analysis

### What happened?

[Mô tả kỹ thuật — tại sao system behaved như vậy. Không chỉ "bug in code".]

**Cơ chế:** [Ví dụ: "Migration thêm column NOT NULL không có default đã lock toàn bộ orders table 8 phút. Trong thời gian đó, mọi write đến orders bị timeout, dẫn đến payment webhook processing queue lên đến 50K backlog."]

### Why didn't we catch this earlier?

- [ ] Không có test coverage cho scenario này
- [ ] Staging không có production-size data
- [ ] Alert threshold quá cao (chỉ alert sau [X] phút)
- [ ] Code review không catch được risk
- [ ] Runbook thiếu step kiểm tra [gì đó]
- [Lý do khác]

### Contributing factors

1. [Factor 1 — vd: "Table 50M rows không được estimate trước"]
2. [Factor 2]
3. [Factor 3]

---

## What Went Well

> Những gì đã làm tốt trong incident này — reinforcement learning.

- [vd: "Alert triggered trong 3 phút — monitoring đang hoạt động tốt"]
- [vd: "Rollback hoàn thành trong 5 phút — deployment process tốt"]
- [vd: "Team communication rõ ràng, không có confusion về ai đang làm gì"]

---

## What Went Poorly

> Không blame — chỉ mô tả sự kiện.

- [vd: "Staging environment không có production-size data → migration time không được estimate đúng"]
- [vd: "Runbook không cover database migration scenario"]
- [vd: "Không có feature flag để disable payment processing trong maintenance"]

---

## Action Items

> Cụ thể, có owner, có deadline.

| # | Action | Owner | Due | Priority |
|---|--------|-------|-----|----------|
| 1 | [Thêm migration staging test với production data dump] | Tuan | [YYYY-MM-DD] | P1 |
| 2 | [Thêm alert cho orders write latency > 500ms] | DevOps | [YYYY-MM-DD] | P1 |
| 3 | [Update runbook: DB migration checklist] | Tuan | [YYYY-MM-DD] | P2 |
| 4 | [Implement feature flag cho payment processing] | Team | [YYYY-MM-DD] | P2 |
| 5 | [Add regression test cho migration lock scenario] | Tuan | [YYYY-MM-DD] | P2 |

---

## Lessons Learned

> Insights có thể apply cho future work — bổ sung vào toolkit.

**Technical lessons:**
- [vd: "ALTER TABLE ADD COLUMN NOT NULL trên table > 10M rows phải dùng expand-contract pattern"]
- [vd: "Luôn estimate migration time trên staging với production data trước khi apply prod"]

**Process lessons:**
- [vd: "Migration lớn cần approval từ lead, không deploy cuối ngày thứ Sáu"]
- [vd: "Incident communication template cần chuẩn bị sẵn"]

**Thêm vào toolkit:**
- [ ] `05-snippets/postgresql/gotchas.md` — thêm migration lock gotcha
- [ ] `04-specs/DB_MIGRATION_TEMPLATE.md` — thêm risk matrix cho loại operation này
- [ ] `02-rules/postgresql.md` — thêm rule về migration trên large table

---

## References

- Incident ticket: [link]
- Related Jira: [link]
- Monitoring dashboard lúc incident: [link]
- Slack thread: [link]

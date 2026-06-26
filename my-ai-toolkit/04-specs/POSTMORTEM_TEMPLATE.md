# Postmortem — [YYYY-MM-DD] [ShortTitle]

Blameless postmortem. Điền trong vòng 48h sau khi resolved.

## Incident Summary

| Field | Value |
|-------|-------|
| Title | [1 câu — vd: "Payment webhook processing stopped for 2 hours"] |
| Date | [YYYY-MM-DD] |
| Duration | [HH:MM] – [HH:MM] ([X] giờ [Y] phút) |
| Severity | P0 / P1 / P2 |
| Status | Resolved |
| Author | Tuan Nguyen |

---

## Impact

- **Users affected:** ~[N] / [X]% of traffic
- **Revenue impact:** ~[N] VND / [mô tả]
- **Features down:** [tên feature / endpoint]
- **Data loss:** [Có / Không / [N] records]
- **SLA breach:** [Có / Không] — uptime [X]%

---

## Timeline

| Time | Event |
|------|-------|
| HH:MM | Deployment [version X] |
| HH:MM | First error alert |
| HH:MM | On-call acknowledged |
| HH:MM | Incident declared |
| HH:MM | Root cause: [1 câu] |
| HH:MM | Mitigation: [rollback / hotfix / config] |
| HH:MM | Traffic recovered |
| HH:MM | Resolved |
| **TTD** | [X phút] |
| **TTR** | [X phút] |

---

## Root Cause Analysis

**Cơ chế:** [Tại sao system behaved như vậy — không chỉ "bug in code"]

**Tại sao không catch được sớm hơn:**
- [ ] Thiếu test coverage
- [ ] Staging không có production-size data
- [ ] Alert threshold quá cao
- [ ] Code review không catch được
- [ ] Runbook thiếu step
- [Khác]

**Contributing factors:**
1. [Factor 1]
2. [Factor 2]

---

## What Went Well

- [vd: "Alert triggered trong 3 phút"]
- [vd: "Rollback trong 5 phút"]

---

## What Went Poorly

- [vd: "Staging không có production data → migration time estimate sai"]
- [vd: "Runbook không cover DB migration scenario"]

---

## Action Items

| # | Action | Owner | Due | Priority |
|---|--------|-------|-----|----------|
| 1 | [Migration staging test với prod data] | Tuan | [YYYY-MM-DD] | P1 |
| 2 | [Alert orders write latency > 500ms] | DevOps | [YYYY-MM-DD] | P1 |
| 3 | [Update runbook: DB migration checklist] | Tuan | [YYYY-MM-DD] | P2 |

---

## Lessons Learned

**Technical:**
- [vd: "ALTER TABLE ADD COLUMN NOT NULL > 10M rows → expand-contract pattern"]

**Process:**
- [vd: "Migration lớn cần lead approval, không deploy thứ Sáu"]

**Thêm vào toolkit:**
- [ ] `05-snippets/postgresql/gotchas.md`
- [ ] `04-specs/DB_MIGRATION_TEMPLATE.md`
- [ ] `02-rules/postgresql.md`

---

## References

- Incident ticket: [link]
- Monitoring dashboard: [link]
- Slack thread: [link]

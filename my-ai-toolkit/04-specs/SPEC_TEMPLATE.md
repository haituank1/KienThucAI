# Feature Spec Template

> Copy file này, đổi tên thành `SPEC_[FeatureName].md`, điền nội dung.

---

## Metadata
- **Feature:** [Tên feature]
- **Jira:** [Ticket link]
- **Author:** [Tên]
- **Date:** [YYYY-MM-DD]
- **Status:** Draft / Review / Approved

---

## Problem Statement
[1-2 câu: Vấn đề đang giải quyết, tại sao cần làm]

## Solution Overview  
[Approach ở mức cao — không phải chi tiết implementation]

---

## Functional Requirements

### Happy Path
1. [Step 1]
2. [Step 2]
3. [Expected outcome]

### Edge Cases
| Scenario | Expected Behavior |
|----------|-------------------|
| [case 1] | [behavior] |
| [case 2] | [behavior] |

### Out of Scope
- [Thứ không làm trong ticket này]

---

## Technical Design

### API Contract
```
[METHOD] /api/[endpoint]

Request:
{
  "field": "type"
}

Response 200:
{
  "field": "type"
}

Response 4xx:
{
  "error": "message"
}
```

### Data Model Changes
```sql
-- Migration needed:
ALTER TABLE ...
CREATE INDEX ...
```

### Dependencies
- Service: [tên service / external API]
- Event: [event publish/consume nếu có]
- Cache: [cache key / TTL nếu có]

---

## Non-Functional Requirements
- **Performance:** [target latency / throughput]
- **Data volume:** [bao nhiêu records affected]
- **Concurrency:** [concurrent users / requests]
- **Rollback plan:** [cách rollback nếu có vấn đề]

---

## Acceptance Criteria
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
- [ ] Unit tests cover happy path + edge cases
- [ ] No N+1 query
- [ ] Logging đủ để debug production issue

---

## Open Questions
| Question | Owner | Due | Answer |
|----------|-------|-----|--------|
| [?] | [name] | [date] | |

---

## Notes / Decisions Log
- [YYYY-MM-DD]: [Decision và lý do]

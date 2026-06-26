# Feature Spec — [FeatureName]

## Metadata

| Field | Value |
|-------|-------|
| Feature | [Tên feature] |
| Jira | [TICKET-123](link) |
| Author | Tuan Nguyen |
| Date | [YYYY-MM-DD] |
| Status | `Draft` → `Review` → `Approved` |
| Complexity | `S` (<1 ngày) / `M` (1-3 ngày) / `L` (3-5 ngày) / `XL` (>1 tuần) |

---

## Problem Statement

[1-3 câu: vấn đề gì, tại sao làm bây giờ, ai bị ảnh hưởng]

---

## Solution Overview

[2-4 câu approach ở mức cao]

**Alternative đã loại:** [A] — vì [lý do]

---

## Functional Requirements

### Happy Path
1. [Actor] thực hiện [action]
2. System xử lý [gì]
3. Kết quả: [expected outcome]

### Edge Cases & Errors

| Scenario | Expected Behavior | HTTP Status |
|----------|-------------------|-------------|
| Resource không tồn tại | 404 message rõ ràng | 404 |
| Input invalid | Validation error + field cụ thể | 400 |
| Không có quyền | 403 — không leak thông tin | 403 |
| Duplicate / conflict | 409 + explanation | 409 |
| External service down | Graceful degradation / retry | 503 |
| Quá lớn / quá nhiều | Limit rõ ràng | 4xx |

### Out of Scope
- [Thứ 1]

---

## Technical Design

### API Contract

```
[METHOD] /api/v1/[resource]
Authorization: Bearer {token}

Request:
{ "field1": "string", "field2": 0, "field3": "string|null" }

Response 201/200:
{ "success": true, "data": { "id": "uuid" } }

Response 400:
{ "success": false, "validationErrors": ["..."] }

Response 4xx/5xx:
{ "success": false, "error": "..." }
```

### Data Model Changes

```sql
ALTER TABLE [table] ADD COLUMN [name] [type] NOT NULL DEFAULT [value];
CREATE INDEX CONCURRENTLY idx_[table]_[columns] ON [table]([col1], [col2]) WHERE [condition];
-- dotnet ef migrations add [Name]
```

```csharp
// Entity changes
```

### Flow (nếu async / event-driven)

```
Client → API → [Handler] → DB
                         → [Event] → [Consumer] → [Side effect]
```

### Dependencies

| Dependency | Type | Impact nếu down |
|-----------|------|-----------------|
| [Service/Table] | Internal | [blocking / degraded] |
| [External API] | External | [retry / fallback] |

---

## Non-Functional

| Metric | Target |
|--------|--------|
| Response time (P99) | <[X]ms |
| Throughput | [N] req/s |
| Error rate | <0.1% |

**Rollback plan:** [feature flag / migration down / revert deploy]

---

## Acceptance Criteria

**Functional:**
- [ ] [criterion 1 — cụ thể, testable]
- [ ] Error cases đúng HTTP status + message

**Technical:**
- [ ] Unit test: happy path + edge cases
- [ ] Integration test nếu có DB/external
- [ ] No N+1 (verify bằng EF Core log)
- [ ] CancellationToken pass đúng
- [ ] Logging đủ để debug production
- [ ] Migration reviewed + tested staging

**Performance:**
- [ ] Load test confirm target latency
- [ ] Memory stable sau extended run

---

## Open Questions

| # | Question | Owner | Due | Status |
|---|----------|-------|-----|--------|
| 1 | [?] | [name] | [YYYY-MM-DD] | Open |

---

## Decision Log

| Date | Decision | Reason | By |
|------|----------|--------|----|
| [YYYY-MM-DD] | [Decision] | [Tại sao] | [Who] |

---

## Implementation Notes

- [Thay đổi so với spec khi implement]
- [Gotcha phát hiện trong lúc code]
- [Technical debt được accept + lý do]

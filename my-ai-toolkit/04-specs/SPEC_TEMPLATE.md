# Feature Spec Template

> Dùng: Copy file này → đổi tên `SPEC_[FeatureName].md` → điền nội dung.
> Hoặc paste Jira ticket vào Claude + prompt: "Fill SPEC_TEMPLATE cho ticket này"

---

## Metadata

| Field | Value |
|-------|-------|
| Feature | [Tên feature ngắn gọn] |
| Jira | [TICKET-123](link) |
| Author | Tuan Nguyen |
| Date | [YYYY-MM-DD] |
| Status | `Draft` → `Review` → `Approved` |
| Complexity | `S` (< 1 ngày) / `M` (1-3 ngày) / `L` (3-5 ngày) / `XL` (> 1 tuần) |

---

## Problem Statement

> Trả lời: **Vấn đề gì? Tại sao phải làm bây giờ? Ai bị ảnh hưởng?**

[1-3 câu. Ví dụ: "Sales team không thể export báo cáo doanh thu khi có hơn 100K records vì bị timeout. Điều này xảy ra cuối mỗi tháng, ảnh hưởng ~50 users."]

---

## Solution Overview

> Approach ở mức cao — không phải chi tiết code.

[2-4 câu mô tả approach. Ví dụ: "Implement background job export với streaming để tránh OOM. User nhận notification/email khi file sẵn sàng. File lưu tạm trên S3 với TTL 24h."]

**Alternative đã loại bỏ:**
- [Alternative A] — loại vì [lý do]

---

## Functional Requirements

### Happy Path
1. [Actor] thực hiện [action]
2. System xử lý [gì]
3. Kết quả: [expected outcome]

### Edge Cases & Error Handling

| Scenario | Expected Behavior | HTTP Status |
|----------|-------------------|-------------|
| [Không tìm thấy resource] | Return 404 với message rõ ràng | 404 |
| [Input invalid] | Validation error với field cụ thể | 400 |
| [Không có quyền] | 403 — không leak thông tin tồn tại | 403 |
| [Duplicate / conflict] | 409 với explanation | 409 |
| [External service down] | Graceful degradation hoặc retry | 503 |
| [Quá lớn / quá nhiều] | 413 hoặc limit rõ ràng | 4xx |

### Out of Scope (ticket này KHÔNG làm)
- [Thứ 1]
- [Thứ 2]

---

## Technical Design

### API Contract

```
[METHOD] /api/v1/[resource]
Authorization: Bearer {token}

Request Body:
{
  "field1": "string",       // required
  "field2": 0,              // required, > 0
  "field3": "string|null"   // optional
}

Response 201 / 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "field": "value"
  }
}

Response 400:
{
  "success": false,
  "validationErrors": ["field1 is required"]
}

Response 4xx/5xx:
{
  "success": false,
  "error": "Human-readable message"
}
```

### Data Model Changes

```sql
-- Thêm column / table mới
ALTER TABLE [table] ADD COLUMN [name] [type] NOT NULL DEFAULT [value];

-- Index cần thiết (dùng CONCURRENTLY nếu production)
CREATE INDEX CONCURRENTLY idx_[table]_[columns]
ON [table]([col1], [col2])
WHERE [condition]; -- partial index nếu cần

-- Migration EF Core: dotnet ef migrations add [Name]
```

**Entity changes:**
```csharp
// Domain entity thay đổi gì
```

### Flow Diagram (nếu có async / event-driven)

```
Client → API → [Handler] → DB
                         → [Event] → [Consumer] → [Side effect]
```

### Dependencies

| Dependency | Type | Impact nếu down |
|-----------|------|-----------------|
| [Service/Table] | Internal | [blocking / degraded] |
| [External API] | External | [retry / fallback] |
| [Redis cache] | Cache | [slower, hit DB directly] |
| [Event queue] | Async | [delayed processing] |

---

## Non-Functional Requirements

| Metric | Target | Current (nếu có) |
|--------|--------|-----------------|
| Response time (P99) | < [X]ms | [Y]ms |
| Throughput | [N] req/s | - |
| Data volume | [N] records | - |
| Error rate | < 0.1% | - |
| Availability | 99.9% | - |

**Rollback plan:** [Cách rollback nếu có vấn đề sau deploy — feature flag / migration down / revert deploy]

---

## Acceptance Criteria

**Functional:**
- [ ] [Testable criterion 1 — specific, không ambiguous]
- [ ] [Testable criterion 2]
- [ ] Error cases return đúng HTTP status + message

**Technical:**
- [ ] Unit test cover: happy path + tất cả edge case trong bảng trên
- [ ] Integration test (nếu có DB/external service)
- [ ] No N+1 query (verify bằng EF Core query log)
- [ ] CancellationToken được pass đúng
- [ ] Logging đủ để debug production issue (request ID, key identifiers)
- [ ] Migration reviewed + tested trên staging

**Performance:**
- [ ] Load test confirm target latency
- [ ] Memory stable (không tăng sau extended run)

---

## Open Questions

| # | Question | Owner | Due | Status |
|---|----------|-------|-----|--------|
| 1 | [?] | [name] | [YYYY-MM-DD] | ⏳ Open |

---

## Decision Log

| Date | Decision | Reason | Made by |
|------|----------|--------|---------|
| [YYYY-MM-DD] | [Decision] | [Tại sao] | [Who] |

---

## Implementation Notes (điền khi code)

> Ghi lại những gì thực tế khác với spec — để người đọc code sau hiểu.

- [Lý do thay đổi approach khi implement]
- [Gotcha phát hiện trong lúc code]
- [Technical debt được accept và lý do]

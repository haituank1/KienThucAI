# Architecture Decision Record (ADR) Template

> ADR = ghi lại quyết định kiến trúc quan trọng, TẠI SAO đưa ra quyết định đó,
> và trade-off đã chấp nhận. Quan trọng khi team member mới join hoặc re-evaluate sau.
>
> Dùng: Copy → đổi tên `ADR_[NNN]_[ShortTitle].md` (ví dụ: ADR_001_UseOutboxPattern.md)

---

## ADR-[NNN]: [Tiêu đề ngắn gọn]

| Field | Value |
|-------|-------|
| Date | [YYYY-MM-DD] |
| Status | `Proposed` → `Accepted` → `Deprecated` → `Superseded by ADR-XXX` |
| Author | Tuan Nguyen |
| Reviewers | [Tên] |
| Ticket | [TICKET-123](link) — optional |

---

## Context

> Mô tả tình huống dẫn đến quyết định này. Vấn đề gì cần giải quyết?
> Technical constraint? Business requirement? Performance issue?

[2-5 câu mô tả context. Ví dụ: "Khi publish domain event, nếu application crash sau khi commit DB nhưng trước khi publish message, event bị mất và downstream service không được notify. Với growing event-driven architecture, consistency giữa DB write và message publish trở thành critical requirement."]

---

## Decision

> Quyết định là gì? Phát biểu rõ ràng, không ambiguous.

**Chúng tôi sẽ [làm gì].**

[1-3 câu mô tả quyết định. Ví dụ: "Implement Transactional Outbox Pattern sử dụng MassTransit built-in Outbox với EF Core. Event được lưu vào outbox table cùng transaction với DB write. Background worker đọc outbox và publish message."]

---

## Options Considered

### Option A: [Tên] ← **Được chọn**

**Mô tả:** [Mô tả approach]

**Pros:**
- [Pro 1]
- [Pro 2]

**Cons:**
- [Con 1]
- [Con 2]

---

### Option B: [Tên]

**Mô tả:** [Mô tả approach]

**Pros:**
- [Pro 1]

**Cons:**
- [Con 1]
- [Con 2 — lý do chính không chọn]

---

### Option C: [Tên — nếu có]

[Tương tự]

---

## Consequences

### Positive
- [Lợi ích chính — vd: "Event consistency được đảm bảo dù app crash"]
- [Lợi ích 2]

### Negative (trade-offs chấp nhận)
- [Trade-off 1 — vd: "Thêm complexity: outbox table, background worker"]
- [Trade-off 2 — vd: "Eventual consistency thay vì immediate — downstream service nhận event sau ~1s"]

### Risks
- [Risk 1 — vd: "Outbox table có thể tăng size nhanh nếu worker bị stuck"]
- Mitigation: [Cách giảm thiểu risk]

---

## Implementation Notes

> Những điều quan trọng cần biết khi implement quyết định này.

```csharp
// Key code pattern hoặc configuration
[Example code nếu hữu ích]
```

- [Note 1 — vd: "MassTransit Outbox cần EF Core DbContext dùng Npgsql"]
- [Note 2]

---

## Review Date

> Khi nào nên re-evaluate quyết định này?

[Ví dụ: "Re-evaluate nếu message volume > 10K/phút hoặc sau 1 năm production"]

---

## References

- [Link tài liệu / blog / issue liên quan]
- [ADR-XXX: Related decision]

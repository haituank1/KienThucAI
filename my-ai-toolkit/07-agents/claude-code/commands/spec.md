# Claude Code Custom Command: /spec

> Đặt ở `.claude/commands/spec.md`
> Dùng: `/spec [mô tả feature hoặc paste Jira ticket]`

---

Đọc CLAUDE.md và codebase để hiểu project context, sau đó tạo SPEC document cho feature sau.

Stack: .NET 8, PostgreSQL, Clean Architecture + CQRS.

**Output SPEC gồm:**

```markdown
## [Feature Name] — Complexity: S/M/L/XL

### Problem Statement
[1-2 câu: vấn đề gì, ai bị ảnh hưởng]

### Solution Overview  
[Approach — không phải code detail]

### API Contract (nếu có)
[METHOD] /api/v1/[resource]
Request: { ... }
Response 200: { ... }
Response 4xx: { ... }

### Data Model Changes
[Schema thay đổi + index cần thêm]

### Edge Cases & Error Handling
| Scenario | Expected Behavior |
|----------|-------------------|
| ... | ... |

### Acceptance Criteria
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
- [ ] No N+1 query
- [ ] Unit tests cho happy path + edge cases

### Technical Risks
- [Performance: vd "export 1M rows → cần streaming"]  
- [Migration: vd "ADD COLUMN NOT NULL trên 50M rows → cần planning"]
- [Breaking change: vd "rename field → cần versioning"]

### Open Questions
| # | Question | Who to ask |
|---|----------|-----------|
| 1 | [...] | PM/BA/Tech Lead |
```

Sau khi tạo SPEC:
1. Highlight risk lớn nhất nếu có
2. Hỏi: "Approve approach này không? Muốn tôi bắt đầu implement từ Domain layer?"

# Bug Report Template

> Dùng: Copy file này → đổi tên `BUG_[ID]_[ShortDescription].md` → điền nội dung.
> Paste stack trace + code vào Claude với prompt từ `03-prompts/session-starters/new-bug.md`

---

## Metadata

| Field | Value |
|-------|-------|
| Bug ID | [TICKET-123](link) |
| Severity | `P0 - Critical` / `P1 - High` / `P2 - Medium` / `P3 - Low` |
| Environment | Dev / Staging / **Production** |
| Reported | [YYYY-MM-DD HH:MM] |
| Reported by | [Tên / Monitoring alert] |
| Assigned | Tuan Nguyen |
| Status | `Investigating` → `Fix Ready` → `Deployed` → `Verified` |

---

## Impact Assessment

> Điền ngay khi nhận bug — trước khi debug.

- **Scope:** [X% users / X users / specific feature]
- **Data affected:** [Có mất/corrupt data không?]
- **Workaround:** [Có cách tạm thời không? — vd: "user có thể dùng export CSV thay"]
- **Business impact:** [Low / Medium / High / Revenue-impacting]

---

## Bug Description

**Một câu:** [Mô tả chính xác — vd: "Order status không được cập nhật khi payment webhook retry"]

| | Behavior |
|---|---|
| **Expected** | [Điều lẽ ra xảy ra] |
| **Actual** | [Điều đang xảy ra] |

**Reproduction Steps:**
1. [Step 1 — cụ thể, với data example]
2. [Step 2]
3. **→ Bug xảy ra tại đây**

**Frequency:** `Always` / `~X%` / `Chỉ khi [condition]` / `Intermittent`

---

## Technical Analysis

### Error / Stack Trace
```
[PASTE ĐẦY ĐỦ — inner exception, correlation ID nếu có]
```

### Logs liên quan
```
[Log lines xung quanh thời điểm xảy ra — format: timestamp + level + message]
```

### Root Cause

> Điền sau khi debug — giải thích cơ chế, không chỉ "sai ở dòng X"

**Tầng bị lỗi:** [ ] Domain  [ ] Application  [ ] Infrastructure  [ ] Config  [ ] External

**Cơ chế:** [Tại sao lỗi này xảy ra — ví dụ: "Race condition khi 2 webhook cùng retry trong 500ms, cả 2 đều thấy status='pending' và update, record cuối cùng overwrites record trước"]

**Trigger condition:** [Chính xác điều kiện nào gây ra bug]

### Code Location
```
File:   src/[Layer]/[Feature]/[FileName].cs
Method: [MethodName]
Line:   ~[N]
```

---

## Fix

### Approach
[Mô tả approach — 2-3 câu. Tại sao chọn cách này, không phải cách khác?]

### Code Change

```csharp
// BEFORE:
[code cũ — đủ context để hiểu]

// AFTER:
[code mới — production-ready, không viết tắt]
```

### Schema / Migration cần thiết
- [ ] Không cần migration
- [ ] Cần migration: [mô tả thay đổi]
```sql
[SQL nếu có]
```

### Deployment notes
- [ ] Cần restart service
- [ ] Cần run data fix script
- [ ] Cần config thay đổi
- [ ] Có thể hot deploy

---

## Testing & Verification

### Reproduce test (viết trước khi fix)
```csharp
[Unit test reproduce scenario bug]
```

### Verification steps sau deploy
1. [Cụ thể — vd: "Chạy query: SELECT status FROM orders WHERE id = 'abc'"]
2. [Monitor metric nào trong 30 phút sau deploy]
3. [Confirm với reporter rằng bug đã fix]

### Regression tests
- [ ] Test cho scenario này
- [ ] Test các case liên quan (tránh break something else)

---

## Prevention

**Short-term (ticket này):**
- [ ] [Guard / validation / test cụ thể]

**Long-term (backlog):**
- [ ] [Monitoring / alerting cần thêm]
- [ ] [Pattern nên refactor để prevent class of bugs này]

**Thêm vào Snippets (nếu là gotcha chung):**
- [ ] `05-snippets/dotnet/gotchas.md`
- [ ] `05-snippets/postgresql/gotchas.md`

---

## Timeline (Production bugs)

| Time | Action |
|------|--------|
| [HH:MM] | Bug reported |
| [HH:MM] | Acknowledged, investigation started |
| [HH:MM] | Root cause identified |
| [HH:MM] | Fix deployed |
| [HH:MM] | Verified resolved |
| **Total TTR** | [X giờ Y phút] |

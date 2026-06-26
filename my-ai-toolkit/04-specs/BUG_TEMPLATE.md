# Bug Report — [ID] [ShortDescription]

## Metadata

| Field | Value |
|-------|-------|
| Bug ID | [TICKET-123](link) |
| Severity | `P0 - Critical` / `P1 - High` / `P2 - Medium` / `P3 - Low` |
| Environment | Dev / Staging / **Production** |
| Reported | [YYYY-MM-DD HH:MM] by [Tên / Monitoring alert] |
| Assigned | Tuan Nguyen |
| Status | `Investigating` → `Fix Ready` → `Deployed` → `Verified` |

---

## Impact

- **Scope:** [X% users / X users / specific feature]
- **Data affected:** [Có mất/corrupt data không?]
- **Workaround:** [Có / Không — mô tả nếu có]
- **Business impact:** [Low / Medium / High / Revenue-impacting]

---

## Bug Description

**Một câu:** [Mô tả chính xác]

| | Behavior |
|---|---|
| **Expected** | [Điều lẽ ra xảy ra] |
| **Actual** | [Điều đang xảy ra] |

**Reproduction:**
1. [Step 1 — cụ thể, data example]
2. [Step 2]
3. **→ Bug xảy ra**

**Frequency:** `Always` / `~X%` / `Chỉ khi [condition]` / `Intermittent`

---

## Technical Analysis

**Stack Trace:**
```
[PASTE ĐẦY ĐỦ — inner exception, correlation ID]
```

**Logs:**
```
[timestamp + level + message xung quanh lúc xảy ra]
```

**Root Cause** *(điền sau khi debug)*

Layer: [ ] Domain  [ ] Application  [ ] Infrastructure  [ ] Config  [ ] External

**Cơ chế:** [Tại sao xảy ra — không chỉ "sai ở dòng X"]

**Trigger condition:** [Chính xác điều kiện gây bug]

**Code location:**
```
File:   src/[Layer]/[Feature]/[File].cs
Method: [MethodName]  Line: ~[N]
```

---

## Fix

**Approach:** [2-3 câu — tại sao chọn cách này]

```csharp
// BEFORE:
[code cũ]

// AFTER:
[code mới — production-ready]
```

**Schema / Migration:**
- [ ] Không cần
- [ ] Cần: [mô tả]
```sql
[SQL nếu có]
```

**Deployment:**
- [ ] Cần restart service
- [ ] Cần run data fix script
- [ ] Cần config thay đổi
- [ ] Hot deploy OK

---

## Testing & Verification

**Reproduce test:**
```csharp
[Unit test reproduce bug]
```

**Verification sau deploy:**
1. [Query / check cụ thể]
2. [Monitor metric nào 30 phút sau]
3. [Confirm với reporter]

**Regression:**
- [ ] Test cho scenario này
- [ ] Test cases liên quan

---

## Prevention

**Short-term:** [ ] [Guard / validation / test]

**Long-term (backlog):** [ ] [Monitoring / alerting] | [ ] [Pattern refactor]

**Thêm vào Snippets:**
- [ ] `05-snippets/dotnet/gotchas.md`
- [ ] `05-snippets/postgresql/gotchas.md`

---

## Timeline *(Production bugs)*

| Time | Action |
|------|--------|
| [HH:MM] | Reported |
| [HH:MM] | Acknowledged, investigating |
| [HH:MM] | Root cause identified |
| [HH:MM] | Fix deployed |
| [HH:MM] | Verified |
| **TTR** | [X giờ Y phút] |

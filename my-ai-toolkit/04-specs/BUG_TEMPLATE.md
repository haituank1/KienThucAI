# Bug Report Template

---

## Metadata
- **Bug ID:** [Jira link]
- **Severity:** Critical / High / Medium / Low
- **Environment:** Dev / Staging / Production
- **Reported:** [YYYY-MM-DD]
- **Assigned:** [Tên]

---

## Bug Description
[1-2 câu mô tả rõ ràng behavior sai]

## Expected vs Actual
| | Behavior |
|---|---|
| **Expected** | [what should happen] |
| **Actual** | [what actually happens] |

## Reproduction Steps
1. [Step 1]
2. [Step 2]
3. **→ Bug xảy ra**

**Frequency:** Luôn luôn / ~X% / Chỉ khi [condition]

---

## Technical Analysis

### Error / Log
```
[Stack trace hoặc log message đầy đủ]
```

### Root Cause
[Điền sau khi debug — giải thích cơ chế tại sao xảy ra]

### Code Location
- File: `[path/to/file.cs]`
- Method: `[MethodName]`
- Line: [số dòng nếu biết]

---

## Fix

### Approach
[Mô tả approach fix]

### Code Change
```csharp
// Before:
[code cũ]

// After:
[code mới]
```

### Migration needed: [ ] Yes / [ ] No

---

## Testing
- [ ] Unit test cho scenario bug
- [ ] Manual test reproduction steps
- [ ] Regression test các case liên quan

## Prevention
[Làm gì để không xảy ra lại — thêm validation, test, monitoring]

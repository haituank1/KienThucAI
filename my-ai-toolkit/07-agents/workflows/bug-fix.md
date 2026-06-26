# Workflow: Bug Fix

## Dùng khi nào
Khi nhận bug từ Jira hoặc production alert.

---

## Step-by-Step với Claude

### 1. Reproduce (trước khi fix gì)
- Reproduce locally nếu được
- Nếu không reproduce được → cần thêm logging trước

### 2. Gather info
Copy template từ `04-specs/BUG_TEMPLATE.md`, fill:
- Stack trace đầy đủ
- Environment (dev/staging/prod)
- Frequency
- Code suspect

### 3. Root cause analysis với Claude
Paste vào Claude: `03-prompts/session-starters/new-bug.md` + thông tin đã gather

**Key question để hỏi Claude:**
> "Đây là root cause hay symptom? Nếu là symptom, root cause thật sự là gì?"

### 4. Fix — Minimal & Safe
- Fix ít code nhất có thể
- Không refactor cùng lúc với fix bug (tách PR riêng)
- Nếu fix cần DB migration → đánh giá có cần downtime không

### 5. Verify fix
```bash
# Test tập trung vào scenario bug
dotnet test --filter "MethodName_BugScenario"
```

### 6. Add regression test
Luôn thêm test cover case đã bug:
```csharp
[Fact]
public async Task MethodName_[BugCondition]_[CorrectBehavior]()
```

### 7. Document
Điền `Root Cause` và `Prevention` vào BUG_TEMPLATE.md.
Nếu là gotcha chung → thêm vào `05-snippets/dotnet/gotchas.md` hoặc `05-snippets/postgresql/gotchas.md`.

---

## Production Bug — Fast Response Mode
```
1. Xác nhận scope impact (bao nhiêu user/request bị ảnh hưởng)
2. Có workaround tạm thời không? (feature flag, config change)
3. Fix minimal → deploy → monitor
4. Post-mortem sau khi ổn định
```

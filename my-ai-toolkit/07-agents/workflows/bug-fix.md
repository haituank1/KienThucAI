# Workflow: Bug Fix

> 2 mode: Normal (dev/staging bug) và Fast Response (production incident).

---

## Mode 1 — Normal Bug Fix

### Step 1: Assess trước khi debug (2 phút)

```
Severity:
- P0: Production down / data loss → switch sang Fast Response Mode ngay
- P1: Major feature broken → fix today
- P2: Minor issue / workaround available → schedule trong sprint
- P3: Cosmetic / low impact → backlog

Impact:
- Bao nhiêu users bị ảnh hưởng?
- Có workaround tạm thời không?
```

### Step 2: Reproduce locally

```bash
# Target: reproduce bug trên local trước khi fix gì
# Nếu không reproduce được → thêm logging/tracing trước

# Check EF Core query log (dev environment)
# appsettings.Development.json:
# "EFCoreQueryLogging": true

# Check recent logs
dotnet run --project src/API
# Trigger bug, observe logs
```

### Step 3: Gather info → Claude

Fill template `04-specs/BUG_TEMPLATE.md`, sau đó dùng:
```
/debug [mô tả bug + paste stack trace]
```

Hoặc paste `03-prompts/session-starters/new-bug.md` vào Claude chat.

**Key question:**
> "Đây là root cause hay chỉ là symptom? Root cause thật sự ở đâu?"

### Step 4: Fix — Minimal only

```
Rules:
✅ Fix ít code nhất có thể
✅ Chỉ fix cái đang gây bug, không thêm feature
❌ Không refactor cùng PR (tách PR riêng)
❌ Không "cải thiện" code lân cận (scope creep)
```

Nếu fix cần migration:
```
/migrate [mô tả thay đổi cần thiết]
```

### Step 5: Test

```bash
# Viết regression test TRƯỚC khi verify fix
# (test driven debugging)
dotnet test --filter "MethodName_[BugCondition]_[CorrectBehavior]"

# Sau khi fix → test pass
# Chạy full test suite
dotnet test
```

### Step 6: Document & Update Toolkit

- [ ] Fill `Root Cause` và `Prevention` vào `BUG_TEMPLATE.md`
- [ ] Nếu là gotcha chung → thêm vào `05-snippets/`:
  - .NET gotcha → `dotnet/gotchas.md`
  - PostgreSQL gotcha → `postgresql/gotchas.md`
  - Pattern để tránh lặp → đúng file patterns

---

## Mode 2 — Production Incident (P0/P1)

### First 5 phút: Triage

```
1. Xác nhận scope: bao nhiêu % users/requests bị ảnh hưởng?
2. Data loss risk? → Nếu có: STOP mọi write đến service đó ngay
3. Có thể isolate không? Feature flag / config change?
4. Notify team: lead + on-call (đừng debug một mình khi P0)
```

### Fast fix options (theo thứ tự ưu tiên)

```
Option A: Rollback deploy (nếu bug xuất hiện sau deploy mới)
→ Fastest, safest — làm trước
→ dotnet/k8s rollback command

Option B: Feature flag off (nếu bug trong feature mới)
→ Nếu có feature flag: toggle off ngay

Option C: Config change (nếu bug do config)
→ Không cần deploy

Option D: Hotfix deploy
→ Khi A/B/C không được — fix minimal → test → deploy
```

### Sau khi resolve

```bash
# Monitor 30 phút sau fix
# Check error rate, latency, queue depth

# Khi stable:
# 1. Điền BUG_TEMPLATE.md với đầy đủ timeline
# 2. Điền POSTMORTEM_TEMPLATE.md (trong vòng 48h)
# 3. Create follow-up tickets cho prevention action items
# 4. Update toolkit nếu có lesson learned
```

---

## PR Checklist — Bug Fix

```
- [ ] Regression test cho scenario bug
- [ ] Không có unrelated changes
- [ ] Build pass, all tests pass
- [ ] PR description: link bug ticket + mô tả root cause + fix approach
- [ ] Nếu có migration: reviewed + rollback tested
- [ ] Toolkit updated nếu cần
```

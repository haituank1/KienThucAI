# Workflow: Implement Feature Mới

## Dùng khi nào
Mỗi khi bắt đầu implement 1 feature từ Jira ticket.

---

## Step-by-Step với Claude Code

### 1. Chuẩn bị context (5 phút)
```bash
# Đảm bảo CLAUDE.md ở root project đã up-to-date
cat CLAUDE.md

# Tạo branch
git checkout -b feature/[ticket-id]-[short-description]
```

Paste vào Claude: `03-prompts/session-starters/new-feature.md` + ticket description

### 2. Design (Claude suggest, bạn approve)
Prompt Claude:
> "Đề xuất approach cho feature này. Chưa cần code. Tôi muốn biết:
> 1. Các layer nào cần thay đổi
> 2. DB schema thay đổi gì không
> 3. Risk / concern nào cần chú ý"

**→ Approve/feedback trước khi tiếp tục**

### 3. Implement theo thứ tự layer
```
Domain        → Entity, Value Object, Domain Event
Application   → Command/Query, Handler, Validator, DTO
Infrastructure → Repository, Migration, External service
API           → Controller, Endpoint mapping
```

Prompt mỗi layer:
> "Implement [layer] cho feature [tên]. Follow clean architecture rules trong CLAUDE.md."

### 4. Test
```bash
dotnet test --filter "Category=[FeatureName]"
```

Nếu thiếu test, dùng: `03-prompts/daily/unit-test.md`

### 5. Review trước PR
```bash
# Trong Claude Code
/review
```

Hoặc paste diff vào Claude với prompt: `03-prompts/daily/code-review.md`

### 6. Document (nếu feature phức tạp)
Update `06-projects/[company]/[project]/project-context.md` nếu:
- Thêm entity mới
- Thêm business rule quan trọng
- Có gotcha mới phát hiện → thêm vào `05-snippets/`

---

## Checklist trước khi tạo PR
- [ ] Build pass: `dotnet build`
- [ ] Tests pass: `dotnet test`
- [ ] Migration reviewed (nếu có)
- [ ] No N+1 (check với query logging)
- [ ] CancellationToken được pass đúng
- [ ] Không có hardcoded values
- [ ] CLAUDE.md / project-context.md cập nhật nếu cần

# my-ai-toolkit

Bộ toolkit cá nhân để làm việc hiệu quả với AI (Claude, Claude Code) qua mọi dự án và công ty.

**Stack:** C#/.NET 8 · PostgreSQL · Clean Architecture · CQRS/MediatR · EF Core · Redis · RabbitMQ

---

## Cấu trúc 7 Layer

```
my-ai-toolkit/
├── 01-context/          ← AI cần biết bạn là ai, làm việc thế nào
├── 02-rules/            ← Convention, coding standards bất biến
├── 03-prompts/          ← Prompt library theo task type
├── 04-specs/            ← Templates cho spec, bug, migration
├── 05-snippets/         ← Battle-tested patterns + gotchas
├── 06-projects/         ← Context theo từng project/công ty
└── 07-agents/           ← Claude Code commands + workflows
```

---

## Khi vào project mới (30 phút setup)

```bash
# 1. Copy project template
cp -r 06-projects/_template/ 06-projects/[company]/[project]/

# 2. Fill thông tin project
# - project-context.md: domain, stack, business rules
# - CLAUDE.md: copy vào root repo của project

# 3. Test với Claude
# Paste 01-context/session-starter.md vào đầu session
# Điền phần [CONTEXT] với project mới
```

---

## Dùng hàng ngày

| Tình huống | Dùng gì |
|-----------|---------|
| Bắt đầu session mới | `01-context/session-starter.md` |
| Implement feature | `07-agents/workflows/feature-dev.md` |
| Debug bug | `07-agents/workflows/bug-fix.md` |
| Code review | `03-prompts/daily/code-review.md` |
| Query PostgreSQL chậm | `03-prompts/postgresql/analyze-slow-query.md` |
| Viết unit test | `03-prompts/daily/unit-test.md` |
| Tạo spec | `04-specs/SPEC_TEMPLATE.md` |
| Lookup pattern | `05-snippets/` |

---

## Claude Code — Custom Commands

Đặt `.claude/commands/` vào root repo dự án:
- `/review` — Review code changes
- `/debug` — Debug với structured approach
- `/spec` — Generate SPEC từ mô tả

---

## Nguyên tắc duy trì

1. **Thêm gotcha khi phát hiện** → `05-snippets/[tech]/gotchas.md`
2. **Thêm pattern khi battle-tested** → `05-snippets/[tech]/patterns.md`
3. **Update project-context** khi có thay đổi lớn trong project
4. **Cập nhật prompt** khi tìm ra cách hỏi hiệu quả hơn

Toolkit có giá trị khi được cập nhật thường xuyên — đừng để nó stale.

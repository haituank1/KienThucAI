# Onboarding — [PROJECT NAME] @ [COMPANY]

> Checklist cho tuần đầu tiên với project mới.
> Target: trong 5 ngày, có thể ship feature nhỏ độc lập.

**Start date:** [YYYY-MM-DD]
**Buddy / go-to person:** [Tên]

---

## Ngày 1 — Setup & Orientation

### Environment Setup
- [ ] Clone repo: `git clone [url]`
- [ ] Copy `.env.example` → `.env`, điền credentials
- [ ] `docker-compose up -d` — verify DB, Redis, RabbitMQ up
- [ ] `dotnet build` — build thành công, không warning lạ
- [ ] `dotnet test` — tests pass (ghi lại số lượng: ___ passed, ___ failed)
- [ ] `dotnet run --project src/[Project].API` — API chạy được locally
- [ ] Gọi health check: `GET /health` → 200

### First Read
- [ ] `README.md` — setup instructions, architecture overview
- [ ] `CLAUDE.md` — conventions AI và team follow
- [ ] `project-context.md` — business domain, key entities
- [ ] Folder structure: `find src -type d | head -30` — hiểu project layout

**Note ngày 1:** [Điền điều gì ngạc nhiên hoặc chưa rõ]

---

## Ngày 2 — Domain Deep Dive

### Business Domain
- [ ] Hiểu 3 entities chính: [Entity1], [Entity2], [Entity3]
- [ ] Biết business rules quan trọng (xem `CLAUDE.md` section Business Rules)
- [ ] Đọc 1 feature hoàn chỉnh: trace từ Controller → Handler → Domain → DB
  - Feature chọn để đọc: [tên feature đơn giản nhất]

### Database
- [ ] Kết nối DB dev: `psql -h localhost -U [user] -d [db]`
- [ ] Xem schema: `\dt` — danh sách tables
- [ ] Row counts: `SELECT relname, reltuples::bigint FROM pg_class WHERE relkind = 'r' ORDER BY reltuples DESC LIMIT 10;`
- [ ] Existing migrations: `SELECT * FROM "__EFMigrationsHistory" ORDER BY "MigrationId" DESC LIMIT 10;`
- [ ] Chạy thử 1 EXPLAIN ANALYZE trên query đơn giản

**Note ngày 2:** [Schema có gì đặc biệt? Table lớn nhất? Performance concern?]

---

## Ngày 3 — Process & Tooling

### Questions cần trả lời hôm nay
- [ ] Auth flow: JWT từ đâu, expire bao lâu, refresh thế nào?
- [ ] Deploy process: push code → production trong bao nhiêu bước?
- [ ] Monitoring: error alert ở đâu? (Sentry / App Insights / Grafana)
- [ ] On-call: production issue xử lý thế nào, ai liên hệ?
- [ ] Code review: ai review, SLA bao lâu, có auto-merge không?
- [ ] Feature flags: có dùng không, dùng tool gì?

### Tooling Setup
- [ ] Access Jira/Linear/GitHub Issues
- [ ] Access monitoring dashboard
- [ ] Join Slack channels liên quan
- [ ] Staging DB access (nếu cần)

**Note ngày 3:** [Process khác gì với nơi cũ? Red flags nếu có?]

---

## Ngày 4-5 — First Contribution

### Pick task & Implement
- [ ] Pick task nhỏ: bug fix hoặc small feature từ backlog
  - Task chọn: [TICKET-XXX]
- [ ] Create branch: `git checkout -b [type]/[TICKET-123]-[description]`
- [ ] Implement — follow conventions trong CLAUDE.md
- [ ] Write tests — cover happy path + edge case chính
- [ ] `dotnet test` pass
- [ ] Submit PR — description rõ ràng

### PR Checklist
- [ ] Build pass
- [ ] Tests pass
- [ ] No N+1 query (check EF Core log)
- [ ] CancellationToken được pass
- [ ] CLAUDE.md conventions được follow
- [ ] Self-review diff trước khi request review

**Note ngày 4-5:** [Feedback từ code review? Convention nào chưa biết?]

---

## AI Toolkit Setup (làm ngay ngày 1)

- [ ] Copy `06-projects/_template/` → `06-projects/[company]/[project]/`
- [ ] Điền `project-context.md` với info thực của project
- [ ] Copy `_template/CLAUDE.md` → root repo (nếu chưa có), customize
- [ ] Test: paste `01-context/session-starter.md` + điền context → gửi Claude
- [ ] Verify AI hiểu đúng project context (hỏi 1 câu về domain)

---

## Knowledge Gaps — Điền khi phát hiện

> Những thứ chưa biết, cần hỏi hoặc tự tìm hiểu

| Topic | Status | Resource / Person |
|-------|--------|-----------------|
| [Điều chưa hiểu 1] | ⏳ | [Ai có thể giải thích] |
| [...] | | |

---

## Lessons Learned từ Onboarding

> Điền ở cuối tuần đầu — input quan trọng cho toolkit

**Gotcha phát hiện:**
- [vd: "Migration trên bảng orders (10M rows) mất 15 phút — cần CONCURRENTLY"]

**Convention project-specific không có trong base toolkit:**
- [vd: "Dùng `ICurrentTenantService` thay vì inject TenantId trực tiếp"]

**Thêm vào toolkit:**
- [ ] `05-snippets/` nếu có pattern mới
- [ ] `project-context.md` nếu phát hiện business rule quan trọng
- [ ] `CLAUDE.md` của project nếu có convention mới

# Onboarding Checklist — [PROJECT NAME]

> Dùng khi bắt đầu làm quen với project mới.
> Check từng mục, ghi note nếu cần.

---

## Ngày 1 — Setup & Overview

### Environment
- [ ] Clone repo
- [ ] Setup `.env` / `appsettings.Development.json`
- [ ] Docker compose up (DB, Redis, RabbitMQ)
- [ ] Build thành công: `dotnet build`
- [ ] Test pass: `dotnet test`
- [ ] Chạy được locally

### Codebase
- [ ] Đọc README.md
- [ ] Đọc CLAUDE.md (conventions)
- [ ] Đọc project-context.md (business domain)
- [ ] Hiểu folder structure
- [ ] Đọc 1 feature hoàn chỉnh từ API → DB (ví dụ: [tên feature đơn giản])

---

## Ngày 2-3 — Domain & Database

### Business Domain
- [ ] Hiểu entities chính và relationship
- [ ] Biết business rules quan trọng
- [ ] Đọc existing migrations để hiểu schema evolution

### Database
- [ ] Kết nối được DB dev/staging
- [ ] Biết tables chính, estimated row count
- [ ] Chạy được EXPLAIN ANALYZE
- [ ] Biết indexes quan trọng

---

## Ngày 4-5 — Thực hành

### First Task
- [ ] Pick 1 bug nhỏ hoặc task đơn giản
- [ ] Follow quy trình: branch → code → test → PR
- [ ] PR được review và merge

### Questions to Answer
- [ ] Flow authentication/authorization như thế nào?
- [ ] Deploy process ra sao?
- [ ] Monitoring/alerting ở đâu?
- [ ] Ai contact khi có vấn đề production?

---

## AI Setup
- [ ] Copy `CLAUDE.md` vào root project (nếu chưa có)
- [ ] Tạo `06-projects/[company]/[project]/` trong toolkit
- [ ] Fill `project-context.md`
- [ ] Test session-starter với Claude

---

## Notes
[Ghi lại những điều quan trọng học được trong quá trình onboarding]

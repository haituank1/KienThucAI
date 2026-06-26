# Project Context — [TÊN PROJECT]

> Copy file này vào `06-projects/[company-name]/[project-name]/`

---

## Overview
- **Project:** [Tên]
- **Company:** [Công ty]
- **Start date:** [YYYY-MM-DD]
- **Domain:** [E-commerce / Healthcare / Fintech / ...]
- **Scale:** [Số users, requests/day, data size]

## Tech Stack (chi tiết)
- **Runtime:** .NET [version]
- **DB:** PostgreSQL [version], schema: [tên schema]
- **Cache:** Redis [version], cluster: [yes/no]
- **Queue:** RabbitMQ [version], MassTransit [version]
- **Auth:** [JWT / Cookie / OAuth2 provider]
- **Deploy:** [Docker / K8s / AWS / Azure]
- **CI/CD:** [GitHub Actions / Jenkins / ...]

## Repository Structure
```
src/
├── [ProjectName].Domain/
├── [ProjectName].Application/
├── [ProjectName].Infrastructure/
├── [ProjectName].API/
└── [ProjectName].Worker/      (nếu có)

tests/
├── [ProjectName].UnitTests/
└── [ProjectName].IntegrationTests/
```

## Key Entities / Domain
- **[Entity1]:** [Mô tả ngắn, ~10 câu context]
- **[Entity2]:** [Mô tả]

## Important Business Rules
- [Rule 1: quan trọng, không vi phạm]
- [Rule 2]

## Team Conventions (project-specific)
- Branch naming: `[format]`
- PR size: [max N files]
- Code review: [ai review ai]
- Deploy process: [mô tả]

## Known Issues / Technical Debt
- [Issue 1: mô tả + workaround hiện tại]
- [Issue 2]

## Performance Characteristics
- Slow tables: [tên table và lý do]
- Hot paths: [endpoint hay bị chậm]
- Known bottleneck: [mô tả]

## External Dependencies
| Service | Purpose | Owner | SLA |
|---------|---------|-------|-----|
| [Tên] | [Dùng để làm gì] | [Team] | [99.9%] |

## Contacts
- Tech Lead: [Tên, contact]
- DBA: [Tên, contact]
- DevOps: [Tên, contact]

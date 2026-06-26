# Project Context — [TÊN PROJECT]

> Copy file này vào `06-projects/[company-name]/[project-name]/project-context.md`
> AI dùng file này để hiểu domain và technical context mà không cần bạn giải thích lại mỗi session.
> Cập nhật khi có thay đổi lớn: entity mới, business rule mới, performance gotcha mới.

---

## Overview

| Field | Value |
|-------|-------|
| Project | [Tên project] |
| Company | [Công ty] |
| Domain | [E-commerce / SaaS / Fintech / Healthcare / ...] |
| Start date | [YYYY-MM-DD] |
| My role | Backend Developer |
| Status | Active / Maintenance / Archived |

**Mô tả ngắn (2-3 câu):**
[Project này làm gì, phục vụ ai, quy mô thế nào. Ví dụ: "B2B SaaS platform quản lý chuỗi cung ứng cho 50 doanh nghiệp vừa. 500K orders/tháng, peak 200 req/s."]

---

## Tech Stack Thực Tế

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Language | C# | .NET 8 | |
| Web | ASP.NET Core | 8.0 | |
| ORM | EF Core | 8.x | |
| DB (primary) | PostgreSQL | 15 | Schema: [tên] |
| Cache | Redis | 7.x | Cluster: [yes/no] |
| Queue | RabbitMQ + MassTransit | | |
| Auth | [JWT / Cookie / OAuth2] | | Provider: [...] |
| Storage | [S3 / Azure Blob / local] | | |
| Deploy | [Docker / K8s / VM] | | Cloud: [AWS/Azure/GCP] |
| CI/CD | [GitHub Actions / Jenkins] | | |
| Monitoring | [Application Insights / Grafana / Sentry] | | |

**Deviations từ stack chuẩn của tôi:**
- [vd: "Dùng Dapper thay EF Core cho reporting queries"]
- [vd: "Không có Redis — dùng in-memory cache"]

---

## Repository Structure

```
[repo-name]/
├── src/
│   ├── [Project].Domain/
│   ├── [Project].Application/
│   ├── [Project].Infrastructure/
│   ├── [Project].API/
│   └── [Project].Worker/     ← Background jobs
├── tests/
│   ├── [Project].UnitTests/
│   └── [Project].IntegrationTests/
├── docs/
├── docker-compose.yml
└── CLAUDE.md                 ← AI context (copy từ _template/CLAUDE.md)
```

---

## Domain Model

### Key Entities

| Entity | Description | Table | ~Rows |
|--------|-------------|-------|-------|
| [Order] | [Đơn hàng — trạng thái từ Draft → Delivered] | orders | 10M |
| [Customer] | [Khách hàng — B2B, mỗi customer có nhiều location] | customers | 50K |
| [Product] | [Sản phẩm — có variants, pricing theo tier] | products | 5K |
| [Entity4] | [...] | [...] | [...] |

### Relationships quan trọng

```
Customer (1) ──── (N) Order
Order (1) ──── (N) OrderItem
OrderItem (N) ──── (1) Product
```

### Business Rules — Quan trọng, không vi phạm

1. **[Rule 1]:** [Mô tả rõ ràng. Ví dụ: "Order không thể cancel sau khi đã shipped"]
2. **[Rule 2]:** [Mô tả]
3. **[Rule 3]:** [Mô tả]

---

## Performance Characteristics

### Tables lớn / chú ý

| Table | Rows | Growth/month | Partitioned? | Hot queries |
|-------|------|-------------|--------------|------------|
| orders | 10M | +500K | Yes (by month) | By customer, by status |
| audit_logs | 50M | +2M | Yes (by quarter) | By entity_id |
| [table] | [...] | [...] | [...] | [...] |

### Known Slow Paths

- **[Endpoint/Query]:** [Tại sao chậm, workaround hiện tại]
- **[Batch job X]:** [Runtime ~Xs, chạy lúc midnight, tránh conflict với]

### Existing Indexes quan trọng

```sql
-- Verify trước khi thêm index mới
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename IN ('orders', 'customers')
ORDER BY tablename, indexname;
```

---

## Team & Process

### Conventions (project-specific, khác với base conventions của tôi)

- Branch: `[feature/TICKET-123-short-desc / fix/... / hotfix/...]`
- Commit: `[Conventional commits / free-form]`
- PR size: `[max X files / max X lines]`
- Review: `[ai review ai, min X approvals]`
- Deploy to prod: `[manual / auto after merge / scheduled]`

### Deploy Process

```bash
# Development → Staging
[command hoặc mô tả]

# Staging → Production
[command hoặc mô tả, approval nếu cần]

# Hotfix
[process]
```

---

## Technical Debt & Known Issues

| Issue | Impact | Workaround | Priority |
|-------|--------|------------|---------|
| [Vấn đề 1] | [High/Med/Low] | [Cách tạm thời] | [Backlog/P1/P2] |
| [Vấn đề 2] | [...] | [...] | [...] |

---

## External Dependencies

| Service | Purpose | Owner | Health check | Fallback |
|---------|---------|-------|-------------|---------|
| [Payment GW] | Process payment | Vendor | [URL] | [Retry / queue] |
| [Email service] | Send notifications | DevOps | - | [Log + retry] |
| [API X] | [Purpose] | [Team] | - | [Degraded mode] |

---

## Key Contacts

| Role | Name | Contact | Availability |
|------|------|---------|-------------|
| Tech Lead | [Tên] | [Slack/email] | [Business hours] |
| DBA | [Tên] | [...] | [...] |
| DevOps | [Tên] | [...] | [...] |
| Product Owner | [Tên] | [...] | [...] |

---

## AI Context Notes

> Những thứ AI cần biết để làm việc hiệu quả với project này mà không cần giải thích lại.

- [vd: "Không dùng AutoMapper — map thủ công trong Projection"]
- [vd: "Migration luôn cần review từ [Tên] trước khi apply staging"]
- [vd: "Tenant isolation qua Global Query Filter — mọi query tự động filter theo TenantId"]
- [vd: "Không có unit test cho Infrastructure layer — chỉ integration test"]

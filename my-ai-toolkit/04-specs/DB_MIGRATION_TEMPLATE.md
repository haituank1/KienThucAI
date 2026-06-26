# DB Migration Template

---

## Metadata
- **Migration name:** `[YYYYMMDD]_[Description]`
- **Ticket:** [Jira link]
- **Author:** [Tên]
- **Estimated run time:** [X phút trên prod với ~N rows]
- **Requires downtime:** [ ] Yes / [ ] No

---

## Changes
| Type | Object | Description |
|------|--------|-------------|
| ADD COLUMN | `table.column` | [mô tả] |
| CREATE INDEX | `idx_name` | [mô tả] |
| ALTER COLUMN | `table.column` | [old → new] |

---

## Risk Assessment
- **Lock risk:** [ ] High / [ ] Medium / [ ] Low
  - Lý do: [ALTER TABLE với nhiều rows lock toàn bộ table...]
  - Mitigation: [CONCURRENTLY, batching, ...]
- **Data loss risk:** [ ] Yes / [ ] No
- **Rollback safe:** [ ] Yes / [ ] No

---

## Migration SQL (Up)
```sql
-- [Mô tả step 1]
ALTER TABLE orders ADD COLUMN discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0;

-- [Mô tả step 2 — dùng CONCURRENTLY để tránh lock]
CREATE INDEX CONCURRENTLY idx_orders_customer_status 
ON orders(customer_id, status) 
WHERE status IN ('pending', 'processing');
```

## Migration SQL (Down / Rollback)
```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_customer_status;
ALTER TABLE orders DROP COLUMN IF EXISTS discount_amount;
```

---

## EF Core Migration Class
```csharp
// File: Migrations/[timestamp]_[Name].cs
public partial class [Name] : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // ...
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // ...
    }
}
```

---

## Deployment Steps
1. [ ] Review migration SQL với DBA (nếu prod lớn)
2. [ ] Test trên staging với production-size data
3. [ ] Backup trước khi apply prod
4. [ ] Apply migration
5. [ ] Verify: `SELECT COUNT(*) FROM [table]` before/after
6. [ ] Monitor slow query log 30 phút sau deploy

---

## Notes
[Ghi chú thêm — ví dụ: "cần chạy data backfill script sau migration"]

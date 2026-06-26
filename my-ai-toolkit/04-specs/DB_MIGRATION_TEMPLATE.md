# DB Migration — [YYYYMMDD] [Description]

## Metadata

| Field | Value |
|-------|-------|
| Migration name | `[YYYYMMDDHHMMSS]_[PascalCaseDescription]` |
| Ticket | [TICKET-123](link) |
| Author | Tuan Nguyen |
| Date | [YYYY-MM-DD] |
| Est. run time | ~[X] phút trên prod (~[N] rows) |
| Downtime | [ ] Yes / [x] No |
| Reviewed by | [Tên DBA/Lead] |

---

## Changes Summary

| # | Type | Object | Description | Risk |
|---|------|--------|-------------|------|
| 1 | ADD COLUMN | `orders.discount_amount` | Thêm discount field | Low |
| 2 | CREATE INDEX | `idx_orders_customer_status` | Speed up customer order query | Low |
| 3 | ALTER COLUMN | `users.email` | Varchar(100) → Varchar(255) | Medium |

---

## Risk Assessment

| Operation | Lock type | Duration | Mitigation |
|-----------|-----------|----------|------------|
| ADD COLUMN nullable | None (PG 11+) | Instant | - |
| ADD COLUMN NOT NULL no default | AccessExclusive | Full rewrite | nullable → backfill → SET NOT NULL |
| CREATE INDEX | ShareLock | [X] phút | `CONCURRENTLY` |
| ALTER COLUMN TYPE | AccessExclusive | Full rewrite | add column → backfill → swap → drop |
| ADD FK | ShareRowExclusive | [X] phút | `NOT VALID` → validate riêng |

**Overall risk:** Low / Medium / High

- Data loss risk: [ ] Yes / [x] No
- Rollback safe: [x] Yes / [ ] No — [lý do]

---

## Migration SQL — Up

```sql
-- Step 1: Add discount_amount column (nullable, no rewrite)
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(18, 4);

-- Step 2: Backfill (chạy riêng nếu table lớn)
UPDATE orders SET discount_amount = 0 WHERE discount_amount IS NULL;

-- Step 3: Set NOT NULL
ALTER TABLE orders
    ALTER COLUMN discount_amount SET NOT NULL,
    ALTER COLUMN discount_amount SET DEFAULT 0;

-- Step 4: Index CONCURRENTLY (est. ~[X] phút cho [N] rows)
-- CONCURRENTLY không chạy trong transaction
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_status_created
    ON orders(customer_id, status, created_at DESC)
    WHERE status IN ('pending', 'processing', 'paid');
```

## Migration SQL — Down

```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_customer_status_created;
ALTER TABLE orders DROP COLUMN IF EXISTS discount_amount;
```

---

## EF Core Migration

```csharp
// dotnet ef migrations add [Name] --project src/Infrastructure
public partial class AddDiscountToOrders : Migration
{
    protected override void Up(MigrationBuilder mb)
    {
        mb.AddColumn<decimal>(
            name: "discount_amount", table: "orders",
            type: "numeric(18,4)", nullable: false, defaultValue: 0m);

        mb.Sql("""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_status_created
            ON orders(customer_id, status, created_at DESC)
            WHERE status IN ('pending', 'processing', 'paid');
            """,
            suppressTransaction: true);
    }

    protected override void Down(MigrationBuilder mb)
    {
        mb.Sql("DROP INDEX CONCURRENTLY IF EXISTS idx_orders_customer_status_created;",
            suppressTransaction: true);
        mb.DropColumn(name: "discount_amount", table: "orders");
    }
}
```

> `CREATE INDEX CONCURRENTLY` không chạy trong transaction. Nếu fail giữa chừng → index INVALID → `DROP INDEX` rồi tạo lại.

---

## Data Backfill Script

```sql
-- Idempotent, chạy ngoài migration sau khi schema apply
DO $$
DECLARE updated_count INT; batch_size INT := 1000;
BEGIN
    LOOP
        UPDATE orders SET discount_amount = 0
        WHERE discount_amount IS NULL
          AND id IN (SELECT id FROM orders WHERE discount_amount IS NULL LIMIT batch_size);
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RAISE NOTICE 'Updated % rows', updated_count;
        EXIT WHEN updated_count < batch_size;
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;
```

---

## Deployment Checklist

**Pre-deployment:**
- [ ] Review migration SQL (không chỉ EF generated)
- [ ] Test trên staging với production-size data
- [ ] Estimate run time với EXPLAIN
- [ ] Confirm rollback khả thi
- [ ] Notify team nếu có impact

**Deploy:**
```bash
dotnet ef database update --project src/Infrastructure --connection "..."
SELECT version FROM __efmigrationshistory ORDER BY migrationid DESC LIMIT 5;
\d orders
```

**Post-deployment verification:**
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'discount_amount';

SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'orders' AND indexname = 'idx_orders_customer_status_created';

SELECT indisvalid FROM pg_index
WHERE indexrelid = 'idx_orders_customer_status_created'::regclass;

SELECT COUNT(*) FROM orders WHERE discount_amount IS NULL; -- phải = 0
```

- [ ] Monitor slow query log 30 phút sau deploy
- [ ] Confirm app chạy không lỗi

---

## Rollback

- **Khả thi khi:** [vd: "trong vòng 1 tiếng, trước khi app deploy version mới"]
- **Không khả thi khi:** [vd: "sau khi app đã viết data vào column mới"]
- **Thời gian rollback:** ~[X] phút

---

## Notes

[Ghi chú thêm]

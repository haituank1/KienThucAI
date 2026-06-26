# DB Migration Template

> Dùng: Copy file này → đổi tên `MIGRATION_[YYYYMMDD]_[Description].md` → điền.
> Với thay đổi phức tạp, dùng prompt `03-prompts/postgresql/migration-plan.md` để AI lập kế hoạch trước.

---

## Metadata

| Field | Value |
|-------|-------|
| Migration name | `[YYYYMMDDHHMMSS]_[PascalCaseDescription]` |
| Ticket | [TICKET-123](link) |
| Author | Tuan Nguyen |
| Date | [YYYY-MM-DD] |
| Estimated run time | ~[X] phút trên prod (~[N] rows) |
| Requires downtime | [ ] Yes / [x] No |
| Reviewed by | [Tên DBA/Lead nếu cần] |

---

## Changes Summary

| # | Type | Object | Description | Risk |
|---|------|--------|-------------|------|
| 1 | ADD COLUMN | `orders.discount_amount` | Thêm discount field | Low |
| 2 | CREATE INDEX | `idx_orders_customer_status` | Speed up customer order query | Low |
| 3 | ALTER COLUMN | `users.email` | Varchar(100) → Varchar(255) | Medium |

---

## Risk Assessment

### Lock Risk
| Operation | Lock type | Duration estimate | Mitigation |
|-----------|-----------|-------------------|------------|
| ADD COLUMN nullable | None (PG 11+) | Instant | - |
| ADD COLUMN NOT NULL (no default) | AccessExclusive | Full table rewrite | Add nullable → backfill → SET NOT NULL |
| CREATE INDEX | ShareLock (blocks writes) | [X] phút | `CONCURRENTLY` |
| ALTER COLUMN TYPE | AccessExclusive | Full table rewrite | Add new column → backfill → swap → drop old |
| ADD FK CONSTRAINT | ShareRowExclusive | [X] phút | `NOT VALID` → validate riêng |

**Overall risk:** 🟢 Low / 🟡 Medium / 🔴 High

**Specific concerns:**
- [Điền nếu có concern cụ thể]

### Data Risk
- **Data loss risk:** [ ] Yes / [x] No
- **Data corruption risk:** [ ] Yes / [x] No
- **Rollback safe:** [x] Yes / [ ] No — [lý do nếu No]

---

## Migration SQL — Up

```sql
-- ============================================================
-- Step 1: [Mô tả — vd: Add discount_amount column]
-- Risk: Low — nullable column, no table rewrite
-- ============================================================
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(18, 4);

-- ============================================================
-- Step 2: [Mô tả — vd: Backfill default value]
-- Note: Chạy riêng nếu table lớn (batch update tránh lock lâu)
-- ============================================================
UPDATE orders
SET discount_amount = 0
WHERE discount_amount IS NULL;

-- ============================================================
-- Step 3: Set NOT NULL sau khi backfill xong
-- ============================================================
ALTER TABLE orders
    ALTER COLUMN discount_amount SET NOT NULL,
    ALTER COLUMN discount_amount SET DEFAULT 0;

-- ============================================================
-- Step 4: [Mô tả index — dùng CONCURRENTLY trên production]
-- Duration estimate: ~[X] phút cho [N] rows
-- CONCURRENTLY: không block writes, nhưng không chạy trong transaction
-- ============================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_status_created
    ON orders(customer_id, status, created_at DESC)
    WHERE status IN ('pending', 'processing', 'paid');
```

## Migration SQL — Down (Rollback)

```sql
-- Rollback theo thứ tự ngược
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_customer_status_created;
ALTER TABLE orders DROP COLUMN IF EXISTS discount_amount;
```

---

## EF Core Migration Class

```csharp
// Chạy để generate: dotnet ef migrations add [Name] --project src/Infrastructure
// File: src/Infrastructure/Persistence/Migrations/[timestamp]_[Name].cs

public partial class AddDiscountToOrders : Migration
{
    protected override void Up(MigrationBuilder mb)
    {
        mb.AddColumn<decimal>(
            name: "discount_amount",
            table: "orders",
            type: "numeric(18,4)",
            nullable: false,
            defaultValue: 0m);

        // Raw SQL cho index với CONCURRENTLY (EF Core không support native)
        mb.Sql("""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_status_created
            ON orders(customer_id, status, created_at DESC)
            WHERE status IN ('pending', 'processing', 'paid');
            """,
            suppressTransaction: true); // CONCURRENTLY không chạy trong transaction
    }

    protected override void Down(MigrationBuilder mb)
    {
        mb.Sql("DROP INDEX CONCURRENTLY IF EXISTS idx_orders_customer_status_created;",
            suppressTransaction: true);
        mb.DropColumn(name: "discount_amount", table: "orders");
    }
}
```

**⚠️ Lưu ý:** `CREATE INDEX CONCURRENTLY` không chạy được trong transaction. Nếu migration fail giữa chừng, index có thể ở trạng thái INVALID — cần `DROP INDEX` rồi tạo lại.

---

## Data Backfill Script (nếu cần)

```sql
-- Chạy riêng biệt, ngoài migration, sau khi schema đã apply
-- Idempotent: chạy nhiều lần không bị lỗi

DO $$
DECLARE
    updated_count INT;
    batch_size INT := 1000;
BEGIN
    LOOP
        UPDATE orders
        SET discount_amount = 0
        WHERE discount_amount IS NULL
          AND id IN (
              SELECT id FROM orders
              WHERE discount_amount IS NULL
              LIMIT batch_size
          );

        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RAISE NOTICE 'Updated % rows', updated_count;

        EXIT WHEN updated_count < batch_size;
        PERFORM pg_sleep(0.1); -- 100ms nghỉ giữa batch
    END LOOP;
END $$;
```

---

## Deployment Checklist

### Pre-deployment
- [ ] Review migration SQL (không chỉ EF Core generated code)
- [ ] Test trên staging với production-size data dump
- [ ] Estimate run time: chạy `EXPLAIN` trên bảng staging với [N] rows
- [ ] Confirm rollback plan khả thi
- [ ] Notify team nếu có maintenance impact

### Deployment
```bash
# 1. Apply migration
dotnet ef database update --project src/Infrastructure --connection "..."

# 2. Verify migration applied
SELECT version FROM __efmigrationshistory ORDER BY migrationid DESC LIMIT 5;

# 3. Verify schema
\d orders  -- hoặc: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders';
```

### Post-deployment verification
```sql
-- Verify column tồn tại và có đúng type
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'discount_amount';

-- Verify index tồn tại và VALID (không INVALID)
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'orders' AND indexname = 'idx_orders_customer_status_created';

SELECT indisvalid FROM pg_index WHERE indexrelid = 'idx_orders_customer_status_created'::regclass;

-- Row count sanity check
SELECT COUNT(*) FROM orders WHERE discount_amount IS NULL; -- Phải = 0 sau backfill
```

- [ ] Monitor slow query log 30 phút sau deploy
- [ ] Confirm application chạy không có lỗi

---

## Rollback Timing

**Rollback khả thi khi:** [Điều kiện — vd: "trong vòng 1 tiếng sau deploy, trước khi deploy app version mới"]
**Rollback không khả thi khi:** [vd: "sau khi app đã viết data vào column mới"]
**Estimated rollback time:** ~[X] phút

---

## Notes

[Ghi chú thêm — vd: "Data backfill script cần chạy manually sau migration", "Index sẽ mất ~20 phút trên prod 50M rows"]

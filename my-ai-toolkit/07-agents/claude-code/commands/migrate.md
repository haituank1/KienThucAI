# Claude Code Custom Command: /migrate

> Đặt ở `.claude/commands/migrate.md`
> Dùng: `/migrate [mô tả thay đổi schema]` — lập kế hoạch migration an toàn

---

Tôi cần thực hiện DB migration PostgreSQL. Đọc CLAUDE.md để biết project context.

**Yêu cầu của tôi:** $ARGUMENTS

**Bước 1 — Risk Assessment**

Phân tích thay đổi cần làm:
- Lock type và duration estimate (dựa trên table size từ CLAUDE.md)
- Data loss risk?
- Rollback có dễ không?
- Cần downtime không?

**Bước 2 — Migration Plan**

Tạo migration plan gồm:

```sql
-- Step 1: [Safe steps trước]
-- (Thêm column nullable, tạo index CONCURRENTLY, ...)

-- Step 2: [Data backfill nếu cần]
-- (Idempotent script)

-- Step 3: [Constraint sau khi data đã clean]
-- (SET NOT NULL, ADD CONSTRAINT, ...)
```

**Bước 3 — EF Core Migration**

```csharp
// Tên migration: [YYYYMMDDHHMMSS]_[PascalCaseDescription]
public partial class [Name] : Migration
{
    protected override void Up(MigrationBuilder mb) { }
    protected override void Down(MigrationBuilder mb) { }
}
```

Note: Index CONCURRENTLY cần `suppressTransaction: true`.

**Bước 4 — Verification Queries**

```sql
-- Chạy sau migration để verify
[SQL]
```

**Bước 5 — Rollback**

```sql
-- Rollback nếu có vấn đề
[SQL]
```

Kết thúc bằng: "Cần review migration này với DBA không? Bảng có bao nhiêu rows?"

# CLAUDE.md — [PROJECT NAME]

> Đặt file này ở ROOT của project repo.
> Claude Code tự đọc khi khởi động — AI sẽ biết context project mà không cần bạn giải thích lại.
> Customize từ template: xóa phần không áp dụng, thêm convention đặc thù của project.

---

## Project

[Tên project] — [1 câu mô tả domain và purpose. Ví dụ: "B2B order management API cho chuỗi cung ứng, ~500K orders/tháng"]

**Stack:** .NET 8 · ASP.NET Core · EF Core 8 · PostgreSQL 15 · Redis 7 · RabbitMQ/MassTransit

**Pattern:** Clean Architecture + CQRS + MediatR
```
Domain → Application → Infrastructure → API
```

---

## Code — Luôn làm

```csharp
// 1. Async method: Async suffix + CancellationToken
public async Task<Result<OrderDto>> GetOrderAsync(Guid id, CancellationToken ct) { }

// 2. Read query: AsNoTracking + projection (không load full entity)
var dto = await _ctx.Orders.AsNoTracking()
    .Where(o => o.Id == id)
    .Select(o => new OrderDto { Id = o.Id, ... })
    .FirstOrDefaultAsync(ct);

// 3. Business error: Result<T>, không throw
return Result.Failure<OrderDto>("Order not found"); // không: throw new NotFoundException()

// 4. Handler: 1 command/query per handler file
// 5. Validator: FluentValidation, 1 file per command/query
```

---

## Code — Không được làm

```
❌ Controller gọi DbContext trực tiếp
❌ Lazy loading (virtual navigation property)
❌ .Result hoặc .Wait() trên async method
❌ Catch (Exception ex) {} — swallow exception
❌ Hardcode connection string, secret, magic number
❌ Application layer import Infrastructure namespace
❌ IQueryable leak ra ngoài Infrastructure layer
❌ CancellationToken bị bỏ qua trong async method
```

---

## Database

- **DB:** PostgreSQL 15, schema: `[schema_name]`
- **Migrations dir:** `src/[Project].Infrastructure/Persistence/Migrations/`

```bash
# Thêm migration
dotnet ef migrations add [Name] \
  --project src/[Project].Infrastructure \
  --startup-project src/[Project].API

# Apply
dotnet ef database update \
  --project src/[Project].Infrastructure \
  --startup-project src/[Project].API

# Verify SQL trước khi apply
dotnet ef migrations script --idempotent \
  --project src/[Project].Infrastructure
```

**Migration rules:**
- Luôn review generated SQL trước khi commit
- Index trên production: dùng `CONCURRENTLY` (có `suppressTransaction: true` trong EF)
- Không mix schema + data migration

---

## Business Rules — Quan trọng

> Những rule bất biến — vi phạm là bug.

1. [Rule 1 — vd: "Order không thể cancel sau khi status = 'shipped'"]
2. [Rule 2]
3. [Rule 3]

---

## Running Locally

```bash
# 1. Start dependencies
docker-compose up -d   # PostgreSQL, Redis, RabbitMQ

# 2. Apply migrations
dotnet ef database update --project src/[Project].Infrastructure --startup-project src/[Project].API

# 3. Run API
dotnet run --project src/[Project].API

# 4. Run tests
dotnet test

# 5. Integration tests (requires Docker)
dotnet test src/[Project].IntegrationTests
```

**Environment variables (copy từ `.env.example`):**
```
ConnectionStrings__DefaultConnection=Host=localhost;Database=[db];Username=[user];Password=[pass]
Redis__ConnectionString=localhost:6379
RabbitMQ__Host=localhost
RabbitMQ__Username=guest
RabbitMQ__Password=guest
```

---

## Project-specific Conventions

> Những gì KHÁC so với base conventions (thêm vào khi phát hiện)

- [vd: "Không dùng AutoMapper — chỉ manual projection trong Handler/Query"]
- [vd: "Feature flag: dùng IFeatureManager (Microsoft.FeatureManagement)"]
- [vd: "Tenant isolation: Global Query Filter tự động — không cần manual WHERE TenantId"]

---

## Known Issues / Gotchas

> Những thứ có thể surprise bạn khi mới vào project

- [vd: "Query trên bảng `audit_logs` rất chậm vì 50M rows — luôn filter by entity_id + index hint"]
- [vd: "`Order.CustomerId` là FK nhưng KHÔNG có index — ai đó quên tạo, đang track ở TICKET-456"]
- [vd: "Worker service restart mỗi 6 tiếng do memory leak chưa fix — TICKET-789"]

---

## Useful Commands

```bash
# Xem slow queries (PostgreSQL)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 20;

# Check migration status
SELECT * FROM "__EFMigrationsHistory" ORDER BY "MigrationId" DESC LIMIT 5;

# Redis CLI
redis-cli -h localhost monitor | grep "orderapi:"
```

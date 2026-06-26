# CLAUDE.md — [PROJECT NAME]

> File này đặt ở root của project repo. Claude Code sẽ tự đọc khi start.
> Customize từ template, xóa phần không áp dụng.

---

## Project Overview
[2-3 câu mô tả project và domain]

## Tech Stack
- .NET 8, ASP.NET Core, EF Core 8
- PostgreSQL 15 (primary DB)
- Redis 7 (cache, session)
- RabbitMQ + MassTransit (messaging)
- [Thêm nếu có]

## Architecture
Clean Architecture + CQRS/MediatR. Layer order:
`Domain → Application → Infrastructure → API`

## Code Conventions
Xem: `docs/conventions.md` hoặc inline:

- Async method: luôn có `Async` suffix và `CancellationToken ct` param
- Repository: trả về `Result<T>` hoặc `T?`, không throw business exception
- Handler: 1 command/query per handler file
- Validator: FluentValidation, 1 file per command
- Projection bắt buộc cho read query (không load full entity)

## Database
- Schema: `[schema name]`
- Migrations: `src/Infrastructure/Migrations/`
- Thêm migration: `dotnet ef migrations add [Name] --project src/Infrastructure`
- Apply: `dotnet ef database update --project src/Infrastructure`

## Important Business Rules
[Copy từ project-context.md]

## Running Locally
```bash
# Start dependencies
docker-compose up -d

# Run API
dotnet run --project src/API

# Run tests
dotnet test
```

## Environment Variables
```
ConnectionStrings__DefaultConnection=...
Redis__ConnectionString=...
RabbitMQ__Host=...
```

## Do NOT
- Gọi trực tiếp DbContext từ Controller
- Dùng lazy loading
- Commit migration chưa được review
- Push secret vào code
- Bỏ CancellationToken khi implement async method

## Known Issues
[Paste từ project-context.md known issues]

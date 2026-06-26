# Clean Architecture Rules

---

## Layer Structure & Folder Naming

```
src/
├── YourApp.Domain/
│   ├── Entities/
│   ├── ValueObjects/
│   ├── Events/              ← Domain Events
│   ├── Enums/
│   ├── Exceptions/          ← Domain-specific exceptions
│   └── Interfaces/          ← Repository interfaces, Domain services
│
├── YourApp.Application/
│   ├── Features/
│   │   └── Orders/
│   │       ├── Commands/
│   │       │   ├── CreateOrder/
│   │       │   │   ├── CreateOrderCommand.cs
│   │       │   │   ├── CreateOrderCommandHandler.cs
│   │       │   │   └── CreateOrderCommandValidator.cs
│   │       └── Queries/
│   │           └── GetOrderById/
│   │               ├── GetOrderByIdQuery.cs
│   │               ├── GetOrderByIdQueryHandler.cs
│   │               └── OrderDetailDto.cs
│   ├── Common/
│   │   ├── Behaviors/       ← Pipeline behaviors (Logging, Validation, Caching)
│   │   ├── Interfaces/      ← IEmailService, IFileStorage, ICurrentUser
│   │   └── Models/          ← Result<T>, PagedList<T>
│   └── DependencyInjection.cs
│
├── YourApp.Infrastructure/
│   ├── Persistence/
│   │   ├── AppDbContext.cs
│   │   ├── Configurations/  ← IEntityTypeConfiguration per entity
│   │   ├── Migrations/
│   │   └── Repositories/
│   ├── ExternalServices/    ← HTTP clients, email, storage
│   ├── Caching/             ← Redis implementation
│   ├── Messaging/           ← RabbitMQ/MassTransit setup
│   └── DependencyInjection.cs
│
└── YourApp.API/
    ├── Controllers/
    ├── Middleware/
    ├── Filters/
    └── Program.cs
```

---

## Dependency Rule — Tuyệt đối không vi phạm

```
Domain        → không depend vào ai
Application   → chỉ depend vào Domain
Infrastructure → depend vào Application + Domain (implement interfaces)
API           → depend vào Application (gọi MediatR), Infrastructure (DI setup)
```

```csharp
// ✅ Application define interface, Infrastructure implement
// Application/Common/Interfaces/IEmailService.cs
public interface IEmailService
{
    Task SendOrderConfirmationAsync(string email, OrderDto order, CancellationToken ct);
}

// Infrastructure/ExternalServices/SmtpEmailService.cs
public class SmtpEmailService(IOptions<SmtpOptions> opts) : IEmailService
{
    public async Task SendOrderConfirmationAsync(string email, OrderDto order, CancellationToken ct)
        => ...; // Implementation detail ở Infrastructure
}

// ❌ Application import Infrastructure namespace
using YourApp.Infrastructure.Persistence; // ❌ trong Application layer
```

---

## Domain Layer

```csharp
// ✅ Entity — business logic trong entity, không ở ngoài
public class Order : AggregateRoot<Guid>
{
    private readonly List<OrderItem> _items = [];
    public IReadOnlyList<OrderItem> Items => _items.AsReadOnly();
    public OrderStatus Status { get; private set; }
    public decimal TotalAmount { get; private set; }

    // Business method — không phải CRUD setter
    public Result AddItem(Product product, int quantity)
    {
        if (Status != OrderStatus.Draft)
            return Result.Failure("Cannot add items to non-draft order");

        if (quantity <= 0)
            return Result.Failure("Quantity must be positive");

        var existing = _items.FirstOrDefault(i => i.ProductId == product.Id);
        if (existing is not null)
            existing.IncreaseQuantity(quantity);
        else
            _items.Add(new OrderItem(product.Id, product.Price, quantity));

        RecalculateTotal();
        AddDomainEvent(new OrderItemAddedEvent(Id, product.Id, quantity));
        return Result.Success();
    }

    private void RecalculateTotal()
        => TotalAmount = _items.Sum(i => i.UnitPrice * i.Quantity);
}

// ✅ Value Object — immutable, so sánh bằng value
public record Money(decimal Amount, string Currency)
{
    public static Money Zero(string currency) => new(0, currency);

    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new DomainException($"Cannot add {Currency} and {other.Currency}");
        return this with { Amount = Amount + other.Amount };
    }
}
```

---

## Application Layer

```csharp
// ✅ Command — write operation, return Result
public record CreateOrderCommand(
    Guid CustomerId,
    List<CreateOrderItemRequest> Items,
    string ShippingAddress
) : IRequest<Result<Guid>>;

// ✅ Handler — orchestrate domain, không có business logic ở đây
public class CreateOrderCommandHandler(
    IOrderRepository orderRepo,
    IProductRepository productRepo,
    IUnitOfWork unitOfWork) : IRequestHandler<CreateOrderCommand, Result<Guid>>
{
    public async Task<Result<Guid>> Handle(CreateOrderCommand cmd, CancellationToken ct)
    {
        var order = Order.Create(cmd.CustomerId, cmd.ShippingAddress);

        foreach (var item in cmd.Items)
        {
            var product = await productRepo.GetByIdAsync(item.ProductId, ct);
            if (product is null)
                return Result.Failure<Guid>($"Product {item.ProductId} not found");

            var addResult = order.AddItem(product, item.Quantity); // business logic ở Domain
            if (addResult.IsFailure)
                return Result.Failure<Guid>(addResult.Error);
        }

        orderRepo.Add(order);
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success(order.Id);
    }
}
```

---

## Common Violations — và cách nhận biết

```
❌ Controller gọi DbContext trực tiếp
   → Dấu hiệu: using Infrastructure namespace trong API project

❌ Business logic trong Handler thay vì Domain Entity
   → Dấu hiệu: if/else phức tạp trong Handle() method

❌ Repository trả về IQueryable ra ngoài Infrastructure
   → Dấu hiệu: LINQ query ở Application layer

❌ DTO từ Domain Entity (AutoMapper trực tiếp từ Entity)
   → Dấu hiệu: Exposing navigation properties trong response

❌ Application layer có infrastructure concern
   → Dấu hiệu: using Npgsql, using StackExchange.Redis trong Application

❌ Domain Entity có EF Core attribute
   → Dấu hiệu: [Column], [Table], [ForeignKey] trong Domain project
   → Fix: dùng IEntityTypeConfiguration trong Infrastructure
```

---

## Worker Service Pattern

```csharp
// ✅ Background worker với proper scope management
public class ReportGenerationWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<ReportGenerationWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
                await mediator.Send(new ProcessPendingReportsCommand(), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break; // Graceful shutdown
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in ReportGenerationWorker");
                // Tiếp tục chạy sau delay, không crash worker
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}
```

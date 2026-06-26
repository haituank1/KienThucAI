# Clean Architecture Rules

## Layer Structure

```
src/
├── YourApp.Domain/
│   ├── Entities/
│   ├── ValueObjects/
│   ├── Events/           ← Domain Events
│   ├── Enums/
│   ├── Exceptions/       ← Domain-specific exceptions
│   └── Interfaces/       ← Repository interfaces, Domain services
├── YourApp.Application/
│   ├── Features/
│   │   └── Orders/
│   │       ├── Commands/CreateOrder/
│   │       │   ├── CreateOrderCommand.cs
│   │       │   ├── CreateOrderCommandHandler.cs
│   │       │   └── CreateOrderCommandValidator.cs
│   │       └── Queries/GetOrderById/
│   │           ├── GetOrderByIdQuery.cs
│   │           ├── GetOrderByIdQueryHandler.cs
│   │           └── OrderDetailDto.cs
│   ├── Common/
│   │   ├── Behaviors/    ← Logging, Validation, Caching pipeline behaviors
│   │   ├── Interfaces/   ← IEmailService, IFileStorage, ICurrentUser
│   │   └── Models/       ← Result<T>, PagedList<T>
│   └── DependencyInjection.cs
├── YourApp.Infrastructure/
│   ├── Persistence/
│   │   ├── AppDbContext.cs
│   │   ├── Configurations/ ← IEntityTypeConfiguration per entity
│   │   ├── Migrations/
│   │   └── Repositories/
│   ├── ExternalServices/ ← HTTP clients, email, storage
│   ├── Caching/          ← Redis implementation
│   ├── Messaging/        ← RabbitMQ/MassTransit setup
│   └── DependencyInjection.cs
└── YourApp.API/
    ├── Controllers/
    ├── Middleware/
    ├── Filters/
    └── Program.cs
```

## Dependency Rule — Never violate

```
Domain        → depends on nothing
Application   → depends on Domain only
Infrastructure → depends on Application + Domain (implements interfaces)
API           → depends on Application (MediatR), Infrastructure (DI setup)
```

```csharp
// ✅ Application defines interface, Infrastructure implements
// Application/Common/Interfaces/IEmailService.cs
public interface IEmailService
{
    Task SendOrderConfirmationAsync(string email, OrderDto order, CancellationToken ct);
}

// Infrastructure/ExternalServices/SmtpEmailService.cs
public class SmtpEmailService(IOptions<SmtpOptions> opts) : IEmailService { ... }

// ❌
using YourApp.Infrastructure.Persistence; // in Application layer
```

## Domain Layer

```csharp
// ✅ Business logic lives in entity, not outside
public class Order : AggregateRoot<Guid>
{
    private readonly List<OrderItem> _items = [];
    public IReadOnlyList<OrderItem> Items => _items.AsReadOnly();
    public OrderStatus Status { get; private set; }
    public decimal TotalAmount { get; private set; }

    public Result AddItem(Product product, int quantity)
    {
        if (Status != OrderStatus.Draft) return Result.Failure("Cannot add items to non-draft order");
        if (quantity <= 0) return Result.Failure("Quantity must be positive");

        var existing = _items.FirstOrDefault(i => i.ProductId == product.Id);
        if (existing is not null) existing.IncreaseQuantity(quantity);
        else _items.Add(new OrderItem(product.Id, product.Price, quantity));

        TotalAmount = _items.Sum(i => i.UnitPrice * i.Quantity);
        AddDomainEvent(new OrderItemAddedEvent(Id, product.Id, quantity));
        return Result.Success();
    }
}

// ✅ Value Object — immutable, equality by value
public record Money(decimal Amount, string Currency)
{
    public static Money Zero(string currency) => new(0, currency);
    public Money Add(Money other) => Currency != other.Currency
        ? throw new DomainException($"Cannot add {Currency} and {other.Currency}")
        : this with { Amount = Amount + other.Amount };
}
```

## Application Layer

```csharp
// ✅ Command — write operation, return Result
public record CreateOrderCommand(
    Guid CustomerId, List<CreateOrderItemRequest> Items, string ShippingAddress
) : IRequest<Result<Guid>>;

// ✅ Handler — orchestrates domain, no business logic here
public class CreateOrderCommandHandler(
    IOrderRepository orderRepo, IProductRepository productRepo, IUnitOfWork unitOfWork)
    : IRequestHandler<CreateOrderCommand, Result<Guid>>
{
    public async Task<Result<Guid>> Handle(CreateOrderCommand cmd, CancellationToken ct)
    {
        var order = Order.Create(cmd.CustomerId, cmd.ShippingAddress);
        foreach (var item in cmd.Items)
        {
            var product = await productRepo.GetByIdAsync(item.ProductId, ct);
            if (product is null) return Result.Failure<Guid>($"Product {item.ProductId} not found");
            var addResult = order.AddItem(product, item.Quantity);
            if (addResult.IsFailure) return Result.Failure<Guid>(addResult.Error);
        }
        orderRepo.Add(order);
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success(order.Id);
    }
}
```

## Common Violations

| Violation | Symptom | Fix |
|-----------|---------|-----|
| Controller calls DbContext directly | Infrastructure namespace in API project | Use MediatR |
| Business logic in Handler | Complex if/else in Handle() | Move to Domain Entity |
| Repository returns IQueryable | LINQ queries in Application layer | Return materialized collections |
| AutoMapper from Entity to DTO | Navigation properties in response | Project in query handler |
| Application has infra concern | using Npgsql/StackExchange.Redis in Application | Define interface, implement in Infrastructure |
| Domain Entity has EF attributes | [Column],[Table],[ForeignKey] in Domain | Use IEntityTypeConfiguration in Infrastructure |

## Worker Service Pattern

```csharp
public class ReportGenerationWorker(IServiceScopeFactory scopeFactory, ILogger<ReportGenerationWorker> logger)
    : BackgroundService
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
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogError(ex, "Error in ReportGenerationWorker"); }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}
```

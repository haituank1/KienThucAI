# CQRS + MediatR Rules

---

## Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Command | `[Verb][Noun]Command` | `CreateOrderCommand`, `CancelOrderCommand` |
| Query | `Get[Noun]By[Key]Query` / `List[Noun]Query` | `GetOrderByIdQuery`, `ListOrdersByCustomerQuery` |
| Handler | `[CommandOrQuery]Handler` | `CreateOrderCommandHandler` |
| Validator | `[CommandOrQuery]Validator` | `CreateOrderCommandValidator` |
| Response DTO | `[Noun]Dto` | `OrderDetailDto`, `OrderSummaryDto` |

---

## Command — Template đầy đủ

```csharp
// 1. Command — immutable record
public record CreateOrderCommand(
    Guid CustomerId,
    IReadOnlyList<CreateOrderItemRequest> Items,
    string ShippingAddress,
    string? PromoCode = null
) : IRequest<Result<Guid>>;

public record CreateOrderItemRequest(Guid ProductId, int Quantity);

// 2. Validator
public class CreateOrderCommandValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Items).NotEmpty().WithMessage("Order must have at least one item");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).NotEmpty();
            item.RuleFor(i => i.Quantity).GreaterThan(0);
        });
        RuleFor(x => x.ShippingAddress).NotEmpty().MaximumLength(500);
    }
}

// 3. Handler
public class CreateOrderCommandHandler(
    IOrderRepository orderRepo,
    IProductRepository productRepo,
    IUnitOfWork unitOfWork,
    ILogger<CreateOrderCommandHandler> logger)
    : IRequestHandler<CreateOrderCommand, Result<Guid>>
{
    public async Task<Result<Guid>> Handle(
        CreateOrderCommand cmd, CancellationToken ct)
    {
        // Orchestrate — không có business logic ở đây
        var order = Order.Create(cmd.CustomerId, cmd.ShippingAddress);

        foreach (var itemReq in cmd.Items)
        {
            var product = await productRepo.GetByIdAsync(itemReq.ProductId, ct);
            if (product is null)
                return Result.Failure<Guid>($"Product {itemReq.ProductId} not found");

            var result = order.AddItem(product, itemReq.Quantity);
            if (result.IsFailure)
                return Result.Failure<Guid>(result.Error);
        }

        orderRepo.Add(order);
        await unitOfWork.SaveChangesAsync(ct);

        logger.LogInformation("Order {OrderId} created for customer {CustomerId}",
            order.Id, cmd.CustomerId);

        return Result.Success(order.Id);
    }
}
```

---

## Query — Template đầy đủ

```csharp
// Query handler: AsNoTracking + projection bắt buộc
public record GetOrderByIdQuery(Guid OrderId) : IRequest<Result<OrderDetailDto>>;

public class GetOrderByIdQueryHandler(AppDbContext ctx)
    : IRequestHandler<GetOrderByIdQuery, Result<OrderDetailDto>>
{
    public async Task<Result<OrderDetailDto>> Handle(
        GetOrderByIdQuery query, CancellationToken ct)
    {
        var dto = await ctx.Orders
            .AsNoTracking()
            .Where(o => o.Id == query.OrderId)
            .Select(o => new OrderDetailDto
            {
                Id = o.Id,
                CustomerName = o.Customer.FullName,
                Status = o.Status,
                TotalAmount = o.TotalAmount,
                Items = o.Items.Select(i => new OrderItemDto
                {
                    ProductName = i.Product.Name,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice
                }).ToList(),
                CreatedAt = o.CreatedAt
            })
            .FirstOrDefaultAsync(ct);

        return dto is null
            ? Result.Failure<OrderDetailDto>($"Order {query.OrderId} not found")
            : Result.Success(dto);
    }
}
```

---

## Pipeline Behaviors — Thứ tự đăng ký

```csharp
// Program.cs — thứ tự đăng ký = thứ tự execute (outer → inner)
services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(ApplicationAssemblyMarker).Assembly);
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));      // 1st
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));   // 2nd
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(CachingBehavior<,>));      // 3rd (Query only)
});
```

```csharp
// LoggingBehavior — log mọi request + timing
public class LoggingBehavior<TRequest, TResponse>(
    ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var requestName = typeof(TRequest).Name;
        logger.LogInformation("Handling {RequestName}", requestName);
        var sw = Stopwatch.StartNew();
        try
        {
            var response = await next();
            logger.LogInformation("Handled {RequestName} in {ElapsedMs}ms",
                requestName, sw.ElapsedMilliseconds);
            return response;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error handling {RequestName} after {ElapsedMs}ms",
                requestName, sw.ElapsedMilliseconds);
            throw;
        }
    }
}

// ValidationBehavior — validate trước khi handler chạy
public class ValidationBehavior<TRequest, TResponse>(
    IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (!validators.Any()) return await next();

        var context = new ValidationContext<TRequest>(request);
        var failures = validators
            .Select(v => v.Validate(context))
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count != 0)
            throw new ValidationException(failures);

        return await next();
    }
}
```

---

## Anti-patterns

```csharp
// ❌ Gọi mediator trong handler — tight coupling + circular dependency risk
public class CreateOrderCommandHandler(IMediator mediator)
{
    public async Task<Result<Guid>> Handle(CreateOrderCommand cmd, CancellationToken ct)
    {
        var product = await mediator.Send(new GetProductByIdQuery(cmd.ProductId), ct); // ❌
        ...
    }
}
// ✅ Inject repository/service trực tiếp

// ❌ Quá nhiều logic trong Handler — vi phạm SRP
public async Task<Result<Guid>> Handle(CreateOrderCommand cmd, CancellationToken ct)
{
    // 100 dòng logic phức tạp ở đây — ❌ move vào Domain Entity
}

// ❌ Command trả về entity — expose internal state
public record CreateOrderCommand(...) : IRequest<Order>; // ❌
// ✅ Trả về Id hoặc DTO
public record CreateOrderCommand(...) : IRequest<Result<Guid>>; // ✅
```

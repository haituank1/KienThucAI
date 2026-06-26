# Base Conventions

## Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Class/Record/Interface | PascalCase | `OrderService`, `IOrderRepository` |
| Method | PascalCase | `GetOrderByIdAsync` |
| Local variable | camelCase | `orderDetail` |
| Private field | `_` prefix | `_orderRepository` |
| Parameter | camelCase | `orderId` |
| Constant | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Interface | `I` prefix | `IEmailService` |
| Async method | `Async` suffix | `CreateOrderAsync` |
| Boolean | `is/has/can` prefix | `isActive`, `hasPermission` |
| Generic type param | `T` + noun | `TEntity`, `TResult` |

## Result Pattern

```csharp
// ✅ Business error → Result
public async Task<Result<OrderDto>> GetOrderAsync(Guid id, CancellationToken ct)
{
    var order = await _ctx.Orders.AsNoTracking()
        .Where(o => o.Id == id).Select(o => new OrderDto { ... }).FirstOrDefaultAsync(ct);
    return order is null ? Result.Failure<OrderDto>($"Order {id} not found") : Result.Success(order);
}

// ❌ Exception for expected business case
if (order is null) throw new NotFoundException("Order not found");
```

Exception only for unexpected/unrecoverable errors (DB down, infra fail). Business validation → Result.

## Error Handling

```csharp
// ✅
catch (PaymentGatewayException ex) when (ex.IsRetryable)
{
    _logger.LogWarning(ex, "Payment retry-able error for order {OrderId}", order.Id);
    throw; // Re-throw for Polly retry
}
catch (PaymentGatewayException ex)
{
    _logger.LogError(ex, "Payment failed permanently for order {OrderId}", order.Id);
    return Result.Failure<PaymentResult>("Payment declined");
}

// ❌
catch (Exception) { }           // swallow
catch (Exception ex) { return null; } // hide
```

Top-level middleware: catch all unexpected exceptions → log + 500.

## Async/Await

```csharp
// ✅ CancellationToken through full call chain
public async Task<Result<ReportDto>> GenerateReportAsync(ReportFilter filter, CancellationToken ct)
{
    var data = await _repo.GetDataAsync(filter, ct);
    return Result.Success(await _processor.ProcessAsync(data, ct));
}

// ❌ Blocking — deadlock risk in ASP.NET
GetDataAsync().Result;
GetDataAsync().GetAwaiter().GetResult();

// ❌ async void — exception uncatchable
public async void ProcessEvent(object sender, EventArgs e) { ... }
// ✅ Exception: required event handlers — wrap try/catch inside
```

## Dependency Injection

```csharp
// ✅ Correct lifetimes
services.AddSingleton<IEmailTemplateCache, EmailTemplateCache>(); // stateless, thread-safe
services.AddScoped<IOrderRepository, OrderRepository>();          // per-request
services.AddTransient<IReportBuilder, PdfReportBuilder>();        // new each time

// ❌ Captive dependency: Scoped injected into Singleton
// ✅ Fix: IServiceScopeFactory
public class MyBackgroundService(IServiceScopeFactory scopeFactory)
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IOrderRepository>();
        await repo.DoWorkAsync(ct);
    }
}
```

## Logging

```csharp
// ✅ Structured logging with named properties
_logger.LogInformation("Order {OrderId} created for customer {CustomerId} with total {TotalAmount:C}",
    order.Id, order.CustomerId, order.TotalAmount);

// ❌ String interpolation — loses structured data
_logger.LogInformation($"Order {order.Id} created");

// ❌ Sensitive data
_logger.LogDebug("User password: {Password}", request.Password);
```

Levels: Debug(dev only) / Info(business event) / Warning(retry/degraded) / Error(failure). Log at entry point only.

## Security

- Input validation at Application layer — FluentValidation per Command/Query
- Re-validate ID ownership server-side (user sees only their data)
- Parameterized queries always — EF Core handles; raw SQL use EF interpolation, not string concat
- Secrets: IConfiguration + Environment Variables + Secret Manager, never hardcode
- Never return `StackTrace` to client in production

## Code Quality

| Rule | Limit |
|------|-------|
| Method length | ≤30 lines |
| Class length | ≤300 lines |
| Cyclomatic complexity | ≤10 per method |

- Magic numbers → named constant or enum
- Commented-out code → delete, use git history
- `TODO` must include ticket: `// TODO: [TICKET-123] Implement retry logic`

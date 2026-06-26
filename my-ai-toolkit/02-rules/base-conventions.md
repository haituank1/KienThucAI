# Base Conventions
> Áp dụng mọi project, mọi công ty. Không override trừ khi có lý do rõ ràng.

---

## Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Class, Record, Interface | PascalCase | `OrderService`, `IOrderRepository` |
| Method | PascalCase | `GetOrderByIdAsync` |
| Local variable | camelCase | `orderDetail` |
| Private field | `_` prefix | `_orderRepository` |
| Parameter | camelCase | `orderId` |
| Constant | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Interface | `I` prefix | `IEmailService` |
| Async method | `Async` suffix | `CreateOrderAsync` |
| Boolean | `is/has/can` prefix | `isActive`, `hasPermission`, `canRetry` |
| Generic type param | `T` + noun | `TEntity`, `TResult` |

---

## Result Pattern — Dùng thay vì throw exception cho business error

```csharp
// ✅ Business error → Result, không throw
public async Task<Result<OrderDto>> GetOrderAsync(Guid id, CancellationToken ct)
{
    var order = await _ctx.Orders
        .AsNoTracking()
        .Where(o => o.Id == id)
        .Select(o => new OrderDto { ... })
        .FirstOrDefaultAsync(ct);

    return order is null
        ? Result.Failure<OrderDto>($"Order {id} not found")
        : Result.Success(order);
}

// ❌ Đừng throw cho expected business case
public async Task<OrderDto> GetOrderAsync(Guid id)
{
    var order = await _ctx.Orders.FindAsync(id);
    if (order is null) throw new NotFoundException("Order not found"); // ❌ Exception cho flow bình thường
    return _mapper.Map<OrderDto>(order);
}
```

**Rule:** Exception chỉ cho unexpected/unrecoverable error (DB down, config sai, infrastructure fail). Business validation → Result.

---

## Error Handling

```csharp
// ✅ Catch specific, log đủ context
try
{
    await _paymentGateway.ChargeAsync(order.Id, amount, ct);
}
catch (PaymentGatewayException ex) when (ex.IsRetryable)
{
    _logger.LogWarning(ex, "Payment retry-able error for order {OrderId}", order.Id);
    throw; // Re-throw để Polly retry
}
catch (PaymentGatewayException ex)
{
    _logger.LogError(ex, "Payment failed permanently for order {OrderId}", order.Id);
    return Result.Failure<PaymentResult>("Payment declined");
}

// ❌ Không swallow, không catch quá rộng
try { ... }
catch (Exception) { } // ❌ swallow
catch (Exception ex) { return null; } // ❌ hide error
```

**Top-level exception handler** (Middleware): catch tất cả unexpected exception, log + return 500.

---

## Async/Await

```csharp
// ✅ CancellationToken qua toàn bộ call chain
public async Task<Result<ReportDto>> GenerateReportAsync(
    ReportFilter filter,
    CancellationToken ct) // ← nhận ở đây
{
    var data = await _repo.GetDataAsync(filter, ct);      // ← pass xuống
    var processed = await _processor.ProcessAsync(data, ct); // ← và tiếp tục
    return Result.Success(processed);
}

// ❌ Blocking — deadlock risk trong ASP.NET
var result = GetDataAsync().Result;     // ❌
var result = GetDataAsync().GetAwaiter().GetResult(); // ❌
Task.Run(() => GetDataAsync()).Wait();  // ❌

// ❌ async void — exception không catch được
public async void ProcessEvent(object sender, EventArgs e) { ... } // ❌
// ✅ Trừ event handler bắt buộc — wrap try/catch bên trong
```

---

## Dependency Injection

```csharp
// ✅ Đăng ký đúng lifetime
services.AddSingleton<IEmailTemplateCache, EmailTemplateCache>();  // stateless, thread-safe
services.AddScoped<IOrderRepository, OrderRepository>();           // per-request
services.AddTransient<IReportBuilder, PdfReportBuilder>();         // new instance mỗi lần

// ❌ Captive dependency — Scoped inject vào Singleton
public class MyBackgroundService // Singleton
{
    private readonly IOrderRepository _repo; // Scoped → ❌ captive dependency
    public MyBackgroundService(IOrderRepository repo) => _repo = repo;
}

// ✅ Fix: IServiceScopeFactory
public class MyBackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IOrderRepository>();
        await repo.DoWorkAsync(ct);
    }
}
```

---

## Logging

```csharp
// ✅ Structured logging với named properties
_logger.LogInformation(
    "Order {OrderId} created for customer {CustomerId} with total {TotalAmount:C}",
    order.Id, order.CustomerId, order.TotalAmount);

// ✅ Log ở entry point, không log trong mọi method
// ✅ Include correlation ID (tự động nếu dùng Serilog + middleware)
// ✅ Log level đúng: Debug(dev only) / Info(business event) / Warning(retry/degraded) / Error(failure)

// ❌ String interpolation trong log — mất structured data
_logger.LogInformation($"Order {order.Id} created"); // ❌

// ❌ Log sensitive data
_logger.LogDebug("User password: {Password}", request.Password); // ❌
_logger.LogDebug("Card number: {Card}", payment.CardNumber);    // ❌
```

---

## Security

- Input validation tại Application layer — FluentValidation per Command/Query
- Không trust client data: re-validate ID ownership (user chỉ xem data của mình)
- Parameterized query always — EF Core tự handle, raw SQL dùng `$"...{param}..."` interpolation của EF (không phải string concat)
- Secret: IConfiguration + Environment Variable + Secret Manager, không hardcode
- Sensitive response: không trả `StackTrace` ra client trong production

---

## Code Quality

- Method: ≤ 30 dòng (nếu dài hơn → tách method private)
- Class: ≤ 300 dòng (nếu dài hơn → tách class)
- Cyclomatic complexity: ≤ 10 per method
- Magic number → named constant hoặc enum
- Commented-out code → xóa, dùng git history
- `TODO` comment → phải kèm ticket number: `// TODO: [TICKET-123] Implement retry logic`

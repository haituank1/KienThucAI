# RabbitMQ + MassTransit Rules

---

## Message Design

```csharp
// ✅ Message là immutable snapshot — không có FK, không reference internal state
public record OrderCreatedEvent
{
    public Guid MessageId { get; init; } = Guid.NewGuid();
    public Guid OrderId { get; init; }
    public Guid CustomerId { get; init; }
    public string CustomerEmail { get; init; } = default!;  // snapshot, không join lại
    public decimal TotalAmount { get; init; }
    public string Currency { get; init; } = default!;
    public DateTime OccurredAt { get; init; } = DateTime.UtcNow;
    public IReadOnlyList<OrderItemSnapshot> Items { get; init; } = [];
}

public record OrderItemSnapshot(Guid ProductId, string ProductName, int Quantity, decimal UnitPrice);

// Naming:
// Event (đã xảy ra): {Entity}{PastTense}Event  → OrderCreatedEvent, PaymentFailedEvent
// Command (yêu cầu làm gì): {Verb}{Entity}Command → ProcessRefundCommand
```

---

## Consumer — Idempotent bắt buộc

```csharp
// MassTransit consumer
public class OrderCreatedConsumer(
    AppDbContext ctx,
    IEmailService emailService,
    ILogger<OrderCreatedConsumer> logger)
    : IConsumer<OrderCreatedEvent>
{
    public async Task Consume(ConsumeContext<OrderCreatedEvent> context)
    {
        var msg = context.Message;
        var messageId = context.MessageId ?? msg.MessageId;

        // 1. Idempotency check — message có thể delivered nhiều lần (at-least-once)
        var alreadyProcessed = await ctx.ProcessedMessages
            .AnyAsync(m => m.MessageId == messageId, context.CancellationToken);

        if (alreadyProcessed)
        {
            logger.LogInformation(
                "Message {MessageId} already processed, skipping", messageId);
            return; // Không throw — acknowledge message
        }

        // 2. Business logic
        await emailService.SendOrderConfirmationAsync(
            msg.CustomerEmail, msg.OrderId, context.CancellationToken);

        // 3. Mark as processed (cùng transaction với business operation nếu có)
        ctx.ProcessedMessages.Add(new ProcessedMessage
        {
            MessageId = messageId,
            MessageType = nameof(OrderCreatedEvent),
            ProcessedAt = DateTime.UtcNow
        });
        await ctx.SaveChangesAsync(context.CancellationToken);

        logger.LogInformation(
            "Order confirmation sent for order {OrderId}", msg.OrderId);
    }
}
```

---

## MassTransit Configuration

```csharp
// Program.cs
services.AddMassTransit(x =>
{
    // Scan consumers trong Assembly
    x.AddConsumers(typeof(ApplicationAssemblyMarker).Assembly);

    // Outbox — đảm bảo publish cùng transaction với DB write
    x.AddEntityFrameworkOutbox<AppDbContext>(o =>
    {
        o.UsePostgres();
        o.UseBusOutbox(); // tự publish từ outbox table
    });

    x.UsingRabbitMq((ctx, cfg) =>
    {
        cfg.Host(config["RabbitMQ:Host"], h =>
        {
            h.Username(config["RabbitMQ:Username"]!);
            h.Password(config["RabbitMQ:Password"]!);
        });

        // Consumer endpoint
        cfg.ReceiveEndpoint("billing-order-created", e =>
        {
            // Retry với exponential backoff
            e.UseMessageRetry(r => r
                .Exponential(5,
                    TimeSpan.FromSeconds(2),
                    TimeSpan.FromMinutes(5),
                    TimeSpan.FromSeconds(5)));

            // Sau retry exhausted → _error queue (DLQ) tự động
            e.ConfigureConsumer<OrderCreatedConsumer>(ctx);
        });

        cfg.ConfigureEndpoints(ctx); // auto-configure remaining consumers
    });
});
```

---

## Outbox Pattern — Đảm bảo publish atomic với DB write

```csharp
// Handler publish event qua outbox (không publish trực tiếp)
public class CreateOrderCommandHandler(
    IOrderRepository orderRepo,
    IUnitOfWork unitOfWork,
    IPublishEndpoint publishEndpoint)  // MassTransit publish endpoint (có outbox)
    : IRequestHandler<CreateOrderCommand, Result<Guid>>
{
    public async Task<Result<Guid>> Handle(CreateOrderCommand cmd, CancellationToken ct)
    {
        var order = Order.Create(cmd.CustomerId, cmd.ShippingAddress);
        orderRepo.Add(order);

        // Publish qua outbox — lưu vào DB cùng transaction với order
        await publishEndpoint.Publish(new OrderCreatedEvent
        {
            OrderId = order.Id,
            CustomerId = order.CustomerId,
            TotalAmount = order.TotalAmount,
            OccurredAt = DateTime.UtcNow
        }, ct);

        await unitOfWork.SaveChangesAsync(ct); // Atomic: order + outbox message
        return Result.Success(order.Id);
    }
}

// ❌ Không publish trực tiếp trước SaveChanges
await publishEndpoint.Publish(event);  // ❌ nếu SaveChanges fail → event đã published, data chưa lưu
await ctx.SaveChangesAsync();
```

---

## Dead Letter Queue (DLQ)

```
Queue naming:
  orderapi.billing-order-created        ← main queue
  orderapi.billing-order-created_error  ← DLQ (MassTransit tự tạo)
  orderapi.billing-order-created_skipped ← skipped messages

Khi message vào DLQ:
  1. Alert ngay → không để DLQ tích lũy
  2. Investigate exception (trong message header)
  3. Fix bug → deploy
  4. Republish từ DLQ:
     - MassTransit: dùng management UI hoặc IReceiveEndpointConnector
     - RabbitMQ Management: shovel plugin
```

---

## Naming Convention

| Element | Convention | Example |
|---------|-----------|---------|
| Exchange | kebab-case, noun-plural | `orders`, `payments`, `notifications` |
| Queue | `{service}-{event-kebab}` | `billing-service-order-created` |
| Event | `{Entity}{PastTense}Event` | `OrderCreatedEvent` |
| Command message | `{Verb}{Entity}Command` | `ProcessRefundCommand` |

---

## Anti-patterns

```
❌ Publish message trực tiếp (không qua Outbox) khi cần consistency với DB
❌ Consumer làm quá nhiều việc — split thành nhiều consumers nhỏ
❌ Throw exception từ consumer mà không retry strategy → message lost
❌ Consumer không idempotent → duplicate message gây data inconsistency
❌ Share queue giữa nhiều services khác nhau — coupling ẩn
❌ Dùng RabbitMQ cho synchronous request-reply — dùng HTTP/gRPC thay
❌ Publish sensitive data trong event — chỉ publish ID + minimal context
```

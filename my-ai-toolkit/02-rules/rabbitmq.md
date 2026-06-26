# RabbitMQ + MassTransit Rules

## Message Design

```csharp
// ✅ Immutable snapshot — no FKs, no internal state references
public record OrderCreatedEvent
{
    public Guid MessageId { get; init; } = Guid.NewGuid();
    public Guid OrderId { get; init; }
    public Guid CustomerId { get; init; }
    public string CustomerEmail { get; init; } = default!;  // snapshot, don't re-join
    public decimal TotalAmount { get; init; }
    public string Currency { get; init; } = default!;
    public DateTime OccurredAt { get; init; } = DateTime.UtcNow;
    public IReadOnlyList<OrderItemSnapshot> Items { get; init; } = [];
}
public record OrderItemSnapshot(Guid ProductId, string ProductName, int Quantity, decimal UnitPrice);
```

## Naming Convention

| Element | Convention | Example |
|---------|-----------|---------|
| Exchange | kebab-case, noun-plural | `orders`, `payments` |
| Queue | `{service}-{event-kebab}` | `billing-service-order-created` |
| Event (past) | `{Entity}{PastTense}Event` | `OrderCreatedEvent`, `PaymentFailedEvent` |
| Command | `{Verb}{Entity}Command` | `ProcessRefundCommand` |

## Consumer — Idempotency Required (at-least-once delivery)

```csharp
public class OrderCreatedConsumer(AppDbContext ctx, IEmailService emailService, ILogger<OrderCreatedConsumer> logger)
    : IConsumer<OrderCreatedEvent>
{
    public async Task Consume(ConsumeContext<OrderCreatedEvent> context)
    {
        var msg = context.Message;
        var messageId = context.MessageId ?? msg.MessageId;

        // 1. Idempotency check
        if (await ctx.ProcessedMessages.AnyAsync(m => m.MessageId == messageId, context.CancellationToken))
        {
            logger.LogInformation("Message {MessageId} already processed, skipping", messageId);
            return; // Don't throw — acknowledge the message
        }

        // 2. Business logic
        await emailService.SendOrderConfirmationAsync(msg.CustomerEmail, msg.OrderId, context.CancellationToken);

        // 3. Mark processed (same transaction as business operation when possible)
        ctx.ProcessedMessages.Add(new ProcessedMessage
            { MessageId = messageId, MessageType = nameof(OrderCreatedEvent), ProcessedAt = DateTime.UtcNow });
        await ctx.SaveChangesAsync(context.CancellationToken);
    }
}
```

## MassTransit Configuration

```csharp
services.AddMassTransit(x =>
{
    x.AddConsumers(typeof(ApplicationAssemblyMarker).Assembly);

    // Outbox — ensures publish is atomic with DB write
    x.AddEntityFrameworkOutbox<AppDbContext>(o => { o.UsePostgres(); o.UseBusOutbox(); });

    x.UsingRabbitMq((ctx, cfg) =>
    {
        cfg.Host(config["RabbitMQ:Host"], h =>
        {
            h.Username(config["RabbitMQ:Username"]!);
            h.Password(config["RabbitMQ:Password"]!);
        });

        cfg.ReceiveEndpoint("billing-order-created", e =>
        {
            // Exponential backoff: 5 retries, 2s base, 5min max, 5s interval
            e.UseMessageRetry(r => r.Exponential(5, TimeSpan.FromSeconds(2),
                TimeSpan.FromMinutes(5), TimeSpan.FromSeconds(5)));
            // After retries exhausted → _error queue (DLQ) auto-created
            e.ConfigureConsumer<OrderCreatedConsumer>(ctx);
        });

        cfg.ConfigureEndpoints(ctx);
    });
});
```

## Outbox Pattern — Atomic publish with DB write

```csharp
public async Task<Result<Guid>> Handle(CreateOrderCommand cmd, CancellationToken ct)
{
    var order = Order.Create(cmd.CustomerId, cmd.ShippingAddress);
    orderRepo.Add(order);

    // Publish via outbox — saved to DB in same transaction
    await publishEndpoint.Publish(new OrderCreatedEvent
        { OrderId = order.Id, CustomerId = order.CustomerId, TotalAmount = order.TotalAmount,
          OccurredAt = DateTime.UtcNow }, ct);

    await unitOfWork.SaveChangesAsync(ct); // Atomic: order + outbox message
    return Result.Success(order.Id);
}

// ❌ Publish directly before SaveChanges
await publishEndpoint.Publish(event);  // if SaveChanges fails → event published, data not saved
await ctx.SaveChangesAsync();
```

## Dead Letter Queue (DLQ)

```
Queues auto-created by MassTransit:
  billing-order-created          ← main
  billing-order-created_error    ← DLQ
  billing-order-created_skipped  ← skipped

On message in DLQ:
  1. Alert immediately — don't let DLQ accumulate
  2. Check exception in message headers
  3. Fix + deploy
  4. Republish: MassTransit management UI / IReceiveEndpointConnector / RabbitMQ shovel plugin
```

## Anti-patterns

```
❌ Publish directly (no Outbox) when DB consistency required
❌ Consumer doing too much — split into multiple small consumers
❌ Throw exception without retry strategy → message lost
❌ Non-idempotent consumer → duplicate messages cause data inconsistency
❌ Shared queue across multiple different services — hidden coupling
❌ RabbitMQ for synchronous request-reply — use HTTP/gRPC instead
❌ Publish sensitive data in events — publish ID + minimal context only
```

# RabbitMQ / MassTransit Patterns Thực Chiến

## 1. Outbox Pattern với EF Core
```csharp
public class OutboxMessage
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Type { get; init; } = default!;
    public string Payload { get; init; } = default!;
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
}

// Publish cùng transaction với business operation
public async Task Handle(CreateOrderCommand cmd, CancellationToken ct)
{
    var order = Order.Create(cmd);
    _ctx.Orders.Add(order);
    _ctx.OutboxMessages.Add(new OutboxMessage
    {
        Type = nameof(OrderCreatedEvent),
        Payload = JsonSerializer.Serialize(new OrderCreatedEvent(order.Id, ...))
    });
    await _ctx.SaveChangesAsync(ct); // Atomic: order + outbox
}
// Background worker reads outbox → publish to broker
// (Dùng MassTransit Outbox built-in hoặc tự build)
```

## 2. Consumer Idempotent với Inbox
```csharp
public class OrderCreatedConsumer : IConsumer<OrderCreatedEvent>
{
    public async Task Consume(ConsumeContext<OrderCreatedEvent> ctx)
    {
        var messageId = ctx.MessageId ?? Guid.NewGuid();
        if (await _ctx.ProcessedMessages.AnyAsync(m => m.MessageId == messageId))
        {
            _logger.LogInformation("Message {Id} already processed, skipping", messageId);
            return;
        }

        await HandleOrderCreated(ctx.Message);

        _ctx.ProcessedMessages.Add(new ProcessedMessage { MessageId = messageId });
        await _ctx.SaveChangesAsync();
    }
}
```

## 3. Retry + Dead Letter Queue
```csharp
services.AddMassTransit(x =>
{
    x.AddConsumer<OrderCreatedConsumer>();
    x.UsingRabbitMq((ctx, cfg) =>
    {
        cfg.ReceiveEndpoint("order-created", e =>
        {
            e.UseMessageRetry(r => r.Intervals(
                TimeSpan.FromSeconds(5),
                TimeSpan.FromSeconds(30),
                TimeSpan.FromMinutes(2)));

            // Sau retry exhausted → _error queue (DLQ)
            e.UseDelayedRedelivery(r => r.Intervals(
                TimeSpan.FromMinutes(5),
                TimeSpan.FromMinutes(30),
                TimeSpan.FromHours(1)));

            e.ConfigureConsumer<OrderCreatedConsumer>(ctx);
        });
    });
});
```

## 4. Republish từ DLQ
```csharp
// Sau khi deploy fix: đọc từ {queueName}_error → publish lại vào queue gốc
public async Task RepublishDeadLettersAsync(string queueName, CancellationToken ct) { ... }
```

**Lesson learned:**
- Luôn implement idempotent consumer — at-least-once delivery
- Monitor DLQ với alert — message trong DLQ = bug cần fix; không xóa mà không hiểu nguyên nhân

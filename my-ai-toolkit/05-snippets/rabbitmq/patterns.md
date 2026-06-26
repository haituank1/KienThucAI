# RabbitMQ / MassTransit Patterns Thực Chiến

## 1. Outbox Pattern với EF Core
```csharp
// 1. Outbox table
public class OutboxMessage
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Type { get; init; } = default!;
    public string Payload { get; init; } = default!;
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
}

// 2. Publish trong cùng transaction
public async Task Handle(CreateOrderCommand cmd, CancellationToken ct)
{
    var order = Order.Create(cmd);
    _ctx.Orders.Add(order);
    
    // Thêm vào outbox cùng transaction
    _ctx.OutboxMessages.Add(new OutboxMessage
    {
        Type = nameof(OrderCreatedEvent),
        Payload = JsonSerializer.Serialize(new OrderCreatedEvent(order.Id, ...))
    });
    
    await _ctx.SaveChangesAsync(ct); // Atomic: order + outbox
}

// 3. Background worker publish outbox
// (Dùng MassTransit Outbox built-in hoặc tự build)
```

## 2. Consumer Idempotent với Inbox
```csharp
public class OrderCreatedConsumer : IConsumer<OrderCreatedEvent>
{
    public async Task Consume(ConsumeContext<OrderCreatedEvent> ctx)
    {
        var messageId = ctx.MessageId ?? Guid.NewGuid();
        
        // Idempotency check
        var exists = await _ctx.ProcessedMessages
            .AnyAsync(m => m.MessageId == messageId);
        if (exists)
        {
            _logger.LogInformation("Message {Id} already processed, skipping", messageId);
            return;
        }
        
        // Process
        await HandleOrderCreated(ctx.Message);
        
        // Mark processed
        _ctx.ProcessedMessages.Add(new ProcessedMessage { MessageId = messageId });
        await _ctx.SaveChangesAsync();
    }
}
```

## 3. Retry + Dead Letter Queue config
```csharp
// Startup.cs
services.AddMassTransit(x =>
{
    x.AddConsumer<OrderCreatedConsumer>();
    
    x.UsingRabbitMq((ctx, cfg) =>
    {
        cfg.ReceiveEndpoint("order-created", e =>
        {
            // Retry 3 lần với backoff
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

## 4. Republish từ DLQ (sau khi fix bug)
```csharp
// Tool/script republish DLQ messages
public async Task RepublishDeadLettersAsync(string queueName, CancellationToken ct)
{
    var dlqName = $"{queueName}_error";
    // Đọc từ DLQ → publish lại vào queue gốc
    // Thực hiện sau khi deploy fix
}
```

---
**Lesson learned:**
- Luôn implement idempotent consumer — message có thể delivered nhiều lần (at-least-once)
- Monitor DLQ với alert — message trong DLQ = bug cần fix
- Không xóa DLQ message mà không hiểu tại sao nó ở đó

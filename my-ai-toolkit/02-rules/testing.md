# Testing Rules — xUnit + Moq + FluentAssertions

## Test Pyramid

```
      [E2E]           ← least, slow, fragile
     [Integration]    ← DB/external (TestContainers)
    [Unit]            ← most, fast, isolated
```

Unit tests: Domain + Application. Integration tests: Infrastructure (DB, EF Core migrations, Redis).

## Naming Convention

```
{MethodOrFeature}_{Scenario}_{ExpectedResult}

✅ GetOrderById_OrderExists_ReturnsOrderDto
✅ AddItem_ProductNotFound_ReturnsFailureResult
✅ CreateOrder_InvalidCustomerId_ThrowsValidationException
❌ Test1, TestGetOrder, ShouldReturnOrder
```

## Unit Test Template

```csharp
public class GetOrderByIdQueryHandlerTests
{
    private readonly Mock<AppDbContext> _ctxMock;
    private readonly GetOrderByIdQueryHandler _sut;

    public GetOrderByIdQueryHandlerTests()
    {
        _ctxMock = new Mock<AppDbContext>();
        _sut = new GetOrderByIdQueryHandler(_ctxMock.Object);
    }

    [Fact]
    public async Task Handle_OrderExists_ReturnsSuccessWithDto()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var expectedDto = new OrderDetailDto { Id = orderId, CustomerName = "Tuan" };
        _ctxMock.Setup(c => c.Orders.AsNoTracking()...).Returns(/* mock queryable */);

        // Act
        var result = await _sut.Handle(new GetOrderByIdQuery(orderId), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeEquivalentTo(expectedDto);
    }

    [Fact]
    public async Task Handle_OrderNotFound_ReturnsFailureResult()
    {
        _ctxMock.Setup(...).Returns(/* empty */);
        var result = await _sut.Handle(new GetOrderByIdQuery(Guid.NewGuid()), CancellationToken.None);
        result.IsFailure.Should().BeTrue();
        result.Error.Should().Contain("not found");
    }
}
```

## Domain Entity Test

```csharp
public class OrderTests
{
    [Fact]
    public void AddItem_ValidProduct_UpdatesTotalAmount()
    {
        var order = Order.Create(Guid.NewGuid(), "123 Main St");
        var product = Product.Create("Widget", Money.Of(100, "VND"));

        var result = order.AddItem(product, quantity: 3);

        result.IsSuccess.Should().BeTrue();
        order.Items.Should().HaveCount(1);
        order.TotalAmount.Should().Be(300);
    }

    [Fact]
    public void AddItem_OrderNotDraft_ReturnsFailure()
    {
        var order = Order.Create(Guid.NewGuid(), "123 Main St");
        order.Submit();

        var result = order.AddItem(new Product(), quantity: 1);

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Contain("draft");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-100)]
    public void AddItem_InvalidQuantity_ReturnsFailure(int quantity)
    {
        var order = Order.Create(Guid.NewGuid(), "123 Main St");
        order.AddItem(new Product(), quantity).IsFailure.Should().BeTrue();
    }
}
```

## Integration Test — TestContainers + EF Core

```csharp
public class OrderRepositoryTests : IAsyncLifetime
{
    private PostgreSqlContainer _pgContainer = default!;
    private AppDbContext _ctx = default!;

    public async Task InitializeAsync()
    {
        _pgContainer = new PostgreSqlBuilder().WithDatabase("testdb").WithUsername("test").WithPassword("test").Build();
        await _pgContainer.StartAsync();

        _ctx = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(_pgContainer.GetConnectionString()).Options);
        await _ctx.Database.MigrateAsync(); // real migrations
    }

    [Fact]
    public async Task GetByIdAsync_OrderExists_ReturnsCorrectData()
    {
        var order = Order.Create(Guid.NewGuid(), "Test Address");
        _ctx.Orders.Add(order);
        await _ctx.SaveChangesAsync();

        var result = await new OrderRepository(_ctx).GetByIdAsync(order.Id, CancellationToken.None);

        result.Should().NotBeNull();
        result!.Id.Should().Be(order.Id);
    }

    public async Task DisposeAsync() { await _ctx.DisposeAsync(); await _pgContainer.DisposeAsync(); }
}
```

## FluentAssertions

```csharp
result.IsSuccess.Should().BeTrue();
result.Value.Items.Should().HaveCount(3);
result.Value.TotalAmount.Should().Be(300m);

orders.Should().HaveCount(5);
orders.Should().AllSatisfy(o => o.Status.Should().Be(OrderStatus.Active));
orders.Should().ContainSingle(o => o.Id == targetId);
orders.Should().BeInDescendingOrder(o => o.CreatedAt);

var act = async () => await service.ProcessAsync(invalidInput);
await act.Should().ThrowAsync<ValidationException>().WithMessage("*required*");

actual.Should().BeEquivalentTo(expected, opt => opt.Excluding(x => x.CreatedAt).Excluding(x => x.Id));
```

## Anti-patterns

```
❌ Testing implementation detail (verify mock call counts, test private methods)
❌ Magic values: sut.Calculate(42, 7) → use named vars: var quantity = 42; var unitPrice = 7;
❌ Multiple unrelated asserts per test → one behavior per test
❌ Tests depending on each other (shared state)
❌ Thread.Sleep in tests (flaky) → mock IDateTimeProvider
❌ InMemory DB for integration tests — doesn't test real SQL → use TestContainers
```

## Code Coverage Targets

| Layer | Target |
|-------|--------|
| Domain (Entities, Value Objects) | >90% |
| Application (Handlers, Validators) | >80% |
| Infrastructure | >60% (integration tests) |
| API (Controllers) | >50% (integration/E2E) |

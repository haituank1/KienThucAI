# Testing Rules — xUnit + Moq + FluentAssertions

---

## Test Pyramid

```
          [E2E]           ← Ít nhất, chạy chậm, fragile
         [Integration]    ← Test DB, external service (TestContainers)
        [Unit]            ← Nhiều nhất, nhanh, isolated
```

**Nguyên tắc:** Unit test cho business logic (Domain, Application). Integration test cho Infrastructure (DB queries, EF Core migrations, Redis).

---

## Naming Convention

```
{MethodOrFeature}_{Scenario}_{ExpectedResult}

✅ GetOrderById_OrderExists_ReturnsOrderDto
✅ AddItem_ProductNotFound_ReturnsFailureResult
✅ CreateOrder_InvalidCustomerId_ThrowsValidationException
✅ GetOrderById_OrderNotFound_ReturnsNotFoundResult

❌ Test1, TestGetOrder, ShouldReturnOrder (không mô tả scenario)
```

---

## Unit Test Template

```csharp
public class GetOrderByIdQueryHandlerTests
{
    // ✅ Shared mock setup trong constructor hoặc field
    private readonly Mock<AppDbContext> _ctxMock;
    private readonly GetOrderByIdQueryHandler _sut; // System Under Test

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

        _ctxMock.Setup(c => c.Orders.AsNoTracking()...)
            .Returns(/* mock queryable */);

        // Act
        var result = await _sut.Handle(new GetOrderByIdQuery(orderId), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeEquivalentTo(expectedDto);
    }

    [Fact]
    public async Task Handle_OrderNotFound_ReturnsFailureResult()
    {
        // Arrange
        _ctxMock.Setup(...).Returns(/* empty */);

        // Act
        var result = await _sut.Handle(new GetOrderByIdQuery(Guid.NewGuid()), CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error.Should().Contain("not found");
    }
}
```

---

## Domain Entity Test — Quan trọng nhất

```csharp
public class OrderTests
{
    [Fact]
    public void AddItem_ValidProduct_UpdatesTotalAmount()
    {
        // Arrange
        var order = Order.Create(Guid.NewGuid(), "123 Main St");
        var product = Product.Create("Widget", Money.Of(100, "VND"));

        // Act
        var result = order.AddItem(product, quantity: 3);

        // Assert
        result.IsSuccess.Should().BeTrue();
        order.Items.Should().HaveCount(1);
        order.TotalAmount.Should().Be(300);
    }

    [Fact]
    public void AddItem_OrderNotDraft_ReturnsFailure()
    {
        // Arrange
        var order = Order.Create(Guid.NewGuid(), "123 Main St");
        order.Submit(); // move to non-draft state

        // Act
        var result = order.AddItem(new Product(), quantity: 1);

        // Assert — test behavior, không test implementation
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
        var result = order.AddItem(new Product(), quantity);
        result.IsFailure.Should().BeTrue();
    }
}
```

---

## Integration Test — TestContainers + EF Core

```csharp
// Test với PostgreSQL thật (TestContainers)
public class OrderRepositoryTests : IAsyncLifetime
{
    private PostgreSqlContainer _pgContainer = default!;
    private AppDbContext _ctx = default!;

    public async Task InitializeAsync()
    {
        _pgContainer = new PostgreSqlBuilder()
            .WithDatabase("testdb")
            .WithUsername("test")
            .WithPassword("test")
            .Build();

        await _pgContainer.StartAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(_pgContainer.GetConnectionString())
            .Options;

        _ctx = new AppDbContext(options);
        await _ctx.Database.MigrateAsync(); // chạy migration thật
    }

    [Fact]
    public async Task GetByIdAsync_OrderExists_ReturnsCorrectData()
    {
        // Arrange — seed data thật vào DB thật
        var order = Order.Create(Guid.NewGuid(), "Test Address");
        _ctx.Orders.Add(order);
        await _ctx.SaveChangesAsync();

        var repo = new OrderRepository(_ctx);

        // Act
        var result = await repo.GetByIdAsync(order.Id, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(order.Id);
    }

    public async Task DisposeAsync()
    {
        await _ctx.DisposeAsync();
        await _pgContainer.DisposeAsync();
    }
}
```

---

## FluentAssertions — Dùng thay vì Assert.X

```csharp
// ✅ Readable, error message rõ hơn
result.IsSuccess.Should().BeTrue();
result.Value.Should().NotBeNull();
result.Value.Items.Should().HaveCount(3);
result.Value.TotalAmount.Should().Be(300m);
result.Value.CustomerName.Should().Be("Tuan").And.NotBeNullOrEmpty();

// Collection assertions
orders.Should().HaveCount(5);
orders.Should().AllSatisfy(o => o.Status.Should().Be(OrderStatus.Active));
orders.Should().ContainSingle(o => o.Id == targetId);
orders.Should().BeInDescendingOrder(o => o.CreatedAt);

// Exception assertions
var act = async () => await service.ProcessAsync(invalidInput);
await act.Should().ThrowAsync<ValidationException>()
    .WithMessage("*required*");

// Object graph comparison (ignore specific properties)
actual.Should().BeEquivalentTo(expected, opt =>
    opt.Excluding(x => x.CreatedAt) // ignore timestamp
       .Excluding(x => x.Id));       // ignore generated ID
```

---

## Test Anti-patterns

```
❌ Test implementation detail thay vì behavior
   → Verify mock.Setup() được gọi bao nhiêu lần (fragile)
   → Test private method trực tiếp

❌ Magic values trong test — không biết ý nghĩa
   var result = sut.Calculate(42, 7); // 42 và 7 là gì?
   ✅ Dùng named variable: var quantity = 42; var unitPrice = 7;

❌ Nhiều Assert trong 1 test — khi fail không biết cái nào
   ✅ Mỗi test focus vào 1 behavior

❌ Test phụ thuộc nhau (shared state giữa tests)
   ✅ Mỗi test tự setup, tự cleanup

❌ Thread.Sleep trong test — flaky
   ✅ Mock IDateTimeProvider, fake time

❌ InMemory database cho integration test — không test SQL thật
   ✅ TestContainers với PostgreSQL thật
```

---

## Code Coverage Target

| Layer | Target | Lý do |
|-------|--------|-------|
| Domain (Entities, Value Objects) | >90% | Business logic quan trọng nhất |
| Application (Handlers, Validators) | >80% | Orchestration logic |
| Infrastructure | >60% | Cover bằng integration test |
| API (Controllers) | >50% | Thin layer, cover bằng integration/E2E |

# Claude Code Custom Command: /test

> Đặt ở `.claude/commands/test.md`
> Dùng: `/test [tên class/method]` — generate unit/integration tests

---

Đọc file được chỉ định và toàn bộ dependencies của nó. Sau đó viết tests đầy đủ.

Stack: xUnit + Moq + FluentAssertions. .NET 8.

**Quyết định loại test:**
- Domain Entity / Value Object → Unit test thuần (không mock gì)
- Application Handler / Service → Unit test với mock dependencies
- Repository / DbContext → Integration test với TestContainers PostgreSQL
- Controller → Không test riêng (quá thin) — skip hoặc integration test

**Naming:** `MethodName_Scenario_ExpectedResult`

**Coverage cần đạt:**
- Happy path (kết quả đúng)
- Tất cả business rule violation (domain error)
- Not found / empty result
- Invalid input (validation)
- Edge cases (boundary values, empty list, null optional)

**Code format:**
```csharp
public class [ClassName]Tests
{
    // Shared setup — constructor hoặc IClassFixture

    [Fact]
    public async Task [Method]_[Scenario]_[Expected]()
    {
        // Arrange
        // Act
        // Assert — dùng FluentAssertions
    }

    [Theory]
    [InlineData(...)]
    public async Task [Method]_[MultipleInputs]_[Expected](...)
    { }
}
```

**Rules:**
- Test behavior, không test implementation detail
- Mock minimal — chỉ mock những gì method thực sự gọi
- Không Thread.Sleep — mock TimeProvider nếu cần
- Domain entity test: test state sau action, test domain events raised

Sau khi viết tests, list những case nào chưa được cover (nếu có).

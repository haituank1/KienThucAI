# Prompt: Viết Unit Test

## Prompt

Viết unit test cho method/class C# sau:

**Code cần test:**
```csharp
[PASTE CODE]
```

**Requirements:**
- Framework: xUnit + Moq + FluentAssertions
- Naming: `MethodName_Scenario_ExpectedResult`
- Cover: happy path + edge cases + error cases
- Mock external dependencies (repository, service, cache)
- Test async method đúng cách (await)
- Không test implementation detail — test behavior

**Nếu có business rule phức tạp, hãy hỏi tôi trước khi viết test.**

**Output format:**
```csharp
public class [ClassName]Tests
{
    // Arrange shared fixtures
    
    [Fact]
    public async Task MethodName_HappyPath_ReturnsExpected()
    { ... }
    
    [Theory]
    [InlineData(...)]
    public async Task MethodName_InvalidInput_ThrowsOrReturnsError(...)
    { ... }
}
```

---

## Checklist test tốt
- [ ] Test tên mô tả đủ scenario (không cần đọc code mới hiểu)
- [ ] Mỗi test Assert đúng 1 behavior
- [ ] Mock setup minimal (chỉ mock những gì method cần)
- [ ] Không dùng Thread.Sleep — dùng mock time provider
- [ ] Integration test cho DB operation, không unit test với InMemory DB nếu cần test SQL

# Unit Test / Integration Test

Stack: xUnit + Moq + FluentAssertions. .NET 8.

---

## Unit Test — Handler / Service

Viết unit test đầy đủ cho class sau:

**Code cần test:**
```csharp
[PASTE — include constructor, dependencies, method cần test]
```

**Business rules (nếu có):**
- [rule 1 — vd: "không thể cancel order đã shipped"]

**Yêu cầu:**
- Naming: `MethodName_Scenario_ExpectedResult`
- Mock tất cả external dependency (repository, service, cache)
- Cover: happy path + business rule violation + edge case
- Test behavior, không test implementation
- Async đúng cách (await, không .Result)
- Không dùng InMemory DB — mock repository

**Output:**
```csharp
public class [ClassName]Tests
{
    [Fact] public async Task Handle_[HappyPath]_[Expected]() { }
    [Fact] public async Task Handle_[FailCase]_[Expected]() { }
    [Theory][InlineData(...)] public async Task Handle_[MultiCase]_[Expected](...) { }
}
```

Sau khi xong, list các case còn thiếu nếu có.

---

## Unit Test — Domain Entity / Value Object

```csharp
[PASTE Entity hoặc Value Object]
```

- Test invariants, state transition, domain event được raise đúng
- Không mock gì — Domain thuần C#

---

## Integration Test — TestContainers

**Repository:**
```csharp
[PASTE]
```

**Entity / DbContext config:**
```csharp
[PASTE]
```

- Dùng TestContainers + PostgreSQL thật (không InMemory)
- Chạy migration thật, seed minimal data
- Test SQL thật được generate
- Implement IAsyncLifetime để setup/teardown

---

## Checklist

```
✅ Tên test mô tả đủ scenario
✅ Mỗi test chỉ assert 1 behavior chính
✅ Arrange rõ ràng
✅ Mock minimal
✅ Không Thread.Sleep — dùng mock ITimeProvider
✅ Edge cases: null, empty list, boundary values
✅ Error cases: not found, duplicate, invalid state
```

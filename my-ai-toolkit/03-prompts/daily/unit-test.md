# Prompt: Viết Unit Test / Integration Test

---

## TEMPLATE 1 — Unit Test cho Handler / Service

Stack: xUnit + Moq + FluentAssertions. .NET 8.

Viết unit test đầy đủ cho class sau:

**Code cần test:**
```csharp
[PASTE — include constructor, dependencies, method cần test]
```

**Business rules quan trọng (nếu có):**
- [rule 1 — vd: "không thể cancel order đã shipped"]
- [rule 2]

**Yêu cầu:**
- Naming: `MethodName_Scenario_ExpectedResult`
- Mock tất cả external dependency (repository, service, cache)
- Cover: happy path + tất cả business rule violation + edge case
- Test behavior, không test implementation (không verify mock call count trừ khi cần)
- Async test đúng cách (await, không .Result)
- Không dùng InMemory DB — mock repository

**Output cần:**
```csharp
public class [ClassName]Tests
{
    // setup
    
    [Fact]
    public async Task Handle_[HappyPath]_[Expected]() { }
    
    [Fact]
    public async Task Handle_[FailCase]_[Expected]() { }
    
    [Theory]
    [InlineData(...)]
    public async Task Handle_[MultiCase]_[Expected](...) { }
}
```

Sau khi viết xong, list ra các case nào còn thiếu nếu có.

---

## TEMPLATE 2 — Unit Test cho Domain Entity

Viết test cho Domain Entity / Value Object sau:

**Entity/Value Object:**
```csharp
[PASTE Entity hoặc Value Object]
```

**Yêu cầu đặc biệt:**
- Test invariants (rule không được vi phạm)
- Test state transition (status machine nếu có)
- Test domain event được raise đúng
- Không mock gì — Domain thuần C#, không dependency

---

## TEMPLATE 3 — Integration Test với TestContainers

Viết integration test cho Repository / DbContext sau:

**Repository code:**
```csharp
[PASTE]
```

**Entity / DbContext config liên quan:**
```csharp
[PASTE]
```

**Yêu cầu:**
- Dùng TestContainers + PostgreSQL thật (không InMemory)
- Chạy migration thật trước test
- Seed minimal data cần thiết
- Test SQL thật được generate (projection, join, index)
- Implement IAsyncLifetime để setup/teardown

---

## Checklist trước khi submit test

```
✅ Tên test mô tả đủ scenario (đọc tên biết test gì)
✅ Mỗi test chỉ assert 1 behavior chính
✅ Arrange rõ ràng — biết input là gì
✅ Mock minimal — chỉ mock những gì method call
✅ Không Thread.Sleep — dùng mock ITimeProvider nếu cần
✅ Edge cases: null, empty list, boundary values
✅ Error cases: not found, duplicate, invalid state
```

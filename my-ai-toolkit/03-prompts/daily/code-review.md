# Prompt: Code Review

## Cách dùng
Paste prompt này + code cần review vào Claude.

---

## Prompt

Hãy review đoạn code C# sau theo các tiêu chí:

**1. Correctness**
- Logic có đúng không?
- Edge case nào chưa handle?
- Null reference risk ở đâu?

**2. Performance**
- N+1 query risk?
- Unnecessary allocation / object creation?
- Có thể optimize với async streaming không?
- Index hint cần thiết không?

**3. Clean Architecture / SOLID**
- SRP violation?
- Dependency rule vi phạm không?
- Business logic có nằm đúng layer không?

**4. Async / Thread Safety**
- CancellationToken có được pass đúng không?
- Có deadlock risk không (`.Result`, `.Wait()`)?
- Shared state có thread-safe không?

**5. Security**
- Input validation đủ chưa?
- SQL injection risk?
- Sensitive data có bị log không?

**Output format:**
```
## Critical (phải fix trước release)
- [mô tả + code fix]

## Warning (nên fix)
- [mô tả + suggestion]

## Suggestion (cải thiện optional)
- [mô tả]
```

**Code cần review:**
```csharp
[PASTE CODE VÀO ĐÂY]
```

---

## Kết quả tốt khi
- Paste đủ context (DbContext, Entity liên quan)
- Include toàn bộ method, không chỉ snippet

## Không hiệu quả khi
- Chỉ paste fragment thiếu context

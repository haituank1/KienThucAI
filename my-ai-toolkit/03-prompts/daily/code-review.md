# Prompt: Code Review

> Copy toàn bộ block "PROMPT" bên dưới → paste vào Claude → paste code vào cuối.

---

## PROMPT

Stack: .NET 8, EF Core 8, PostgreSQL, Clean Architecture + CQRS/MediatR.

Hãy review code C# sau. Phân tích theo 5 nhóm, chỉ report những gì thực sự có vấn đề — không liệt kê những thứ đã đúng.

**1. 🔴 Critical — Bug hoặc risk production**
- Logic sai / race condition / deadlock risk
- N+1 query ẩn (lazy loading, missing Include, Select trong loop)
- Memory leak (event handler không unsubscribe, large object captured in closure)
- `.Result` / `.Wait()` trên async method
- Exception bị swallow hoặc catch quá rộng

**2. 🟡 Performance**
- Load full entity thay vì projection
- Missing `.AsNoTracking()` trên read-only query
- `ToList()` trước filter (client-side evaluation)
- String concat trong loop
- Allocation không cần thiết trong hot path

**3. 🟠 Architecture / Clean Code**
- Business logic leak ra khỏi Domain layer
- Dependency rule vi phạm (Infrastructure → Application ngược chiều)
- Method quá dài (>30 dòng) hoặc làm nhiều hơn 1 việc
- Hardcode giá trị nên là config/constant

**4. 🔵 Async / Thread Safety**
- CancellationToken không được pass qua call chain
- `async void` (trừ event handler)
- DbContext dùng concurrent (không thread-safe)
- Shared mutable state không protected

**5. 🟣 Security**
- Input không được validate
- Raw SQL với string interpolation (SQL injection)
- Sensitive data trong log
- Không check ownership (user xem data của người khác)

**Output format cho mỗi issue:**
```
[Emoji] [Tên vấn đề]
Vị trí: [method/line]
Vấn đề: [giải thích ngắn]
Fix:
\`\`\`csharp
[code fix]
\`\`\`
```

Nếu code không có vấn đề gì → nói thẳng: "Code looks clean, không có critical issue."

**Code cần review:**
```csharp
[PASTE CODE VÀO ĐÂY]
```

---

## Tips để review tốt hơn
- Paste thêm Entity config nếu có EF Core query
- Paste interface/dependency nếu cần hiểu contract
- Nói rõ context: "đây là hot path" hay "batch job chạy ban đêm" → AI adjust severity

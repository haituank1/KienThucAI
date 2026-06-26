# Refactor

Stack: .NET 8, Clean Architecture. Giữ nguyên behavior, cải thiện quality.

---

## General Refactor

**Code hiện tại:**
```csharp
[PASTE]
```

**Vấn đề:**
- [ ] Method quá dài / làm nhiều việc
- [ ] Logic lặp lại
- [ ] Primitive obsession
- [ ] Nested if phức tạp
- [ ] Thiếu abstraction
- [ ] Khác: [...]

**Constraint:**
- [ ] Không được thay đổi public API
- [ ] Phải giữ nguyên method signature
- [ ] [khác]

Tôi muốn: 1) Code sau refactor — hoàn chỉnh. 2) Giải thích thay đổi quan trọng (ngắn). 3) Cảnh báo nếu thay đổi behavior. 4) Nếu có nhiều approach → recommend 1 cái tốt nhất.

---

## Refactor EF Core Query

**Code hiện tại:**
```csharp
[PASTE LINQ/EF CODE]
```

**Generated SQL (nếu có):**
```sql
[PASTE]
```

**Entity / DbContext config:**
```csharp
[PASTE]
```

**Vấn đề:**
- [ ] N+1 query
- [ ] Load full entity, chỉ cần vài column
- [ ] Client-side evaluation
- [ ] Missing AsNoTracking
- [ ] Query quá phức tạp
- [ ] Cartesian explosion

Sau refactor, paste generated SQL mới để verify.

---

## Extract Pattern

**Code hiện tại:**
```csharp
[PASTE]
```

**Context:**
- Số variant hiện tại: [N]
- Dự kiến tương lai: [có thể thêm nhiều không?]
- Frequency thay đổi: [thường xuyên / hiếm khi]

Hãy: 1) Identify pattern phù hợp. 2) Giải thích tại sao fit. 3) Code refactored hoàn chỉnh. 4) Trade-off: khi nào nên / không nên dùng.

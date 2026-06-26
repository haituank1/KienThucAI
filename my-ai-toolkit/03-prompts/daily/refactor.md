# Prompt: Refactor

---

## TEMPLATE 1 — General Refactor

Stack: .NET 8, Clean Architecture. Giữ nguyên behavior, cải thiện quality.

**Code hiện tại:**
```csharp
[PASTE]
```

**Vấn đề tôi thấy (điền nếu biết):**
- [ ] Method quá dài / làm nhiều việc
- [ ] Logic lặp lại (duplicate code)
- [ ] Primitive obsession (dùng string/int thay vì Value Object)
- [ ] Nested if phức tạp (cyclomatic complexity cao)
- [ ] Thiếu abstraction (cần tách interface)
- [ ] Khác: [...]

**Constraint:**
- [ ] Không được thay đổi public API (caller code không sửa được)
- [ ] Phải giữ nguyên method signature
- [ ] [constraint khác]

**Tôi muốn:**
1. Code sau refactor — hoàn chỉnh, không viết tắt
2. Giải thích những thay đổi quan trọng và lý do (ngắn)
3. Nếu bạn thay đổi behavior vô tình — cảnh báo rõ ràng
4. Nếu có nhiều approach → recommend 1 cái tốt nhất thay vì list tất cả

---

## TEMPLATE 2 — Refactor EF Core Query

LINQ query / EF Core code sau cần optimize. Giữ đúng kết quả, cải thiện performance.

**Code hiện tại:**
```csharp
[PASTE LINQ/EF CODE]
```

**Generated SQL hiện tại (nếu có):**
```sql
[PASTE — lấy bằng .ToQueryString() hoặc DB log]
```

**Entity / DbContext config:**
```csharp
[PASTE — quan trọng để AI hiểu relationship]
```

**Vấn đề:**
- [ ] N+1 query (load navigation property trong loop)
- [ ] Load full entity, chỉ cần vài column
- [ ] Client-side evaluation (filter sau ToList)
- [ ] Missing AsNoTracking
- [ ] Query quá phức tạp, cần tách hoặc dùng raw SQL
- [ ] Cartesian explosion (Include nhiều collection)

Sau refactor, paste generated SQL mới để tôi verify.

---

## TEMPLATE 3 — Extract Pattern

Code sau cần áp dụng design pattern. Không biết pattern nào phù hợp — bạn suggest.

**Code hiện tại:**
```csharp
[PASTE]
```

**Context:**
- Số lượng variant hiện tại: [N loại]
- Dự kiến tương lai: [có thể thêm nhiều không?]
- Frequency thay đổi: [thường xuyên / hiếm khi]

Hãy:
1. Identify pattern phù hợp (Strategy / Factory / Chain of Responsibility / ...)
2. Giải thích ngắn tại sao pattern đó fit
3. Code refactored hoàn chỉnh
4. Trade-off: khi nào nên dùng pattern này, khi nào over-engineering

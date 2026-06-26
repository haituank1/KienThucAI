# Prompt: Refactor

## Prompt

Refactor đoạn code C# sau. Giữ nguyên behavior, cải thiện quality:

**Code hiện tại:**
```csharp
[PASTE CODE]
```

**Vấn đề nhận thấy (nếu biết):**
- [Mô tả vấn đề: quá dài, duplicate, vi phạm SRP, v.v.]

**Constraints:**
- Không thay đổi public API signature (nếu có)
- [Constraint khác nếu có]

**Tôi muốn:**
- [ ] Tách thành method nhỏ hơn
- [ ] Áp dụng pattern phù hợp (Strategy, Factory, v.v.)
- [ ] Cải thiện readability
- [ ] Giảm complexity (cyclomatic)
- [ ] Cải thiện performance (nếu có bottleneck rõ)

**Output:**
1. Code sau refactor
2. Giải thích những thay đổi quan trọng và lý do
3. Nếu thay đổi behavior vô tình — cảnh báo rõ

---

## Khi refactor EF Core / LINQ
Thêm context:
```csharp
// DbContext config liên quan:
[PASTE ENTITY CONFIG / RELATIONSHIP]

// Generated SQL hiện tại:
[PASTE .ToQueryString() output nếu có]
```

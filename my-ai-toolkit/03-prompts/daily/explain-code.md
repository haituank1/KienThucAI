# Giải thích Code

Stack: .NET 8, Clean Architecture. Level: Senior dev — bỏ qua basic, focus vào intent và trade-off.

---

## Explain codebase / feature

```csharp
[PASTE]
```

Tôi muốn hiểu:
- [ ] Flow tổng thể — data đi qua đâu, theo thứ tự nào
- [ ] Tại sao code được viết theo cách này (design decision)
- [ ] Potential issue / gotcha không rõ ràng
- [ ] Interaction với DB / external service

Format: Prose ngắn + ASCII diagram nếu cần.

---

## Explain execution plan PostgreSQL

```
[PASTE EXPLAIN ANALYZE OUTPUT ĐẦY ĐỦ]
```

**Query:**
```sql
[PASTE QUERY]
```

1. Plan đọc từ đâu (inner → outer hay leaf → root)?
2. Node nào tốn thời gian nhất và tại sao?
3. "rows=X" là estimate hay actual? Chênh lệch lớn → ý nghĩa gì?
4. Buffer hits/reads nói lên gì về cache?
5. Planner đang làm gì đúng / sai?

---

## Explain pattern / concept

Tôi đang implement [tên feature] và thấy code dùng [pattern/approach].

**Code:**
```csharp
[PASTE]
```

1. Pattern giải quyết vấn đề gì cụ thể?
2. Tại sao chọn cách này thay vì cách đơn giản hơn?
3. Nhược điểm / trade-off?
4. Khi nào không nên dùng?

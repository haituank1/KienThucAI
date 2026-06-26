# Prompt: Giải thích Code

> Dùng khi tiếp cận codebase mới, đọc code người khác, hoặc cần hiểu sâu một pattern.

---

## TEMPLATE 1 — Explain codebase / feature

Tôi cần hiểu đoạn code C# sau. Stack: .NET 8, Clean Architecture.

**Code:**
```csharp
[PASTE]
```

**Tôi muốn hiểu:**
- [ ] Flow tổng thể — data đi qua đâu, theo thứ tự nào
- [ ] Tại sao code được viết theo cách này (design decision)
- [ ] Potential issue / gotcha nào không rõ ràng
- [ ] Interaction với DB / external service như thế nào

**Level giải thích:** Senior developer — bỏ qua basic concept, focus vào intent và trade-off.

Format: Prose ngắn + diagram ASCII nếu cần, không bullet point dày đặc.

---

## TEMPLATE 2 — Explain execution plan PostgreSQL

Giải thích execution plan PostgreSQL sau cho tôi:

```
[PASTE EXPLAIN ANALYZE OUTPUT ĐẦY ĐỦ]
```

**Query:**
```sql
[PASTE QUERY]
```

Tôi muốn hiểu:
1. Plan đọc từ đâu (inner → outer hay leaf → root)?
2. Node nào đang tốn thời gian nhất và tại sao?
3. "rows=X" là estimate hay actual? Nếu chênh lệch lớn → ý nghĩa gì?
4. Buffer hits/reads nói lên điều gì về cache?
5. Planner đang làm gì đúng / sai ở plan này?

---

## TEMPLATE 3 — Explain pattern / concept trong context cụ thể

Tôi đang implement [tên feature] và thấy code dùng [pattern/approach].

**Code ví dụ:**
```csharp
[PASTE]
```

Giải thích:
1. Pattern này giải quyết vấn đề gì cụ thể?
2. Tại sao chọn cách này thay vì cách đơn giản hơn?
3. Nhược điểm / trade-off là gì?
4. Khi nào thì không nên dùng pattern này?

Giả sử tôi là senior dev C# — không cần giải thích syntax, focus vào why và when.

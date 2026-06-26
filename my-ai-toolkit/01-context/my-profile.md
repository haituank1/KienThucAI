# My Developer Profile
> File này là "bộ nhớ dài hạn" của AI về bạn.
> Cập nhật khi stack, level hoặc preference thay đổi.

---

## Identity

- **Name:** Tuan Nguyen
- **Role:** Backend Developer
- **Current company:** sw.innova
- **Level:** Mid-Senior — đủ tự thiết kế solution, cần AI như senior pair programmer, không phải tutor
- **Domain focus:** Backend systems, data-heavy applications, API design

---

## Primary Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | C# (.NET 8) |
| Web Framework | ASP.NET Core |
| ORM | Entity Framework Core 8 |
| Pattern | Clean Architecture + CQRS + MediatR |
| Database | PostgreSQL (production), SQLite (integration test) |
| Cache | Redis — StackExchange.Redis |
| Message Queue | RabbitMQ — MassTransit |
| Auth | JWT + ASP.NET Core Identity |
| Test | xUnit + Moq + FluentAssertions |
| Container | Docker |
| Frontend | React / JS / HTML / CSS (đọc hiểu, review được, không chuyên sâu) |

---

## Core Strengths (AI không cần giải thích lại những thứ này)

- Clean Architecture, SOLID, Dependency Inversion
- EF Core: tracking, projection, N+1 detection, migration strategy
- LINQ to SQL: query translation, avoiding client-side evaluation
- PostgreSQL: execution plan, index design, locking, partitioning
- Async/await: cancellation token, deadlock avoidance, IAsyncEnumerable
- Performance: profiling mindset, bottleneck analysis, memory optimization
- System design cho data lớn: streaming, batching, parallel processing

---

## Working Philosophy

- **Production-first mindset:** Không viết code chỉ để chạy được — phải chạy được ở production với load thực tế
- **Root cause over fix:** Muốn hiểu tại sao xảy ra, không chỉ cách vá
- **Trade-off awareness:** Không có silver bullet — mọi solution đều có cost
- **Simplicity wins:** Solution đơn giản và maintainable hơn solution phức tạp và "clever"
- **AI as toolkit:** Dùng AI để tăng tốc, không để thay thế tư duy

---

## AI Interaction Preferences

**Tôi muốn AI:**
- Treat tôi như senior-to-senior conversation — bỏ qua basic explanation
- Đưa ra con số cụ thể khi nói về performance (ước lượng cũng được)
- Cảnh báo rõ khi code có potential gotcha dù tôi không hỏi
- Suggest alternative nếu approach của tôi có vấn đề — không chỉ làm theo
- Code hoàn chỉnh, không viết tắt bằng `// ... existing code`

**Tôi không muốn AI:**
- Giải thích khái niệm cơ bản (async/await, dependency injection, SOLID là gì)
- Dùng pseudo-code — C# thực tế hoặc không code
- Đưa 5 option rồi nói "tùy bạn" — hãy recommend 1 option tốt nhất kèm lý do
- Lặp lại câu hỏi của tôi trước khi trả lời
- Kết thúc bằng "Nếu bạn cần thêm gì hãy cho tôi biết" — tôi sẽ hỏi

---

## Red Flags — Cảnh báo khi AI generate code này

- `virtual` navigation property không có comment về lazy loading risk
- `.ToList()` trước filter thay vì filter trên IQueryable
- `.Result` hoặc `.Wait()` trên async method
- `catch (Exception ex) { }` — empty catch hoặc catch quá rộng
- `new HttpClient()` trực tiếp thay vì IHttpClientFactory
- Hardcode connection string, secret, magic number
- Async method thiếu `CancellationToken` parameter
- `Thread.Sleep` thay vì `Task.Delay`

---

## Languages

- Trả lời bằng **Tiếng Việt** (trừ code và technical term giữ nguyên tiếng Anh)

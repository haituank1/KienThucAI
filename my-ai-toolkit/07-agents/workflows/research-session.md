# Workflow: AI Research Session

> Workflow AI follow mỗi khi được giao nghiên cứu một topic.
> Paste prompt này vào Claude khi muốn AI tự học một topic mới.

---

## Cách dùng

Paste nội dung này vào Claude + tên topic cần nghiên cứu:

> "Hãy thực hiện research session cho topic: [TÊN TOPIC]. Follow workflow trong file này."

---

## RESEARCH SESSION PROMPT

```
Bạn là AI research assistant. Thực hiện deep research cho topic sau và lưu kết quả vào ai-lab.

TOPIC: [ĐIỀN TÊN TOPIC]

Stack context: .NET 8, PostgreSQL, Clean Architecture, C#.

---

BƯỚC 1 — RESEARCH (dùng WebSearch, đọc docs)

Tìm kiếm và đọc:
1. Official documentation (ưu tiên)
2. Ít nhất 2 nguồn khác (blog kỹ thuật, GitHub, talk)
3. Thực tế dùng trong production (case study nếu có)

Thu thập:
- Vấn đề nó giải quyết là gì?
- Cách hoạt động (cơ chế kỹ thuật)
- Code example thực tế (C# ưu tiên)
- Trade-offs (pros/cons)
- Khi nào nên / không nên dùng

---

BƯỚC 2 — SELF-VERIFY

Trước khi lưu, tự kiểm chứng:
- Cross-check với ít nhất 2 nguồn độc lập
- Code example có compile được không? (review kỹ syntax)
- Có contradiction với kiến thức đã biết không?
- Confidence level thực tế là bao nhiêu? (0.0-1.0)
- Caveat / limitation nào cần mention?

---

BƯỚC 3 — TẠO JSON FILE

Tạo file JSON theo đúng schema, lưu vào:
`C:\_Claude_code\KienThucAI\ai-lab\data\[category]\[yyyy-MM]\[topic-slug].json`

Schema:
{
  "id": "[category]-[topic-slug]-[yyyymmdd]",
  "topic": "Tên đầy đủ",
  "category": "[dotnet|postgresql|architecture|ai-coding|tools]",
  "subcategory": "[chi tiết hơn]",
  "tags": ["tag1", "tag2", "tag3"],
  "difficulty": "[beginner|intermediate|advanced]",
  "relevance": "[high|medium|low]",
  "status": "pending_review",
  "confidence": 0.XX,
  "researchedAt": "[ISO timestamp]",
  "validatedAt": null,
  "validatedBy": null,
  "summary": "1-2 câu tóm tắt — hiển thị trên card",
  "problem": "Vấn đề gì được giải quyết",
  "solution": "Giải pháp / technique / feature",
  "codeExample": "```csharp\n[code ví dụ thực tế]\n```",
  "tradeoffs": [
    "✅ Pro 1",
    "✅ Pro 2",
    "⚠️ Trade-off",
    "❌ Limitation"
  ],
  "references": [
    { "title": "Tên nguồn", "url": "https://..." }
  ],
  "selfVerification": {
    "verified": true,
    "method": "Mô tả cách đã verify",
    "caveats": "Limitation hoặc caveats quan trọng"
  },
  "demo": {
    "exists": false,
    "type": "backend",
    "path": "",
    "description": "Mô tả demo sẽ làm"
  },
  "validation": {
    "notes": "",
    "toolkitTarget": "[path trong my-ai-toolkit để merge vào]",
    "action": "append"
  },
  "toolkitContent": "[XEM HƯỚNG DẪN BÊN DƯỚI]"
}

---

**QUAN TRỌNG — `toolkitContent` format:**

Đây là nội dung markdown sẽ được append trực tiếp vào file toolkit khi validate.
Viết ngắn gọn, token-efficient, AI đọc và làm theo được ngay.

Rules:
- Heading: `## [Topic ngắn gọn]` (không cần date/confidence)
- Code: giữ nguyên phần quan trọng nhất, bỏ verbose comments
- Chỉ dùng `⚠️` và `❌` — bỏ `✅` pros (AI biết đây là pattern tốt vì nó trong toolkit)
- Không cần references (tiết kiệm token)
- Tổng cộng: 15-25 dòng là lý tưởng

Ví dụ tốt:
```
## EF Core — Typed Raw SQL `SqlQuery<T>`

\`\`\`csharp
// {params} auto-parameterized, không cần Entity setup
var results = await ctx.Database
    .SqlQuery<RevenueByMonth>($"SELECT ... WHERE tenant_id={tenantId}")
    .ToListAsync(ct);
// LINQ composable: .Where(), .OrderBy(), .Skip().Take()
\`\`\`

⚠️ Column alias PHẢI match property name · ❌ Không compose với LINQ navigation property
```

---

BƯỚC 4 — TẠO DEMO (nếu có thể)

Với backend demo:
- Thêm case vào DemoRunnerService.cs
- Method name: Run[TopicName]DemoAsync()
- Return: object mô tả concept + simulated result

Với frontend demo:
- Tạo HTML file trong Demos/Frontend/[name].html
- Self-contained HTML với embedded CSS+JS
- Update field demo.exists = true, demo.path trong JSON

---

BƯỚC 5 — UPDATE LOGS

1. Update RESEARCH_QUEUE.md: tick [x] topic vừa nghiên cứu, thêm path file JSON
2. Append vào RESEARCH_LOG.md:
   ## [Date]
   **Topics researched:** [tên]
   **Sources used:** [liệt kê]
   **Confidence:** [XX]%
   **Demo created:** [yes/no]

---

QUAN TRỌNG:
- Không bịa đặt thông tin — nếu không chắc, ghi confidence thấp và caveat rõ
- Code example phải thực tế, không pseudo-code
- Nếu topic quá rộng, focus vào phần relevant nhất với stack C#/.NET + PostgreSQL
- Ghi rõ version (.NET 8, PostgreSQL 15, EF Core 8) khi relevant
```

---

## Tips để research hiệu quả

**Topics nên research theo batch thay vì từng cái:**
- Cùng category: dotnet x3, postgresql x2
- Batch giúp AI build context tốt hơn

**Confirm quality trước khi submit:**
- Confidence < 0.7 → thêm caveat hoặc nghiên cứu thêm
- Code không compile → đừng lưu, sửa trước
- Không tìm được 2 nguồn độc lập → ghi rõ trong caveats

**Topics có demo value cao nhất:**
- Performance optimization (show before/after)
- Pattern so sánh (show A vs B)
- Configuration (show working code)

---

## Ví dụ trigger research

Paste vào Claude:
> "Thực hiện research session. Topic: PostgreSQL 17 New Features. Focus vào những gì relevant với .NET/EF Core stack. Follow research-session.md workflow."

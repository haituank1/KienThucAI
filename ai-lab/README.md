# AI Lab

> Nơi AI tự nghiên cứu, tích lũy kiến thức mới và chờ bạn validate.
> Kiến thức đã validate → được merge vào `my-ai-toolkit/`.

---

## Cách sử dụng

### 1. Khởi động

```bash
cd ai-lab/demo-engine
run.bat          # Windows
# Hoặc: dotnet run --project src/DemoEngine.API
```

Mở browser: **http://localhost:5001**

### 2. Workflow hàng ngày

**Khi rảnh — để AI nghiên cứu:**
1. Paste prompt từ `my-ai-toolkit/07-agents/workflows/research-session.md` vào Claude
2. AI research → tạo JSON trong `data/` → tạo demo code
3. AI update `RESEARCH_LOG.md` và tick `RESEARCH_QUEUE.md`

**Khi có thời gian — validate:**
1. Mở `http://localhost:5001`
2. Xem Dashboard → click item "Pending Review"
3. Đọc content, xem demo nếu có → Validate / Reject / Needs Rework
4. Kiến thức validated → tự tay merge vào `my-ai-toolkit/`

### 3. Thêm topic mới để AI nghiên cứu

Chỉnh sửa `RESEARCH_QUEUE.md`:
```markdown
## 🔴 Priority: High
- [ ] Tên topic cần nghiên cứu
```

---

## Cấu trúc

```
ai-lab/
├── data/                    ← JSON store (AI ghi, DemoEngine đọc)
│   ├── _categories.json     ← Danh sách categories
│   ├── dotnet/2026-06/     ← Phân loại theo category + tháng
│   ├── postgresql/...
│   └── ...
├── knowledge-hub/           ← UI Dashboard (HTML+JS)
│   └── index.html
├── demo-engine/             ← .NET 8 API (serve cả UI lẫn API)
│   ├── run.bat
│   └── src/DemoEngine.API/
├── sessions/                ← Research session logs của AI
├── RESEARCH_QUEUE.md        ← Topics muốn AI research
└── RESEARCH_LOG.md          ← Log mỗi session AI đã làm gì
```

---

## JSON Schema (mỗi research item)

```json
{
  "id": "unique-id",
  "topic": "Tên topic",
  "category": "dotnet | postgresql | architecture | ai-coding | tools",
  "tags": ["tag1", "tag2"],
  "status": "pending_review | validated | rejected | needs_rework",
  "confidence": 0.85,
  "researchedAt": "2026-06-27T10:00:00Z",
  "summary": "Tóm tắt ngắn",
  "problem": "Vấn đề giải quyết",
  "solution": "Giải pháp",
  "codeExample": "```csharp\n...\n```",
  "tradeoffs": ["✅ Pro", "❌ Con"],
  "references": [{ "title": "...", "url": "..." }],
  "selfVerification": { "verified": true, "method": "..." },
  "demo": { "exists": true, "type": "backend|frontend", "path": "..." },
  "validation": { "notes": "", "toolkitTarget": "05-snippets/..." }
}
```

---

## Thêm demo mới

**Backend demo:** Thêm case vào `demo-engine/src/DemoEngine.API/Services/DemoRunnerService.cs`

**Frontend demo:** Tạo file HTML trong `demo-engine/src/DemoEngine.API/Demos/Frontend/[name].html`

Sau đó update field `demo` trong JSON item tương ứng.

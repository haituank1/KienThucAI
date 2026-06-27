# PROJECT CONTEXT — KienThucAI

> Đọc file này trước khi làm việc với bất kỳ thứ gì trong repo này.
> Cập nhật lần cuối: 2026-06-27

---

## Tổng quan

**Owner:** Tuan Nguyen — Backend Developer (C#/.NET 8 + PostgreSQL)

**Mục tiêu hệ thống:** Xây dựng một vòng lặp tự học có cấu trúc, nơi AI nghiên cứu kiến thức mới → Tuan validate → kiến thức tốt được tích lũy vào một bộ toolkit cá nhân dùng lâu dài. Giải quyết vấn đề "kiến thức AI response hay nhưng bị quên / không tái sử dụng được."

---

## Cấu trúc thư mục

```
C:\_Claude_code\KienThucAI\
├── PROJECT_CONTEXT.md          ← file này
├── my-ai-toolkit/              ← Bộ toolkit kiến thức đã được validate
└── ai-lab/                     ← Nơi AI nghiên cứu và Tuan validate
    ├── data/                   ← JSON store (knowledge items)
    ├── knowledge-hub/          ← UI Dashboard (HTML + JS, mở trực tiếp trong browser)
    ├── demo-engine/            ← .NET 8 Minimal API backend
    ├── RESEARCH_QUEUE.md       ← Topics muốn AI research tiếp
    └── RESEARCH_LOG.md         ← Log mỗi research session
```

---

## Hai thành phần chính

### 1. `my-ai-toolkit/` — Kiến thức đã tích lũy

Bộ 7-layer chứa toàn bộ context, rule, prompt, snippet cá nhân của Tuan. Dùng để paste vào Claude khi bắt đầu session mới.

```
my-ai-toolkit/
├── 01-context/     ← Profile, career context, working style, session-starter
├── 02-rules/       ← Coding conventions bất biến (C#, EF Core, PostgreSQL, Redis, RabbitMQ)
├── 03-prompts/     ← Prompt library (debug, refactor, code-review, schema-design, ...)
├── 04-specs/       ← Templates (SPEC, ADR, BUG, DB Migration, Postmortem, API Contract)
├── 05-snippets/    ← Battle-tested patterns + gotchas (dotnet, postgresql, redis, rabbitmq)
├── 06-projects/    ← Template setup context cho từng project/công ty
└── 07-agents/      ← Claude Code commands + workflows (feature-dev, bug-fix, code-review, research-session)
```

**Cách dùng:** Trước mỗi session, paste nội dung `01-context/session-starter.md` vào Claude.

### 2. `ai-lab/` — Vòng lặp nghiên cứu + validate

#### Backend: `demo-engine/`
- **.NET 8 Minimal API**, port **5001**
- Serve cả API lẫn `knowledge-hub/` UI (static files)
- `appsettings.json` config: `DataPath`, `KnowledgeHubPath`, `ToolkitPath`
- Khởi động: `cd ai-lab/demo-engine && run.bat` (hoặc `dotnet run --project src/DemoEngine.API`)

**API endpoints:**

| Endpoint | Mô tả |
|----------|-------|
| `GET /api/knowledge` | Danh sách items (list projection) |
| `GET /api/knowledge/{id}` | Chi tiết 1 item |
| `POST /api/knowledge/{id}/validate` | Validate/Reject item |
| `POST /api/knowledge/{id}/merge-to-toolkit` | Merge content vào toolkit file |
| `GET /api/toolkit/files` | Tất cả .md files trong toolkit + headings |
| `GET /api/toolkit/headings?path=...` | Headings của 1 file cụ thể |
| `GET /api/toolkit/preview/{id}` | Preview content trước khi merge |
| `GET /api/queue` | Research queue |
| `POST /api/queue` | Thêm topic mới vào queue |
| `GET /api/categories` | Danh sách categories |
| `GET /api/stats` | Thống kê dashboard |
| `GET /api/health` | Health check + paths |

**Models quan trọng (`Models/`):**

`KnowledgeItem` — entity chính, lưu theo file JSON trong `data/{category}/{yyyy-MM}/`:
- `Id`, `Topic`, `Category`, `Subcategory`, `Tags`
- `Status`: `pending_review` | `validated` | `rejected` | `needs_rework`
- `Confidence` (0-1), `ResearchedAt`, `ValidatedAt`
- `Summary`, `Problem`, `Solution`, `CodeExample`, `Tradeoffs`, `References`
- `SelfVerification`, `Demo` (backend/frontend demo), `Validation`
- `ToolkitContent` — nội dung sẽ merge vào toolkit (AI tự điền khi research)
- `StaleAfterDays` (default 180) — staleness detection
- `TechVersions` — `{ "dotnet": "8+", "efcore": "8+", "postgres": "15+" }`
- `MergedIntoFile` — file toolkit đã merge vào (vd: `"05-snippets/dotnet/ef-core-patterns.md"`)
- `MergedAt` — thời điểm merge

**Services:**
- `KnowledgeService` — CRUD, validate, merge tracking. Lưu file JSON, lazy-load detail fields.
- `ToolkitService` — đọc/ghi `.md` files, extract `##` headings, append/replace section, scan toàn bộ toolkit
- `QueueService`, `CategoryService`, `StatsService`, `DemoRunnerService`

**Patterns backend:**
- Clean Architecture, Primary Constructors (.NET 8)
- `System.Text.Json` (không dùng Newtonsoft)
- `MergeToToolkitRequest` là class (không phải positional record) để tránh STJ deserialization bug
- `ToolkitService.ResolvePath(relPath)` — luôn resolve từ relPath, bao giờ cũng ignore client-provided absPath (security)
- Path traversal guard: reject `..` và `\` trong query params

#### Frontend: `knowledge-hub/`
- **Vanilla HTML + CSS + JS** (zero framework, không build step)
- 1 file `index.html` + `css/app.css` + `js/app.js` (~1380 dòng)
- Mở bằng browser qua `http://localhost:5001` (được serve bởi demo-engine)

**5 views (sidebar navigation):**
1. **Dashboard** — stats cards, confidence chart, category breakdown
2. **Knowledge** — danh sách items, filter theo status/category, full-text search, staleness badge, version badge
3. **Queue** — research queue, add topic mới, mark done/in-progress
4. **Toolkit Explorer** — duyệt toàn bộ `.md` files trong `my-ai-toolkit/`, group theo thư mục, accordion heading, search + highlight, "Find" ngược về item gốc
5. **Settings** — quản lý categories, system info

**3 Modals:**
- **Detail Modal** — xem đầy đủ 1 item, badge "Merged into: ..." nếu đã merge
- **Validate Modal** — validate/reject, chọn toolkit target (editable + datalist), chọn action (Append/Replace/Skip), conflict detection, headings accordion
- **Queue Modal** — thêm topic mới

**State management (JS):**
```js
state = {
  view, items, categories, queue, toolkitFiles,
  tkExpandedFiles: new Set(),  // accordion state
  tkSearch: '',
  currentSearch, currentStatusFilter, currentCategoryFilter,
  loadingKnowledge
}
```

---

## Workflow chính (Research → Validate → Merge)

```
1. AI research
   └─ Dùng prompt từ 07-agents/workflows/research-session.md
   └─ AI tạo JSON vào ai-lab/data/{category}/{yyyy-MM}/{slug}.json
   └─ AI điền sẵn: summary, problem, solution, codeExample, toolkitContent

2. Tuan validate (trên Knowledge Hub)
   └─ Mở item pending_review
   └─ Đọc summary, xem demo nếu có
   └─ Click "Validate" → Status = validated

3. Merge vào toolkit (Layer 1 — Conflict Detection)
   └─ Click "Lưu vào Toolkit" → Preview Modal mở
   └─ Chọn target file (editable input với datalist gợi ý)
   └─ Backend tự detect: heading trùng → warning + gợi ý Replace
   └─ Chọn action: Append / Replace section / Skip
   └─ Confirm → content merge vào .md file tương ứng

4. Traceability (Layer 2)
   └─ Item được gắn mergedIntoFile + mergedAt
   └─ Dashboard hiện badge xanh "Merged: 05-snippets/..."

5. Toolkit Explorer (Layer 3)
   └─ Tab mới xem toàn bộ toolkit
   └─ Search heading, click "Find" → mở item gốc
```

---

## Vấn đề đã giải quyết

| Vấn đề | Giải pháp |
|--------|-----------|
| Không biết heading đã tồn tại trong toolkit chưa | Layer 1: conflict detection, hiện danh sách headings hiện có |
| Không biết item nào đã merge vào đâu | Layer 2: `mergedIntoFile` + badge |
| Không thể duyệt xem toolkit có gì | Layer 3: Toolkit Explorer với search |
| onclick attribute bị break khi heading có apostrophe | Fix: dùng `JSON.stringify().replace(/"/g, '&quot;')` thay vì `esc()` |
| `MergeToToolkitRequest` không deserialize đúng | Dùng class thay vì positional record |
| Client gửi absPath có thể bị giả mạo | Backend luôn resolve từ relPath, ignore absPath từ client |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | .NET 8 Minimal API, C# 12, Primary Constructors |
| Data store | JSON files trên disk (không có DB) |
| Frontend | Vanilla HTML/CSS/JS (ES2022+), Chart.js |
| Toolkit | Markdown files |

---

## Hướng mở rộng (chưa làm)

- **Export/Import** — xuất toàn bộ knowledge ra file zip để chia sẻ hoặc backup
- **Full-text search trong toolkit** — hiện chỉ search headings; cần search trong content
- **Diff view** — khi Replace section, hiện diff trước/sau để confirm
- **Multi-file merge** — 1 item có thể merge nhiều đoạn vào nhiều file khác nhau
- **Stale notification** — alert khi có items sắp hết hạn (StaleAfterDays)
- **Tag-based filtering trong Toolkit Explorer**
- **API authentication** — hiện không có auth, chạy local only
- **PostgreSQL backend** — nếu data lớn hơn, migrate từ JSON files sang DB
- **AI-assisted conflict resolution** — dùng AI đề xuất cách merge khi có conflict heading
- **Version tracking** — git-based diff khi toolkit file thay đổi
- **Research session automation** — AI tự schedule research theo RESEARCH_QUEUE
- **Category-specific snippet files** — tự động tạo file snippet mới khi category mới được thêm

---

## Ghi chú kỹ thuật quan trọng

**Khi tiếp tục phát triển:**

1. `ToolkitService.GetAllFilesAsync()` scan các folder: `02-rules`, `03-prompts`, `04-specs`, `05-snippets`, `06-projects`, `07-agents` — không scan `01-context` (personal info)
2. Section replace trong `ReplaceSectionAsync`: tìm line bắt đầu bằng `## heading`, scan đến `## ` tiếp theo (section boundary), replace phần giữa. Fallback: append nếu không tìm thấy heading.
3. `KnowledgeService` lazy-load: list endpoint chỉ trả về projection (không có detail fields như `Problem`, `Solution`, `CodeExample`). Chi tiết chỉ load khi mở modal detail.
4. File JSON knowledge: lưu tại `ai-lab/data/{category}/{yyyy-MM}/{id}.json`, tên file = id + `.json`
5. Categories lưu tại `ai-lab/data/_categories.json`, queue tại `ai-lab/data/_queue.json`
6. `demo-engine/run.bat` — lệnh khởi động nhanh trên Windows
7. Frontend dùng `state.items` = list view (không có detail fields). Khi cần merge tracking, search trong `state.items` chỉ tìm được items đang hiển thị. Nếu cần search toàn bộ, gọi thêm API.

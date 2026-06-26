# Claude Code Custom Command: /spec

> Đặt ở `.claude/commands/spec.md`
> Dùng: `/spec [mô tả feature]` — sinh ra SPEC document

---

Từ mô tả feature sau, hãy tạo một SPEC document theo cấu trúc:

## Metadata
- Feature name (gợi ý tên ngắn gọn)
- Complexity estimate: S/M/L/XL

## Problem Statement
[1-2 câu — vấn đề đang giải quyết]

## Solution Overview
[Approach ở mức cao]

## API Contract
[Endpoint, request/response schema nếu có]

## Data Model Changes
[Table/column thay đổi nếu có]

## Edge Cases
[Liệt kê edge case quan trọng]

## Acceptance Criteria
[Testable, cụ thể]

## Technical Risks
[Performance, data migration, breaking change, v.v.]

## Open Questions
[Những gì cần confirm với PM/BA trước khi code]

---
Sau khi tạo SPEC, hỏi tôi: "Bạn muốn tôi bắt đầu implement từ layer nào?"

# API Contract — [ResourceName] v[N]

## Metadata

| Field | Value |
|-------|-------|
| Resource | [Tên resource] |
| Version | v1 |
| Base URL | `/api/v1/[resource]` |
| Auth | Bearer JWT |
| Ticket | [TICKET-123](link) |
| Author | Tuan Nguyen |
| Status | `Draft` → `Agreed` → `Implemented` |

---

## Common Response Format

```json
// Success
{ "success": true, "data": { ... } }

// Validation error (400)
{ "success": false, "validationErrors": ["field required", "value must be > 0"] }

// Business / not found / conflict
{ "success": false, "error": "Human-readable message" }
```

---

## POST /api/v1/[resource]

**[Tạo mới / Submit / Trigger gì?]**

```http
POST /api/v1/[resource]
Authorization: Bearer {token}
Content-Type: application/json

{
  "field1": "string",         // required — [mô tả]
  "field2": 0,                // required — [range]
  "field3": "string | null",  // optional — [default]
  "items": [{ "itemField": "string" }]  // required, min 1
}
```

**Validation:** `field1` max 255 | `field2` > 0 | `items` min 1

**Response 201:**
```json
{ "success": true, "data": { "id": "uuid" } }
```

| Status | Condition |
|--------|-----------|
| 400 | Validation failed |
| 401 | Not authenticated |
| 403 | Not authorized |
| 409 | Duplicate / conflict |

---

## GET /api/v1/[resource]/{id}

**path:** `id` (uuid, required)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid", "field1": "value", "field2": 0,
    "status": "active | inactive | pending",
    "createdAt": "2024-01-15T10:30:00Z",
    "items": [{ "id": "uuid", "itemField": "value" }]
  }
}
```

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | Not owner |
| 404 | Not found |

---

## GET /api/v1/[resource]

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | 1-based |
| `pageSize` | int | 20 | max 100 |
| `status` | string | null | Filter by status |
| `search` | string | null | Full-text on [fields] |
| `from` | datetime | null | createdAt >= |
| `to` | datetime | null | createdAt <= |
| `sortBy` | string | `createdAt` | `createdAt`, `name`, `status` |
| `sortDir` | string | `desc` | `asc`, `desc` |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "items": [ { ... } ],
    "totalCount": 150, "page": 1, "pageSize": 20,
    "totalPages": 8, "hasNextPage": true, "hasPreviousPage": false
  }
}
```

---

## PUT /api/v1/[resource]/{id}

[Tương tự POST — PATCH thì tất cả fields optional]

**Response 200:** resource sau update | Errors: 400 / 401 / 403 / 404 / 409

---

## DELETE /api/v1/[resource]/{id}

**[Soft / Hard / Archive?]** → Response 204 No Content

Soft delete: `isDeleted = true` | Cascading: [resource liên quan ảnh hưởng thế nào]

---

## Data Types

| Type | Format | Example |
|------|--------|---------|
| ID | UUID string | `"3fa85f64-5717-4562-b3fc-2c963f66afa6"` |
| Timestamp | ISO 8601 UTC | `"2024-01-15T10:30:00Z"` |
| Money | decimal string | `"150000.00"` |
| Enum | lowercase string | `"pending"`, `"active"` |
| Phone | E.164 | `"+84901234567"` |

---

## Rate Limiting

| Tier | Limit |
|------|-------|
| Default | 100 req/min per user |
| Heavy (export, search) | 10 req/min per user |

```
HTTP 429  Retry-After: 60  X-RateLimit-Limit: 100  X-RateLimit-Remaining: 0
```

---

## Breaking Change Policy

- **Non-breaking:** Thêm optional field vào response/request
- **Breaking:** Xóa field, rename, thay type, thay URL → bump version, giữ v1 ít nhất [X tháng]

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | [YYYY-MM-DD] | Initial |

# API Contract Template

> Dùng: Copy → đổi tên `API_[ResourceName]_v[N].md` → điền.
> Mục đích: Document contract trước khi implement, share với frontend/mobile team.

---

## Metadata

| Field | Value |
|-------|-------|
| Resource | [Tên resource — vd: Orders] |
| Version | v1 |
| Base URL | `/api/v1/[resource]` |
| Auth | Bearer JWT |
| Ticket | [TICKET-123](link) |
| Author | Tuan Nguyen |
| Status | `Draft` → `Agreed` → `Implemented` |

---

## Common Response Format

Mọi response đều wrap trong `ApiResponse<T>`:

```json
// Success
{
  "success": true,
  "data": { ... }
}

// Validation error (400)
{
  "success": false,
  "validationErrors": ["field is required", "value must be > 0"]
}

// Business / not found / conflict error
{
  "success": false,
  "error": "Human-readable message"
}
```

---

## Endpoints

---

### `POST /api/v1/[resource]`

**Mục đích:** [Tạo mới / Submit / Trigger gì?]

**Request:**
```http
POST /api/v1/[resource]
Authorization: Bearer {token}
Content-Type: application/json

{
  "field1": "string",          // required — [mô tả]
  "field2": 0,                 // required — [range / constraint]
  "field3": "string | null",   // optional — [mô tả, default nếu có]
  "items": [                   // required — min 1 item
    {
      "itemField": "string"    // required
    }
  ]
}
```

**Validation rules:**
- `field1`: required, max length 255
- `field2`: required, must be > 0
- `items`: required, at least 1 element

**Response 201 Created:**
```json
{
  "success": true,
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  }
}
```

**Response errors:**

| Status | Condition | Error message |
|--------|-----------|---------------|
| 400 | Validation failed | field-specific messages |
| 401 | Not authenticated | - |
| 403 | Not authorized | "Insufficient permissions" |
| 409 | Duplicate / conflict | "[Resource] already exists" |

---

### `GET /api/v1/[resource]/{id}`

**Mục đích:** Lấy chi tiết theo ID

**Path params:**
- `id` (uuid, required)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "field1": "value",
    "field2": 0,
    "status": "active | inactive | pending",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "items": [
      {
        "id": "uuid",
        "itemField": "value"
      }
    ]
  }
}
```

**Response errors:**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | Authenticated but not owner |
| 404 | Resource not found |

---

### `GET /api/v1/[resource]`

**Mục đích:** List với pagination + filtering + sorting

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number (1-based) |
| `pageSize` | int | 20 | Items per page (max: 100) |
| `status` | string | null | Filter by status |
| `search` | string | null | Full-text search on [fields] |
| `from` | datetime | null | Filter createdAt >= |
| `to` | datetime | null | Filter createdAt <= |
| `sortBy` | string | `createdAt` | `createdAt`, `name`, `status` |
| `sortDir` | string | `desc` | `asc`, `desc` |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "items": [ { ... } ],
    "totalCount": 150,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

### `PUT /api/v1/[resource]/{id}`

**Mục đích:** Update toàn bộ resource (hoặc dùng PATCH nếu partial)

**Request:** [Tương tự POST nhưng tất cả fields optional nếu là PATCH]

**Response 200:** [Trả về resource sau update]

**Response errors:** 400 / 401 / 403 / 404 / 409

---

### `DELETE /api/v1/[resource]/{id}`

**Mục đích:** [Soft delete / Hard delete / Archive?]

**Response 204 No Content** (không có body)

**Notes:**
- Soft delete: record không bị xóa, `isDeleted = true`
- Cascading: [các resource liên quan bị ảnh hưởng thế nào]

---

## Data Types Reference

| Type | Format | Example |
|------|--------|---------|
| ID | UUID string | `"3fa85f64-5717-4562-b3fc-2c963f66afa6"` |
| Timestamp | ISO 8601 UTC | `"2024-01-15T10:30:00Z"` |
| Money | decimal string | `"150000.00"` — tránh float precision |
| Enum | lowercase string | `"pending"`, `"active"` |
| Phone | E.164 | `"+84901234567"` |

---

## Rate Limiting

| Tier | Limit |
|------|-------|
| Default | 100 req/min per user |
| Heavy endpoints (export, search) | 10 req/min per user |

Response header khi bị rate limit:
```
HTTP 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705312260
```

---

## Breaking Change Policy

- **Non-breaking:** Thêm optional field vào response, thêm optional request field
- **Breaking:** Xóa field, rename field, thay đổi type, thay đổi URL
- Breaking change → bump version (`v2`), keep `v1` alive ít nhất [X tháng]

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | [YYYY-MM-DD] | Initial |

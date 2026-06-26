# API Design Rules — ASP.NET Core REST

---

## Response Format — Chuẩn hóa toàn bộ API

```csharp
// Thống nhất response wrapper
public record ApiResponse<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Error { get; init; }
    public IReadOnlyList<string>? ValidationErrors { get; init; }

    public static ApiResponse<T> Ok(T data) => new() { Success = true, Data = data };
    public static ApiResponse<T> Fail(string error) => new() { Success = false, Error = error };
    public static ApiResponse<T> Invalid(IReadOnlyList<string> errors)
        => new() { Success = false, ValidationErrors = errors };
}

// JSON response:
// 200: { "success": true, "data": { ... } }
// 400: { "success": false, "validationErrors": ["Field X is required"] }
// 404: { "success": false, "error": "Order abc-123 not found" }
// 500: { "success": false, "error": "An unexpected error occurred" } ← không expose detail
```

---

## Controller — Thin, chỉ orchestrate

```csharp
[ApiController]
[Route("api/v{version:apiVersion}/orders")]
[ApiVersion("1.0")]
public class OrdersController(ISender mediator) : ControllerBase
{
    // ✅ Controller chỉ: nhận request → gọi mediator → map response
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<Guid>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateOrderRequest request,
        CancellationToken ct)
    {
        var command = new CreateOrderCommand(
            request.CustomerId,
            request.Items.Select(i => new CreateOrderItemRequest(i.ProductId, i.Quantity)).ToList(),
            request.ShippingAddress);

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? CreatedAtAction(nameof(GetById), new { id = result.Value }, ApiResponse<Guid>.Ok(result.Value))
            : BadRequest(ApiResponse<Guid>.Fail(result.Error));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<OrderDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetOrderByIdQuery(id), ct);
        return result.IsSuccess
            ? Ok(ApiResponse<OrderDetailDto>.Ok(result.Value))
            : NotFound(ApiResponse<OrderDetailDto>.Fail(result.Error));
    }
}

// ❌ Controller không nên có
// - Business logic
// - Direct DB access
// - Complex mapping logic
```

---

## HTTP Status Codes — Dùng đúng ngữ nghĩa

| Scenario | Status Code |
|----------|------------|
| GET / PUT / PATCH thành công | 200 OK |
| POST tạo resource mới | 201 Created + Location header |
| DELETE / action không có data trả về | 204 No Content |
| Validation error (bad input) | 400 Bad Request |
| Chưa authenticated | 401 Unauthorized |
| Authenticated nhưng không có quyền | 403 Forbidden |
| Resource không tồn tại | 404 Not Found |
| Conflict (duplicate, version mismatch) | 409 Conflict |
| Request body quá lớn | 413 Payload Too Large |
| Rate limit exceeded | 429 Too Many Requests |
| Server error | 500 Internal Server Error |
| Service unavailable | 503 Service Unavailable |

---

## Route & Naming Convention

```
# Resource naming: noun plural, lowercase, kebab-case
GET    /api/v1/orders              # list
POST   /api/v1/orders              # create
GET    /api/v1/orders/{id}         # get by id
PUT    /api/v1/orders/{id}         # full update
PATCH  /api/v1/orders/{id}         # partial update
DELETE /api/v1/orders/{id}         # delete

# Nested resource (khi relationship rõ ràng)
GET    /api/v1/orders/{id}/items   # items của order cụ thể
POST   /api/v1/orders/{id}/cancel  # action/sub-resource

# ❌ Tránh
GET  /api/v1/getOrders     # verb trong URL
POST /api/v1/order/create  # singular noun + verb
```

---

## Pagination, Filtering, Sorting

```csharp
// ✅ Chuẩn hóa query parameters
// GET /api/v1/orders?page=1&pageSize=20&status=pending&sortBy=createdAt&sortDir=desc

public record PagedQuery
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? SortBy { get; init; }
    public string SortDir { get; init; } = "desc"; // asc | desc
}

public record PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
}
```

---

## Versioning

```csharp
// Program.cs
services.AddApiVersioning(opt =>
{
    opt.DefaultApiVersion = new ApiVersion(1, 0);
    opt.AssumeDefaultVersionWhenUnspecified = true;
    opt.ReportApiVersions = true;
    opt.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader(),      // /api/v1/...
        new HeaderApiVersionReader("X-Version") // fallback: header
    );
});

// Controller: [ApiVersion("1.0")] + route /api/v{version:apiVersion}/...
// Deprecate old version: [ApiVersion("1.0", Deprecated = true)]
```

---

## Exception Handling Middleware

```csharp
// Global exception handler — không để unhandled exception leak detail
public class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (ValidationException ex)
        {
            ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
            await ctx.Response.WriteAsJsonAsync(
                ApiResponse<object>.Invalid(ex.Errors.Select(e => e.ErrorMessage).ToList()));
        }
        catch (NotFoundException ex)
        {
            ctx.Response.StatusCode = StatusCodes.Status404NotFound;
            await ctx.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(ex.Message));
        }
        catch (ConflictException ex)
        {
            ctx.Response.StatusCode = StatusCodes.Status409Conflict;
            await ctx.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await ctx.Response.WriteAsJsonAsync(
                ApiResponse<object>.Fail("An unexpected error occurred")); // Không expose detail
        }
    }
}
```

---

## Security Headers & Rate Limiting

```csharp
// Program.cs
services.AddRateLimiter(opt =>
{
    opt.AddFixedWindowLimiter("api", o =>
    {
        o.PermitLimit = 100;
        o.Window = TimeSpan.FromMinutes(1);
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 10;
    });
    opt.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Controller: [EnableRateLimiting("api")]
```

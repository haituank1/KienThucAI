# API Design Rules — ASP.NET Core REST

## Response Format

```csharp
public record ApiResponse<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Error { get; init; }
    public IReadOnlyList<string>? ValidationErrors { get; init; }

    public static ApiResponse<T> Ok(T data) => new() { Success = true, Data = data };
    public static ApiResponse<T> Fail(string error) => new() { Success = false, Error = error };
    public static ApiResponse<T> Invalid(IReadOnlyList<string> errors) => new() { Success = false, ValidationErrors = errors };
}
// 200: { "success": true, "data": { ... } }
// 400: { "success": false, "validationErrors": ["Field X is required"] }
// 404: { "success": false, "error": "Order abc-123 not found" }
// 500: { "success": false, "error": "An unexpected error occurred" }  ← never expose detail
```

## Controller — Thin, orchestrate only

```csharp
[ApiController]
[Route("api/v{version:apiVersion}/orders")]
[ApiVersion("1.0")]
public class OrdersController(ISender mediator) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<Guid>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequest request, CancellationToken ct)
    {
        var command = new CreateOrderCommand(request.CustomerId,
            request.Items.Select(i => new CreateOrderItemRequest(i.ProductId, i.Quantity)).ToList(),
            request.ShippingAddress);
        var result = await mediator.Send(command, ct);
        return result.IsSuccess
            ? CreatedAtAction(nameof(GetById), new { id = result.Value }, ApiResponse<Guid>.Ok(result.Value))
            : BadRequest(ApiResponse<Guid>.Fail(result.Error));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetOrderByIdQuery(id), ct);
        return result.IsSuccess
            ? Ok(ApiResponse<OrderDetailDto>.Ok(result.Value))
            : NotFound(ApiResponse<OrderDetailDto>.Fail(result.Error));
    }
}
// ❌ No business logic, no direct DB access, no complex mapping in controller
```

## HTTP Status Codes

| Scenario | Code |
|----------|------|
| GET/PUT/PATCH success | 200 OK |
| POST creates resource | 201 Created + Location header |
| DELETE / no body returned | 204 No Content |
| Validation error | 400 Bad Request |
| Not authenticated | 401 Unauthorized |
| Authenticated, no permission | 403 Forbidden |
| Resource not found | 404 Not Found |
| Duplicate / version conflict | 409 Conflict |
| Body too large | 413 Payload Too Large |
| Rate limit exceeded | 429 Too Many Requests |
| Server error | 500 Internal Server Error |
| Service unavailable | 503 Service Unavailable |

## Route Convention

```
# Noun plural, lowercase, kebab-case
GET    /api/v1/orders
POST   /api/v1/orders
GET    /api/v1/orders/{id}
PUT    /api/v1/orders/{id}
PATCH  /api/v1/orders/{id}
DELETE /api/v1/orders/{id}
GET    /api/v1/orders/{id}/items   # nested resource
POST   /api/v1/orders/{id}/cancel  # action sub-resource

# ❌
GET  /api/v1/getOrders      # verb in URL
POST /api/v1/order/create   # singular + verb
```

## Pagination, Filtering, Sorting

```csharp
// GET /api/v1/orders?page=1&pageSize=20&status=pending&sortBy=createdAt&sortDir=desc
public record PagedQuery
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? SortBy { get; init; }
    public string SortDir { get; init; } = "desc";
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

## Versioning

```csharp
services.AddApiVersioning(opt =>
{
    opt.DefaultApiVersion = new ApiVersion(1, 0);
    opt.AssumeDefaultVersionWhenUnspecified = true;
    opt.ReportApiVersions = true;
    opt.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader(),       // /api/v1/...
        new HeaderApiVersionReader("X-Version") // fallback
    );
});
// Deprecate: [ApiVersion("1.0", Deprecated = true)]
```

## Exception Handling Middleware

```csharp
public class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try { await next(ctx); }
        catch (ValidationException ex)
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsJsonAsync(
                ApiResponse<object>.Invalid(ex.Errors.Select(e => e.ErrorMessage).ToList()));
        }
        catch (NotFoundException ex) { ctx.Response.StatusCode = 404; await ctx.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(ex.Message)); }
        catch (ConflictException ex) { ctx.Response.StatusCode = 409; await ctx.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(ex.Message)); }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            ctx.Response.StatusCode = 500;
            await ctx.Response.WriteAsJsonAsync(ApiResponse<object>.Fail("An unexpected error occurred"));
        }
    }
}
```

## Rate Limiting

```csharp
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

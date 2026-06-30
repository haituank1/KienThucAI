using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DemoEngine.API.Services;

namespace DemoEngine.API.Endpoints;

public static class PromotionEndpoints
{
    public static void MapPromotionEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/promotions").RequireAuthorization();

        // GET /api/promotions — toan bo promotions cua user hien tai
        // Returns: { itemId: promotedAtIso, ... }
        group.MapGet("", async (ClaimsPrincipal principal, PromotionService svc) =>
        {
            var userId = GetUserId(principal);
            if (userId is null) return Results.Unauthorized();
            return Results.Ok(await svc.GetAllAsync(userId));
        });

        // POST /api/promotions/{itemId} — promote item
        group.MapPost("{itemId}", async (string itemId, ClaimsPrincipal principal, PromotionService svc) =>
        {
            var userId = GetUserId(principal);
            if (userId is null) return Results.Unauthorized();
            await svc.PromoteAsync(userId, itemId);
            return Results.Ok(new { itemId, promoted = true });
        });

        // DELETE /api/promotions/{itemId} — unpromote item
        group.MapDelete("{itemId}", async (string itemId, ClaimsPrincipal principal, PromotionService svc) =>
        {
            var userId = GetUserId(principal);
            if (userId is null) return Results.Unauthorized();
            var ok = await svc.UnpromoteAsync(userId, itemId);
            return ok ? Results.Ok(new { itemId, promoted = false }) : Results.NotFound();
        });
    }

    private static string? GetUserId(ClaimsPrincipal principal)
        => principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
}

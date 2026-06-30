using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DemoEngine.API.Services;

namespace DemoEngine.API.Endpoints;

public static class RatingEndpoints
{
    public static void MapRatingEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/ratings").RequireAuthorization();

        // GET /api/ratings — toàn bộ ratings của user hiện tại
        group.MapGet("", async (ClaimsPrincipal principal, RatingService svc) =>
        {
            var userId = GetUserId(principal);
            if (userId is null) return Results.Unauthorized();

            var ratings = await svc.GetRatingsAsync(userId);
            return Results.Ok(ratings);
        });

        // GET /api/ratings/{itemId} — rating của 1 item
        group.MapGet("{itemId}", async (string itemId, ClaimsPrincipal principal, RatingService svc) =>
        {
            var userId = GetUserId(principal);
            if (userId is null) return Results.Unauthorized();

            var stars = await svc.GetRatingAsync(userId, itemId);
            return Results.Ok(new { itemId, stars });
        });

        // PUT /api/ratings/{itemId} — set rating { stars: 1–5 }, stars=0 để xoá
        group.MapPut("{itemId}", async (string itemId, SetRatingRequest req,
            ClaimsPrincipal principal, RatingService svc) =>
        {
            var userId = GetUserId(principal);
            if (userId is null) return Results.Unauthorized();

            if (req.Stars < 0 || req.Stars > 5)
                return Results.BadRequest(new { error = "Stars phải từ 0 đến 5" });

            await svc.SetRatingAsync(userId, itemId, req.Stars);
            return Results.Ok(new { itemId, stars = req.Stars });
        });

        // DELETE /api/ratings/{itemId} — xoá rating
        group.MapDelete("{itemId}", async (string itemId, ClaimsPrincipal principal, RatingService svc) =>
        {
            var userId = GetUserId(principal);
            if (userId is null) return Results.Unauthorized();

            await svc.DeleteRatingAsync(userId, itemId);
            return Results.NoContent();
        });
    }

    private static string? GetUserId(ClaimsPrincipal principal)
        => principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
}

public record SetRatingRequest(int Stars);

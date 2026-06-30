using System.Security.Claims;
using DemoEngine.API.Models;
using DemoEngine.API.Services;

namespace DemoEngine.API.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        // POST /api/auth/login
        group.MapPost("login", async (LoginRequest req, UserService svc) =>
        {
            if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
                return Results.BadRequest(new { error = "Username và password không được để trống" });

            var user = await svc.ValidateAsync(req.Username, req.Password);
            if (user is null)
                return Results.Unauthorized();

            var token     = svc.GenerateToken(user);
            var expiryHrs = int.TryParse(app.Configuration["Jwt:ExpiryHours"], out var h) ? h : 168;

            return Results.Ok(new LoginResponse(
                Token:       token,
                UserId:      user.Id,
                Username:    user.Username,
                DisplayName: user.DisplayName,
                Role:        user.Role,
                ExpiresAt:   DateTime.UtcNow.AddHours(expiryHrs)));
        });

        // GET /api/auth/me — trả về thông tin user hiện tại (yêu cầu JWT)
        group.MapGet("me", (ClaimsPrincipal principal) =>
        {
            var userId      = principal.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
            var username    = principal.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.UniqueName);
            var displayName = principal.FindFirstValue("displayName");
            var role        = principal.FindFirstValue(ClaimTypes.Role);

            return userId is null
                ? Results.Unauthorized()
                : Results.Ok(new { userId, username, displayName, role });
        }).RequireAuthorization();
    }
}

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DemoEngine.API.Models;
using Microsoft.IdentityModel.Tokens;

namespace DemoEngine.API.Services;

public class UserService(IConfiguration config, ILogger<UserService> logger)
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private string UsersFilePath =>
        Path.Combine(config["DataPath"]!, "users.json");

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Validate username/password. Trả về null nếu sai.</summary>
    public async Task<AppUser?> ValidateAsync(string username, string password)
    {
        var users = await LoadUsersAsync();
        var user  = users.FirstOrDefault(u =>
            u.Username.Equals(username, StringComparison.OrdinalIgnoreCase));

        if (user is null) return null;
        return VerifyPassword(password, user.PasswordHash) ? user : null;
    }

    public string GenerateToken(AppUser user)
    {
        var secret  = config["Jwt:Secret"]!;
        var issuer  = config["Jwt:Issuer"] ?? "demo-engine";
        var audience = config["Jwt:Audience"] ?? "knowledge-hub";
        var hours   = int.TryParse(config["Jwt:ExpiryHours"], out var h) ? h : 168;

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,             user.Id),
            new Claim(JwtRegisteredClaimNames.UniqueName,      user.Username),
            new Claim("displayName",                           user.DisplayName),
            new Claim(ClaimTypes.Role,                         user.Role),
            new Claim(JwtRegisteredClaimNames.Jti,             Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer:             issuer,
            audience:           audience,
            claims:             claims,
            expires:            DateTime.UtcNow.AddHours(hours),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<List<AppUser>> LoadUsersAsync()
    {
        if (!File.Exists(UsersFilePath))
        {
            logger.LogWarning("users.json không tồn tại tại {Path}", UsersFilePath);
            return [];
        }

        try
        {
            var json = await File.ReadAllTextAsync(UsersFilePath, Encoding.UTF8);
            return JsonSerializer.Deserialize<List<AppUser>>(json, JsonOpts) ?? [];
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Lỗi đọc users.json");
            return [];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Password helpers — PBKDF2 / SHA-256
    // Format: pbkdf2:{iterations}:{salt_base64}:{hash_base64}
    // ─────────────────────────────────────────────────────────────────────────

    public static string HashPassword(string password)
    {
        const int iterations = 100_000;
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password),
            salt,
            iterations,
            HashAlgorithmName.SHA256,
            32);

        return $"pbkdf2:{iterations}:{Convert.ToBase64String(salt)}:{Convert.ToBase64String(hash)}";
    }

    public static bool VerifyPassword(string password, string storedHash)
    {
        try
        {
            var parts = storedHash.Split(':');
            if (parts.Length != 4 || parts[0] != "pbkdf2") return false;

            var iterations = int.Parse(parts[1]);
            var salt       = Convert.FromBase64String(parts[2]);
            var expected   = Convert.FromBase64String(parts[3]);

            var actual = Rfc2898DeriveBytes.Pbkdf2(
                Encoding.UTF8.GetBytes(password),
                salt,
                iterations,
                HashAlgorithmName.SHA256,
                32);

            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch
        {
            return false;
        }
    }
}

namespace DemoEngine.API.Models;

public class AppUser
{
    public string   Id           { get; set; } = "";
    public string   Username     { get; set; } = "";
    public string   DisplayName  { get; set; } = "";
    /// <summary>Format: pbkdf2:{iterations}:{salt_b64}:{hash_b64}</summary>
    public string   PasswordHash { get; set; } = "";
    public string   Role         { get; set; } = "user";
    public DateTime CreatedAt    { get; set; }
}

public record LoginRequest(string Username, string Password);

public record LoginResponse(
    string   Token,
    string   UserId,
    string   Username,
    string   DisplayName,
    string   Role,
    DateTime ExpiresAt);

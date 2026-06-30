using System.Text;
using System.Text.Json;

namespace DemoEngine.API.Services;

public class RatingService(IConfiguration config, ILogger<RatingService> logger)
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented               = true
    };

    private string RatingsDir =>
        Path.Combine(config["DataPath"]!, "_ratings");

    private string RatingFilePath(string userId) =>
        Path.Combine(RatingsDir, $"{userId}.json");

    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Lấy toàn bộ ratings của user. Key = itemId, Value = stars (1–5).</summary>
    public async Task<Dictionary<string, int>> GetRatingsAsync(string userId)
    {
        var path = RatingFilePath(userId);
        if (!File.Exists(path)) return new();

        try
        {
            var json = await File.ReadAllTextAsync(path, Encoding.UTF8);
            return JsonSerializer.Deserialize<Dictionary<string, int>>(json, JsonOpts) ?? new();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Lỗi đọc rating file cho user {UserId}", userId);
            return new();
        }
    }

    /// <summary>Lấy rating của 1 item. Trả về 0 nếu chưa rate.</summary>
    public async Task<int> GetRatingAsync(string userId, string itemId)
    {
        var ratings = await GetRatingsAsync(userId);
        return ratings.TryGetValue(itemId, out var stars) ? stars : 0;
    }

    /// <summary>Set rating (1–5). stars = 0 → xoá rating.</summary>
    public async Task SetRatingAsync(string userId, string itemId, int stars)
    {
        if (stars < 0 || stars > 5)
            throw new ArgumentOutOfRangeException(nameof(stars), "Stars phải từ 0 đến 5");

        Directory.CreateDirectory(RatingsDir);

        var ratings = await GetRatingsAsync(userId);

        if (stars == 0)
            ratings.Remove(itemId);
        else
            ratings[itemId] = stars;

        var json = JsonSerializer.Serialize(ratings, JsonOpts);
        await File.WriteAllTextAsync(RatingFilePath(userId), json, Encoding.UTF8);

        logger.LogInformation("Rating updated: user={UserId} item={ItemId} stars={Stars}",
            userId, itemId, stars);
    }

    /// <summary>Xoá rating của 1 item.</summary>
    public Task DeleteRatingAsync(string userId, string itemId)
        => SetRatingAsync(userId, itemId, 0);
}

using System.Text;
using System.Text.Json;

namespace DemoEngine.API.Services;

/// <summary>
/// Quản lý danh sách "Promote to Rule" per-user.
/// Lưu tại data/_promoted/{userId}.json — Dictionary&lt;itemId, promotedAt ISO string&gt;
/// </summary>
public class PromotionService(IConfiguration config, ILogger<PromotionService> logger)
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented               = true,
        PropertyNameCaseInsensitive = true
    };

    private string PromotedDir =>
        Path.Combine(config["DataPath"]!, "_promoted");

    private string FilePath(string userId) =>
        Path.Combine(PromotedDir, $"{userId}.json");

    // -------------------------------------------------------------------------

    public async Task<Dictionary<string, string>> GetAllAsync(string userId)
    {
        var path = FilePath(userId);
        if (!File.Exists(path)) return new();

        try
        {
            var json = await File.ReadAllTextAsync(path, Encoding.UTF8);
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json, JsonOpts) ?? new();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Doc _promoted that bai cho user {UserId}", userId);
            return new();
        }
    }

    public async Task PromoteAsync(string userId, string itemId)
    {
        var data = await GetAllAsync(userId);
        data[itemId] = DateTime.UtcNow.ToString("O");
        await SaveAsync(userId, data);
        logger.LogInformation("Promoted: user={UserId} item={ItemId}", userId, itemId);
    }

    public async Task<bool> UnpromoteAsync(string userId, string itemId)
    {
        var data = await GetAllAsync(userId);
        if (!data.Remove(itemId)) return false;
        await SaveAsync(userId, data);
        logger.LogInformation("Unpromoted: user={UserId} item={ItemId}", userId, itemId);
        return true;
    }

    // -------------------------------------------------------------------------

    private async Task SaveAsync(string userId, Dictionary<string, string> data)
    {
        Directory.CreateDirectory(PromotedDir);
        var json = JsonSerializer.Serialize(data, JsonOpts);
        await File.WriteAllTextAsync(FilePath(userId), json, Encoding.UTF8);
    }
}

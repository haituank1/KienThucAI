using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using DemoEngine.API.Models;

namespace DemoEngine.API.Services;

public class QueueService(IConfiguration config, ILogger<QueueService> logger)
{
    private readonly string _queuePath = Path.Combine(
        config["DataPath"] ?? throw new InvalidOperationException("DataPath not configured"),
        "_queue.json");

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.CamelCase,
        WriteIndented               = true,
        PropertyNameCaseInsensitive = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    // ── Public API ────────────────────────────────────────────────────────────

    public async Task<List<QueueItem>> GetAllAsync()
    {
        if (!File.Exists(_queuePath)) return [];
        try
        {
            var json = await File.ReadAllTextAsync(_queuePath, Encoding.UTF8);
            return JsonSerializer.Deserialize<List<QueueItem>>(json, JsonOpts) ?? [];
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to read queue file");
            return [];
        }
    }

    public async Task<QueueItem> AddAsync(QueueItem item)
    {
        if (string.IsNullOrEmpty(item.Id))
            item.Id = Guid.NewGuid().ToString("N")[..8];
        item.AddedAt = DateTime.UtcNow;
        if (string.IsNullOrWhiteSpace(item.Status))   item.Status   = "pending";
        if (string.IsNullOrWhiteSpace(item.Priority)) item.Priority = "medium";

        var items = await GetAllAsync();
        items.Add(item);
        await SaveAsync(items);

        logger.LogInformation("Queue item added: {Topic}", item.Topic);
        return item;
    }

    public async Task<QueueItem?> UpdateAsync(string id, QueueItem updated)
    {
        var items = await GetAllAsync();
        var idx   = items.FindIndex(i => i.Id == id);
        if (idx < 0) return null;

        updated.Id      = id;
        updated.AddedAt = items[idx].AddedAt; // giữ nguyên AddedAt
        items[idx]      = updated;

        await SaveAsync(items);
        return updated;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var items   = await GetAllAsync();
        var removed = items.RemoveAll(i => i.Id == id);
        if (removed == 0) return false;
        await SaveAsync(items);
        return true;
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private static readonly Dictionary<string, int> PriorityOrder = new()
    {
        ["high"]   = 0,
        ["medium"] = 1,
        ["low"]    = 2
    };

    private async Task SaveAsync(List<QueueItem> items)
    {
        // Sort: pending/in-progress trước, xong mới done;
        // trong cùng group: high > medium > low, rồi đến AddedAt
        var sorted = items
            .OrderBy(i  => i.Status == "done" ? 1 : 0)
            .ThenBy(i   => PriorityOrder.GetValueOrDefault(i.Priority, 1))
            .ThenBy(i   => i.AddedAt)
            .ToList();

        var json = JsonSerializer.Serialize(sorted, JsonOpts);
        await File.WriteAllTextAsync(_queuePath, json, Encoding.UTF8);
    }
}

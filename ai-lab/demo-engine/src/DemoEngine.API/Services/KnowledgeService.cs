using System.Text.Json;
using DemoEngine.API.Models;

namespace DemoEngine.API.Services;

public class KnowledgeService(IConfiguration config, ILogger<KnowledgeService> logger)
{
    private readonly string _dataPath = config["DataPath"]
        ?? throw new InvalidOperationException("DataPath not configured");

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        PropertyNameCaseInsensitive = true
    };

    // ── List all items (with optional filters) ─────────────────────────────
    public async Task<List<KnowledgeItem>> GetAllAsync(
        string? category = null,
        string? status = null,
        string? search = null)
    {
        var items = new List<KnowledgeItem>();

        if (!Directory.Exists(_dataPath))
        {
            logger.LogWarning("Data path does not exist: {Path}", _dataPath);
            return items;
        }

        // Scan all JSON files recursively, skip _categories.json and _index.json
        var files = Directory.GetFiles(_dataPath, "*.json", SearchOption.AllDirectories)
            .Where(f =>
            {
                var name = Path.GetFileName(f);
                return !name.StartsWith('_');
            });

        foreach (var file in files)
        {
            try
            {
                var json = await File.ReadAllTextAsync(file);
                var item = JsonSerializer.Deserialize<KnowledgeItem>(json, JsonOpts);
                if (item is null) continue;
                item.FilePath = file;
                items.Add(item);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to parse {File}", file);
            }
        }

        // Apply filters
        if (!string.IsNullOrWhiteSpace(category))
            items = items.Where(i => i.Category == category).ToList();

        if (!string.IsNullOrWhiteSpace(status))
            items = items.Where(i => i.Status == status).ToList();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            items = items.Where(i =>
                i.Topic.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                i.Summary.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                i.Tags.Any(t => t.Contains(q, StringComparison.OrdinalIgnoreCase))
            ).ToList();
        }

        return items.OrderByDescending(i => i.ResearchedAt).ToList();
    }

    // ── Get single item by ID ───────────────────────────────────────────────
    public async Task<KnowledgeItem?> GetByIdAsync(string id)
    {
        var all = await GetAllAsync();
        return all.FirstOrDefault(i => i.Id == id);
    }

    // ── Update status ────────────────────────────────────────────────────────
    public async Task<KnowledgeItem?> UpdateStatusAsync(
        string id, string status, string notes, string validatedBy = "Tuan")
    {
        var item = await GetByIdAsync(id);
        if (item is null) return null;

        item.Status = status;
        item.Validation.Notes = notes;

        if (status == "validated")
        {
            item.ValidatedAt = DateTime.UtcNow;
            item.ValidatedBy = validatedBy;
        }
        else if (status == "rejected" || status == "needs_rework")
        {
            item.ValidatedAt = DateTime.UtcNow;
            item.ValidatedBy = validatedBy;
        }

        await SaveItemAsync(item);
        return item;
    }

    // ── Save item back to file ───────────────────────────────────────────────
    private async Task SaveItemAsync(KnowledgeItem item)
    {
        if (string.IsNullOrEmpty(item.FilePath))
            throw new InvalidOperationException($"FilePath is not set for item {item.Id}");

        // Temporarily clear FilePath (not stored in JSON)
        var filePath = item.FilePath;
        item.FilePath = "";

        var json = JsonSerializer.Serialize(item, JsonOpts);
        await File.WriteAllTextAsync(filePath, json);

        item.FilePath = filePath;
    }

    // ── Create new item ────────────────────────────────────────────────────
    public async Task<KnowledgeItem> CreateAsync(KnowledgeItem item)
    {
        if (string.IsNullOrEmpty(item.Id))
            item.Id = $"{item.Category}-{Guid.NewGuid():N}".ToLower();

        if (item.ResearchedAt == default)
            item.ResearchedAt = DateTime.UtcNow;

        // Determine path: data/{category}/{yyyy-MM}/
        var yearMonth = item.ResearchedAt.ToString("yyyy-MM");
        var dir = Path.Combine(_dataPath, item.Category, yearMonth);
        Directory.CreateDirectory(dir);

        var slug = item.Topic.ToLower()
            .Replace(" ", "-")
            .Replace("/", "-")
            .Replace(".", "")
            .Replace("(", "")
            .Replace(")", "");
        if (slug.Length > 50) slug = slug[..50];

        var filePath = Path.Combine(dir, $"{slug}.json");
        item.FilePath = filePath;

        await SaveItemAsync(item);
        return item;
    }
}

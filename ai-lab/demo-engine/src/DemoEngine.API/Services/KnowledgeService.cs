using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using DemoEngine.API.Models;

namespace DemoEngine.API.Services;

public class KnowledgeService(IConfiguration config, ILogger<KnowledgeService> logger)
{
    private readonly string _dataPath = config["DataPath"]
        ?? throw new InvalidOperationException("DataPath not configured");

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.CamelCase,
        WriteIndented               = true,
        PropertyNameCaseInsensitive = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<List<KnowledgeItem>> GetAllAsync(
        string? category = null,
        string? status   = null,
        string? search   = null)
    {
        if (!Directory.Exists(_dataPath))
        {
            logger.LogWarning("Data path does not exist: {Path}", _dataPath);
            return [];
        }

        var items = new List<KnowledgeItem>();

        var allFiles = Directory.GetFiles(_dataPath, "*", SearchOption.AllDirectories);

        var metaFiles = allFiles.Where(IsMetaFile).ToList();

        foreach (var file in metaFiles)
        {
            try
            {
                var json = await File.ReadAllTextAsync(file, Encoding.UTF8);

                var item = JsonSerializer.Deserialize<KnowledgeItem>(json, JsonOpts);
                if (item is null) continue;

                // Guard: skip items thiếu required fields (bảo vệ khỏi file incomplete/corrupt)
                if (string.IsNullOrWhiteSpace(item.Topic)) { logger.LogWarning("Skip item missing Topic: {File}", file); continue; }
                if (item.ResearchedAt == DateTime.MinValue) { logger.LogWarning("Skip item missing ResearchedAt: {File}", file); continue; }

                item.FilePath = file;
                items.Add(item);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to parse {File}", file);
            }
        }

        if (!string.IsNullOrWhiteSpace(category))
            items = items.Where(i => i.Category == category).ToList();
        if (!string.IsNullOrWhiteSpace(status))
            items = items.Where(i => i.Status == status).ToList();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim();
            items = items.Where(i =>
                i.Topic.Contains(q, StringComparison.OrdinalIgnoreCase)       ||
                i.Summary.Contains(q, StringComparison.OrdinalIgnoreCase)     ||
                i.Subcategory.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                i.Category.Contains(q, StringComparison.OrdinalIgnoreCase)    ||
                i.Tags.Any(t => t.Contains(q, StringComparison.OrdinalIgnoreCase))
            ).ToList();
        }

        return items.OrderByDescending(i => i.ResearchedAt).ToList();
    }

    public async Task<KnowledgeItem?> GetByIdAsync(string id)
    {
        var all = await GetAllAsync();
        return all.FirstOrDefault(i => i.Id == id);
    }

    /// <summary>
    /// Tìm các knowledge items liên quan đến item có id cho trước.
    /// Score = tagOverlap×2 + sameCategory×2 + sameSubcategory×1.
    /// </summary>
    public async Task<List<RelatedKnowledgeItem>> GetRelatedItemsAsync(string id, int limit = 6)
    {
        var target = await GetByIdAsync(id);
        if (target is null) return [];

        var all = await GetAllAsync();

        return all
            .Where(i => i.Id != id && i.Status == "validated")
            .Select(i =>
            {
                var commonTags = i.Tags.Intersect(target.Tags, StringComparer.OrdinalIgnoreCase).ToList();
                var score      = commonTags.Count * 2
                               + (i.Category   .Equals(target.Category,    StringComparison.OrdinalIgnoreCase) ? 2 : 0)
                               + (i.Subcategory.Equals(target.Subcategory, StringComparison.OrdinalIgnoreCase)
                                  && !string.IsNullOrEmpty(i.Subcategory) ? 1 : 0);
                return (item: i, score, commonTags);
            })
            .Where(x => x.score > 0)
            .OrderByDescending(x => x.score)
            .Take(limit)
            .Select(x => new RelatedKnowledgeItem
            {
                Id          = x.item.Id,
                Topic       = x.item.Topic,
                Category    = x.item.Category,
                Subcategory = x.item.Subcategory,
                Tags        = x.item.Tags,
                Status      = x.item.Status,
                Score       = x.score,
                CommonTags  = x.commonTags
            })
            .ToList();
    }

    public async Task<KnowledgeItem?> UpdateStatusAsync(
        string id, string status, string notes, string validatedBy = "Tuan")
    {
        var item = await GetByIdAsync(id);
        if (item is null) return null;

        item.Status           = status;
        item.Validation.Notes = notes;

        if (status is "validated" or "rejected" or "needs_rework")
        {
            item.ValidatedAt = DateTime.UtcNow;
            item.ValidatedBy = validatedBy;
        }

        await SaveItemAsync(item);
        return item;
    }

    /// <summary>
    /// Lưu thông tin file toolkit mà item đã được merge vào.
    /// </summary>
    public async Task<KnowledgeItem?> UpdateMergeTrackingAsync(string id, string mergedIntoFile)
    {
        var item = await GetByIdAsync(id);
        if (item is null) return null;

        item.MergedIntoFile = mergedIntoFile;
        item.MergedAt       = DateTime.UtcNow;

        await SaveItemAsync(item);
        logger.LogInformation("Merge tracking updated for {Id} → {File}", id, mergedIntoFile);
        return item;
    }

    public async Task<KnowledgeItem> CreateAsync(KnowledgeItem item)
    {
        if (string.IsNullOrEmpty(item.Id))
            item.Id = $"{item.Category}-{Guid.NewGuid():N}".ToLower();
        if (item.ResearchedAt == default)
            item.ResearchedAt = DateTime.UtcNow;

        var yearMonth = item.ResearchedAt.ToString("yyyy-MM");
        var dir       = Path.Combine(_dataPath, item.Category, yearMonth);
        Directory.CreateDirectory(dir);

        var slug = Slugify(item.Topic);
        item.FilePath = Path.Combine(dir, $"{slug}.json");

        await SaveItemAsync(item);
        return item;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private — Save
    // ─────────────────────────────────────────────────────────────────────────

    private async Task SaveItemAsync(KnowledgeItem item)
    {
        if (string.IsNullOrEmpty(item.FilePath))
            throw new InvalidOperationException($"FilePath not set for item {item.Id}");

        var path = item.FilePath;
        item.FilePath = "";
        var json = DecodeNonAsciiEscapes(JsonSerializer.Serialize(item, JsonOpts));
        await File.WriteAllTextAsync(path, json, Encoding.UTF8);
        item.FilePath = path;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private — Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private static bool IsMetaFile(string path)
    {
        var name = Path.GetFileName(path);
        if (name.StartsWith('_')) return false;
        return name.EndsWith(".json", StringComparison.OrdinalIgnoreCase);
    }

    private static string Slugify(string topic)
    {
        var slug = topic.ToLower()
            .Replace(" ", "-").Replace("/", "-")
            .Replace(".", "").Replace("(", "").Replace(")", "")
            .Replace("<", "").Replace(">", "").Replace("—", "-");
        return slug.Length > 50 ? slug[..50] : slug;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Unicode helpers
    // ─────────────────────────────────────────────────────────────────────────

    private static string DecodeNonAsciiEscapes(string input)
    {
        if (!input.Contains("\\u", StringComparison.Ordinal)) return input;
        var sb  = new StringBuilder(input.Length);
        int i   = 0;
        int len = input.Length;

        while (i < len)
        {
            if (input[i] == '\\' && i + 1 < len)
            {
                var next = input[i + 1];
                if (next == 'u' && i + 5 < len
                    && IsHex(input[i+2]) && IsHex(input[i+3])
                    && IsHex(input[i+4]) && IsHex(input[i+5]))
                {
                    var code = ParseHex4(input, i + 2);
                    if (code is >= 0xD800 and <= 0xDBFF
                        && i + 11 < len
                        && input[i+6] == '\\' && input[i+7] == 'u'
                        && IsHex(input[i+8]) && IsHex(input[i+9])
                        && IsHex(input[i+10]) && IsHex(input[i+11]))
                    {
                        var low = ParseHex4(input, i + 8);
                        if (low is >= 0xDC00 and <= 0xDFFF)
                        {
                            sb.Append(char.ConvertFromUtf32(0x10000 + (code - 0xD800) * 0x400 + (low - 0xDC00)));
                            i += 12; continue;
                        }
                    }
                    if (code >= 0x80) { sb.Append((char)code); i += 6; continue; }
                    sb.Append('\\'); sb.Append('u'); sb.Append(input, i + 2, 4); i += 6; continue;
                }
                sb.Append('\\'); sb.Append(next); i += 2; continue;
            }
            sb.Append(input[i]); i++;
        }
        return sb.ToString();
    }

    private static bool IsHex(char c)
        => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');

    private static int ParseHex4(string s, int start)
        => Convert.ToInt32(s.Substring(start, 4), 16);
}

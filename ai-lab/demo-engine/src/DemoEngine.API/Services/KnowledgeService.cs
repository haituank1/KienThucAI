using System.IO.Compression;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using DemoEngine.API.Models;

namespace DemoEngine.API.Services;

/// <summary>
/// Mỗi knowledge item lưu thành 2 file cạnh nhau:
///   {slug}.json          — meta (nhẹ, uncompressed) — dùng cho list view
///   {slug}.detail.json.gz — detail (nặng, compressed) — chỉ load khi mở detail
///
/// Legacy format (.json.gz đơn) vẫn được đọc và tự migrate khi có write.
/// </summary>
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

    /// <summary>
    /// List: chỉ đọc meta.json (không decompress) — nhanh.
    /// Legacy .json.gz files cũng được đọc (backward compat).
    /// </summary>
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

        // Scan tất cả files trong data dir
        var allFiles = Directory.GetFiles(_dataPath, "*", SearchOption.AllDirectories);

        // Lọc meta files, bỏ _* và .detail.json.gz
        // Deduplicate: nếu cả .json và .json.gz cùng tồn tại (legacy + new), ưu tiên .json
        var metaFiles = allFiles
            .Where(IsMetaFile)
            .GroupBy(f => GetSlugKey(f))          // group by slug without extension
            .Select(g => g.OrderBy(f              // prefer .json (0) over .json.gz (1)
                => f.EndsWith(".json.gz", StringComparison.OrdinalIgnoreCase) ? 1 : 0).First())
            .ToList();

        foreach (var file in metaFiles)
        {
            try
            {
                // Legacy .json.gz → đọc với decompression; .json mới → đọc plain
                var json = file.EndsWith(".json.gz", StringComparison.OrdinalIgnoreCase)
                    ? await ReadGzipAsync(file)
                    : await File.ReadAllTextAsync(file, Encoding.UTF8);

                var item = JsonSerializer.Deserialize<KnowledgeItem>(json, JsonOpts);
                if (item is null) continue;
                item.FilePath = file;
                items.Add(item);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to parse meta {File}", file);
            }
        }

        // Apply filters
        if (!string.IsNullOrWhiteSpace(category))
            items = items.Where(i => i.Category == category).ToList();
        if (!string.IsNullOrWhiteSpace(status))
            items = items.Where(i => i.Status == status).ToList();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search;
            items = items.Where(i =>
                i.Topic.Contains(q, StringComparison.OrdinalIgnoreCase)   ||
                i.Summary.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                i.Tags.Any(t => t.Contains(q, StringComparison.OrdinalIgnoreCase))
            ).ToList();
        }

        return items.OrderByDescending(i => i.ResearchedAt).ToList();
    }

    /// <summary>
    /// Detail: đọc meta + detail, merge thành full KnowledgeItem.
    /// </summary>
    public async Task<KnowledgeItem?> GetByIdAsync(string id)
    {
        var meta = await GetAllAsync();
        var item = meta.FirstOrDefault(i => i.Id == id);
        if (item is null) return null;

        // Load detail fields từ .detail.json.gz
        var detailPath = GetDetailPath(item.FilePath);
        if (File.Exists(detailPath))
        {
            try
            {
                var detailJson = await ReadGzipAsync(detailPath);
                var detail     = JsonSerializer.Deserialize<KnowledgeDetail>(detailJson, JsonOpts);
                if (detail is not null)
                    MergeDetail(item, detail);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to read detail for {Id}", id);
            }
        }

        return item;
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
        item.FilePath = Path.Combine(dir, $"{slug}.json"); // meta path

        await SaveItemAsync(item);
        return item;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private — Save / Split
    // ─────────────────────────────────────────────────────────────────────────

    private async Task SaveItemAsync(KnowledgeItem item)
    {
        if (string.IsNullOrEmpty(item.FilePath))
            throw new InvalidOperationException($"FilePath not set for item {item.Id}");

        // Normalize: đảm bảo FilePath trỏ đến .json (meta), không phải .json.gz
        var metaPath = NormalizeToMetaPath(item.FilePath);

        // ── 1. Tách detail fields ───────────────────────────────────────────
        var detail = ExtractDetail(item);

        // ── 2. Zero-out detail fields trên item trước khi lưu meta ─────────
        ClearDetailFields(item);

        // ── 3. Ghi meta.json (uncompressed, nhỏ) ───────────────────────────
        var filePath  = item.FilePath;
        item.FilePath = "";
        var metaJson  = DecodeNonAsciiEscapes(JsonSerializer.Serialize(item, JsonOpts));
        await File.WriteAllTextAsync(metaPath, metaJson, Encoding.UTF8);
        item.FilePath = metaPath;

        // ── 4. Ghi detail.json.gz (compressed) ─────────────────────────────
        var detailPath = GetDetailPath(metaPath);
        var detailJson = DecodeNonAsciiEscapes(JsonSerializer.Serialize(detail, JsonOpts));
        await WriteGzipAsync(detailPath, detailJson);

        // ── 5. Xoá legacy file nếu có ───────────────────────────────────────
        CleanupLegacyFiles(metaPath, filePath);

        // ── 6. Restore detail fields (caller có thể cần dùng tiếp) ─────────
        MergeDetail(item, detail);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private — Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Key để deduplicate: path không có extension (.json/.json.gz)</summary>
    private static string GetSlugKey(string path)
    {
        if (path.EndsWith(".json.gz", StringComparison.OrdinalIgnoreCase))
            return path[..^8]; // bỏ ".json.gz"
        if (path.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            return path[..^5]; // bỏ ".json"
        return path;
    }

    private static bool IsMetaFile(string path)
    {
        var name = Path.GetFileName(path);
        if (name.StartsWith('_'))                                return false; // _categories.json etc
        if (name.EndsWith(".detail.json.gz", StringComparison.OrdinalIgnoreCase)) return false; // detail file
        if (name.EndsWith(".json",    StringComparison.OrdinalIgnoreCase)) return true;  // new meta
        if (name.EndsWith(".json.gz", StringComparison.OrdinalIgnoreCase)) return true;  // legacy
        return false;
    }

    private static string GetDetailPath(string metaPath)
    {
        // meta:   /data/dotnet/2026-06/ef-core.json
        // detail: /data/dotnet/2026-06/ef-core.detail.json.gz
        var withoutExt = metaPath
            .Replace(".json.gz", "", StringComparison.OrdinalIgnoreCase)
            .Replace(".json",    "", StringComparison.OrdinalIgnoreCase);
        return withoutExt + ".detail.json.gz";
    }

    private static string NormalizeToMetaPath(string path)
    {
        // Nếu đang là legacy .json.gz → đổi về .json
        if (path.EndsWith(".json.gz", StringComparison.OrdinalIgnoreCase)
            && !path.EndsWith(".detail.json.gz", StringComparison.OrdinalIgnoreCase))
            return path[..^3]; // bỏ ".gz"
        return path;
    }

    private static void CleanupLegacyFiles(string newMetaPath, string originalPath)
    {
        // Xoá legacy .json.gz nếu vừa migrate sang .json split
        if (!string.IsNullOrEmpty(originalPath)
            && originalPath != newMetaPath
            && File.Exists(originalPath))
        {
            try { File.Delete(originalPath); }
            catch { /* ignore */ }
        }
    }

    private static KnowledgeDetail ExtractDetail(KnowledgeItem item) => new()
    {
        Problem          = item.Problem,
        Solution         = item.Solution,
        CodeExample      = item.CodeExample,
        Tradeoffs        = item.Tradeoffs,
        References       = item.References,
        SelfVerification = item.SelfVerification,
        DemoPath         = item.Demo.Path,
        DemoDescription  = item.Demo.Description,
        ValidationNotes  = item.Validation.Notes,
        ValidationAction = item.Validation.Action,
        ToolkitContent   = item.ToolkitContent   // pre-written snippet for toolkit
    };

    private static void ClearDetailFields(KnowledgeItem item)
    {
        item.Problem          = "";
        item.Solution         = "";
        item.CodeExample      = "";
        item.Tradeoffs        = [];
        item.References       = [];
        item.SelfVerification = new SelfVerification();
        item.ToolkitContent   = "";
        item.Demo             = new DemoInfo { Exists = item.Demo.Exists, Type = item.Demo.Type };
        item.Validation       = new ValidationInfo { ToolkitTarget = item.Validation.ToolkitTarget };
    }

    private static void MergeDetail(KnowledgeItem item, KnowledgeDetail detail)
    {
        item.Problem          = detail.Problem;
        item.Solution         = detail.Solution;
        item.CodeExample      = detail.CodeExample;
        item.Tradeoffs        = detail.Tradeoffs;
        item.References       = detail.References;
        item.SelfVerification = detail.SelfVerification;
        item.ToolkitContent   = detail.ToolkitContent;
        item.Demo.Path        = detail.DemoPath;
        item.Demo.Description = detail.DemoDescription;
        item.Validation.Notes  = detail.ValidationNotes;
        item.Validation.Action = detail.ValidationAction;
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
    // Gzip + Unicode helpers (không thay đổi)
    // ─────────────────────────────────────────────────────────────────────────

    private static async Task WriteGzipAsync(string path, string content)
    {
        await using var fs    = new FileStream(path, FileMode.Create, FileAccess.Write);
        await using var gz    = new GZipStream(fs, CompressionLevel.Optimal);
        var bytes = Encoding.UTF8.GetBytes(content);
        await gz.WriteAsync(bytes);
    }

    private static async Task<string> ReadGzipAsync(string path)
    {
        await using var fs = new FileStream(path, FileMode.Open, FileAccess.Read);
        await using var gz = new GZipStream(fs, CompressionMode.Decompress);
        using var sr       = new StreamReader(gz, Encoding.UTF8);
        return await sr.ReadToEndAsync();
    }

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
                            sb.Append(char.ConvertFromUtf32(0x10000 + (code-0xD800)*0x400 + (low-0xDC00)));
                            i += 12; continue;
                        }
                    }
                    if (code >= 0x80) { sb.Append((char)code); i += 6; continue; }
                    sb.Append('\\'); sb.Append('u'); sb.Append(input, i+2, 4); i += 6; continue;
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

using System.IO.Compression;
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
        PropertyNamingPolicy         = JsonNamingPolicy.CamelCase,
        WriteIndented                = true,
        PropertyNameCaseInsensitive  = true,
        // Giữ nguyên tiếng Việt, emoji, <T>, —, &, v.v. — không escape thành \uXXXX
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
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

        // Scan .json và .json.gz, bỏ qua file bắt đầu bằng _
        var files = Directory.GetFiles(_dataPath, "*", SearchOption.AllDirectories)
            .Where(f =>
            {
                var name = Path.GetFileName(f);
                return !name.StartsWith('_')
                    && (f.EndsWith(".json", StringComparison.OrdinalIgnoreCase)
                     || f.EndsWith(".json.gz", StringComparison.OrdinalIgnoreCase));
            });

        foreach (var file in files)
        {
            try
            {
                var json = await ReadFileAsync(file);
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

    // ── Save item back to file (always as .json.gz) ─────────────────────────
    private async Task SaveItemAsync(KnowledgeItem item)
    {
        if (string.IsNullOrEmpty(item.FilePath))
            throw new InvalidOperationException($"FilePath is not set for item {item.Id}");

        var originalPath = item.FilePath;
        item.FilePath = "";

        var json = JsonSerializer.Serialize(item, JsonOpts);
        json = DecodeNonAsciiEscapes(json);

        // Luôn lưu dạng .json.gz
        var gzPath = originalPath.EndsWith(".json.gz", StringComparison.OrdinalIgnoreCase)
            ? originalPath
            : originalPath + ".gz";

        await WriteGzipAsync(gzPath, json);

        // Xoá file .json cũ nếu đang migrate
        if (originalPath != gzPath && File.Exists(originalPath))
            File.Delete(originalPath);

        item.FilePath = gzPath;
    }

    /// <summary>
    /// Giải mã \uXXXX escape sequences cho ký tự non-ASCII (>= U+0080).
    /// Giữ nguyên: \\, \", \n, \t, \r, \b, \f và \uXXXX ASCII (< 0x80).
    /// Xử lý surrogate pair (\uD800-\uDBFF + \uDC00-\uDFFF).
    /// Bug fix: \\ được xử lý trước, tránh nhầm \\uXXXX thành unicode escape.
    /// </summary>
    private static string DecodeNonAsciiEscapes(string input)
    {
        if (!input.Contains("\\u", StringComparison.Ordinal)) return input;

        var sb  = new StringBuilder(input.Length);
        int i   = 0;
        int len = input.Length;

        while (i < len)
        {
            // Bắt gặp backslash
            if (input[i] == '\\' && i + 1 < len)
            {
                var next = input[i + 1];

                // Đây là \uXXXX — kiểm tra 4 hex digits
                if (next == 'u' && i + 5 < len
                    && IsHex(input[i + 2]) && IsHex(input[i + 3])
                    && IsHex(input[i + 4]) && IsHex(input[i + 5]))
                {
                    var code = ParseHex4(input, i + 2);

                    // Surrogate pair: \uD800-\uDBFF theo sau \uDC00-\uDFFF
                    if (code is >= 0xD800 and <= 0xDBFF
                        && i + 11 < len
                        && input[i + 6] == '\\'
                        && input[i + 7] == 'u'
                        && IsHex(input[i +  8]) && IsHex(input[i +  9])
                        && IsHex(input[i + 10]) && IsHex(input[i + 11]))
                    {
                        var low = ParseHex4(input, i + 8);
                        if (low is >= 0xDC00 and <= 0xDFFF)
                        {
                            var cp = 0x10000 + (code - 0xD800) * 0x400 + (low - 0xDC00);
                            sb.Append(char.ConvertFromUtf32(cp));
                            i += 12;
                            continue;
                        }
                    }

                    // BMP non-ASCII (Vietnamese, emoji, —, etc.) → decode thành char
                    if (code >= 0x80)
                    {
                        sb.Append((char)code);
                        i += 6;
                        continue;
                    }

                    // ASCII \uXXXX (vd: " = ") → giữ nguyên dạng escape
                    sb.Append('\\');
                    sb.Append('u');
                    sb.Append(input, i + 2, 4);
                    i += 6;
                    continue;
                }

                // Mọi escape khác (\\, \", \n, \t, \r, \b, \f, \/) → copy nguyên 2 ký tự
                // Quan trọng: \\ phải xử lý ở đây để tránh \\uXXXX bị decode sai
                sb.Append('\\');
                sb.Append(next);
                i += 2;
                continue;
            }

            sb.Append(input[i]);
            i++;
        }

        return sb.ToString();
    }

    private static bool IsHex(char c)
        => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');

    private static int ParseHex4(string s, int start)
        => Convert.ToInt32(s.Substring(start, 4), 16);

    // ── Gzip helpers ──────────────────────────────────────────────────────────

    private static async Task WriteGzipAsync(string path, string content)
    {
        await using var fs = new FileStream(path, FileMode.Create, FileAccess.Write);
        await using var gz = new GZipStream(fs, CompressionLevel.Optimal);
        var bytes = Encoding.UTF8.GetBytes(content);
        await gz.WriteAsync(bytes);
    }

    private static async Task<string> ReadFileAsync(string path)
    {
        if (path.EndsWith(".json.gz", StringComparison.OrdinalIgnoreCase))
        {
            await using var fs = new FileStream(path, FileMode.Open, FileAccess.Read);
            await using var gz = new GZipStream(fs, CompressionMode.Decompress);
            using var sr = new StreamReader(gz, Encoding.UTF8);
            return await sr.ReadToEndAsync();
        }
        return await File.ReadAllTextAsync(path, Encoding.UTF8);
    }

    // ── Create new item ────────────────────────────────────────────────────
    public async Task<KnowledgeItem> CreateAsync(KnowledgeItem item)
    {
        if (string.IsNullOrEmpty(item.Id))
            item.Id = $"{item.Category}-{Guid.NewGuid():N}".ToLower();

        if (item.ResearchedAt == default)
            item.ResearchedAt = DateTime.UtcNow;

        var yearMonth = item.ResearchedAt.ToString("yyyy-MM");
        var dir = Path.Combine(_dataPath, item.Category, yearMonth);
        Directory.CreateDirectory(dir);

        var slug = item.Topic.ToLower()
            .Replace(" ", "-").Replace("/", "-")
            .Replace(".", "").Replace("(", "").Replace(")", "");
        if (slug.Length > 50) slug = slug[..50];

        // Lưu trực tiếp dạng .json.gz
        item.FilePath = Path.Combine(dir, $"{slug}.json.gz");

        await SaveItemAsync(item);
        return item;
    }
}

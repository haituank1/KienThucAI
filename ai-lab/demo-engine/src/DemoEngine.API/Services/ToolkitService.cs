using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using DemoEngine.API.Models;

namespace DemoEngine.API.Services;

public class ToolkitService(IConfiguration config, ILogger<ToolkitService> logger)
{
    // ToolkitPath đã được resolve thành absolute path trong Program.cs
    private readonly string _toolkitPath =
        config["ToolkitPath"] ?? throw new InvalidOperationException("ToolkitPath not configured");

    // Các thư mục toolkit theo thứ tự hiển thị
    private static readonly string[] ToolkitDirs =
        ["01-context", "02-rules", "03-prompts", "04-specs", "05-snippets", "06-demos", "07-agents"];

    private const string IndexFileName = "_toolkit-index.json";

    // Dùng JsonSerializerDefaults.Web → camelCase, nhất quán với API responses
    private static readonly JsonSerializerOptions JsonOpts =
        new(JsonSerializerDefaults.Web) { WriteIndented = true };

    // Precompile regex để tránh overhead mỗi lần gọi
    private static readonly Regex NonAlphanumeric = new(@"[^a-z0-9\s]", RegexOptions.Compiled);
    private static readonly Regex MultiSpace       = new(@"\s+",         RegexOptions.Compiled);

    // ── Public API ────────────────────────────────────────────────────────────

    public string GetToolkitPath() => _toolkitPath;

    /// <summary>
    /// Đọc headings (## ) từ một file toolkit.
    /// Trả về ToolkitFileInfo với list headings, size, lastModified.
    /// </summary>
    public async Task<ToolkitFileInfo> GetFileInfoAsync(string relPath)
    {
        var absPath  = ResolvePath(relPath);
        var fileName = Path.GetFileName(relPath);
        var dir      = Path.GetDirectoryName(relPath)?.Replace('\\', '/') ?? "";

        if (!File.Exists(absPath))
            return new ToolkitFileInfo { RelPath = relPath, FileName = fileName, Directory = dir, FileExists = false };

        var lines    = await File.ReadAllLinesAsync(absPath, Encoding.UTF8);
        var headings = ExtractHeadings(lines);
        var fi       = new FileInfo(absPath);

        return new ToolkitFileInfo
        {
            RelPath      = relPath,
            FileName     = fileName,
            Directory    = dir,
            FileExists   = true,
            SizeBytes    = fi.Length,
            LastModified = fi.LastWriteTimeUtc,
            Headings     = headings
        };
    }

    /// <summary>
    /// Scan toàn bộ my-ai-toolkit, trả về list tất cả .md files với headings.
    /// </summary>
    public async Task<List<ToolkitFileInfo>> GetAllFilesAsync()
    {
        if (!Directory.Exists(_toolkitPath)) return [];

        var result = new List<ToolkitFileInfo>();

        foreach (var dir in ToolkitDirs)
        {
            var dirPath = Path.Combine(_toolkitPath, dir);
            if (!Directory.Exists(dirPath)) continue;

            var mdFiles = Directory.GetFiles(dirPath, "*.md", SearchOption.AllDirectories)
                .Where(f => !Path.GetFileName(f).Equals("INDEX.md", StringComparison.OrdinalIgnoreCase))
                .OrderBy(f => f)
                .ToList();

            foreach (var file in mdFiles)
            {
                var relPath  = Path.GetRelativePath(_toolkitPath, file).Replace('\\', '/');
                var fileInfo = await GetFileInfoAsync(relPath);
                result.Add(fileInfo);
            }
        }

        return result;
    }

    /// <summary>
    /// Normalize heading text để dùng làm key trong HeadingMap.
    /// Lowercase → bỏ diacritics (bao gồm tiếng Việt) → chỉ giữ [a-z0-9 ] → collapse spaces.
    /// </summary>
    public static string NormalizeHeading(string text)
    {
        // Lowercase
        var s = text.ToLowerInvariant();
        // Decompose Unicode → strip NonSpacingMark (diacritics, Vietnamese tones, etc.)
        s = string.Concat(
            s.Normalize(NormalizationForm.FormD)
             .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
        );
        // Bỏ ký tự đặc biệt, giữ alphanumeric + space
        s = NonAlphanumeric.Replace(s, " ");
        return MultiSpace.Replace(s, " ").Trim();
    }

    /// <summary>
    /// Đọc toolkit index từ file (fast path).
    /// Nếu file chưa tồn tại hoặc đọc lỗi → tự động rebuild.
    /// </summary>
    /// <summary>
    /// Đọc toolkit index từ file (fast path).
    /// Nếu file chưa tồn tại hoặc đọc lỗi → tự động build (incremental).
    /// </summary>
    public async Task<ToolkitIndex> GetToolkitIndexAsync()
    {
        var indexPath = Path.Combine(_toolkitPath, IndexFileName);
        if (File.Exists(indexPath))
        {
            try
            {
                var json = await File.ReadAllTextAsync(indexPath, Encoding.UTF8);
                var idx  = JsonSerializer.Deserialize<ToolkitIndex>(json, JsonOpts);
                if (idx is not null) return idx;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Đọc toolkit index lỗi, tự rebuild...");
            }
        }
        // File chưa có → build lần đầu (full scan)
        return await BuildToolkitIndexAsync();
    }

    /// <summary>
    /// Scan toàn bộ toolkit, build HeadingMap, lưu vào _toolkit-index.json.
    /// Tự động gọi sau mỗi write vào toolkit file.
    /// </summary>
    /// <summary>
    /// Incremental build: load existing index → chỉ re-read files có lastModified thay đổi.
    /// Xử lý cả file mới (chưa có trong cache) và file bị xóa (tự loại khỏi kết quả).
    /// </summary>
    public async Task<ToolkitIndex> BuildToolkitIndexAsync()
    {
        // 1. Load cached index để so sánh lastModified
        var cached = await LoadCachedIndexAsync();

        // 2. List tất cả .md files hiện tại (không đọc content)
        var diskFiles = ListToolkitFiles();

        var resultFiles   = new List<ToolkitIndexFile>(diskFiles.Count);
        var totalHeadings = 0;
        var changedCount  = 0;

        // 3. Với mỗi file: reuse cache nếu chưa thay đổi, re-read nếu thay đổi
        foreach (var (relPath, absPath) in diskFiles)
        {
            var fi           = new FileInfo(absPath);
            var lastModified = fi.LastWriteTimeUtc;

            if (cached.TryGetValue(relPath, out var cachedFile) &&
                cachedFile.LastModified.HasValue               &&
                cachedFile.LastModified.Value == lastModified)
            {
                // File không đổi → reuse cached entry
                resultFiles.Add(cachedFile);
                totalHeadings += cachedFile.Headings.Count;
                continue;
            }

            // File mới hoặc đã thay đổi → re-read
            changedCount++;
            var lines    = await File.ReadAllLinesAsync(absPath, Encoding.UTF8);
            var headings = ExtractHeadings(lines)
                .Select(h => new ToolkitIndexHeading { Level = 2, Text = h.Text, LineNumber = h.LineNumber })
                .ToList();

            resultFiles.Add(new ToolkitIndexFile
            {
                RelPath      = relPath,
                FileName     = Path.GetFileName(relPath),
                Directory    = Path.GetDirectoryName(relPath)?.Replace('\\', '/') ?? "",
                SizeBytes    = fi.Length,
                LastModified = lastModified,
                FileExists   = true,
                Headings     = headings
            });
            totalHeadings += headings.Count;
        }

        var index = new ToolkitIndex
        {
            GeneratedAt   = DateTime.UtcNow,
            TotalFiles    = resultFiles.Count,
            TotalHeadings = totalHeadings,
            Files         = resultFiles
        };

        var indexPath = Path.Combine(_toolkitPath, IndexFileName);
        await File.WriteAllTextAsync(indexPath, JsonSerializer.Serialize(index, JsonOpts), Encoding.UTF8);
        logger.LogInformation(
            "Toolkit index built: {Total} files ({Changed} re-read, {Skipped} cached), {Headings} headings",
            resultFiles.Count, changedCount, resultFiles.Count - changedCount, totalHeadings);

        return index;
    }

    /// <summary>
    /// Generate preview markdown + detect duplicate heading.
    /// </summary>
    public async Task<ToolkitPreview> GeneratePreviewAsync(KnowledgeItem item)
    {
        var targetRel = item.Validation.ToolkitTarget;
        if (string.IsNullOrWhiteSpace(targetRel))
            throw new InvalidOperationException("toolkitTarget chưa được set cho item này.");

        var targetAbs = ResolvePath(targetRel);

        // Dùng toolkitContent nếu AI đã điền sẵn, ngược lại auto-generate
        var content = !string.IsNullOrWhiteSpace(item.ToolkitContent)
            ? item.ToolkitContent.Trim() + "\n\n---"
            : FormatMarkdown(item);

        // Kiểm tra duplicate heading trong file đích
        var fileExists         = File.Exists(targetAbs);
        var lineCount          = 0;
        var hasDuplicate       = false;
        var dupWarning         = "";
        var conflictingHeading = "";
        var existingHeadings   = new List<ToolkitHeading>();

        if (fileExists)
        {
            var existingLines = await File.ReadAllLinesAsync(targetAbs, Encoding.UTF8);
            lineCount        = existingLines.Length;
            existingHeadings = ExtractHeadings(existingLines);

            // Tìm heading trong toolkitContent trùng với heading trong file
            var contentHeading = ExtractFirstHeading(content);
            if (!string.IsNullOrEmpty(contentHeading))
            {
                var conflict = existingHeadings.FirstOrDefault(h =>
                    h.Text.Equals(contentHeading, StringComparison.OrdinalIgnoreCase));
                if (conflict is not null)
                {
                    hasDuplicate       = true;
                    conflictingHeading = conflict.Text;
                    dupWarning         = $"⚠️ Heading \"## {conflictingHeading}\" đã tồn tại ở dòng {conflict.LineNumber}. Chọn \"Replace\" để thay thế, hoặc \"Append\" để giữ cả hai.";
                }
            }
            else
            {
                // Fallback: tìm keyword trong shortTitle
                var shortTitle = ExtractShortTitle(item.Topic);
                if (existingHeadings.Any(h => h.Text.Contains(shortTitle, StringComparison.OrdinalIgnoreCase)))
                {
                    hasDuplicate = true;
                    dupWarning   = $"⚠️ File có thể đã chứa nội dung về \"{shortTitle}\". Kiểm tra trước khi lưu.";
                }
            }
        }

        logger.LogInformation("Preview generated for {Topic} → {Target}", item.Topic, targetRel);

        return new ToolkitPreview
        {
            TargetRelPath     = targetRel,
            TargetAbsPath     = targetAbs,
            Content           = content,
            FileExists        = fileExists,
            HasDuplicate      = hasDuplicate,
            DuplicateWarning  = dupWarning,
            ConflictingHeading = conflictingHeading,
            ExistingLineCount = lineCount,
            ExistingHeadings  = existingHeadings
        };
    }

    /// <summary>
    /// Append content vào cuối file.
    /// TargetAbsPath từ client bị IGNORE — backend luôn resolve từ TargetRelPath để bảo mật.
    /// </summary>
    public async Task<MergeResult> MergeAsync(MergeToToolkitRequest req)
    {
        try
        {
            // LUÔN resolve absPath từ relPath — không trust client-side absPath
            var absPath = ResolvePath(req.TargetRelPath);
            var dir = Path.GetDirectoryName(absPath);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

            var content = "\n" + req.Content.TrimStart('\n');
            await File.AppendAllTextAsync(absPath, content, Encoding.UTF8);

            logger.LogInformation("Appended to toolkit: {Path}", req.TargetRelPath);
            await RegenerateIndexIfNeeded(req.TargetRelPath);

            return new MergeResult
            {
                Success       = true,
                Message       = $"Đã append vào {req.TargetRelPath}.",
                TargetRelPath = req.TargetRelPath
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Append failed for {Path}", req.TargetRelPath);
            return new MergeResult { Success = false, Message = $"Lỗi: {ex.Message}" };
        }
    }

    /// <summary>
    /// Tìm section "## headingText" trong file và thay thế bằng newContent.
    /// Nếu heading không tìm thấy → append xuống cuối.
    /// absPath bị IGNORE — luôn resolve từ relPath để bảo mật.
    /// </summary>
    public async Task<MergeResult> ReplaceSectionAsync(string absPathIgnored, string relPath, string headingText, string newContent)
    {
        try
        {
            // LUÔN resolve từ relPath
            var absPath = ResolvePath(relPath);
            var dir = Path.GetDirectoryName(absPath);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

            if (!File.Exists(absPath))
            {
                // File chưa tồn tại → tạo mới (giống append)
                await File.WriteAllTextAsync(absPath, newContent.TrimEnd() + "\n", Encoding.UTF8);
                logger.LogInformation("Created new file for replace: {Path}", relPath);
                await RegenerateIndexIfNeeded(relPath);
                return new MergeResult { Success = true, Message = $"Đã tạo mới {relPath}.", TargetRelPath = relPath };
            }

            var lines       = await File.ReadAllLinesAsync(absPath, Encoding.UTF8);
            var normalized  = headingText.Trim();

            // Tìm dòng bắt đầu section
            int startIdx = -1;
            for (int i = 0; i < lines.Length; i++)
            {
                if (lines[i].StartsWith("## ", StringComparison.Ordinal) &&
                    lines[i][3..].Trim().Equals(normalized, StringComparison.OrdinalIgnoreCase))
                {
                    startIdx = i;
                    break;
                }
            }

            if (startIdx < 0)
            {
                // Heading không tìm thấy → append
                logger.LogWarning("Heading '{Heading}' not found in {Path}, falling back to append", normalized, relPath);
                var fallbackContent = "\n" + newContent.TrimStart('\n');
                await File.AppendAllTextAsync(absPath, fallbackContent, Encoding.UTF8);
                await RegenerateIndexIfNeeded(relPath);
                return new MergeResult { Success = true, Message = $"Heading không tìm thấy — đã append vào {relPath}.", TargetRelPath = relPath };
            }

            // Tìm dòng bắt đầu section tiếp theo (hoặc EOF)
            int endIdx = lines.Length;
            for (int i = startIdx + 1; i < lines.Length; i++)
            {
                if (lines[i].StartsWith("## ", StringComparison.Ordinal))
                {
                    endIdx = i;
                    break;
                }
            }

            // Rebuild file: phần trước section + content mới + phần sau section
            var before      = lines[..startIdx];
            var after       = endIdx < lines.Length ? lines[endIdx..] : Array.Empty<string>();
            var newLines    = new List<string>();

            newLines.AddRange(before);

            // Đảm bảo có blank line trước section mới nếu cần
            if (newLines.Count > 0 && !string.IsNullOrWhiteSpace(newLines[^1]))
                newLines.Add("");

            // Thêm content mới (split thành lines)
            var newContentLines = newContent.Trim().Split('\n');
            newLines.AddRange(newContentLines);

            // Đảm bảo có blank line sau section nếu còn phần tiếp
            if (after.Length > 0)
            {
                if (newLines.Count > 0 && !string.IsNullOrWhiteSpace(newLines[^1]))
                    newLines.Add("");
                newLines.AddRange(after);
            }

            await File.WriteAllTextAsync(absPath, string.Join('\n', newLines) + "\n", Encoding.UTF8);
            logger.LogInformation("Replaced section '{Heading}' in {Path}", normalized, relPath);
            await RegenerateIndexIfNeeded(relPath);

            return new MergeResult
            {
                Success       = true,
                Message       = $"Đã replace section \"## {normalized}\" trong {relPath}.",
                TargetRelPath = relPath
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Replace section failed for {Path}", relPath);
            return new MergeResult { Success = false, Message = $"Lỗi khi replace: {ex.Message}" };
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private string ResolvePath(string relPath) =>
        Path.GetFullPath(Path.Combine(_toolkitPath, relPath.Replace('/', Path.DirectorySeparatorChar)));

    private static List<ToolkitHeading> ExtractHeadings(string[] lines) =>
        lines
            .Select((line, idx) => (line, idx))
            .Where(x => x.line.StartsWith("## ", StringComparison.Ordinal))
            .Select(x => new ToolkitHeading { Text = x.line[3..].Trim(), LineNumber = x.idx + 1 })
            .ToList();

    /// <summary>
    /// List tất cả .md files trong toolkit (không đọc content).
    /// Tách biệt với GetAllFilesAsync() để incremental build chỉ đọc file khi cần.
    /// </summary>
    private List<(string RelPath, string AbsPath)> ListToolkitFiles()
    {
        var result = new List<(string, string)>();
        foreach (var dir in ToolkitDirs)
        {
            var dirPath = Path.Combine(_toolkitPath, dir);
            if (!Directory.Exists(dirPath)) continue;

            var mdFiles = Directory.GetFiles(dirPath, "*.md", SearchOption.AllDirectories)
                .Where(f => !Path.GetFileName(f).Equals("INDEX.md", StringComparison.OrdinalIgnoreCase))
                .OrderBy(f => f);

            foreach (var abs in mdFiles)
            {
                var rel = Path.GetRelativePath(_toolkitPath, abs).Replace('\\', '/');
                result.Add((rel, abs));
            }
        }
        return result;
    }

    /// <summary>
    /// Load existing index từ file, trả về dict relPath → ToolkitIndexFile.
    /// Dùng cho incremental build để so sánh lastModified.
    /// </summary>
    private async Task<Dictionary<string, ToolkitIndexFile>> LoadCachedIndexAsync()
    {
        var indexPath = Path.Combine(_toolkitPath, IndexFileName);
        if (!File.Exists(indexPath)) return [];
        try
        {
            var json     = await File.ReadAllTextAsync(indexPath, Encoding.UTF8);
            var existing = JsonSerializer.Deserialize<ToolkitIndex>(json, JsonOpts);
            if (existing?.Files is null) return [];

            // Schema guard: nếu bất kỳ entry nào thiếu FileName → schema cũ → full rebuild
            if (existing.Files.Any(f => string.IsNullOrEmpty(f.FileName)))
            {
                logger.LogInformation("Cached index schema outdated (missing FileName), triggering full rebuild");
                return [];
            }

            return existing.Files.ToDictionary(f => f.RelPath);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Đọc cached index lỗi, sẽ full rebuild");
            return [];
        }
    }

    /// <summary>Lấy text của heading đầu tiên (## ...) trong content string.</summary>
    private static string ExtractFirstHeading(string content)
    {
        foreach (var line in content.Split('\n'))
        {
            var trimmed = line.TrimStart();
            if (trimmed.StartsWith("## ", StringComparison.Ordinal))
                return trimmed[3..].Trim();
        }
        return "";
    }

    private async Task RegenerateIndexIfNeeded(string relPath)
    {
        // Luôn rebuild JSON index sau mỗi write — bất kể file nào thay đổi
        await BuildToolkitIndexAsync();

        // Rebuild INDEX.md riêng cho 05-snippets
        if (relPath.StartsWith("05-snippets/", StringComparison.OrdinalIgnoreCase))
        {
            await RegenerateSnippetsIndexAsync();
            logger.LogInformation("Regenerated 05-snippets/INDEX.md");
        }
    }

    // ── INDEX.md regeneration ─────────────────────────────────────────────────

    private async Task RegenerateSnippetsIndexAsync()
    {
        var snippetsPath = Path.Combine(_toolkitPath, "05-snippets");
        if (!Directory.Exists(snippetsPath)) return;

        var sb = new StringBuilder();
        sb.AppendLine("# 05-Snippets — Index");
        sb.AppendLine("> **Auto-generated bởi DemoEngine** khi validate knowledge mới.");
        sb.AppendLine("> Đọc file này trước để biết có gì, rồi AI tự navigate đến file cần thiết.");
        sb.AppendLine($"> Last updated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
        sb.AppendLine();
        sb.AppendLine("---");
        sb.AppendLine();
        sb.AppendLine("## Cách dùng với AI");
        sb.AppendLine();
        sb.AppendLine("Paste file này vào đầu session:");
        sb.AppendLine("> \"Xem snippets index: [paste INDEX.md]. Khi tôi hỏi về X, hãy đọc file liên quan trước khi trả lời.\"");
        sb.AppendLine();
        sb.AppendLine("Hoặc trong CLAUDE.md của project:");
        sb.AppendLine("```");
        sb.AppendLine("Snippets: my-ai-toolkit/05-snippets/INDEX.md — đọc index trước, pull file cần thiết.");
        sb.AppendLine("```");
        sb.AppendLine();
        sb.AppendLine("---");
        sb.AppendLine();

        var totalFiles    = 0;
        var totalSections = 0;
        var categorySummary = new List<(string cat, int files, int sections)>();

        foreach (var subDir in Directory.GetDirectories(snippetsPath).OrderBy(d => d))
        {
            var subName = Path.GetFileName(subDir);
            var mdFiles = Directory.GetFiles(subDir, "*.md").OrderBy(f => f).ToList();
            if (mdFiles.Count == 0) continue;

            sb.AppendLine($"## {subName}/");
            sb.AppendLine();
            sb.AppendLine("| File | Sections | Dùng khi |");
            sb.AppendLine("|------|---------|---------|");

            var catSections = 0;
            foreach (var file in mdFiles)
            {
                var fileName = Path.GetFileName(file);
                var lines    = await File.ReadAllLinesAsync(file, Encoding.UTF8);
                var sections = ExtractHeadings(lines);
                catSections    += sections.Count;
                totalSections  += sections.Count;
                totalFiles++;

                var sectionsStr = sections.Count > 0
                    ? string.Join(", ", sections.Select(s => s.Text.Length > 40 ? s.Text[..40] + "…" : s.Text))
                    : "—";
                var whenToUse = InferWhenToUse(subName, fileName);
                sb.AppendLine($"| [{fileName}]({subName}/{fileName}) | {sectionsStr} | {whenToUse} |");
            }

            categorySummary.Add((subName, mdFiles.Count, catSections));
            sb.AppendLine();
        }

        sb.AppendLine("---");
        sb.AppendLine();
        sb.AppendLine("## Thống kê");
        sb.AppendLine();
        sb.AppendLine("| Category | Files | Tổng sections |");
        sb.AppendLine("|----------|-------|--------------|");
        foreach (var (cat, files, sections) in categorySummary)
            sb.AppendLine($"| {cat} | {files} | {sections} |");
        sb.AppendLine($"| **Total** | **{totalFiles}** | **{totalSections}** |");

        var indexPath = Path.Combine(snippetsPath, "INDEX.md");
        await File.WriteAllTextAsync(indexPath, sb.ToString(), Encoding.UTF8);
    }

    // ── Formatter (fallback khi toolkitContent chưa điền) ────────────────────

    private static string FormatMarkdown(KnowledgeItem item)
    {
        var sb   = new StringBuilder();
        var date = (item.ValidatedAt ?? DateTime.UtcNow).ToString("yyyy-MM-dd");
        var conf = Math.Round(item.Confidence * 100);

        sb.AppendLine($"## {item.Topic}");
        sb.AppendLine($"> {date} · {conf}%");
        sb.AppendLine();

        if (!string.IsNullOrWhiteSpace(item.Summary))
            sb.AppendLine(FirstSentence(item.Summary)).AppendLine();

        if (!string.IsNullOrWhiteSpace(item.CodeExample))
            sb.AppendLine(item.CodeExample.Trim()).AppendLine();

        var warnings = item.Tradeoffs
            .Where(t => t.StartsWith("⚠️") || t.StartsWith("❌"))
            .ToList();
        if (warnings.Count > 0)
            sb.AppendLine(string.Join(" · ", warnings)).AppendLine();

        if (!string.IsNullOrWhiteSpace(item.Validation.Notes))
            sb.AppendLine($"**Note:** {item.Validation.Notes.Trim()}").AppendLine();

        sb.AppendLine("---");
        return sb.ToString();
    }

    private static string FirstSentence(string text)
    {
        var dot = text.IndexOf('.', StringComparison.Ordinal);
        return dot > 0 && dot < 150 ? text[..(dot + 1)] : (text.Length > 150 ? text[..150] + "…" : text);
    }

    private static string ExtractShortTitle(string topic)
    {
        var separators = new[] { " — ", " – ", " / ", ": " };
        foreach (var sep in separators)
        {
            var idx = topic.IndexOf(sep, StringComparison.OrdinalIgnoreCase);
            if (idx > 0) return topic[..idx].Trim();
        }
        return topic.Length > 30 ? topic[..30] : topic;
    }

    private static string InferWhenToUse(string category, string fileName) => (category, fileName) switch
    {
        ("dotnet", "ef-core-patterns.md")      => "EF Core query, ORM pattern, performance",
        ("dotnet", "gotchas.md")               => "Debug lỗi lạ, review code, production issue",
        ("dotnet", "async-patterns.md")        => "Concurrency, pipeline, retry, background job",
        ("dotnet", "performance-patterns.md")  => "Memory optimization, hot path, export lớn",
        ("postgresql", "query-patterns.md")    => "Query design, pagination, reporting, job queue",
        ("postgresql", "index-patterns.md")    => "Index strategy, performance tuning, production",
        ("postgresql", "gotchas.md")           => "Debug query chậm, data inconsistency",
        ("redis", "patterns.md")               => "Cache strategy, distributed lock, rate limit",
        ("rabbitmq", "patterns.md")            => "Message queue, event-driven, reliability",
        _                                       => category
    };
}

using System.Text;
using System.Text.RegularExpressions;
using DemoEngine.API.Models;

namespace DemoEngine.API.Services;

public class ToolkitService(IConfiguration config, ILogger<ToolkitService> logger)
{
    // ToolkitPath đã được resolve thành absolute path trong Program.cs
    private readonly string _toolkitPath =
        config["ToolkitPath"] ?? throw new InvalidOperationException("ToolkitPath not configured");

    // ── Public API ────────────────────────────────────────────────────────────

    public async Task<ToolkitPreview> GeneratePreviewAsync(KnowledgeItem item)
    {
        var targetRel = item.Validation.ToolkitTarget;
        if (string.IsNullOrWhiteSpace(targetRel))
            throw new InvalidOperationException("toolkitTarget chưa được set cho item này.");

        var targetAbs = Path.GetFullPath(
            Path.Combine(_toolkitPath, targetRel.Replace('/', Path.DirectorySeparatorChar)));

        var content = FormatMarkdown(item);

        // Kiểm tra duplicate heading trong file đích
        var fileExists   = File.Exists(targetAbs);
        var lineCount    = 0;
        var hasDuplicate = false;
        var dupWarning   = "";

        if (fileExists)
        {
            var existing = await File.ReadAllTextAsync(targetAbs);
            lineCount = existing.Split('\n').Length;

            // Tìm heading tương tự (so sánh title rút gọn)
            var shortTitle = ExtractShortTitle(item.Topic);
            if (existing.Contains(shortTitle, StringComparison.OrdinalIgnoreCase))
            {
                hasDuplicate = true;
                dupWarning = $"⚠️ File đã chứa nội dung với từ khoá \"{shortTitle}\". Kiểm tra kỹ trước khi append để tránh trùng lặp.";
            }
        }

        logger.LogInformation("Preview generated for {Topic} → {Target}", item.Topic, targetRel);

        return new ToolkitPreview
        {
            TargetRelPath    = targetRel,
            TargetAbsPath    = targetAbs,
            Content          = content,
            FileExists       = fileExists,
            HasDuplicate     = hasDuplicate,
            DuplicateWarning = dupWarning,
            ExistingLineCount = lineCount
        };
    }

    public async Task<MergeResult> MergeAsync(MergeToToolkitRequest req)
    {
        try
        {
            var dir = Path.GetDirectoryName(req.TargetAbsPath);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

            var content = "\n" + req.Content.TrimStart('\n');
            await File.AppendAllTextAsync(req.TargetAbsPath, content, Encoding.UTF8);

            logger.LogInformation("Merged to toolkit: {Path}", req.TargetRelPath);

            // Nếu target là 05-snippets/ → regenerate INDEX.md
            if (req.TargetRelPath.StartsWith("05-snippets/", StringComparison.OrdinalIgnoreCase))
            {
                await RegenerateSnippetsIndexAsync();
                logger.LogInformation("Regenerated 05-snippets/INDEX.md");
            }

            return new MergeResult
            {
                Success       = true,
                Message       = $"Đã append vào {req.TargetRelPath}. INDEX.md đã được cập nhật.",
                TargetRelPath = req.TargetRelPath
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Merge failed for {Path}", req.TargetRelPath);
            return new MergeResult { Success = false, Message = $"Lỗi: {ex.Message}" };
        }
    }

    public string GetToolkitPath() => _toolkitPath;

    // ── INDEX.md regeneration ─────────────────────────────────────────────────

    /// <summary>
    /// Scan toàn bộ 05-snippets/, đọc ## headings từ mỗi file,
    /// rebuild INDEX.md với bảng đầy đủ.
    /// </summary>
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

        // Scan từng subfolder
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
                var sections = await ExtractSectionTitlesAsync(file);
                catSections += sections.Count;
                totalSections += sections.Count;
                totalFiles++;

                var sectionsStr = sections.Count > 0
                    ? string.Join(", ", sections.Select(s => s.Length > 40 ? s[..40] + "…" : s))
                    : "—";

                // Dùng khi: ghép tags từ tên file
                var whenToUse = InferWhenToUse(subName, fileName);

                sb.AppendLine($"| [{fileName}]({subName}/{fileName}) | {sectionsStr} | {whenToUse} |");
            }

            categorySummary.Add((subName, mdFiles.Count, catSections));
            sb.AppendLine();
        }

        // Bảng thống kê
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

    private static async Task<List<string>> ExtractSectionTitlesAsync(string filePath)
    {
        var lines = await File.ReadAllLinesAsync(filePath);
        return lines
            .Where(l => l.StartsWith("## ", StringComparison.Ordinal))
            .Select(l => l[3..].Trim())
            // Bỏ số thứ tự ở đầu (vd: "1. Projection" → "Projection")
            .Select(s => Regex.Replace(s, @"^\d+\.\s*", ""))
            .ToList();
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

    // ── Formatter — compact, token-efficient ─────────────────────────────────

    private static string FormatMarkdown(KnowledgeItem item)
    {
        var sb   = new StringBuilder();
        var date = (item.ValidatedAt ?? DateTime.UtcNow).ToString("yyyy-MM-dd");
        var conf = Math.Round(item.Confidence * 100);

        // Heading + metadata compact (1 dòng)
        sb.AppendLine($"## {item.Topic}");
        sb.AppendLine($"> {date} · {conf}%");
        sb.AppendLine();

        // Summary — 1 câu, không lặp lại heading
        if (!string.IsNullOrWhiteSpace(item.Summary))
        {
            var summary = TruncateSentence(item.Summary.Trim(), 120);
            sb.AppendLine(summary);
            sb.AppendLine();
        }

        // Khi dùng — chỉ lấy câu đầu tiên nếu dài
        if (!string.IsNullOrWhiteSpace(item.Problem))
        {
            var problem = TruncateSentence(item.Problem.Trim(), 100);
            sb.AppendLine($"**Khi dùng:** {problem}");
            sb.AppendLine();
        }

        // Code example — giữ nguyên (code là phần quan trọng nhất)
        if (!string.IsNullOrWhiteSpace(item.CodeExample))
        {
            sb.AppendLine(item.CodeExample.Trim());
            sb.AppendLine();
        }

        // Trade-offs — gộp thành 1 dòng thay vì list dài
        if (item.Tradeoffs.Count > 0)
        {
            sb.AppendLine(string.Join(" · ", item.Tradeoffs));
            sb.AppendLine();
        }

        // Validation notes — chỉ khi có nội dung thực sự
        if (!string.IsNullOrWhiteSpace(item.Validation.Notes))
        {
            sb.AppendLine($"**Note:** {item.Validation.Notes.Trim()}");
            sb.AppendLine();
        }

        // References — chỉ title, không URL (tiết kiệm token)
        if (item.References.Count > 0)
        {
            var refs = item.References.Select(r => r.Title).Where(t => !string.IsNullOrWhiteSpace(t));
            sb.AppendLine($"**Ref:** {string.Join(", ", refs)}");
            sb.AppendLine();
        }

        sb.AppendLine("---");
        return sb.ToString();
    }

    // Cắt đến câu hoàn chỉnh gần nhất nếu dài hơn maxLen
    private static string TruncateSentence(string text, int maxLen)
    {
        if (text.Length <= maxLen) return text;
        var dot = text.IndexOf('.', maxLen / 2);
        return dot > 0 && dot < maxLen ? text[..(dot + 1)] : text[..maxLen] + "…";
    }

    private static string ExtractShortTitle(string topic)
    {
        // Lấy phần trước dấu "—", "/", ":" để so sánh
        var separators = new[] { " — ", " – ", " / ", ": " };
        foreach (var sep in separators)
        {
            var idx = topic.IndexOf(sep, StringComparison.OrdinalIgnoreCase);
            if (idx > 0) return topic[..idx].Trim();
        }
        // Nếu không có separator, lấy 30 ký tự đầu
        return topic.Length > 30 ? topic[..30] : topic;
    }
}

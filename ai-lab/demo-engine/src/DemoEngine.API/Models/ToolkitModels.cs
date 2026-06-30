namespace DemoEngine.API.Models;

// ── Preview / Merge ──────────────────────────────────────────────────────────

public class ToolkitPreview
{
    /// <summary>Path tương đối trong my-ai-toolkit, vd: "05-snippets/dotnet/ef-core-patterns.md"</summary>
    public string TargetRelPath { get; init; } = "";

    /// <summary>Absolute path đến file trong my-ai-toolkit</summary>
    public string TargetAbsPath { get; init; } = "";

    /// <summary>Markdown content sẽ được append/replace</summary>
    public string Content { get; init; } = "";

    /// <summary>File đích đã tồn tại chưa</summary>
    public bool FileExists { get; init; }

    /// <summary>Phát hiện heading trùng trong file đích</summary>
    public bool HasDuplicate { get; init; }

    /// <summary>Mô tả duplicate nếu có</summary>
    public string DuplicateWarning { get; init; } = "";

    /// <summary>Heading trùng (text) nếu phát hiện được — dùng để pre-fill Replace action</summary>
    public string ConflictingHeading { get; init; } = "";

    /// <summary>Số dòng hiện tại của file đích</summary>
    public int ExistingLineCount { get; init; }

    /// <summary>Danh sách ## headings hiện có trong file đích</summary>
    public List<ToolkitHeading> ExistingHeadings { get; init; } = [];
}

/// <summary>
/// Dùng class thay vì positional record để System.Text.Json có thể xử lý
/// optional fields (Action, HeadingToReplace) với default values đúng.
/// </summary>
public class MergeToToolkitRequest
{
    public string TargetAbsPath    { get; init; } = "";  // Ignored — backend resolves from TargetRelPath
    public string TargetRelPath    { get; init; } = "";
    public string Content          { get; init; } = "";
    public string Action           { get; init; } = "append";  // append | replace | skip
    public string HeadingToReplace { get; init; } = "";         // chỉ cần khi action = "replace"
}

public class MergeResult
{
    public bool   Success       { get; init; }
    public string Message       { get; init; } = "";
    public string TargetRelPath { get; init; } = "";
}

// ── Toolkit Explorer ─────────────────────────────────────────────────────────

/// <summary>Một ## heading trong file toolkit</summary>
public class ToolkitHeading
{
    /// <summary>Heading text (không có "## " prefix)</summary>
    public string Text       { get; init; } = "";

    /// <summary>Số dòng trong file (1-based)</summary>
    public int    LineNumber { get; init; }
}

/// <summary>Thông tin một file .md trong toolkit kèm danh sách headings</summary>
public class ToolkitFileInfo
{
    public string              RelPath      { get; init; } = "";
    public string              FileName     { get; init; } = "";
    public string              Directory    { get; init; } = "";
    public bool                FileExists   { get; init; }
    public long                SizeBytes    { get; init; }
    public DateTime?           LastModified { get; init; }
    public List<ToolkitHeading> Headings    { get; init; } = [];
}

// ── Toolkit Index (JSON snapshot của toàn bộ headings) ────────────────────────

/// <summary>
/// Snapshot toàn bộ ## headings trong my-ai-toolkit.
/// Lưu tại my-ai-toolkit/_toolkit-index.json.
///
/// Design: files[] làm primary source — không lưu headingMap vào JSON.
/// headingMap được derive tại JS runtime từ files[] (O(N), một lần khi load).
/// Incremental build: mỗi file chỉ re-read khi lastModified thay đổi.
/// </summary>
public class ToolkitIndex
{
    public DateTime            GeneratedAt   { get; init; }
    public int                 TotalFiles    { get; init; }
    public int                 TotalHeadings { get; init; }
    public List<ToolkitIndexFile> Files      { get; init; } = [];
}

/// <summary>
/// Thông tin một file .md trong index.
/// Field names khớp với ToolkitFileInfo để Toolkit Explorer dùng được trực tiếp.
/// </summary>
public class ToolkitIndexFile
{
    public string                    RelPath      { get; init; } = "";
    public string                    FileName     { get; init; } = "";  // Path.GetFileName(relPath)
    public string                    Directory    { get; init; } = "";  // parent folder (relative)
    public long                      SizeBytes    { get; init; }
    public DateTime?                 LastModified { get; init; }         // UTC — dùng để incremental build
    public bool                      FileExists   { get; init; }
    public List<ToolkitIndexHeading> Headings     { get; init; } = [];
}

/// <summary>
/// Một ## heading trong file.
/// Không lưu normalized — derive tại JS runtime để tránh duplicate data.
/// LineNumber khớp với ToolkitHeading để Toolkit Explorer dùng được trực tiếp.
/// </summary>
public class ToolkitIndexHeading
{
    public int    Level      { get; init; }
    public string Text       { get; init; } = "";
    public int    LineNumber { get; init; }
}

// ── Full-text content search ───────────────────────────────────────────────────

public class ContentSearchResult
{
    public string                    RelPath   { get; init; } = "";
    public string                    FileName  { get; init; } = "";
    public string                    Directory { get; init; } = "";
    public List<ContentSearchMatch>  Matches   { get; init; } = [];
}

public class ContentSearchMatch
{
    public int    LineNumber { get; init; }
    public string LineText   { get; init; } = "";
}

// ── Section content (diff view) ───────────────────────────────────────────────

/// <summary>Nội dung của một ## section trong file toolkit — dùng cho diff view khi Replace.</summary>
public class SectionContent
{
    public string RelPath     { get; init; } = "";
    public string HeadingText { get; init; } = "";
    public string Content     { get; init; } = "";  // toàn bộ section markdown (bao gồm heading)
    public int    LineStart   { get; init; }
    public int    LineEnd     { get; init; }
    public bool   Found       { get; init; }
}

// ── Cross-reference (Feature: related knowledge items) ───────────────────────

/// <summary>
/// Một knowledge item liên quan — trả về khi query cross-references.
/// Score tính theo: tag overlap ×2 + same category +2 + same subcategory +1.
/// </summary>
public class RelatedKnowledgeItem
{
    public string       Id           { get; init; } = "";
    public string       Topic        { get; init; } = "";
    public string       Category     { get; init; } = "";
    public string       Subcategory  { get; init; } = "";
    public List<string> Tags         { get; init; } = [];
    public string       Status       { get; init; } = "";
    public int          Score        { get; init; }           // overlap score
    public List<string> CommonTags   { get; init; } = [];     // tags trùng nhau
}

// ── Session Starter Generator (Feature 2) ────────────────────────────────────

/// <summary>Session starter prompt được generate từ toolkit content.</summary>
public class SessionStarter
{
    public string             Type    { get; init; } = "";   // debug | feature | refactor | schema
    public string             Prompt  { get; init; } = "";   // assembled prompt text
    public List<StarterSource> Sources { get; init; } = [];  // sections đã được dùng
}

public class StarterSource
{
    public string RelPath     { get; init; } = "";
    public string HeadingText { get; init; } = "";
    public int    LineNumber  { get; init; }
}

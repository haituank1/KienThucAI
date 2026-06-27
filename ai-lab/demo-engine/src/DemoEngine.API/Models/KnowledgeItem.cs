using System.Text.Json.Serialization;

namespace DemoEngine.API.Models;

public class KnowledgeItem
{
    public string Id { get; set; } = "";
    public string Topic { get; set; } = "";
    public string Category { get; set; } = "";
    public string Subcategory { get; set; } = "";
    public List<string> Tags { get; set; } = [];
    public string Difficulty { get; set; } = "intermediate";
    public string Relevance { get; set; } = "medium";
    public string Status { get; set; } = "pending_review";
    public double Confidence { get; set; }
    public DateTime ResearchedAt { get; set; }
    public DateTime? ValidatedAt { get; set; }
    public string? ValidatedBy { get; set; }
    public string Summary { get; set; } = "";
    public string Problem { get; set; } = "";
    public string Solution { get; set; } = "";
    public string CodeExample { get; set; } = "";
    public List<string> Tradeoffs { get; set; } = [];
    public List<Reference> References { get; set; } = [];
    public SelfVerification SelfVerification { get; set; } = new();
    public DemoInfo Demo { get; set; } = new();
    public ValidationInfo Validation { get; set; } = new();

    /// <summary>
    /// Nội dung sẽ append vào toolkit khi validate.
    /// AI điền sẵn khi research. Nếu rỗng → auto-generate khi cần.
    /// </summary>
    public string ToolkitContent { get; set; } = "";

    /// <summary>
    /// Số ngày sau khi validate thì item bị đánh dấu stale (cần review lại).
    /// Default 180. Dùng 90 cho AI/tools (thay đổi nhanh), 365 cho stable patterns.
    /// </summary>
    public int StaleAfterDays { get; set; } = 180;

    /// <summary>
    /// Phiên bản tech tương ứng. Vd: { "dotnet": "8+", "efcore": "8+", "postgres": "15+" }
    /// AI điền khi research. Dùng để filter và biết khi nào cần review lại.
    /// </summary>
    public Dictionary<string, string> TechVersions { get; set; } = new();

    /// <summary>
    /// File trong my-ai-toolkit mà item đã được merge vào sau khi validate.
    /// Vd: "05-snippets/dotnet/ef-core-patterns.md"
    /// </summary>
    public string? MergedIntoFile { get; set; }

    /// <summary>Thời điểm merge vào toolkit.</summary>
    public DateTime? MergedAt { get; set; }

    // Computed — not stored in JSON
    [JsonIgnore]
    public string FilePath { get; set; } = "";
}

public class Reference
{
    public string Title { get; set; } = "";
    public string Url { get; set; } = "";
}

public class SelfVerification
{
    public bool Verified { get; set; }
    public string Method { get; set; } = "";
    public string Caveats { get; set; } = "";
}

public class DemoInfo
{
    public bool Exists { get; set; }
    public string Type { get; set; } = "backend"; // backend | frontend
    public string Path { get; set; } = "";
    public string Description { get; set; } = "";
}

public class ValidationInfo
{
    public string Notes { get; set; } = "";
    public string ToolkitTarget { get; set; } = "";
    public string Action { get; set; } = "append";
}

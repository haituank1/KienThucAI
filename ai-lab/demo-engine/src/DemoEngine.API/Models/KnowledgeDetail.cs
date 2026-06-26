namespace DemoEngine.API.Models;

/// <summary>
/// Heavy fields — chỉ load khi user mở detail view.
/// Lưu trong .detail.json.gz cạnh .json meta file.
/// </summary>
public class KnowledgeDetail
{
    public string Problem         { get; set; } = "";
    public string Solution        { get; set; } = "";
    public string CodeExample     { get; set; } = "";
    public List<string> Tradeoffs { get; set; } = [];
    public List<Reference> References        { get; set; } = [];
    public SelfVerification SelfVerification { get; set; } = new();
    public string DemoPath        { get; set; } = "";
    public string DemoDescription { get; set; } = "";
    public string ValidationNotes  { get; set; } = "";
    public string ValidationAction { get; set; } = "append";

    /// <summary>
    /// Nội dung markdown sẽ được append vào toolkit khi validate.
    /// AI điền sẵn khi research — compact, token-efficient, actionable.
    /// Nếu rỗng → ToolkitService tự generate từ các fields trên.
    /// Format: heading + code + warnings only (không cần ✅ pros).
    /// </summary>
    public string ToolkitContent { get; set; } = "";
}

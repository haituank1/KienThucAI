namespace DemoEngine.API.Models;

/// <summary>
/// Research queue item — topic cần AI nghiên cứu.
/// Lưu trong data/_queue.json
/// </summary>
public class QueueItem
{
    public string   Id            { get; set; } = "";
    public string   Topic         { get; set; } = "";
    public string   Category      { get; set; } = "";
    public string   Priority      { get; set; } = "medium"; // high | medium | low
    public string   Notes         { get; set; } = "";
    public string   Status        { get; set; } = "pending"; // pending | in-progress | done
    public DateTime AddedAt       { get; set; } = DateTime.UtcNow;
    public string?  LinkedItemId  { get; set; } // ID của KnowledgeItem sau khi done
}

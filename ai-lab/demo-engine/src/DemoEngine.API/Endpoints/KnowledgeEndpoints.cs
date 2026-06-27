using DemoEngine.API.Models;
using DemoEngine.API.Services;

namespace DemoEngine.API.Endpoints;

public static class KnowledgeEndpoints
{
    public static void MapKnowledgeEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/knowledge");

        // GET /api/knowledge?category=&status=&search=
        group.MapGet("", async (string? category, string? status, string? search, KnowledgeService svc) =>
        {
            var items = await svc.GetAllAsync(category, status, search);
            var list = items.Select(i => new
            {
                i.Id, i.Topic, i.Category, i.Subcategory, i.Tags,
                i.Difficulty, i.Relevance, i.Status, i.Confidence,
                i.ResearchedAt, i.ValidatedAt, i.Summary,
                HasDemo       = i.Demo.Exists,
                DemoType      = i.Demo.Type,
                i.StaleAfterDays,
                i.TechVersions,
                i.MergedIntoFile,
                i.MergedAt
            });
            return Results.Ok(list);
        });

        // GET /api/knowledge/{id}
        group.MapGet("{id}", async (string id, KnowledgeService svc) =>
        {
            var item = await svc.GetByIdAsync(id);
            return item is null ? Results.NotFound() : Results.Ok(item);
        });

        // PUT /api/knowledge/{id}/status
        group.MapPut("{id}/status", async (string id, UpdateStatusRequest req, KnowledgeService svc) =>
        {
            var valid = new[] { "validated", "rejected", "needs_rework", "pending_review" };
            if (!valid.Contains(req.Status))
                return Results.BadRequest($"Invalid status. Valid: {string.Join(", ", valid)}");

            var updated = await svc.UpdateStatusAsync(id, req.Status, req.Notes ?? "");
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        });

        // GET /api/knowledge/{id}/toolkit-preview
        // Tạo preview markdown sẽ được append vào my-ai-toolkit
        group.MapGet("{id}/toolkit-preview", async (string id, KnowledgeService svc, ToolkitService toolkitSvc) =>
        {
            var item = await svc.GetByIdAsync(id);
            if (item is null) return Results.NotFound();

            if (string.IsNullOrWhiteSpace(item.Validation.ToolkitTarget))
                return Results.BadRequest(new { error = "toolkitTarget chưa được set cho item này. Thêm vào JSON field 'validation.toolkitTarget'." });

            try
            {
                var preview = await toolkitSvc.GeneratePreviewAsync(item);
                return Results.Ok(preview);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // POST /api/knowledge/{id}/merge-to-toolkit
        // Append/Replace/Skip content vào file my-ai-toolkit
        group.MapPost("{id}/merge-to-toolkit", async (string id, MergeToToolkitRequest req, KnowledgeService svc, ToolkitService toolkitSvc) =>
        {
            var item = await svc.GetByIdAsync(id);
            if (item is null) return Results.NotFound();

            MergeResult result;

            switch (req.Action)
            {
                case "skip":
                    result = new MergeResult
                    {
                        Success       = true,
                        Message       = "Bỏ qua — không lưu vào toolkit.",
                        TargetRelPath = req.TargetRelPath
                    };
                    break;

                case "replace" when !string.IsNullOrWhiteSpace(req.HeadingToReplace):
                    result = await toolkitSvc.ReplaceSectionAsync(
                        req.TargetAbsPath, req.TargetRelPath,
                        req.HeadingToReplace, req.Content);
                    break;

                default: // "append" hoặc không hợp lệ → append
                    result = await toolkitSvc.MergeAsync(req);
                    break;
            }

            // Lưu merge tracking vào item (trừ skip)
            if (result.Success && req.Action != "skip")
                await svc.UpdateMergeTrackingAsync(id, req.TargetRelPath);

            return result.Success ? Results.Ok(result) : Results.UnprocessableEntity(result);
        });

        // POST /api/knowledge — tạo item mới
        group.MapPost("", async (KnowledgeItem item, KnowledgeService svc) =>
        {
            if (string.IsNullOrWhiteSpace(item.Topic))    return Results.BadRequest("Topic is required");
            if (string.IsNullOrWhiteSpace(item.Category)) return Results.BadRequest("Category is required");

            var created = await svc.CreateAsync(item);
            return Results.Created($"/api/knowledge/{created.Id}", created);
        });
    }
}

public record UpdateStatusRequest(string Status, string? Notes);

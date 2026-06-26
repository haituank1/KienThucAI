using DemoEngine.API.Models;
using DemoEngine.API.Services;

namespace DemoEngine.API.Endpoints;

public static class KnowledgeEndpoints
{
    public static void MapKnowledgeEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/knowledge");

        // GET /api/knowledge?category=&status=&search=
        group.MapGet("", async (
            string? category,
            string? status,
            string? search,
            KnowledgeService svc) =>
        {
            var items = await svc.GetAllAsync(category, status, search);
            var list = items.Select(i => new
            {
                i.Id, i.Topic, i.Category, i.Subcategory, i.Tags,
                i.Difficulty, i.Relevance, i.Status, i.Confidence,
                i.ResearchedAt, i.ValidatedAt, i.Summary,
                HasDemo   = i.Demo.Exists,
                DemoType  = i.Demo.Type
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

        // POST /api/knowledge
        group.MapPost("", async (KnowledgeItem item, KnowledgeService svc) =>
        {
            if (string.IsNullOrWhiteSpace(item.Topic))
                return Results.BadRequest("Topic is required");
            if (string.IsNullOrWhiteSpace(item.Category))
                return Results.BadRequest("Category is required");

            var created = await svc.CreateAsync(item);
            return Results.Created($"/api/knowledge/{created.Id}", created);
        });
    }
}

public record UpdateStatusRequest(string Status, string? Notes);

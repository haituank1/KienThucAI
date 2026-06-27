using DemoEngine.API.Models;
using DemoEngine.API.Services;

namespace DemoEngine.API.Endpoints;

public static class QueueEndpoints
{
    public static void MapQueueEndpoints(this WebApplication app)
    {
        app.MapGet("/api/queue", async (QueueService svc) =>
            Results.Ok(await svc.GetAllAsync()));

        app.MapPost("/api/queue", async (QueueItem item, QueueService svc) =>
        {
            if (string.IsNullOrWhiteSpace(item.Topic))
                return Results.BadRequest("Topic là bắt buộc");
            var created = await svc.AddAsync(item);
            return Results.Ok(created);
        });

        app.MapPut("/api/queue/{id}", async (string id, QueueItem item, QueueService svc) =>
        {
            var updated = await svc.UpdateAsync(id, item);
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        });

        app.MapDelete("/api/queue/{id}", async (string id, QueueService svc) =>
        {
            var ok = await svc.DeleteAsync(id);
            return ok ? Results.Ok() : Results.NotFound();
        });
    }
}

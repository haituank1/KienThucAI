using DemoEngine.API.Services;

namespace DemoEngine.API.Endpoints;

public static class StatsEndpoints
{
    public static void MapStatsEndpoints(this WebApplication app)
    {
        app.MapGet("/api/stats", async (StatsService svc) =>
            Results.Ok(await svc.GetStatsAsync()));
    }
}

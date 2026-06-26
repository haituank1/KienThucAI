using DemoEngine.API.Services;

namespace DemoEngine.API.Endpoints;

public static class DemoEndpoints
{
    public static void MapDemoEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/demo");

        // GET /api/demo/{id} — trả về info và URL để call demo
        group.MapGet("{id}", async (string id, KnowledgeService svc, IConfiguration config) =>
        {
            var item = await svc.GetByIdAsync(id);
            if (item is null)
                return Results.NotFound();

            if (!item.Demo.Exists)
                return Results.Ok(new { exists = false, message = "Demo chưa được tạo cho topic này." });

            var port    = config["Port"] ?? "5001";
            var baseUrl = $"http://localhost:{port}";

            if (item.Demo.Type == "frontend")
            {
                var slug = item.Demo.Path.Replace("/", "-").Replace("\\", "-").ToLower();
                return Results.Ok(new
                {
                    exists      = true,
                    type        = "frontend",
                    url         = $"{baseUrl}/demos/frontend/{slug}.html",
                    description = item.Demo.Description
                });
            }

            // backend demo
            var apiSlug = item.Demo.Path.Replace("/", "-").Replace("\\", "-").ToLower();
            return Results.Ok(new
            {
                exists      = true,
                type        = "backend",
                url         = $"{baseUrl}/api/demo/run/{apiSlug}",
                description = item.Demo.Description
            });
        });

        // POST /api/demo/run/{slug} — execute backend demo
        group.MapPost("run/{slug}", async (string slug, DemoRunnerService runner) =>
        {
            var json = await runner.RunAsync(slug);
            return Results.Text(json, "application/json");
        });
    }
}

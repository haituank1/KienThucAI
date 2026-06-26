using DemoEngine.API.Models;
using DemoEngine.API.Services;

namespace DemoEngine.API.Endpoints;

public static class CategoryEndpoints
{
    public static void MapCategoryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/categories");

        group.MapGet("", async (CategoryService svc) =>
            Results.Ok(await svc.GetAllAsync()));

        group.MapPost("", async (Category category, CategoryService svc) =>
        {
            if (string.IsNullOrWhiteSpace(category.Id))
                return Results.BadRequest("Id is required");
            if (string.IsNullOrWhiteSpace(category.Label))
                return Results.BadRequest("Label is required");

            category.Id = category.Id.ToLower().Replace(" ", "-");

            try
            {
                var created = await svc.AddAsync(category);
                return Results.Created($"/api/categories/{created.Id}", created);
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(ex.Message);
            }
        });

        group.MapDelete("{id}", async (string id, CategoryService svc) =>
        {
            var deleted = await svc.DeleteAsync(id);
            return deleted ? Results.NoContent() : Results.NotFound();
        });
    }
}

using DemoEngine.API.Services;

namespace DemoEngine.API.Endpoints;

public static class ToolkitEndpoints
{
    public static void MapToolkitEndpoints(this WebApplication app)
    {
        // GET /api/toolkit/files
        // List tất cả .md files trong toolkit kèm headings — dùng cho Toolkit Explorer
        app.MapGet("/api/toolkit/files", async (ToolkitService svc) =>
        {
            var files = await svc.GetAllFilesAsync();
            return Results.Ok(files);
        });

        // GET /api/toolkit/index
        // Trả về _toolkit-index.json (đọc file, lazy rebuild nếu chưa có)
        app.MapGet("/api/toolkit/index", async (ToolkitService svc) =>
        {
            var index = await svc.GetToolkitIndexAsync();
            return Results.Ok(index);
        });

        // POST /api/toolkit/rebuild-index
        // Scan lại toàn bộ .md files, lưu file, trả về stats
        app.MapPost("/api/toolkit/rebuild-index", async (ToolkitService svc) =>
        {
            var index = await svc.BuildToolkitIndexAsync();
            return Results.Ok(new
            {
                message       = $"Rebuilt: {index.TotalFiles} files, {index.TotalHeadings} headings",
                generatedAt   = index.GeneratedAt,
                totalFiles    = index.TotalFiles,
                totalHeadings = index.TotalHeadings
            });
        });

        // GET /api/toolkit/headings?path=05-snippets/dotnet/ef-core-patterns.md
        // Headings + metadata của một file cụ thể — dùng trong validate preview modal
        app.MapGet("/api/toolkit/headings", async (string? path, ToolkitService svc) =>
        {
            if (string.IsNullOrWhiteSpace(path))
                return Results.BadRequest(new { error = "path query parameter là bắt buộc" });

            // Path traversal guard — chỉ cho phép forward slash, không có ../
            if (path.Contains("..") || path.Contains('\\'))
                return Results.BadRequest(new { error = "path không hợp lệ" });

            var info = await svc.GetFileInfoAsync(path);
            return Results.Ok(info);
        });
    }
}

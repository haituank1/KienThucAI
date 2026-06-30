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

        // GET /api/toolkit/search?q=...
        // Full-text search trong toàn bộ .md files của toolkit
        app.MapGet("/api/toolkit/search", async (string? q, ToolkitService svc) =>
        {
            if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
                return Results.BadRequest(new { error = "q cần ít nhất 2 ký tự" });
            var results = await svc.SearchContentAsync(q);
            return Results.Ok(results);
        });

        // GET /api/toolkit/section?path=...&heading=...
        // Lấy nội dung hiện tại của một section — dùng cho diff view khi Replace
        app.MapGet("/api/toolkit/section", async (string? path, string? heading, ToolkitService svc) =>
        {
            if (string.IsNullOrWhiteSpace(path) || string.IsNullOrWhiteSpace(heading))
                return Results.BadRequest(new { error = "path và heading là bắt buộc" });
            if (path.Contains("..") || path.Contains('\\'))
                return Results.BadRequest(new { error = "path không hợp lệ" });
            var section = await svc.GetSectionContentAsync(path, heading);
            return Results.Ok(section);
        });

        // GET /api/toolkit/session-starter?type=debug|feature|refactor|schema
        // Generate session-starter prompt từ toolkit knowledge phù hợp với task type
        app.MapGet("/api/toolkit/session-starter", async (string? type, ToolkitService svc) =>
        {
            var validTypes = new[] { "debug", "feature", "refactor", "schema" };
            if (string.IsNullOrWhiteSpace(type) || !validTypes.Contains(type, StringComparer.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = $"type phải là một trong: {string.Join(", ", validTypes)}" });

            var starter = await svc.GenerateSessionStarterAsync(type.ToLower());
            return Results.Ok(starter);
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

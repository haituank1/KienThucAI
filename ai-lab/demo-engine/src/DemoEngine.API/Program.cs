using Microsoft.Extensions.FileProviders;
using DemoEngine.API.Endpoints;
using DemoEngine.API.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Resolve paths ────────────────────────────────────────────────────────────
var contentRoot = builder.Environment.ContentRootPath;
var dataPathRaw = builder.Configuration["DataPath"] ?? "../../data";
var hubPathRaw  = builder.Configuration["KnowledgeHubPath"] ?? "../../knowledge-hub";
var dataPath    = Path.GetFullPath(Path.Combine(contentRoot, dataPathRaw));
var hubPath     = Path.GetFullPath(Path.Combine(contentRoot, hubPathRaw));

// Write resolved absolute paths back so services can read them
builder.Configuration["DataPath"] = dataPath;
builder.Configuration["KnowledgeHubPath"] = hubPath;

// ── Services ─────────────────────────────────────────────────────────────────
builder.Services.AddScoped<KnowledgeService>();
builder.Services.AddScoped<CategoryService>();
builder.Services.AddScoped<StatsService>();
builder.Services.AddScoped<DemoRunnerService>();

builder.Services.AddCors(opt => opt.AddDefaultPolicy(p =>
    p.SetIsOriginAllowed(_ => true)   // cho phép mọi origin kể cả null (file://)
     .AllowAnyHeader()
     .AllowAnyMethod()));

var port = builder.Configuration["Port"] ?? "5001";
builder.WebHost.UseUrls($"http://localhost:{port}");

var app = builder.Build();

// ── Middleware ───────────────────────────────────────────────────────────────
app.UseCors();

// Serve frontend demo HTML files at /demos/frontend/...
var frontendDemosPath = Path.Combine(contentRoot, "Demos", "Frontend");
if (Directory.Exists(frontendDemosPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider  = new PhysicalFileProvider(frontendDemosPath),
        RequestPath   = "/demos/frontend"
    });
}

// Serve knowledge-hub static files at root /
if (Directory.Exists(hubPath))
{
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = new PhysicalFileProvider(hubPath),
        RequestPath  = ""
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(hubPath),
        RequestPath  = ""
    });
}
else
{
    app.Logger.LogWarning("knowledge-hub path not found: {Path}", hubPath);
}

// ── Endpoints ─────────────────────────────────────────────────────────────────
app.MapKnowledgeEndpoints();
app.MapCategoryEndpoints();
app.MapDemoEndpoints();
app.MapStatsEndpoints();

app.MapGet("/api/health", () => Results.Ok(new
{
    status         = "ok",
    dataPath,
    hubPath,
    dataPathExists = Directory.Exists(dataPath),
    hubPathExists  = Directory.Exists(hubPath)
}));

app.Logger.LogInformation("==============================================");
app.Logger.LogInformation("DemoEngine  →  http://localhost:{Port}", port);
app.Logger.LogInformation("Data path   →  {Path}", dataPath);
app.Logger.LogInformation("Hub path    →  {Path}", hubPath);
app.Logger.LogInformation("==============================================");

app.Run();

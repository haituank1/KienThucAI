using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using DemoEngine.API.Endpoints;
using DemoEngine.API.Services;

// Giữ nguyên claim names từ JWT (không map sub → NameIdentifier, v.v.)
JwtSecurityTokenHandler.DefaultMapInboundClaims = false;

var builder = WebApplication.CreateBuilder(args);

// ── Resolve paths ────────────────────────────────────────────────────────────
var contentRoot = builder.Environment.ContentRootPath;
var dataPathRaw = builder.Configuration["DataPath"] ?? "../../data";
var hubPathRaw  = builder.Configuration["KnowledgeHubPath"] ?? "../../knowledge-hub";
var dataPath    = Path.GetFullPath(Path.Combine(contentRoot, dataPathRaw));
var hubPath     = Path.GetFullPath(Path.Combine(contentRoot, hubPathRaw));

var toolkitPathRaw = builder.Configuration["ToolkitPath"] ?? "../../../../my-ai-toolkit";
var toolkitPath    = Path.GetFullPath(Path.Combine(contentRoot, toolkitPathRaw));

builder.Configuration["DataPath"]          = dataPath;
builder.Configuration["KnowledgeHubPath"]  = hubPath;
builder.Configuration["ToolkitPath"]       = toolkitPath;
builder.Configuration["ContentRoot"]       = contentRoot;

// ── JWT Authentication ───────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret chưa được cấu hình");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"] ?? "demo-engine",
            ValidAudience            = builder.Configuration["Jwt:Audience"] ?? "knowledge-hub",
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew                = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// ── Services ─────────────────────────────────────────────────────────────────
builder.Services.AddScoped<KnowledgeService>();
builder.Services.AddScoped<CategoryService>();
builder.Services.AddScoped<StatsService>();
builder.Services.AddScoped<DemoRunnerService>();
builder.Services.AddScoped<ToolkitService>();
builder.Services.AddScoped<QueueService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<RatingService>();
builder.Services.AddScoped<PromotionService>();

builder.Services.AddCors(opt => opt.AddDefaultPolicy(p =>
    p.SetIsOriginAllowed(_ => true)
     .AllowAnyHeader()
     .AllowAnyMethod()));

var port = builder.Configuration["Port"] ?? "5001";
builder.WebHost.UseUrls($"http://localhost:{port}");

var app = builder.Build();

// ── Middleware ───────────────────────────────────────────────────────────────
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Serve frontend demo HTML files at /demos/frontend/...
var frontendDemosPath = Path.Combine(contentRoot, "Demos", "Frontend");
if (Directory.Exists(frontendDemosPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(frontendDemosPath),
        RequestPath  = "/demos/frontend"
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
app.MapQueueEndpoints();
app.MapToolkitEndpoints();
app.MapAuthEndpoints();
app.MapRatingEndpoints();
app.MapPromotionEndpoints();

app.MapGet("/api/health", () => Results.Ok(new
{
    status            = "ok",
    dataPath,
    hubPath,
    toolkitPath,
    dataPathExists    = Directory.Exists(dataPath),
    hubPathExists     = Directory.Exists(hubPath),
    toolkitPathExists = Directory.Exists(toolkitPath)
}));

app.Logger.LogInformation("==============================================");
app.Logger.LogInformation("DemoEngine  →  http://localhost:{Port}", port);
app.Logger.LogInformation("Data path   →  {Path}", dataPath);
app.Logger.LogInformation("Hub path    →  {Path}", hubPath);
app.Logger.LogInformation("==============================================");

app.Run();

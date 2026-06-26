using System.Text.Json;

namespace DemoEngine.API.Services;

public class DemoRunnerService(ILogger<DemoRunnerService> logger)
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    public async Task<string> RunAsync(string slug)
    {
        logger.LogInformation("Running demo: {Slug}", slug);

        var result = slug.ToLower() switch
        {
            "dotnet-efcorerawsql" => RunEfCoreRawSqlDemo(),
            "postgresql-skiplockedqueue" => await RunSkipLockedDemoAsync(),
            _ => BuildNotFound(slug)
        };

        return JsonSerializer.Serialize(result, JsonOpts);
    }

    // ─────────────────────────────────────────────────────────────────────────
    private static object RunEfCoreRawSqlDemo()
    {
        var rows = Enumerable.Range(1, 6).Select(m => new
        {
            month      = new DateTime(2026, m, 1).ToString("yyyy-MM-dd"),
            revenue    = Random.Shared.Next(50_000_000, 200_000_000),
            orderCount = Random.Shared.Next(100, 2000)
        }).ToArray();

        return new
        {
            concept     = "EF Core 8+ — Database.SqlQuery<T>()",
            description = "Map raw SQL thành bất kỳ type nào, không cần Entity setup",
            keyBenefits = new[]
            {
                "Không cần Entity configuration hoặc keyless entity",
                "SQL Injection safe — tự động parameterize interpolated values",
                "Chain LINQ sau SqlQuery(): .Where(), .OrderBy(), .Skip().Take()",
                "Column name match property name (case-insensitive)"
            },
            codePattern = "ctx.Database.SqlQuery<RevenueByMonth>($\"SELECT ... WHERE tenant_id = {tenantId}\").ToListAsync(ct)",
            gotcha      = "Column alias trong SQL PHẢI match property name. COUNT(*)::int AS order_count → property OrderCount",
            simulatedOutput = rows
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    private static async Task<object> RunSkipLockedDemoAsync()
    {
        var allIds = Enumerable.Range(1, 20)
            .Select(i => $"job-{i:D3}")
            .ToList();

        var workerResults = new List<object>();
        var rng = new Random(42);

        for (var w = 1; w <= 5; w++)
        {
            var picked = allIds.Take(4).ToList();
            allIds    = allIds.Skip(4).ToList();

            workerResults.Add(new
            {
                workerId       = $"Worker-{w}",
                jobsProcessed  = picked.Count,
                jobIds         = picked,
                processingTime = $"{rng.Next(50, 200)}ms"
            });

            await Task.Delay(1);
        }

        return new
        {
            concept     = "PostgreSQL FOR UPDATE SKIP LOCKED",
            description = "5 workers chạy song song, mỗi job chỉ được xử lý đúng 1 lần",
            keyBenefits = new[]
            {
                "Zero wait time — worker tự skip locked rows",
                "Không cần message broker",
                "ACID — job state nhất quán với business data",
                "Debug dễ dàng bằng SQL"
            },
            sqlPattern  = "SELECT id, payload FROM jobs WHERE status='pending' LIMIT 10 FOR UPDATE SKIP LOCKED",
            totalJobs   = 20,
            workerCount = 5,
            results     = workerResults
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    private static object BuildNotFound(string slug) => new
    {
        error          = $"Demo '{slug}' not found.",
        availableDemos = new[] { "dotnet-efcorerawsql", "postgresql-skiplockedqueue" }
    };
}

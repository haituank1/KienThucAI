using DemoEngine.API.Models;

namespace DemoEngine.API.Services;

public class StatsService(KnowledgeService knowledgeService, CategoryService categoryService)
{
    public async Task<Stats> GetStatsAsync()
    {
        var items      = await knowledgeService.GetAllAsync();
        var categories = await categoryService.GetAllAsync();
        var now        = DateTime.UtcNow;
        var weekAgo    = now.AddDays(-7);
        var monthAgo   = now.AddDays(-30);

        var stats = new Stats
        {
            Total              = items.Count,
            PendingReview      = items.Count(i => i.Status == "pending_review"),
            Validated          = items.Count(i => i.Status == "validated"),
            Rejected           = items.Count(i => i.Status == "rejected"),
            NeedsRework        = items.Count(i => i.Status == "needs_rework"),
            WithDemo           = items.Count(i => i.Demo.Exists),
            AvgConfidence      = items.Count > 0
                                   ? Math.Round(items.Average(i => i.Confidence) * 100, 1)
                                   : 0,
            PendingOver7Days   = items.Count(i => i.Status == "pending_review" && i.ResearchedAt < weekAgo),
            ValidatedThisWeek  = items.Count(i => i.Status == "validated" && i.ValidatedAt.HasValue && i.ValidatedAt.Value >= weekAgo),
            ValidatedThisMonth = items.Count(i => i.Status == "validated" && i.ValidatedAt.HasValue && i.ValidatedAt.Value >= monthAgo),
            ResearchedThisWeek = items.Count(i => i.ResearchedAt >= weekAgo),
            ValidatedStreak    = CalculateStreak(items)
        };

        // By category
        stats.ByCategory = categories.Select(cat =>
        {
            var ci = items.Where(i => i.Category == cat.Id).ToList();
            return new CategoryStat
            {
                CategoryId = cat.Id,
                Label      = cat.Label,
                Color      = cat.Color,
                Total      = ci.Count,
                Pending    = ci.Count(i => i.Status == "pending_review"),
                Validated  = ci.Count(i => i.Status == "validated"),
                Rejected   = ci.Count(i => i.Status == "rejected")
            };
        }).ToList();

        // Timeline — last 30 days
        stats.Timeline = Enumerable.Range(0, 30)
            .Select(ago =>
            {
                var date = now.AddDays(-ago).Date;
                return new DailyActivity
                {
                    Date       = date.ToString("yyyy-MM-dd"),
                    Researched = items.Count(i => i.ResearchedAt.Date == date),
                    Validated  = items.Count(i => i.ValidatedAt.HasValue && i.ValidatedAt.Value.Date == date)
                };
            })
            .OrderBy(d => d.Date)
            .ToList();

        return stats;
    }

    private static int CalculateStreak(List<KnowledgeItem> items)
    {
        var dates = items
            .Where(i => i.ValidatedAt.HasValue)
            .Select(i => i.ValidatedAt!.Value.Date)
            .Distinct()
            .OrderByDescending(d => d)
            .ToList();

        if (dates.Count == 0) return 0;

        var today = DateTime.UtcNow.Date;

        // Streak chỉ bắt đầu nếu có validate trong hôm nay hoặc hôm qua
        if (dates[0] < today.AddDays(-1)) return 0;

        var streak   = 0;
        var expected = today;

        foreach (var date in dates)
        {
            if (date >= expected.AddDays(-1) && date <= expected)
            {
                streak++;
                expected = date.AddDays(-1);
            }
            else break;
        }

        return streak;
    }
}

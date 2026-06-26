namespace DemoEngine.API.Models;

public class Stats
{
    public int Total { get; set; }
    public int PendingReview { get; set; }
    public int Validated { get; set; }
    public int Rejected { get; set; }
    public int NeedsRework { get; set; }
    public int WithDemo { get; set; }
    public double AvgConfidence { get; set; }
    public int PendingOver7Days { get; set; }
    public int ValidatedThisWeek { get; set; }
    public int ValidatedThisMonth { get; set; }
    public int ResearchedThisWeek { get; set; }
    public int ValidatedStreak { get; set; }
    public List<CategoryStat> ByCategory { get; set; } = [];
    public List<DailyActivity> Timeline { get; set; } = [];
}

public class CategoryStat
{
    public string CategoryId { get; set; } = "";
    public string Label { get; set; } = "";
    public string Color { get; set; } = "";
    public int Total { get; set; }
    public int Pending { get; set; }
    public int Validated { get; set; }
    public int Rejected { get; set; }
}

public class DailyActivity
{
    public string Date { get; set; } = "";   // yyyy-MM-dd
    public int Researched { get; set; }
    public int Validated { get; set; }
}

namespace DemoEngine.API.Models;

public class Category
{
    public string Id { get; set; } = "";
    public string Label { get; set; } = "";
    public string Icon { get; set; } = "📚";
    public string Color { get; set; } = "#6B7280";
    public string Description { get; set; } = "";
}

public class CategoriesFile
{
    public List<Category> Categories { get; set; } = [];
}

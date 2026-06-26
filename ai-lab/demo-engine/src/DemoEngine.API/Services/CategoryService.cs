using System.Text.Encodings.Web;
using System.Text.Json;
using DemoEngine.API.Models;

namespace DemoEngine.API.Services;

public class CategoryService(IConfiguration config, ILogger<CategoryService> logger)
{
    private readonly string _categoriesFile = Path.Combine(
        config["DataPath"] ?? throw new InvalidOperationException("DataPath not configured"),
        "_categories.json");

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.CamelCase,
        WriteIndented               = true,
        PropertyNameCaseInsensitive = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    public async Task<List<Category>> GetAllAsync()
    {
        if (!File.Exists(_categoriesFile))
        {
            logger.LogWarning("Categories file not found: {File}", _categoriesFile);
            return [];
        }

        var json = await File.ReadAllTextAsync(_categoriesFile);
        var file = JsonSerializer.Deserialize<CategoriesFile>(json, JsonOpts);
        return file?.Categories ?? [];
    }

    public async Task<Category> AddAsync(Category category)
    {
        var categories = await GetAllAsync();

        // Check duplicate
        if (categories.Any(c => c.Id == category.Id))
            throw new InvalidOperationException($"Category '{category.Id}' already exists");

        categories.Add(category);
        await SaveAsync(categories);

        // Create directory
        var dataPath = Path.GetDirectoryName(_categoriesFile)!;
        Directory.CreateDirectory(Path.Combine(dataPath, category.Id));

        return category;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var categories = await GetAllAsync();
        var existing = categories.FirstOrDefault(c => c.Id == id);
        if (existing is null) return false;

        categories.Remove(existing);
        await SaveAsync(categories);
        return true;
    }

    private async Task SaveAsync(List<Category> categories)
    {
        var file = new CategoriesFile { Categories = categories };
        var json = JsonSerializer.Serialize(file, JsonOpts);
        await File.WriteAllTextAsync(_categoriesFile, json);
    }
}

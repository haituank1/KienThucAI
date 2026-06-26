namespace DemoEngine.API.Models;

public class ToolkitPreview
{
    /// <summary>Path tương đối trong my-ai-toolkit, vd: "05-snippets/dotnet/ef-core-patterns.md"</summary>
    public string TargetRelPath { get; init; } = "";

    /// <summary>Absolute path đến file trong my-ai-toolkit</summary>
    public string TargetAbsPath { get; init; } = "";

    /// <summary>Markdown content sẽ được append</summary>
    public string Content { get; init; } = "";

    /// <summary>File đích đã tồn tại chưa</summary>
    public bool FileExists { get; init; }

    /// <summary>Phát hiện heading trùng trong file đích</summary>
    public bool HasDuplicate { get; init; }

    /// <summary>Mô tả duplicate nếu có</summary>
    public string DuplicateWarning { get; init; } = "";

    /// <summary>Số dòng hiện tại của file đích (để biết sẽ append ở đâu)</summary>
    public int ExistingLineCount { get; init; }
}

public record MergeToToolkitRequest(
    string TargetAbsPath,
    string TargetRelPath,
    string Content   // Nội dung đã được user edit (nếu có)
);

public class MergeResult
{
    public bool Success { get; init; }
    public string Message { get; init; } = "";
    public string TargetRelPath { get; init; } = "";
}

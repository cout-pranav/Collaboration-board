namespace CollabWhiteboard.API.Models;

public class Board
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public ApplicationUser Owner { get; set; } = null!;

    /// <summary>
    /// Serialized Yjs document binary state for persistence and reconnect recovery.
    /// </summary>
    public byte[]? YjsDocState { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<BoardMember> Members { get; set; } = [];
}

public class BoardMember
{
    public Guid BoardId { get; set; }
    public Board Board { get; set; } = null!;

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;

    public BoardRole Role { get; set; } = BoardRole.Editor;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

public enum BoardRole { Viewer, Editor, Admin }

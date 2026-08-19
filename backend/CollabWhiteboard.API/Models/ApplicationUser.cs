using Microsoft.AspNetCore.Identity;

namespace CollabWhiteboard.API.Models;

public class ApplicationUser : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;
    public string AvatarColor { get; set; } = "#6366f1"; // default indigo
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Board> OwnedBoards { get; set; } = [];
    public ICollection<BoardMember> BoardMemberships { get; set; } = [];
}

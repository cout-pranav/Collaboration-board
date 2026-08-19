using CollabWhiteboard.API.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CollabWhiteboard.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<Board> Boards => Set<Board>();
    public DbSet<BoardMember> BoardMembers => Set<BoardMember>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Board>(e =>
        {
            e.HasKey(b => b.Id);
            e.Property(b => b.Name).HasMaxLength(200).IsRequired();
            e.HasOne(b => b.Owner)
             .WithMany(u => u.OwnedBoards)
             .HasForeignKey(b => b.OwnerId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<BoardMember>(e =>
        {
            e.HasKey(bm => new { bm.BoardId, bm.UserId });
            e.HasOne(bm => bm.Board)
             .WithMany(b => b.Members)
             .HasForeignKey(bm => bm.BoardId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(bm => bm.User)
             .WithMany(u => u.BoardMemberships)
             .HasForeignKey(bm => bm.UserId)
             .OnDelete(DeleteBehavior.NoAction);
        });
    }
}

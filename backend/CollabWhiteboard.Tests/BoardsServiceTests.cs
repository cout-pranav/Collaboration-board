using CollabWhiteboard.API.Data;
using CollabWhiteboard.API.DTOs;
using CollabWhiteboard.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CollabWhiteboard.Tests;

public class BoardsServiceTests
{
    private static AppDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task Board_IsCreated_WithCorrectOwner()
    {
        await using var db = CreateInMemoryDb();

        var board = new Board { Name = "My Board", OwnerId = "user-1" };
        db.Boards.Add(board);
        await db.SaveChangesAsync();

        var saved = await db.Boards.FirstOrDefaultAsync(b => b.Name == "My Board");
        Assert.NotNull(saved);
        Assert.Equal("user-1", saved.OwnerId);
    }

    [Fact]
    public async Task Board_SnapshotUpdate_PersistsYjsState()
    {
        await using var db = CreateInMemoryDb();

        var board = new Board { Name = "Canvas", OwnerId = "user-1" };
        db.Boards.Add(board);
        await db.SaveChangesAsync();

        // Simulate a Yjs doc state snapshot
        var fakeYjsState = new byte[] { 0x01, 0x02, 0x03 };
        board.YjsDocState = fakeYjsState;
        board.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var updated = await db.Boards.FindAsync(board.Id);
        Assert.NotNull(updated);
        Assert.Equal(fakeYjsState, updated.YjsDocState);
    }

    [Fact]
    public async Task Board_Delete_RemovesCascadeMembers()
    {
        await using var db = CreateInMemoryDb();

        var board = new Board { Name = "Team Board", OwnerId = "user-1" };
        db.Boards.Add(board);
        await db.SaveChangesAsync();

        var member = new BoardMember
        {
            BoardId = board.Id,
            UserId = "user-2",
            Role = BoardRole.Editor,
        };
        db.BoardMembers.Add(member);
        await db.SaveChangesAsync();

        db.Boards.Remove(board);
        await db.SaveChangesAsync();

        // BoardMember should be cascade-deleted
        var remainingMembers = await db.BoardMembers
            .Where(m => m.BoardId == board.Id).ToListAsync();
        Assert.Empty(remainingMembers);
    }

    [Fact]
    public async Task UserQuery_ReturnsOnlyBoardsUserBelongsTo()
    {
        await using var db = CreateInMemoryDb();

        var myBoard = new Board { Name = "Mine", OwnerId = "user-1" };
        var otherBoard = new Board { Name = "Other", OwnerId = "user-2" };
        db.Boards.AddRange(myBoard, otherBoard);
        await db.SaveChangesAsync();

        var userId = "user-1";
        var boards = await db.Boards
            .Where(b => b.OwnerId == userId ||
                        b.Members.Any(m => m.UserId == userId))
            .ToListAsync();

        Assert.Single(boards);
        Assert.Equal("Mine", boards[0].Name);
    }
}

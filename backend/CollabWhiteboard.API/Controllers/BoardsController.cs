using CollabWhiteboard.API.Data;
using CollabWhiteboard.API.DTOs;
using CollabWhiteboard.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

using Microsoft.AspNetCore.SignalR;
using CollabWhiteboard.API.Hubs;

namespace CollabWhiteboard.API.Controllers;

[ApiController]
[Route("api/boards")]
[Authorize]
public class BoardsController(AppDbContext db, IHubContext<WhiteboardHub> hubContext) : ControllerBase
{
    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /api/boards — list all boards
    [HttpGet]
    public async Task<IActionResult> GetBoards()
    {
        var boards = await db.Boards
            .Include(b => b.Owner)
            // Removed the Where clause so all boards act as a public workspace
            .OrderByDescending(b => b.UpdatedAt)
            .Select(b => new BoardResponse(
                b.Id, b.Name, b.OwnerId, b.Owner.DisplayName,
                b.CreatedAt, b.UpdatedAt))
            .ToListAsync();

        return Ok(boards);
    }

    // GET /api/boards/{id} — get board detail with initial Yjs state.
    // Any authenticated user who knows the board ID can open it.
    // If they are not the owner and not yet a member, they are auto-added
    // as an Editor so that subsequent snapshot writes also succeed.
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetBoard(Guid id)
    {
        var userId = CurrentUserId;

        var board = await db.Boards
            .Include(b => b.Owner)
            .Include(b => b.Members).ThenInclude(m => m.User)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (board is null) return NotFound();

        // Auto-add the visitor as a member (Editor) if they aren't already
        bool isOwner = board.OwnerId == userId;
        bool isMember = board.Members.Any(m => m.UserId == userId);
        if (!isOwner && !isMember)
        {
            var newMember = new BoardMember
            {
                BoardId = board.Id,
                UserId = userId,
                Role = BoardRole.Editor,
            };
            db.BoardMembers.Add(newMember);
            await db.SaveChangesAsync();
            // Reload members so the response includes the new entry
            await db.Entry(board).Collection(b => b.Members).LoadAsync();
            foreach (var m in board.Members)
                await db.Entry(m).Reference(bm => bm.User).LoadAsync();
        }

        var response = new BoardDetailResponse(
            board.Id, board.Name, board.OwnerId, board.Owner.DisplayName,
            board.CreatedAt, board.UpdatedAt,
            board.YjsDocState,
            board.Members.Select(m => new BoardMemberResponse(
                m.UserId, m.User.DisplayName, m.User.AvatarColor, m.Role.ToString())));

        return Ok(response);
    }


    // POST /api/boards — create a new board
    [HttpPost]
    public async Task<IActionResult> CreateBoard([FromBody] CreateBoardRequest request)
    {
        var board = new Board
        {
            Name = request.Name,
            OwnerId = CurrentUserId,
        };
        db.Boards.Add(board);
        await db.SaveChangesAsync();

        var owner = await db.Users.FindAsync(CurrentUserId);
        var response = new BoardResponse(board.Id, board.Name, board.OwnerId,
                owner!.DisplayName, board.CreatedAt, board.UpdatedAt);

        // Broadcast to all connected clients that a new board was created
        await hubContext.Clients.All.SendAsync("BoardCreated", response);

        return CreatedAtAction(nameof(GetBoard), new { id = board.Id }, response);
    }

    // DELETE /api/boards/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteBoard(Guid id)
    {
        var board = await db.Boards
            .FirstOrDefaultAsync(b => b.Id == id && b.OwnerId == CurrentUserId);
        if (board is null) return NotFound();

        db.Boards.Remove(board);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/boards/{id}/snapshot — persist the Yjs document binary state
    [HttpPost("{id:guid}/snapshot")]
    public async Task<IActionResult> SaveSnapshot(Guid id, [FromBody] SnapshotRequest request)
    {
        var userId = CurrentUserId;

        var board = await db.Boards
            .FirstOrDefaultAsync(b => b.Id == id &&
                (b.OwnerId == userId || b.Members.Any(m => m.UserId == userId)));

        if (board is null) return NotFound();

        board.YjsDocState = request.YjsDocState;
        board.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return NoContent();
    }
}

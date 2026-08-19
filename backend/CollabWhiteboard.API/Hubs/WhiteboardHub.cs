using CollabWhiteboard.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace CollabWhiteboard.API.Hubs;

/// <summary>
/// The core real-time hub. Clients join board-specific groups and exchange
/// Yjs binary diffs plus presence/cursor events through this hub.
/// </summary>
[Authorize]
public class WhiteboardHub : Hub
{
    // ── Connection Lifecycle ──────────────────────────────────────────────────

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Notify all groups the user was in that they have left.
        // We store board memberships in ConnectionMapping (in-memory for demo;
        // use IDistributedCache / Azure Cache for Redis in production).
        if (ConnectionBoardMap.TryRemove(Context.ConnectionId, out var boardId))
        {
            var userId = UserId;
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, boardId);
            await Clients.Group(boardId).SendAsync("UserLeft", new PresenceInfo(
                userId, DisplayName, AvatarColor));
        }
        await base.OnDisconnectedAsync(exception);
    }

    // ── Hub Methods (Client → Server) ─────────────────────────────────────────

    /// <summary>
    /// Join a board room. Sends the caller a UserJoined confirmation and
    /// notifies other members that a new user has arrived.
    /// </summary>
    public async Task JoinBoard(string boardId)
    {
        ConnectionBoardMap[Context.ConnectionId] = boardId;

        await Groups.AddToGroupAsync(Context.ConnectionId, boardId);

        // Notify others in the room
        await Clients.OthersInGroup(boardId).SendAsync("UserJoined", new PresenceInfo(
            UserId, DisplayName, AvatarColor));
    }

    /// <summary>
    /// Leave a board room explicitly (e.g., navigating away).
    /// </summary>
    public async Task LeaveBoard(string boardId)
    {
        ConnectionBoardMap.TryRemove(Context.ConnectionId, out _);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, boardId);

        await Clients.OthersInGroup(boardId).SendAsync("UserLeft", new PresenceInfo(
            UserId, DisplayName, AvatarColor));
    }

    /// <summary>
    /// Relay a Yjs binary update diff to all other clients in the board group.
    /// The hub is stateless here — it is a pure relay. Persistence is handled
    /// via the REST snapshot endpoint called periodically by the client.
    /// 
    /// The update is transmitted as a base64 string (not byte[]) to avoid
    /// ambiguity in SignalR's JSON protocol binary serialization.
    /// </summary>
    public async Task SyncYjsUpdate(string boardId, string update)
    {
        Console.WriteLine($"[Hub] SyncYjsUpdate boardId={boardId} len={update.Length}");
        await Clients.OthersInGroup(boardId).SendAsync("ReceiveYjsUpdate", update);
    }

    /// <summary>
    /// Broadcast the current user's cursor position to others.
    /// Clients should throttle calls to this method (e.g., 30fps max).
    /// </summary>
    public async Task UpdateCursor(string boardId, double x, double y)
    {
        await Clients.OthersInGroup(boardId).SendAsync(
            "CursorMoved",
            new CursorPosition(UserId, DisplayName, AvatarColor, x, y));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string UserId =>
        Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private string DisplayName =>
        Context.User!.FindFirstValue("displayName") ?? "Anonymous";

    private string AvatarColor =>
        Context.User!.FindFirstValue("avatarColor") ?? "#6366f1";

    /// <summary>
    /// In-memory connection → boardId mapping.
    /// Replace with IDistributedCache (Azure Redis) for multi-instance deployments.
    /// </summary>
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, string>
        ConnectionBoardMap = new();
}

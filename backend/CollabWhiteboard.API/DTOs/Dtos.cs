namespace CollabWhiteboard.API.DTOs;

// ── Auth ──────────────────────────────────────────────────────────────────────

public record RegisterRequest(
    string Email,
    string Password,
    string DisplayName);

public record LoginRequest(
    string Email,
    string Password);

public record MicrosoftLoginRequest(string IdToken);

public record AuthResponse(
    string Token,
    string UserId,
    string Email,
    string DisplayName,
    string AvatarColor);

public record UserProfileResponse(
    string UserId,
    string Email,
    string DisplayName,
    string AvatarColor);

// ── Boards ────────────────────────────────────────────────────────────────────

public record CreateBoardRequest(string Name);

public record BoardResponse(
    Guid Id,
    string Name,
    string OwnerId,
    string OwnerDisplayName,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record BoardDetailResponse(
    Guid Id,
    string Name,
    string OwnerId,
    string OwnerDisplayName,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    byte[]? YjsDocState,   // base64-encoded Yjs document for initial sync
    IEnumerable<BoardMemberResponse> Members);

public record BoardMemberResponse(
    string UserId,
    string DisplayName,
    string AvatarColor,
    string Role);

public record SnapshotRequest(byte[] YjsDocState);

// ── SignalR Hub Messages ───────────────────────────────────────────────────────

public record CursorPosition(string UserId, string DisplayName, string AvatarColor, double X, double Y);
public record PresenceInfo(string UserId, string DisplayName, string AvatarColor);

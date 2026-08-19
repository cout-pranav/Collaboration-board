// Shared SignalR message shape types (mirrors the C# DTOs)

export interface CursorPosition {
  userId: string
  displayName: string
  avatarColor: string
  x: number
  y: number
}

export interface PresenceInfo {
  userId: string
  displayName: string
  avatarColor: string
}

// Core domain types shared between components, stores, and services

export interface Board {
  id: string
  name: string
  ownerId: string
  ownerDisplayName: string
  createdAt: string
  updatedAt: string
}

export interface BoardDetail extends Board {
  yjsDocState: number[] | null // base64-decoded bytes of the Yjs doc
  members: BoardMember[]
}

export interface BoardMember {
  userId: string
  displayName: string
  avatarColor: string
  role: 'Viewer' | 'Editor' | 'Admin'
}

// ── Canvas objects (live in Yjs Y.Map / Y.Array) ─────────────────────────────

export interface Card {
  id: string
  text: string
  color: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  authorId: string
}

export interface DrawPath {
  id: string
  points: number[] // flat [x0,y0, x1,y1, ...] array
  color: string
  strokeWidth: number
  authorId: string
}

export interface TextNode {
  id: string
  text: string
  color: string
  fontSize: number
  x: number
  y: number
  zIndex: number
  authorId: string
}

// ── Presence ─────────────────────────────────────────────────────────────────

export interface CursorState {
  userId: string
  displayName: string
  avatarColor: string
  x: number
  y: number
  lastSeen: number // Date.now() timestamp for stale-cursor cleanup
}

export interface OnlineUser {
  userId: string
  displayName: string
  avatarColor: string
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string
  email: string
  displayName: string
  avatarColor: string
  token: string
}

// ── Tool mode ─────────────────────────────────────────────────────────────────

export type ToolMode = 'select' | 'draw' | 'card' | 'pan' | 'text'

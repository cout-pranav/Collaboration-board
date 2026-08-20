import * as signalR from '@microsoft/signalr'
import type { CursorPosition, PresenceInfo } from './signalrTypes'
import type { Board } from '@/types/whiteboard'

type YjsUpdateHandler = (update: Uint8Array) => void
type CursorHandler = (cursor: CursorPosition) => void
type PresenceHandler = (info: PresenceInfo) => void

class SignalRService {
  private connection: signalR.HubConnection | null = null
  private reconnecting = false

  /** Build and start the hub connection with JWT auth */
  async connect(token: string): Promise<void> {
    if (this.connection && this.isConnected) {
      return; // Already connected
    }
    if (this.connection) {
      await this.connection.stop();
    }

    // Use relative URL so the request goes through the Vite dev-server proxy
    // (/hubs → http://localhost:5000) in development, and through the same
    // origin in Docker production (ASP.NET Core serves both SPA + /hubs).
    const apiBase = import.meta.env.VITE_API_URL ?? ''
    const hubUrl = `${apiBase}/hubs/whiteboard`
 
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        // Pass JWT via query string so WebSocket handshake can authenticate
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build()
 
    this.connection.onreconnecting(() => {
      this.reconnecting = true
      this._onReconnectingHandlers.forEach((h) => h())
    })
 
    this.connection.onreconnected(() => {
      this.reconnecting = false
      this._onReconnectedHandlers.forEach((h) => h())
    })
 
    this.connection.onclose(() => {
      this._onClosedHandlers.forEach((h) => h())
    })
 
    await this.connection.start()
    console.info('[SignalR] Connected to hub.')
  }

  async disconnect(): Promise<void> {
    await this.connection?.stop()
    this.connection = null
  }

  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected
  }

  // ── Board room management ─────────────────────────────────────────────────

  async joinBoard(boardId: string): Promise<void> {
    await this.invoke('JoinBoard', boardId)
  }

  async leaveBoard(boardId: string): Promise<void> {
    await this.invoke('LeaveBoard', boardId)
  }

  // ── Yjs sync ──────────────────────────────────────────────────────────────

  async sendYjsUpdate(boardId: string, update: Uint8Array): Promise<void> {
    // Encode binary as base64 string — SignalR JSON protocol serializes byte[]
    // as base64, but the reverse (receiving) does NOT auto-decode. Doing the
    // conversion explicitly here guarantees both sides use the same encoding.
    const base64 = btoa(String.fromCharCode(...update))
    await this.invoke('SyncYjsUpdate', boardId, base64)
  }

  // Stored handler refs — one per event type.
  // We call connection.off() before connection.on() so repeated calls to
  // onYjsUpdate / onCursorMoved / etc. (e.g. across reconnects or HMR) never
  // stack duplicate listeners.
  private _yjsUpdateHandler: ((data: unknown) => void) | null = null
  private _cursorMovedHandler: CursorHandler | null = null
  private _userJoinedHandler: PresenceHandler | null = null
  private _userLeftHandler: PresenceHandler | null = null

  onYjsUpdate(handler: YjsUpdateHandler): void {
    if (this._yjsUpdateHandler) {
      this.connection?.off('ReceiveYjsUpdate', this._yjsUpdateHandler)
    }
    this._yjsUpdateHandler = (rawData: unknown) => {
      let bytes: Uint8Array
      if (typeof rawData === 'string') {
        // Base64 string (our explicit encoding, or JSON protocol default)
        const binary = atob(rawData)
        bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
      } else if (rawData instanceof Uint8Array) {
        bytes = rawData
      } else {
        // Fallback: number[] or similar
        bytes = new Uint8Array(rawData as number[])
      }
      console.debug('[SignalR] ReceiveYjsUpdate', bytes.length, 'bytes')
      handler(bytes)
    }
    this.connection?.on('ReceiveYjsUpdate', this._yjsUpdateHandler)
  }


  // ── Cursor ────────────────────────────────────────────────────────────────

  async sendCursor(boardId: string, x: number, y: number): Promise<void> {
    await this.invoke('UpdateCursor', boardId, x, y)
  }

  onCursorMoved(handler: CursorHandler): void {
    if (this._cursorMovedHandler) {
      this.connection?.off('CursorMoved', this._cursorMovedHandler)
    }
    this._cursorMovedHandler = handler
    this.connection?.on('CursorMoved', handler)
  }

  // ── Presence ──────────────────────────────────────────────────────────────

  onUserJoined(handler: PresenceHandler): void {
    if (this._userJoinedHandler) {
      this.connection?.off('UserJoined', this._userJoinedHandler)
    }
    this._userJoinedHandler = handler
    this.connection?.on('UserJoined', handler)
  }

  onUserLeft(handler: PresenceHandler): void {
    if (this._userLeftHandler) {
      this.connection?.off('UserLeft', this._userLeftHandler)
    }
    this._userLeftHandler = handler
    this.connection?.on('UserLeft', handler)
  }

  // ── Global Events ─────────────────────────────────────────────────────────
  
  private _boardCreatedHandler: ((board: Board) => void) | null = null

  onBoardCreated(handler: (board: Board) => void): void {
    if (this._boardCreatedHandler) {
      this.connection?.off('BoardCreated', this._boardCreatedHandler)
    }
    this._boardCreatedHandler = handler
    this.connection?.on('BoardCreated', handler)
  }

  // ── Connection lifecycle handlers ─────────────────────────────────────────

  private _onReconnectingHandlers: Array<() => void> = []
  private _onReconnectedHandlers: Array<() => void> = []
  private _onClosedHandlers: Array<() => void> = []

  onReconnecting(handler: () => void): void {
    this._onReconnectingHandlers.push(handler)
  }

  onReconnected(handler: () => void): void {
    this._onReconnectedHandlers.push(handler)
  }

  onClosed(handler: () => void): void {
    this._onClosedHandlers.push(handler)
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async invoke(method: string, ...args: unknown[]): Promise<void> {
    if (!this.connection || !this.isConnected) return
    try {
      await this.connection.invoke(method, ...args)
    } catch (err) {
      console.error(`[SignalR] invoke ${method} failed:`, err)
    }
  }
}

// Singleton — one connection per app session
export const signalRService = new SignalRService()

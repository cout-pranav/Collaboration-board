import { ref } from 'vue'
import throttle from 'lodash/throttle'
import { signalRService } from '@/services/signalrService'
import { boardsApi } from '@/services/apiService'
import { useWhiteboardStore } from '@/stores/whiteboardStore'
import { usePresenceStore } from '@/stores/presenceStore'
import { useAuthStore } from '@/stores/authStore'

const SNAPSHOT_INTERVAL_MS = 30_000 // persist Yjs state every 30 s

/**
 * useCollaboration — wires together:
 *   - SignalR events → store mutations
 *   - Yjs Y.Doc updates → SignalR broadcasts
 *   - Periodic snapshot persistence
 *   - Presence & cursor tracking
 */
export function useCollaboration(boardId: string) {
  const whiteboardStore = useWhiteboardStore()
  const presenceStore = usePresenceStore()
  const authStore = useAuthStore()

  const isConnecting = ref(false)
  const connectionStatus = ref<'connected' | 'reconnecting' | 'disconnected'>('disconnected')

  let yjsUpdateUnsubscribe: (() => void) | null = null
  let snapshotTimer: ReturnType<typeof setInterval> | null = null
  let staleCursorTimer: ReturnType<typeof setInterval> | null = null

  // ── Throttled cursor sender (max 30 fps to avoid flooding the hub) ────────
  const sendCursor = throttle((x: number, y: number) => {
    signalRService.sendCursor(boardId, x, y)
  }, 33) // ~30 fps

  async function join(): Promise<void> {
    isConnecting.value = true

    // Ensure connection is active
    if (!signalRService.isConnected && authStore.user?.token) {
      console.info('[Collab] Connecting SignalR…')
      await signalRService.connect(authStore.user.token)
    }

    // 1. Join the SignalR group
    await signalRService.joinBoard(boardId)
    console.info(`[Collab] Joined board ${boardId}`)
    connectionStatus.value = 'connected'
    isConnecting.value = false

    // 2. Wire SignalR events to stores
    // These calls use off()+on() internally, so they are safe to call multiple times.
    signalRService.onYjsUpdate((update) => {
      whiteboardStore.applyRemoteUpdate(update)
    })

    signalRService.onCursorMoved((cursor) => {
      if (cursor.userId === authStore.user?.userId) return
      presenceStore.updateCursor({
        ...cursor,
        lastSeen: Date.now(),
      })
    })

    signalRService.onUserJoined((info) => {
      presenceStore.addUser(info)
    })

    signalRService.onUserLeft((info) => {
      presenceStore.removeUser(info.userId)
    })

    signalRService.onReconnecting(() => {
      connectionStatus.value = 'reconnecting'
    })

    signalRService.onReconnected(() => {
      connectionStatus.value = 'connected'
      // Rejoin the room after reconnection
      signalRService.joinBoard(boardId)
    })

    // 3. Observe the Yjs doc — broadcast diffs to hub on every local change.
    //    getYDoc() returns the current plain Y.Doc (set up by initBoard).
    const observeHandler = (update: Uint8Array, origin: unknown) => {
      // origin is null for local mutations (e.g. user actions);
      // skip echoing back updates that came from SignalR (origin = 'signalr')
      if (origin !== null) return
      console.debug('[Collab] Sending Yjs update', update.length, 'bytes')
      signalRService.sendYjsUpdate(boardId, update)
    }

    const doc = whiteboardStore.getYDoc()
    doc.on('update', observeHandler)
    yjsUpdateUnsubscribe = () => doc.off('update', observeHandler)


    // 4. Periodic snapshot save
    snapshotTimer = setInterval(async () => {
      const snapshot = whiteboardStore.encodeState()
      await boardsApi.saveSnapshot(boardId, snapshot).catch(console.warn)
    }, SNAPSHOT_INTERVAL_MS)

    // 5. Prune stale cursors every 5 s
    staleCursorTimer = setInterval(() => presenceStore.pruneStale(), 5000)
  }

  async function leave(): Promise<void> {
    // Final snapshot on leave
    const snapshot = whiteboardStore.encodeState()
    await boardsApi.saveSnapshot(boardId, snapshot).catch(console.warn)

    await signalRService.leaveBoard(boardId)
    presenceStore.clearAll()
    connectionStatus.value = 'disconnected'

    yjsUpdateUnsubscribe?.()
    if (snapshotTimer) clearInterval(snapshotTimer)
    if (staleCursorTimer) clearInterval(staleCursorTimer)

    console.info(`[Collab] Left board ${boardId}`)
  }

  return { join, leave, sendCursor, connectionStatus, isConnecting }
}


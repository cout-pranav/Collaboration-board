import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CursorState, OnlineUser } from '@/types/whiteboard'

const STALE_CURSOR_MS = 5000 // remove cursor if no update in 5 s

export const usePresenceStore = defineStore('presence', () => {
  const cursors = ref<Map<string, CursorState>>(new Map())
  const onlineUsers = ref<Map<string, OnlineUser>>(new Map())

  function updateCursor(cursor: CursorState): void {
    cursors.value.set(cursor.userId, { ...cursor, lastSeen: Date.now() })
    // Trigger Vue reactivity on Map mutation
    cursors.value = new Map(cursors.value)
  }

  function addUser(user: OnlineUser): void {
    onlineUsers.value.set(user.userId, user)
    onlineUsers.value = new Map(onlineUsers.value)
  }

  function removeUser(userId: string): void {
    onlineUsers.value.delete(userId)
    cursors.value.delete(userId)
    onlineUsers.value = new Map(onlineUsers.value)
    cursors.value = new Map(cursors.value)
  }

  function clearAll(): void {
    cursors.value = new Map()
    onlineUsers.value = new Map()
  }

  /** Called on an interval to remove stale (disconnected) cursors */
  function pruneStale(): void {
    const now = Date.now()
    for (const [id, cursor] of cursors.value) {
      if (now - cursor.lastSeen > STALE_CURSOR_MS) {
        cursors.value.delete(id)
      }
    }
    cursors.value = new Map(cursors.value)
  }

  return { cursors, onlineUsers, updateCursor, addUser, removeUser, clearAll, pruneStale }
})

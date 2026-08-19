import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as Y from 'yjs'
import type { Card, DrawPath } from '@/types/whiteboard'

/**
 * Whiteboard store — single source of truth for canvas state.
 *
 * Design: keep Y.Doc and its shared types as plain JS objects (no Vue reactivity
 * wrappers). Vue-reactive `cards` and `drawPaths` refs are synced from Yjs
 * observers. This avoids all the pitfalls of wrapping Y.Doc in shallowRef/computed.
 */
export const useWhiteboardStore = defineStore('whiteboard', () => {
  // ── Yjs document (plain JS, never wrapped in Vue reactive) ────────────────

  let ydoc = new Y.Doc()
  let yCards = ydoc.getMap<Card>('cards')
  let yPaths = ydoc.getArray<DrawPath>('paths')
  let undoManager = new Y.UndoManager([yCards, yPaths], { captureTimeout: 500 })

  // ── Vue-reactive mirrors (updated by Yjs observers) ───────────────────────

  const cards = ref<Card[]>([])
  const drawPaths = ref<DrawPath[]>([])

  function _syncCards(): void {
    console.debug('[Store] _syncCards fired, count=', yCards.size)
    // JSON round-trip ensures all values are plain JS objects/primitives.
    // Yjs can return internal Y.Map/Y.Array wrappers for nested structures
    // when an update is applied from a remote peer — plain JSON forces them out.
    cards.value = Array.from(yCards.values()).map((c) => JSON.parse(JSON.stringify(c)))
  }

  function _syncPaths(): void {
    console.debug('[Store] _syncPaths fired, count=', yPaths.length)
    // Same reason as _syncCards: nested `points: number[]` inside a Y.Array item
    // comes back as a Y.Array on the receiving side. JSON round-trip makes it
    // a plain number[] so Konva's v-line config receives a real array.
    drawPaths.value = yPaths.toArray().map((p) => JSON.parse(JSON.stringify(p)))
  }

  let _observersRegistered = false

  function _registerObservers(): void {
    if (_observersRegistered) {
      yCards.unobserve(_syncCards)
      yPaths.unobserve(_syncPaths)
    }
    yCards.observe(_syncCards)
    yPaths.observe(_syncPaths)
    _observersRegistered = true
    _syncCards()
    _syncPaths()
  }

  // ── Board lifecycle ───────────────────────────────────────────────────────

  /**
   * Reset the store for a new board. Destroys the previous Y.Doc and creates
   * a fresh one, optionally hydrated from a server snapshot.
   */
  function initBoard(snapshotBytes?: number[] | null): void {
    // Tear down
    if (_observersRegistered) {
      yCards.unobserve(_syncCards)
      yPaths.unobserve(_syncPaths)
      _observersRegistered = false
    }
    ydoc.destroy()

    // Build fresh
    ydoc = new Y.Doc()
    yCards = ydoc.getMap<Card>('cards')
    yPaths = ydoc.getArray<DrawPath>('paths')
    undoManager = new Y.UndoManager([yCards, yPaths], { captureTimeout: 500 })

    if (snapshotBytes && snapshotBytes.length > 0) {
      Y.applyUpdate(ydoc, new Uint8Array(snapshotBytes))
    }

    _registerObservers()
    console.info('[Store] initBoard complete, cards=', yCards.size)
  }

  // ── Expose Y.Doc for collaboration composable ─────────────────────────────

  /** Returns the current live Y.Doc (call after initBoard) */
  function getYDoc(): Y.Doc {
    return ydoc
  }

  // ── Card mutations ────────────────────────────────────────────────────────

  function addCard(partial: Partial<Card> & { authorId: string }): Card {
    const card: Card = {
      id: crypto.randomUUID(),
      text: 'New card',
      color: '#fef08a',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      zIndex: yCards.size,
      ...partial,
    }
    yCards.set(card.id, card)
    return card
  }

  function updateCard(id: string, patch: Partial<Card>): void {
    const existing = yCards.get(id)
    if (!existing) return
    yCards.set(id, { ...existing, ...patch })
  }

  function deleteCard(id: string): void {
    yCards.delete(id)
  }

  // ── Draw path mutations ───────────────────────────────────────────────────

  function addDrawPath(path: Omit<DrawPath, 'id'>): void {
    yPaths.push([{ id: crypto.randomUUID(), ...path }])
  }

  function clearPaths(): void {
    yPaths.delete(0, yPaths.length)
  }

  // ── Remote Yjs sync ───────────────────────────────────────────────────────

  function applyRemoteUpdate(update: Uint8Array): void {
    console.debug('[Store] applyRemoteUpdate', update.length, 'bytes')
    Y.applyUpdate(ydoc, update, 'signalr')
  }

  function encodeState(): Uint8Array {
    return Y.encodeStateAsUpdate(ydoc)
  }

  // ── Undo / Redo ───────────────────────────────────────────────────────────

  function undo(): void {
    undoManager.undo()
  }

  function redo(): void {
    undoManager.redo()
  }

  return {
    // Reactive state (Vue templates bind to these)
    cards,
    drawPaths,
    // Board lifecycle
    initBoard,
    getYDoc,
    // Mutations
    addCard,
    updateCard,
    deleteCard,
    addDrawPath,
    clearPaths,
    // Sync
    applyRemoteUpdate,
    encodeState,
    // History
    undo,
    redo,
  }
})

import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as Y from 'yjs'
import type { Card, DrawPath, TextNode } from '@/types/whiteboard'

/**
 * Whiteboard store — single source of truth for canvas state.
 */
export const useWhiteboardStore = defineStore('whiteboard', () => {
  // ── Yjs document ────────────────────────────────────────────────────────
  let ydoc = new Y.Doc()
  let yCards = ydoc.getMap<Card>('cards')
  let yPaths = ydoc.getArray<DrawPath>('paths')
  let yTexts = ydoc.getMap<TextNode>('texts')
  let undoManager = new Y.UndoManager([yCards, yPaths, yTexts], { captureTimeout: 500 })

  // ── Vue-reactive mirrors ────────────────────────────────────────────────
  const cards = ref<Card[]>([])
  const drawPaths = ref<DrawPath[]>([])
  const textNodes = ref<TextNode[]>([])

  function _syncCards(): void {
    cards.value = Array.from(yCards.values()).map((c) => JSON.parse(JSON.stringify(c)))
  }

  function _syncPaths(): void {
    drawPaths.value = yPaths.toArray().map((p) => JSON.parse(JSON.stringify(p)))
  }

  function _syncTexts(): void {
    textNodes.value = Array.from(yTexts.values()).map((t) => JSON.parse(JSON.stringify(t)))
  }

  let _observersRegistered = false

  function _registerObservers(): void {
    if (_observersRegistered) {
      yCards.unobserve(_syncCards)
      yPaths.unobserve(_syncPaths)
      yTexts.unobserve(_syncTexts)
    }
    yCards.observe(_syncCards)
    yPaths.observe(_syncPaths)
    yTexts.observe(_syncTexts)
    _observersRegistered = true
    _syncCards()
    _syncPaths()
    _syncTexts()
  }

  function initBoard(snapshotBytes?: number[] | null): void {
    if (_observersRegistered) {
      yCards.unobserve(_syncCards)
      yPaths.unobserve(_syncPaths)
      yTexts.unobserve(_syncTexts)
      _observersRegistered = false
    }
    ydoc.destroy()

    ydoc = new Y.Doc()
    yCards = ydoc.getMap<Card>('cards')
    yPaths = ydoc.getArray<DrawPath>('paths')
    yTexts = ydoc.getMap<TextNode>('texts')
    undoManager = new Y.UndoManager([yCards, yPaths, yTexts], { captureTimeout: 500 })

    if (snapshotBytes && snapshotBytes.length > 0) {
      Y.applyUpdate(ydoc, new Uint8Array(snapshotBytes))
    }

    _registerObservers()
  }

  function getYDoc(): Y.Doc { return ydoc }

  // ── Card mutations ────────────────────────────────────────────────────────
  function addCard(partial: Partial<Card> & { authorId: string }): Card {
    const card: Card = {
      id: crypto.randomUUID(), text: 'New card', color: '#fef08a',
      x: 100, y: 100, width: 200, height: 150, zIndex: yCards.size, ...partial,
    }
    yCards.set(card.id, card)
    return card
  }
  function updateCard(id: string, patch: Partial<Card>): void {
    const existing = yCards.get(id)
    if (existing) yCards.set(id, { ...existing, ...patch })
  }
  function deleteCard(id: string): void { yCards.delete(id) }

  // ── Text mutations ────────────────────────────────────────────────────────
  function addText(partial: Partial<TextNode> & { authorId: string }): TextNode {
    const text: TextNode = {
      id: crypto.randomUUID(), text: '', color: '#1e293b', fontSize: 24,
      x: 100, y: 100, zIndex: yTexts.size, ...partial,
    }
    yTexts.set(text.id, text)
    return text
  }
  function updateText(id: string, patch: Partial<TextNode>): void {
    const existing = yTexts.get(id)
    if (existing) yTexts.set(id, { ...existing, ...patch })
  }
  function deleteText(id: string): void { yTexts.delete(id) }

  // ── Draw path mutations ───────────────────────────────────────────────────
  function addDrawPath(path: Omit<DrawPath, 'id'>): void {
    yPaths.push([{ id: crypto.randomUUID(), ...path }])
  }
  function clearPaths(): void { yPaths.delete(0, yPaths.length) }

  // ── Sync ──────────────────────────────────────────────────────────────────
  function applyRemoteUpdate(update: Uint8Array): void { Y.applyUpdate(ydoc, update, 'signalr') }
  function encodeState(): Uint8Array { return Y.encodeStateAsUpdate(ydoc) }

  function undo(): void { undoManager.undo() }
  function redo(): void { undoManager.redo() }

  return {
    cards, drawPaths, textNodes,
    initBoard, getYDoc,
    addCard, updateCard, deleteCard,
    addText, updateText, deleteText,
    addDrawPath, clearPaths,
    applyRemoteUpdate, encodeState,
    undo, redo,
  }
})

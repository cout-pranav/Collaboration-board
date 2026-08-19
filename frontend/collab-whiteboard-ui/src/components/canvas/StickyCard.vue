<template>
  <v-group
    :config="{
      x: card.x,
      y: card.y,
      draggable: true,
      id: card.id,
    }"
    @dragend="onDragEnd(card, $event)"
    @click="emit('select', card.id)"
    @dblclick="startEditing(card)"
  >
        <!-- Card background -->
        <v-rect
          :config="{
            width: card.width,
            height: card.height,
            fill: card.color,
            cornerRadius: 8,
            shadowColor: 'rgba(0,0,0,0.15)',
            shadowBlur: 8,
            shadowOffsetX: 2,
            shadowOffsetY: 4,
            stroke: isSelected ? '#6366f1' : 'transparent',
            strokeWidth: 2,
          }"
        />

        <!-- Card text (Konva text, hidden while textarea overlay is active) -->
        <v-text
          v-if="editingCardId !== card.id"
          :config="{
            x: 12,
            y: 12,
            width: card.width - 24,
            height: card.height - 24,
            text: card.text || 'Double-click to edit',
            fontSize: 14,
            fontFamily: 'Inter, system-ui, sans-serif',
            fill: '#1e293b',
            wrap: 'word',
            ellipsis: true,
          }"
        />

        <!-- Delete button (shown on select) -->
        <v-group
          v-if="isSelected"
          :config="{ x: card.width - 24, y: -8 }"
          @click.stop="emit('delete', card.id)"
        >
          <v-circle :config="{ radius: 10, fill: '#ef4444' }" />
          <v-text
            :config="{
              x: -4,
              y: -5,
              text: '×',
              fontSize: 14,
              fill: 'white',
              fontStyle: 'bold',
            }"
          />
        </v-group>

    <!-- Invisible overlay textarea for text editing (mounted over Konva stage) -->
  </v-group>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Card } from '@/types/whiteboard'

const props = defineProps<{
  card: Card
  isSelected?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  deselect: []
  update: [patch: Partial<Card>]
  delete: [id: string]
}>()

const editingCardId = ref<string | null>(null)

function onDragEnd(card: Card, event: { target: { x: () => number; y: () => number } }) {
  emit('update', { x: event.target.x(), y: event.target.y() })
}

function startEditing(card: Card) {
  // Use a native textarea overlay positioned over the Konva stage.
  // This is the canonical Konva pattern for rich text editing.
  editingCardId.value = card.id
  const stage = (document.querySelector('.konvajs-content') as HTMLElement | null)
  if (!stage) return

  const stageRect = stage.getBoundingClientRect()

  const textarea = document.createElement('textarea')
  textarea.value = card.text
  textarea.style.cssText = `
    position: fixed;
    top: ${stageRect.top + card.y + 12}px;
    left: ${stageRect.left + card.x + 12}px;
    width: ${card.width - 24}px;
    min-height: ${card.height - 24}px;
    font-size: 14px;
    font-family: Inter, system-ui, sans-serif;
    color: #1e293b;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    z-index: 9999;
    padding: 0;
    line-height: 1.5;
  `

  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  const finish = () => {
    emit('update', { text: textarea.value })
    textarea.remove()
    editingCardId.value = null
  }

  textarea.addEventListener('blur', finish)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      textarea.blur()
    }
  })
}
</script>

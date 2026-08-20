<template>
  <v-group
    :config="{
      x: node.x,
      y: node.y,
      draggable: true,
      id: node.id,
    }"
    @dragend="onDragEnd(node, $event)"
    @click="emit('select', node.id)"
    @dblclick="startEditing(node)"
  >
    <!-- Background hit area for easier selection -->
    <v-rect
      :config="{
        x: -4,
        y: -4,
        width: Math.max(50, (node.text.length * node.fontSize * 0.6) + 8),
        height: node.fontSize * 1.5 + 8,
        fill: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
        stroke: isSelected ? '#6366f1' : 'transparent',
        strokeWidth: 1,
        cornerRadius: 4,
      }"
    />

    <!-- Text display (hidden while editing) -->
    <v-text
      v-if="editingNodeId !== node.id"
      :config="{
        text: node.text || 'Double-click to type...',
        fontSize: node.fontSize,
        fontFamily: 'Inter, system-ui, sans-serif',
        fill: node.color,
      }"
    />

    <!-- Delete button (shown on select) -->
    <v-group
      v-if="isSelected"
      :config="{ x: -10, y: -10 }"
      @click.stop="emit('delete', node.id)"
    >
      <v-circle :config="{ radius: 8, fill: '#ef4444' }" />
      <v-text
        :config="{
          x: -3.5,
          y: -4.5,
          text: '×',
          fontSize: 12,
          fill: 'white',
          fontStyle: 'bold',
        }"
      />
    </v-group>
  </v-group>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TextNode } from '@/types/whiteboard'

defineProps<{
  node: TextNode
  isSelected?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  deselect: []
  update: [patch: Partial<TextNode>]
  delete: [id: string]
}>()

const editingNodeId = ref<string | null>(null)

function onDragEnd(node: TextNode, event: { target: { x: () => number; y: () => number } }) {
  emit('update', { x: event.target.x(), y: event.target.y() })
}

function startEditing(node: TextNode) {
  editingNodeId.value = node.id
  const stage = (document.querySelector('.konvajs-content') as HTMLElement | null)
  if (!stage) return

  const stageRect = stage.getBoundingClientRect()

  const textarea = document.createElement('textarea')
  textarea.value = node.text
  textarea.style.cssText = `
    position: fixed;
    top: ${stageRect.top + node.y - 2}px;
    left: ${stageRect.left + node.x - 2}px;
    min-width: 200px;
    min-height: ${node.fontSize * 1.5}px;
    font-size: ${node.fontSize}px;
    font-family: Inter, system-ui, sans-serif;
    color: ${node.color};
    background: transparent;
    border: 1px dashed #6366f1;
    outline: none;
    resize: none;
    z-index: 9999;
    padding: 0;
    line-height: 1.2;
    overflow: hidden;
  `

  document.body.appendChild(textarea)
  textarea.focus()
  // Move cursor to end
  textarea.setSelectionRange(textarea.value.length, textarea.value.length)

  const autoResize = () => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    textarea.style.width = 'auto';
    textarea.style.width = Math.max(200, textarea.scrollWidth + 20) + 'px';
  }
  
  textarea.addEventListener('input', autoResize)
  autoResize()

  const finish = () => {
    emit('update', { text: textarea.value })
    textarea.remove()
    editingNodeId.value = null
  }

  textarea.addEventListener('blur', finish)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      textarea.blur()
    }
  })
}
</script>

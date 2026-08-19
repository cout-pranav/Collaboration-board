<template>
  <header class="toolbar">
    <!-- Tool selector -->
    <div class="tool-group" role="toolbar" aria-label="Drawing tools">
      <button
        v-for="tool in tools"
        :key="tool.mode"
        :class="['tool-btn', { active: modelValue === tool.mode }]"
        :title="tool.label"
        :aria-pressed="modelValue === tool.mode"
        @click="emit('update:modelValue', tool.mode)"
      >
        <span class="tool-icon">{{ tool.icon }}</span>
        <span class="tool-label">{{ tool.label }}</span>
      </button>
    </div>

    <div class="divider" />

    <!-- Color picker -->
    <div class="color-group">
      <label class="color-label" for="color-picker">Color</label>
      <input
        id="color-picker"
        type="color"
        :value="color"
        @input="emit('update:color', ($event.target as HTMLInputElement).value)"
        class="color-input"
        title="Pen / card color"
      />
    </div>

    <!-- Stroke width -->
    <div class="stroke-group">
      <label class="color-label" for="stroke-width">Stroke</label>
      <input
        id="stroke-width"
        type="range"
        min="1"
        max="20"
        :value="strokeWidth"
        @input="emit('update:strokeWidth', Number(($event.target as HTMLInputElement).value))"
        class="stroke-slider"
      />
    </div>

    <div class="divider" />

    <!-- Undo / Redo -->
    <button class="tool-btn" title="Undo (Ctrl+Z)" @click="emit('undo')">↩</button>
    <button class="tool-btn" title="Redo (Ctrl+Y)" @click="emit('redo')">↪</button>

    <div class="spacer" />

    <!-- Online users presence -->
    <PresenceAvatars />

    <!-- Board name -->
    <span class="board-name">{{ boardName }}</span>
  </header>
</template>

<script setup lang="ts">
import PresenceAvatars from './PresenceAvatars.vue'
import type { ToolMode } from '@/types/whiteboard'

defineProps<{
  modelValue: ToolMode
  color: string
  strokeWidth: number
  boardName: string
}>()

const emit = defineEmits<{
  'update:modelValue': [mode: ToolMode]
  'update:color': [color: string]
  'update:strokeWidth': [width: number]
  undo: []
  redo: []
}>()

const tools: Array<{ mode: ToolMode; icon: string; label: string }> = [
  { mode: 'select', icon: '↖', label: 'Select' },
  { mode: 'draw', icon: '✏️', label: 'Draw' },
  { mode: 'card', icon: '🗒', label: 'Card' },
  { mode: 'pan', icon: '✋', label: 'Pan' },
]
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 64px;
  padding: 0 16px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
  position: relative;
  z-index: 10;
  user-select: none;
}

.tool-group {
  display: flex;
  gap: 2px;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 11px;
  color: #64748b;
  transition: background 0.15s, color 0.15s;
}

.tool-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.tool-btn.active {
  background: #ede9fe;
  color: #6366f1;
}

.tool-icon {
  font-size: 18px;
  line-height: 1;
}

.divider {
  width: 1px;
  height: 32px;
  background: #e2e8f0;
  margin: 0 6px;
}

.spacer {
  flex: 1;
}

.color-group,
.stroke-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.color-label {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 500;
}

.color-input {
  width: 32px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  padding: 2px;
  background: none;
}

.stroke-slider {
  width: 80px;
  accent-color: #6366f1;
}

.board-name {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-left: 8px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

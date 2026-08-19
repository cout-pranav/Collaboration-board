<template>
  <v-layer>
    <template v-for="cursor in props.cursors" :key="cursor.userId">
      <!-- Cursor dot -->
      <v-circle
        :config="{
          x: cursor.x,
          y: cursor.y,
          radius: 6,
          fill: cursor.avatarColor,
          shadowColor: 'rgba(0,0,0,0.3)',
          shadowBlur: 4,
        }"
      />
      <!-- Name label -->
      <v-label :config="{ x: cursor.x + 10, y: cursor.y - 8 }">
        <v-tag
          :config="{
            fill: cursor.avatarColor,
            cornerRadius: 4,
            pointerDirection: 'left',
            pointerWidth: 6,
            pointerHeight: 6,
          }"
        />
        <v-text
          :config="{
            text: cursor.displayName,
            fontSize: 11,
            padding: 4,
            fill: 'white',
            fontFamily: 'Inter, system-ui, sans-serif',
          }"
        />
      </v-label>
    </template>
  </v-layer>
</template>

<script setup lang="ts">
import type { CursorState } from '@/types/whiteboard'

const props = defineProps<{
  cursors: CursorState[]
}>()
</script>

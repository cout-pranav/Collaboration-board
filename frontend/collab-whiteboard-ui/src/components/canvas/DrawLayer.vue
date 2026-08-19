<template>
  <v-layer>
    <v-line
      v-for="path in props.paths"
      :key="path.id"
      :config="{
        points: path.points,
        stroke: path.color,
        strokeWidth: path.strokeWidth,
        lineCap: 'round',
        lineJoin: 'round',
        tension: 0.5,
        globalCompositeOperation: 'source-over',
      }"
    />
  </v-layer>
</template>

<script setup lang="ts">
import type { DrawPath } from '@/types/whiteboard'

const props = defineProps<{
  paths: DrawPath[]
}>()
</script>

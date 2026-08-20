<template>
  <div class="whiteboard-view">
    <AppToolbar
      v-model="toolMode"
      v-model:color="drawColor"
      v-model:stroke-width="strokeWidth"
      :board-name="boardName"
      @undo="whiteboardStore.undo()"
      @redo="whiteboardStore.redo()"
    />

    <WhiteboardCanvas
      v-if="!isLoading"
      :tool-mode="toolMode"
      :draw-color="drawColor"
      :draw-stroke-width="strokeWidth"
      :connection-status="connectionStatus"
      @cursor-move="onCursorMove"
      @add-card="onAddCard"
      @add-text="onAddText"
    />

    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner" />
      <p>Loading board…</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWhiteboardStore } from '@/stores/whiteboardStore'
import { useAuthStore } from '@/stores/authStore'
import { useCollaboration } from '@/composables/useCollaboration'
import { boardsApi } from '@/services/apiService'
import AppToolbar from '@/components/ui/AppToolbar.vue'
import WhiteboardCanvas from '@/components/canvas/WhiteboardCanvas.vue'
import type { ToolMode } from '@/types/whiteboard'

const route = useRoute()
const router = useRouter()
const whiteboardStore = useWhiteboardStore()
const authStore = useAuthStore()

const boardId = route.params.id as string
const boardName = ref('Board')
const isLoading = ref(true)

const toolMode = ref<ToolMode>('select')
const drawColor = ref('#6366f1')
const strokeWidth = ref(4)

const { join, leave, sendCursor, connectionStatus } = useCollaboration(boardId)

onMounted(async () => {
  try {
    const detail = await boardsApi.get(boardId)
    boardName.value = detail.name

    // Hydrate Yjs doc from server snapshot (if exists)
    whiteboardStore.initBoard(detail.yjsDocState)

    await join()
  } catch {
    router.push('/boards')
  } finally {
    isLoading.value = false
  }

  // Keyboard shortcuts
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  leave()
})

function onCursorMove(x: number, y: number) {
  sendCursor(x, y)
}

function onAddCard(x: number, y: number) {
  whiteboardStore.addCard({
    x,
    y,
    color: drawColor.value,
    authorId: authStore.user?.userId ?? 'unknown',
  })
  toolMode.value = 'select'
}

function onAddText(x: number, y: number) {
  whiteboardStore.addText({
    x,
    y,
    color: drawColor.value,
    fontSize: Math.max(16, strokeWidth.value * 6), // Scale font with stroke width
    authorId: authStore.user?.userId ?? 'unknown',
  })
  toolMode.value = 'select'
}

function onKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault()
    whiteboardStore.undo()
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
    e.preventDefault()
    whiteboardStore.redo()
  }
}
</script>

<style scoped>
.whiteboard-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.loading-overlay {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  color: #64748b;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>

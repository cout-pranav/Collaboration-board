<template>
  <div class="whiteboard-wrapper" ref="containerRef">
    <!-- Connection status banner -->
    <Transition name="fade">
      <div v-if="connectionStatus !== 'connected'" class="connection-banner">
        <span v-if="connectionStatus === 'reconnecting'">⚡ Reconnecting…</span>
        <span v-else>🔌 Disconnected</span>
      </div>
    </Transition>

    <v-stage
      ref="stageRef"
      :config="stageConfig"
      @mousedown="onStageMouseDown"
      @touchstart="onStageMouseDown"
      @mousemove="onStageMouseMove"
      @touchmove="onStageMouseMove"
      @mouseup="onStageMouseUp"
      @touchend="onStageMouseUp"
      @wheel="onWheel"
      @click="onStageClick"
      @tap="onStageClick"
    >
      <!-- Draw layer — freehand paths (below cards) -->
      <DrawLayer :paths="whiteboardStore.drawPaths" />

      <!-- Card layer — sticky cards -->
      <v-layer>
        <StickyCard
          v-for="card in whiteboardStore.cards"
          :key="card.id"
          :card="card"
          :is-selected="selectedCardId === card.id"
          @select="selectedCardId = card.id"
          @deselect="selectedCardId = null"
          @update="whiteboardStore.updateCard(card.id, $event)"
          @delete="whiteboardStore.deleteCard(card.id)"
        />
      </v-layer>

      <!-- Text layer — native text nodes -->
      <v-layer>
        <TextNodeComponent
          v-for="text in whiteboardStore.textNodes"
          :key="text.id"
          :node="text"
          :is-selected="selectedTextId === text.id"
          @select="selectedTextId = text.id"
          @deselect="selectedTextId = null"
          @update="whiteboardStore.updateText(text.id, $event)"
          @delete="whiteboardStore.deleteText(text.id)"
        />
      </v-layer>

      <!-- Cursor layer — remote user cursors (topmost) -->
      <CursorLayer :cursors="Array.from(presenceStore.cursors.values())" />
    </v-stage>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWhiteboardStore } from '@/stores/whiteboardStore'
import { usePresenceStore } from '@/stores/presenceStore'
import { useAuthStore } from '@/stores/authStore'
import DrawLayer from './DrawLayer.vue'
import StickyCard from './StickyCard.vue'
import TextNodeComponent from './TextNodeComponent.vue'
import CursorLayer from './CursorLayer.vue'

const props = defineProps<{
  toolMode: 'select' | 'draw' | 'card' | 'pan' | 'text'
  drawColor: string
  drawStrokeWidth: number
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
}>()

const emit = defineEmits<{
  cursorMove: [x: number, y: number]
  addCard: [x: number, y: number]
  addText: [x: number, y: number]
}>()

const whiteboardStore = useWhiteboardStore()
const presenceStore = usePresenceStore()
const authStore = useAuthStore()

const containerRef = ref<HTMLDivElement>()
const stageRef = ref()
const selectedCardId = ref<string | null>(null)
const selectedTextId = ref<string | null>(null)

// ── Stage sizing ──────────────────────────────────────────────────────────────

const stageWidth = ref(window.innerWidth)
const stageHeight = ref(window.innerHeight - 64) // subtract toolbar height

const stageConfig = computed(() => ({
  width: stageWidth.value,
  height: stageHeight.value,
  draggable: props.toolMode === 'pan',
}))

function onResize() {
  stageWidth.value = window.innerWidth
  stageHeight.value = window.innerHeight - 64
}

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

// ── Zoom (Ctrl + scroll) ──────────────────────────────────────────────────────

function onWheel(e: { evt: WheelEvent }) {
  if (!e.evt.ctrlKey) return
  e.evt.preventDefault()
  const stage = stageRef.value?.getStage()
  if (!stage) return

  const scaleBy = 1.05
  const oldScale = stage.scaleX()
  const pointer = stage.getPointerPosition()!
  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  }
  const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
  const clampedScale = Math.max(0.1, Math.min(newScale, 5))

  stage.scale({ x: clampedScale, y: clampedScale })
  stage.position({
    x: pointer.x - mousePointTo.x * clampedScale,
    y: pointer.y - mousePointTo.y * clampedScale,
  })
}

// ── Drawing ───────────────────────────────────────────────────────────────────

const isDrawing = ref(false)
const activePath = ref<number[]>([])

function getRelativePointer(): { x: number; y: number } | null {
  const stage = stageRef.value?.getStage()
  return stage?.getRelativePointerPosition() ?? null
}

function onStageMouseDown() {
  if (props.toolMode !== 'draw') return
  const pos = getRelativePointer()
  if (!pos) return
  isDrawing.value = true
  activePath.value = [pos.x, pos.y]
}

function onStageMouseMove() {
  const pos = getRelativePointer()
  if (!pos) return

  // Emit cursor move for presence tracking (throttled in composable)
  emit('cursorMove', pos.x, pos.y)

  if (props.toolMode !== 'draw' || !isDrawing.value) return
  activePath.value = [...activePath.value, pos.x, pos.y]
}

function onStageMouseUp() {
  if (props.toolMode !== 'draw' || !isDrawing.value) return
  isDrawing.value = false
  if (activePath.value.length >= 4) {
    whiteboardStore.addDrawPath({
      points: activePath.value,
      color: props.drawColor,
      strokeWidth: props.drawStrokeWidth,
      authorId: authStore.user?.userId ?? 'unknown',
    })
  }
  activePath.value = []
}

function onStageClick(e: { target: { getStage: () => unknown } }) {
  if (props.toolMode !== 'card' && props.toolMode !== 'text') {
    // Clear selection if clicking empty canvas with select tool
    if (props.toolMode === 'select' && e.target === stageRef.value?.getStage()) {
      selectedCardId.value = null
      selectedTextId.value = null
    }
    return
  }
  
  const stage = stageRef.value?.getStage()
  // Only add card/text if clicking on empty stage (not on an existing shape)
  if (e.target !== stage) return
  const pos = getRelativePointer()
  if (!pos) return

  if (props.toolMode === 'card') {
    emit('addCard', pos.x, pos.y)
  } else if (props.toolMode === 'text') {
    emit('addText', pos.x, pos.y)
  }
}
</script>

<style scoped>
.whiteboard-wrapper {
  position: relative;
  overflow: hidden;
  background: #f8fafc;
  background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px);
  background-size: 24px 24px;
  touch-action: none; /* Prevents mobile browser pull-to-refresh and scrolling when drawing */
}

.connection-banner {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  padding: 6px 16px;
  background: #1e293b;
  color: #f8fafc;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 500;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

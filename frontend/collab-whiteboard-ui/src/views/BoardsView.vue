<template>
  <div class="boards-page">
    <header class="page-header">
      <div class="header-left">
        <span class="logo-icon">🖊</span>
        <h1>CollabBoard</h1>
      </div>
      <div class="header-right">
        <span class="user-chip">
          <span class="avatar" :style="{ background: authStore.user?.avatarColor ?? '#6366f1' }">
            {{ initials(authStore.user?.displayName) }}
          </span>
          {{ authStore.user?.displayName }}
        </span>
        <button class="logout-btn" @click="logout">Sign out</button>
      </div>
    </header>

    <main class="boards-main">
      <div class="boards-heading">
        <h2>Your Boards</h2>
        <button class="create-btn" @click="showCreate = true">+ New Board</button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="loading">Loading boards…</div>

      <!-- Empty state -->
      <div v-else-if="boards.length === 0" class="empty-state">
        <span class="empty-icon">🗒</span>
        <p>No boards yet. Create your first one!</p>
      </div>

      <!-- Board grid -->
      <div v-else class="boards-grid">
        <RouterLink
          v-for="board in boards"
          :key="board.id"
          :to="`/boards/${board.id}`"
          class="board-card"
        >
          <div class="board-color-strip" :style="{ background: colorFor(board.id ?? '') }" />
          <div class="board-info">
            <h3>{{ board.name }}</h3>
            <p>by {{ board.ownerDisplayName }}</p>
            <p class="board-date">{{ formatDate(board.updatedAt) }}</p>
          </div>
          <button
            class="delete-btn"
            title="Delete board"
            @click.prevent="deleteBoard(board.id)"
          >
            ×
          </button>
        </RouterLink>
      </div>
    </main>

    <!-- Create board modal -->
    <Transition name="fade">
      <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
        <div class="modal">
          <h3>New Board</h3>
          <form @submit.prevent="createBoard">
            <input
              v-model="newBoardName"
              type="text"
              placeholder="Board name"
              required
              autofocus
              class="modal-input"
            />
            <div class="modal-actions">
              <button type="button" class="cancel-btn" @click="showCreate = false">Cancel</button>
              <button type="submit" class="submit-btn">Create</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { boardsApi } from '@/services/apiService'
import { signalRService } from '@/services/signalrService'
import type { Board } from '@/types/whiteboard'

const authStore = useAuthStore()
const router = useRouter()

const boards = ref<Board[]>([])
const isLoading = ref(true)
const showCreate = ref(false)
const newBoardName = ref('')

const COLORS = ['#6366f1', '#8b5cf6', '#14b8a6', '#f97316', '#22c55e', '#3b82f6']
function colorFor(id: string | undefined): string {
  if (!id) return COLORS[0] ?? '#6366f1'
  return COLORS[id.charCodeAt(0) % COLORS.length] ?? '#6366f1'
}

        function initials(name: string | undefined): string {
  return (name ?? '').split(' ').map((n) => n[0]?.toUpperCase() ?? '').slice(0, 2).join('')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(async () => {
  try {
    boards.value = await boardsApi.list()

    // Connect to SignalR to receive real-time updates for the dashboard
    if (authStore.token) {
      await signalRService.connect(authStore.token)
      signalRService.onBoardCreated((newBoard) => {
        // Prevent duplicates if we just created it ourselves
        if (!boards.value.some((b) => b.id === newBoard.id)) {
          boards.value.unshift(newBoard)
        }
      })
    }
  } finally {
    isLoading.value = false
  }
})

async function createBoard() {
  if (!newBoardName.value.trim()) return
  const board = await boardsApi.create(newBoardName.value.trim())
  boards.value.unshift(board)
  showCreate.value = false
  newBoardName.value = ''
  router.push(`/boards/${board.id}`)
}

async function deleteBoard(id: string) {
  if (!confirm('Delete this board? This cannot be undone.')) return
  await boardsApi.delete(id)
  boards.value = boards.value.filter((b) => b.id !== id)
}

async function logout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.boards-page {
  min-height: 100vh;
  background: #f8fafc;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 64px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon { font-size: 24px; }

.header-left h1 {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #475569;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: white;
}

.logout-btn {
  padding: 6px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  color: #64748b;
}
.logout-btn:hover { background: #f1f5f9; }

.boards-main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px;
}

.boards-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.boards-heading h2 {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.create-btn {
  padding: 10px 20px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.create-btn:hover { background: #4f46e5; }

.loading, .empty-state {
  text-align: center;
  padding: 80px 0;
  color: #94a3b8;
}

.empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }

.boards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

.board-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  text-decoration: none;
  transition: box-shadow 0.2s, transform 0.2s;
}

.board-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.12); transform: translateY(-2px); }

.board-color-strip { height: 6px; }

.board-info { padding: 16px; }

.board-info h3 { font-size: 15px; font-weight: 600; color: #1e293b; margin: 0 0 4px; }
.board-info p { font-size: 12px; color: #64748b; margin: 0; }
.board-date { margin-top: 8px !important; font-size: 11px; color: #94a3b8 !important; }

.delete-btn {
  position: absolute;
  top: 14px;
  right: 12px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: 16px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.board-card:hover .delete-btn { opacity: 1; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  width: 360px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

.modal h3 { margin: 0 0 20px; font-size: 18px; color: #1e293b; }

.modal-input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  outline: none;
  box-sizing: border-box;
  margin-bottom: 16px;
}
.modal-input:focus { border-color: #6366f1; }

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; }

.cancel-btn {
  padding: 8px 18px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 14px;
}

.submit-btn {
  padding: 8px 20px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

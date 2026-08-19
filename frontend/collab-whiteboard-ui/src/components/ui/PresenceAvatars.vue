<template>
  <div class="presence-avatars" role="list" aria-label="Online collaborators">
    <div
      v-for="user in onlineUsers"
      :key="user.userId"
      class="avatar"
      :style="{ background: user.avatarColor }"
      :title="user.displayName"
      role="listitem"
    >
      {{ initials(user.displayName) }}
    </div>
    <div
      v-if="currentUser"
      class="avatar current"
      :style="{ background: currentUser.avatarColor }"
      :title="`${currentUser.displayName} (you)`"
    >
      {{ initials(currentUser.displayName) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePresenceStore } from '@/stores/presenceStore'
import { useAuthStore } from '@/stores/authStore'

const presenceStore = usePresenceStore()
const authStore = useAuthStore()

const onlineUsers = computed(() => Array.from(presenceStore.onlineUsers.values()))
const currentUser = computed(() => authStore.user)

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}
</script>

<style scoped>
.presence-avatars {
  display: flex;
  gap: -8px;
  align-items: center;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: white;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  margin-left: -6px;
  cursor: default;
  transition: transform 0.15s;
  position: relative;
}

.avatar:first-child {
  margin-left: 0;
}

.avatar:hover {
  transform: translateY(-2px) scale(1.1);
  z-index: 1;
}

.avatar.current {
  border-color: #6366f1;
}
</style>

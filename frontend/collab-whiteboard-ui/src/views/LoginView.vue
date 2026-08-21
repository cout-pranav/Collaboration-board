<template>
  <div class="login-page">
    <div class="login-card">
      <div class="logo">
        <span class="logo-icon">🖊</span>
        <h1>CollabBoard</h1>
        <p class="tagline">Real-time collaborative workspace</p>
      </div>

      <!-- Tab toggle -->
      <div class="tabs" role="tablist">
        <button
          :class="['tab', { active: mode === 'login' }]"
          role="tab"
          :aria-selected="mode === 'login'"
          cls
          @click="mode = 'login'"
        >
          Sign In
        </button>
        <button
          :class="['tab', { active: mode === 'register' }]"
          role="tab"
          :aria-selected="mode === 'register'"
          @click="mode = 'register'"
        >
          Register
        </button>
      </div>

      <form @submit.prevent="submit" class="form" novalidate>
        <div v-if="mode === 'register'" class="field">
          <label for="displayName">Display Name</label>
          <input
            id="displayName"
            v-model="displayName"
            type="text"
            placeholder="Alice Smith"
            required
            autocomplete="name"
          />
        </div>

        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="current-password"
            minlength="8"
          />
        </div>

        <div v-if="authStore.error" class="error-msg" role="alert">
          {{ authStore.error }}
        </div>

        <button type="submit" class="submit-btn" :disabled="authStore.isLoading">
          <span v-if="authStore.isLoading">Loading…</span>
          <span v-else>{{ mode === 'login' ? 'Sign In' : 'Create Account' }}</span>
        </button>
      </form>

      <div class="divider">
        <span>OR</span>
      </div>

      <button @click="handleMicrosoftLogin" type="button" class="ms-btn" :disabled="isMsLoading || authStore.isLoading">
        <svg class="ms-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21">
          <path fill="#f35325" d="M0 0h10v10H0z"/>
          <path fill="#81bc06" d="M11 0h10v10H11z"/>
          <path fill="#05a6f0" d="M0 11h10v10H0z"/>
          <path fill="#ffba08" d="M11 11h10v10H11z"/>
        </svg>
        {{ isMsLoading ? 'Loading...' : 'Sign in with Microsoft' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { initMsal, loginWithMicrosoft } from '@/services/msalService'

const authStore = useAuthStore()
const router = useRouter()

const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const displayName = ref('')
const isMsLoading = ref(false)

onMounted(() => {
  // We must initialize MSAL as soon as this page loads!
  // When Microsoft redirects back to this page inside the popup, 
  // initializing MSAL allows it to detect the popup, send the token to the parent, and close itself.
  initMsal()
})

async function submit() {
  try {
    if (mode.value === 'login') {
      await authStore.login(email.value, password.value)
    } else {
      await authStore.register(email.value, password.value, displayName.value)
    }
    router.push('/boards')
  } catch {
    // Error displayed via authStore.error
  }
}

async function handleMicrosoftLogin() {
  if (isMsLoading.value || authStore.isLoading) return
  isMsLoading.value = true
  
  try {
    const idToken = await loginWithMicrosoft()
    await authStore.microsoftLogin(idToken)
    router.push('/boards')
  } catch (err) {
    authStore.error = (err as Error).message ?? 'Microsoft login failed'
  } finally {
    isMsLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
}

.login-card {
  background: white;
  border-radius: 20px;
  padding: 40px 36px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.logo {
  text-align: center;
  margin-bottom: 28px;
}

.logo-icon {
  font-size: 48px;
}

.logo h1 {
  margin: 8px 0 4px;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.tagline {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

.tabs {
  display: flex;
  gap: 0;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 24px;
}

.tab {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  transition:
    background 0.15s,
    color 0.15s;
}

.tab.active {
  background: white;
  color: #6366f1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.field input {
  padding: 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.field input:focus {
  border-color: #6366f1;
}

.error-msg {
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  border-radius: 8px;
  font-size: 13px;
}

.submit-btn {
  padding: 12px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    opacity 0.15s;
  margin-top: 4px;
}

.submit-btn:hover:not(:disabled) {
  background: #4f46e5;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 20px 0;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e2e8f0;
}
.divider span {
  padding: 0 10px;
}

.ms-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: white;
  color: #374151;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.ms-btn:hover:not(:disabled) {
  background: #f8fafc;
}

.ms-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ms-icon {
  width: 18px;
  height: 18px;
}
</style>

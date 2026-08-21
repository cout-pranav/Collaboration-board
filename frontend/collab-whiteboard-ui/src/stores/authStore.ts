import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/apiService'
import { signalRService } from '@/services/signalrService'
import type { AuthUser } from '@/types/whiteboard'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)

  /** Restore session from localStorage on app load */
  function restore(): void {
    const stored = localStorage.getItem('auth_user')
    if (stored) {
      try {
        user.value = JSON.parse(stored) as AuthUser
      } catch {
        localStorage.removeItem('auth_user')
        localStorage.removeItem('jwt_token')
      }
    }
  }

  async function login(email: string, password: string): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const authUser = await authApi.login(email, password)
      _persist(authUser)
      await signalRService.connect(authUser.token)
    } catch (e: unknown) {
      error.value = (e as Error).message ?? 'Login failed'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const authUser = await authApi.register(email, password, displayName)
      _persist(authUser)
      await signalRService.connect(authUser.token)
    } catch (e: unknown) {
      error.value = (e as Error).message ?? 'Registration failed'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    await signalRService.disconnect()
    user.value = null
    localStorage.removeItem('auth_user')
    localStorage.removeItem('jwt_token')
    
    try {
      const { logoutMicrosoft } = await import('@/services/msalService')
      await logoutMicrosoft()
    } catch (e) {
      console.error('Failed to log out of Microsoft', e)
    }
  }

  function _persist(authUser: AuthUser): void {
    user.value = authUser
    localStorage.setItem('auth_user', JSON.stringify(authUser))
    localStorage.setItem('jwt_token', authUser.token)
  }

  async function microsoftLogin(idToken: string): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const authUser = await authApi.microsoftLogin(idToken)
      _persist(authUser)
      await signalRService.connect(authUser.token)
    } catch (e: unknown) {
      error.value = (e as Error).message ?? 'Microsoft Login failed'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  return { user, isAuthenticated, isLoading, error, restore, login, register, microsoftLogin, logout }
})

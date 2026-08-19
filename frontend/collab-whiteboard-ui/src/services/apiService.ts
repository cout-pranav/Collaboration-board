import axios from 'axios'
import type { AuthUser, Board, BoardDetail } from '@/types/whiteboard'

const api = axios.create({
  // Empty baseURL = use current window origin.
  // In dev: Vite proxy forwards /api/* → http://localhost:5000
  // In Docker prod: API serves both the SPA and /api from the same origin
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data
      ? Array.isArray(err.response.data)
        ? err.response.data.join(', ')
        : err.response.data.message || err.response.data
      : err.message
    return Promise.reject(new Error(message))
  },
)

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (email: string, password: string, displayName: string): Promise<AuthUser> =>
    api.post<AuthUser>('/api/auth/register', { email, password, displayName }).then((r) => r.data),

  login: (email: string, password: string): Promise<AuthUser> =>
    api.post<AuthUser>('/api/auth/login', { email, password }).then((r) => r.data),

  me: (): Promise<AuthUser> => api.get<AuthUser>('/api/auth/me').then((r) => r.data),
}

// ── Boards ────────────────────────────────────────────────────────────────────

export const boardsApi = {
  list: (): Promise<Board[]> => api.get<Board[]>('/api/boards').then((r) => r.data),

  get: (id: string): Promise<BoardDetail> =>
    api.get<BoardDetail>(`/api/boards/${id}`).then((r) => r.data),

  create: (name: string): Promise<Board> =>
    api.post<Board>('/api/boards', { name }).then((r) => r.data),

  delete: (id: string): Promise<void> => api.delete(`/api/boards/${id}`).then(() => {}),

  /** Persist the current Yjs document binary to the server for recovery */
  saveSnapshot: (id: string, yjsDocState: Uint8Array): Promise<void> =>
    api.post(`/api/boards/${id}/snapshot`, { yjsDocState: Array.from(yjsDocState) }).then(() => {}),
}

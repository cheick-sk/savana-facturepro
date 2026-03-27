import { create } from 'zustand'
import api from '../lib/api'

interface User { id: number; email: string; first_name: string; last_name: string; role: string }
interface AuthState {
  user: User | null; loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void; init: () => void
}

// Helper to safely parse JSON from localStorage
function safeJsonParse<T>(value: string | null): T | null {
  if (!value || value === 'undefined' || value === 'null') {
    return null
  }
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, loading: false,
  init: () => {
    const raw = localStorage.getItem('user')
    const user = safeJsonParse<User>(raw)
    if (user) set({ user })
  },
  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token)
      }
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token)
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
        set({ user: data.user, loading: false })
      } else {
        set({ loading: false })
      }
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },
  logout: () => { localStorage.clear(); set({ user: null }) },
}))

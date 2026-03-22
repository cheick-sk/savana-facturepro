import { create } from 'zustand'
import api from '../lib/api'

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
  organisation_id?: number
}

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  init: () => void
}

// Safe JSON parse to handle "undefined" string
function safeJsonParse(str: string | null): User | null {
  if (!str || str === 'undefined' || str === 'null') return null
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,

  init: () => {
    const raw = localStorage.getItem('user')
    const user = safeJsonParse(raw)
    if (user) set({ user })
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      set({ user: data.user, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    set({ user: null })
  },
}))

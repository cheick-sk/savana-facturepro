import { create } from 'zustand'
import api from '../lib/api'

interface User { id: number; email: string; first_name: string; last_name: string; role: string }
interface AuthState {
  user: User | null; loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void; init: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, loading: false,
  init: () => { const raw = localStorage.getItem('user'); if (raw) set({ user: JSON.parse(raw) }) },
  login: async (email, password) => {
    set({ loading: true })
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    set({ user: data.user, loading: false })
  },
  logout: () => { localStorage.clear(); set({ user: null }) },
}))

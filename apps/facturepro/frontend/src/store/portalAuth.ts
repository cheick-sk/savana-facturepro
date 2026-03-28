import { create } from 'zustand'

interface PortalClient {
  id: number
  email: string
  phone: string | null
  preferred_language: string
  email_verified: boolean
  customer: {
    id: number
    name: string
  } | null
}

interface PortalAuthState {
  client: PortalClient | null
  token: string | null
  loading: boolean

  init: () => void
  setClient: (client: PortalClient, token: string) => void
  logout: () => void
}

function safeJsonParse(str: string | null): PortalClient | null {
  if (!str || str === 'undefined' || str === 'null') return null
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

export const usePortalAuthStore = create<PortalAuthState>((set) => ({
  client: null,
  token: null,
  loading: false,

  init: () => {
    const token = localStorage.getItem('portal_token')
    const clientRaw = localStorage.getItem('portal_client')
    const client = safeJsonParse(clientRaw)
    if (token && client) {
      set({ token, client })
    }
  },

  setClient: (client, token) => {
    localStorage.setItem('portal_token', token)
    localStorage.setItem('portal_refresh', localStorage.getItem('portal_refresh') || '')
    localStorage.setItem('portal_client', JSON.stringify(client))
    set({ client, token })
  },

  logout: () => {
    localStorage.removeItem('portal_token')
    localStorage.removeItem('portal_refresh')
    localStorage.removeItem('portal_client')
    set({ client: null, token: null })
  },
}))

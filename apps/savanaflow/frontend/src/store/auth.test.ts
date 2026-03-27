import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '../store/auth'

// Mock API calls
vi.mock('../lib/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

describe('Auth Store - SavanaFlow', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      currentStore: null,
    })
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState()

      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.currentStore).toBeNull()
    })
  })

  describe('Store Management', () => {
    it('should set current store', () => {
      const { result } = renderHook(() => useAuthStore())
      const mockStore = {
        id: 1,
        name: 'Main Store',
        address: 'Conakry, Guinea',
        phone: '+224 123 456 789',
      }

      act(() => {
        result.current.setCurrentStore(mockStore)
      })

      expect(result.current.currentStore).toEqual(mockStore)
    })

    it('should clear store on logout', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setCurrentStore({
          id: 1,
          name: 'Main Store',
          address: 'Conakry',
          phone: '+224',
        })
        result.current.setUser({
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'cashier',
          tenant_id: 1,
        })
      })

      act(() => {
        result.current.logout()
      })

      expect(result.current.currentStore).toBeNull()
      expect(result.current.user).toBeNull()
    })
  })

  describe('User Roles', () => {
    it('should handle admin role', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setUser({
          id: 1,
          email: 'admin@example.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          tenant_id: 1,
        })
      })

      expect(result.current.user?.role).toBe('admin')
    })

    it('should handle cashier role', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setUser({
          id: 2,
          email: 'cashier@example.com',
          first_name: 'Cashier',
          last_name: 'User',
          role: 'cashier',
          tenant_id: 1,
        })
      })

      expect(result.current.user?.role).toBe('cashier')
    })

    it('should handle manager role', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setUser({
          id: 3,
          email: 'manager@example.com',
          first_name: 'Manager',
          last_name: 'User',
          role: 'manager',
          tenant_id: 1,
        })
      })

      expect(result.current.user?.role).toBe('manager')
    })
  })

  describe('Error Handling', () => {
    it('should set error message', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setError('Invalid login credentials')
      })

      expect(result.current.error).toBe('Invalid login credentials')
    })

    it('should clear error', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setError('Error')
      })
      expect(result.current.error).toBe('Error')

      act(() => {
        result.current.clearError()
      })
      expect(result.current.error).toBeNull()
    })
  })
})

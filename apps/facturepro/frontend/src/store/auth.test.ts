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

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
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
    })
  })

  describe('Login Actions', () => {
    it('should set loading state during login', async () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setLoading(true)
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('should set error state', () => {
      const { result } = renderHook(() => useAuthStore())
      const errorMessage = 'Invalid credentials'

      act(() => {
        result.current.setError(errorMessage)
      })

      expect(result.current.error).toBe(errorMessage)
    })

    it('should clear error', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setError('Some error')
      })
      expect(result.current.error).toBe('Some error')

      act(() => {
        result.current.clearError()
      })
      expect(result.current.error).toBeNull()
    })
  })

  describe('User Management', () => {
    it('should set user and authenticate', () => {
      const { result } = renderHook(() => useAuthStore())
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'admin',
        tenant_id: 1,
      }

      act(() => {
        result.current.setUser(mockUser)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should set token', () => {
      const { result } = renderHook(() => useAuthStore())
      const mockToken = 'jwt-token-123'

      act(() => {
        result.current.setToken(mockToken)
      })

      expect(result.current.token).toBe(mockToken)
    })

    it('should logout and clear state', () => {
      const { result } = renderHook(() => useAuthStore())

      // First set some state
      act(() => {
        result.current.setUser({
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'admin',
          tenant_id: 1,
        })
        result.current.setToken('token')
      })

      // Then logout
      act(() => {
        result.current.logout()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.token).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('Persisted State', () => {
    it('should persist auth state to localStorage on login', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setToken('persisted-token')
      })

      // Check that localStorage was called
      expect(window.localStorage.setItem).toHaveBeenCalled()
    })
  })
})

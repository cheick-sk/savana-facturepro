import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '../store/auth'

// Mock API
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
      loading: false,
    })
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState()

      expect(state.user).toBeNull()
      expect(state.loading).toBe(false)
    })
  })

  describe('Init', () => {
    it('should restore user from localStorage', () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'admin',
      }
      localStorage.setItem('user', JSON.stringify(mockUser))

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.init()
      })

      expect(result.current.user).toEqual(mockUser)
    })

    it('should handle invalid localStorage data', () => {
      localStorage.setItem('user', 'undefined')

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.init()
      })

      expect(result.current.user).toBeNull()
    })

    it('should handle null localStorage', () => {
      localStorage.setItem('user', 'null')

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.init()
      })

      expect(result.current.user).toBeNull()
    })
  })

  describe('Login', () => {
    it('should set loading during login', async () => {
      const { result } = renderHook(() => useAuthStore())

      const api = await import('../lib/api')
      vi.mocked(api.default.post).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          data: { access_token: 'token', user: { id: 1, email: 'test@test.com', first_name: 'Test', last_name: 'User', role: 'admin' } }
        } as any, 100))
      )

      act(() => {
        result.current.login('test@test.com', 'password')
      })

      // Loading should be true during the async call
      expect(result.current.loading).toBe(true)
    })

    it('should set user on successful login', async () => {
      const { result } = renderHook(() => useAuthStore())

      const api = await import('../lib/api')
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'admin',
      }

      vi.mocked(api.default.post).mockResolvedValueOnce({
        data: {
          access_token: 'test-token',
          refresh_token: 'refresh-token',
          user: mockUser,
        },
      } as any)

      await act(async () => {
        await result.current.login('test@example.com', 'password')
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.loading).toBe(false)
      expect(localStorage.getItem('access_token')).toBe('test-token')
    })

    it('should handle login error', async () => {
      const { result } = renderHook(() => useAuthStore())

      const api = await import('../lib/api')
      vi.mocked(api.default.post).mockRejectedValueOnce(new Error('Invalid credentials'))

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrong')
        } catch (e) {
          expect(e).toBeDefined()
        }
      })

      expect(result.current.user).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })

  describe('Logout', () => {
    it('should clear user on logout', () => {
      const { result } = renderHook(() => useAuthStore())

      // First set a user
      act(() => {
        useAuthStore.setState({
          user: {
            id: 1,
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            role: 'admin',
          },
        })
      })

      expect(result.current.user).not.toBeNull()

      // Then logout
      act(() => {
        result.current.logout()
      })

      expect(result.current.user).toBeNull()
    })

    it('should clear localStorage on logout', () => {
      localStorage.setItem('access_token', 'token')
      localStorage.setItem('user', JSON.stringify({ id: 1 }))

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.logout()
      })

      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })
  })
})

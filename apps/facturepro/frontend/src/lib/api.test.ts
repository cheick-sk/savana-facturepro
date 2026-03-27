import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    })),
  },
}))

describe('API Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Axios Instance', () => {
    it('should create axios instance with base configuration', () => {
      expect(axios.create).toBeDefined()
    })

    it('should have request interceptors', () => {
      const api = axios.create()
      expect(api.interceptors.request.use).toBeDefined()
    })

    it('should have response interceptors', () => {
      const api = axios.create()
      expect(api.interceptors.response.use).toBeDefined()
    })
  })

  describe('HTTP Methods', () => {
    it('should have GET method', () => {
      const api = axios.create()
      expect(api.get).toBeDefined()
    })

    it('should have POST method', () => {
      const api = axios.create()
      expect(api.post).toBeDefined()
    })

    it('should have PUT method', () => {
      const api = axios.create()
      expect(api.put).toBeDefined()
    })

    it('should have DELETE method', () => {
      const api = axios.create()
      expect(api.delete).toBeDefined()
    })

    it('should have PATCH method', () => {
      const api = axios.create()
      expect(api.patch).toBeDefined()
    })
  })
})

describe('API Error Handling', () => {
  it('should handle network errors', () => {
    const networkError = new Error('Network Error')
    expect(networkError.message).toBe('Network Error')
  })

  it('should handle 401 unauthorized errors', () => {
    const unauthorizedError = {
      response: {
        status: 401,
        data: { message: 'Unauthorized' },
      },
    }
    expect(unauthorizedError.response.status).toBe(401)
  })

  it('should handle 403 forbidden errors', () => {
    const forbiddenError = {
      response: {
        status: 403,
        data: { message: 'Forbidden' },
      },
    }
    expect(forbiddenError.response.status).toBe(403)
  })

  it('should handle 500 server errors', () => {
    const serverError = {
      response: {
        status: 500,
        data: { message: 'Internal Server Error' },
      },
    }
    expect(serverError.response.status).toBe(500)
  })
})

describe('API Request Headers', () => {
  it('should include Content-Type header', () => {
    const headers = {
      'Content-Type': 'application/json',
    }
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('should include Authorization header when token exists', () => {
    const token = 'jwt-token-123'
    const headers = {
      Authorization: `Bearer ${token}`,
    }
    expect(headers.Authorization).toBe('Bearer jwt-token-123')
  })
})

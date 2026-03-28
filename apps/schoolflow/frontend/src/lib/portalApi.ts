import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

export const portalApi = axios.create({
  baseURL: `${BASE}/api/v1/parent`,
  headers: { 'Content-Type': 'application/json' },
})

portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('parent_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

portalApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('parent_refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE}/api/v1/parent/auth/refresh`, { refresh_token: refresh })
          localStorage.setItem('parent_access_token', data.access_token)
          localStorage.setItem('parent_refresh_token', data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return portalApi(original)
        } catch {
          localStorage.removeItem('parent_access_token')
          localStorage.removeItem('parent_refresh_token')
          localStorage.removeItem('parent_user')
          window.location.href = '/portal/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default portalApi

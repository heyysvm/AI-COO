import axios from 'axios'
import { API_BASE_URL } from '@/lib/constants'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

api.interceptors.request.use(
  (config) => {
    const tokensRaw = localStorage.getItem('auth_tokens')
    if (tokensRaw) {
      try {
        const tokens = JSON.parse(tokensRaw) as { access_token: string }
        if (tokens.access_token) {
          config.headers.Authorization = `Bearer ${tokens.access_token}`
        }
      } catch {
        // Invalid token data, skip
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true

      try {
        const tokensRaw = localStorage.getItem('auth_tokens')
        if (tokensRaw) {
          const tokens = JSON.parse(tokensRaw) as { refresh_token: string }
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: tokens.refresh_token,
          })

          const newTokens = response.data
          localStorage.setItem('auth_tokens', JSON.stringify(newTokens))
          originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`
          return api(originalRequest)
        }
      } catch {
        localStorage.removeItem('auth_tokens')
        localStorage.removeItem('auth_user')
        window.location.hash = '#/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api

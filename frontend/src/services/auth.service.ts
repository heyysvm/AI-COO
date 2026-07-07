import api from './api'
import type {
  LoginRequest,
  RegisterRequest,
  AuthTokens,
  User,
} from '@/types/api.types'

export const authService = {
  async login(data: LoginRequest): Promise<AuthTokens> {
    const response = await api.post<AuthTokens>('/auth/login', data)
    return response.data
  },

  async register(data: RegisterRequest): Promise<AuthTokens> {
    const response = await api.post<AuthTokens>('/auth/register', data)
    return response.data
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await api.post<AuthTokens>('/auth/refresh', {
      refresh_token: refreshToken,
    })
    return response.data
  },

  async getMe(): Promise<User> {
    const response = await api.get<User>('/auth/me')
    return response.data
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore logout errors
    }
  },
}

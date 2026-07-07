import { create } from 'zustand'
import type { User, AuthTokens } from '@/types/api.types'

interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User) => void
  login: (tokens: AuthTokens, user: User) => void
  logout: () => void
  loadFromStorage: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => {
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ user })
  },

  login: (tokens, user) => {
    localStorage.setItem('auth_tokens', JSON.stringify(tokens))
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ tokens, user, isAuthenticated: true, isLoading: false })
  },

  logout: () => {
    localStorage.removeItem('auth_tokens')
    localStorage.removeItem('auth_user')
    set({ tokens: null, user: null, isAuthenticated: false, isLoading: false })
  },

  loadFromStorage: () => {
    try {
      const tokensRaw = localStorage.getItem('auth_tokens')
      const userRaw = localStorage.getItem('auth_user')

      if (tokensRaw && userRaw) {
        const tokens = JSON.parse(tokensRaw) as AuthTokens
        const user = JSON.parse(userRaw) as User
        set({ tokens, user, isAuthenticated: true, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      localStorage.removeItem('auth_tokens')
      localStorage.removeItem('auth_user')
      set({ isLoading: false })
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
}))

import { defineStore } from 'pinia'
import { api, ApiError } from '../api'

interface AuthUser {
  email: string
  roles: string[]
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    ready: false,
  }),
  getters: {
    isAuthenticated: (s) => s.user !== null,
  },
  actions: {
    async bootstrap() {
      try {
        const { user } = await api.get<{ user: AuthUser }>('/api/me')
        this.user = user
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 401) throw e
        this.user = null
      } finally {
        this.ready = true
      }
    },
    async login(email: string, password: string, rememberMe: boolean) {
      const { user } = await api.post<{ user: AuthUser }>('/api/login', { email, password, rememberMe })
      this.user = user
    },
    async logout() {
      await api.post('/api/logout')
      this.user = null
    },
  },
})

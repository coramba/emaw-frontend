import { defineStore } from 'pinia'
import { api, ApiError } from '../api'
import { resetChartPrefs } from '../chartRange'

interface AuthUser {
  email: string
  roles: string[]
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    ready: false,
    /** Public sign-up + email flows; backend flag, off until mail is configured. */
    registrationEnabled: false,
  }),
  getters: {
    isAuthenticated: (s) => s.user !== null,
  },
  actions: {
    async bootstrap() {
      const config = api
        .get<{ registrationEnabled: boolean }>('/api/config')
        .then((c) => c.registrationEnabled === true)
        .catch(() => false)
      try {
        const { user } = await api.get<{ user: AuthUser }>('/api/me')
        this.user = user
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 401) throw e
        this.user = null
      } finally {
        this.registrationEnabled = await config
        this.ready = true
      }
    },
    async login(email: string, password: string, rememberMe: boolean) {
      const { user } = await api.post<{ user: AuthUser }>('/api/login', { email, password, rememberMe })
      this.user = user
    },
    async register(email: string, password: string, locale: string) {
      await api.post('/api/register', { email, password, locale })
    },
    /** The backend signs the user in on successful verification. */
    async verifyEmail(token: string) {
      const { user } = await api.post<{ user: AuthUser }>('/api/verify-email', { token })
      this.user = user
    },
    async resendVerification(email: string) {
      await api.post('/api/resend-verification', { email })
    },
    async forgotPassword(email: string) {
      await api.post('/api/forgot-password', { email })
    },
    async resetPassword(token: string, password: string) {
      await api.post('/api/reset-password', { token, password })
    },
    async logout() {
      await api.post('/api/logout')
      resetChartPrefs()
      this.user = null
    },
  },
})

/** i18n key for a failed public auth request: sign-ups closed, rate limit, or anything else. */
export function authErrorKey(e: unknown, closedKey = 'auth.closed'): string {
  if (e instanceof ApiError && e.code === 'registration_closed') return closedKey
  return e instanceof ApiError && e.status === 429 ? 'auth.rateLimited' : 'auth.failed'
}

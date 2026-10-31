import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { resetChartRange } from './chartRange'

// Public screens that make no sense once signed in.
const GUEST_ONLY = ['login', 'register', 'forgot-password']
// Screens that start an email flow; hidden while registration is switched off.
// (verify-email / reset-password stay reachable so already-sent links work.)
const REGISTRATION_ONLY = ['register', 'check-email', 'forgot-password']

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  routes: [
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true } },
    { path: '/register', name: 'register', component: () => import('./views/RegisterView.vue'), meta: { public: true } },
    { path: '/check-email', name: 'check-email', component: () => import('./views/CheckEmailView.vue'), meta: { public: true } },
    { path: '/verify-email', name: 'verify-email', component: () => import('./views/VerifyEmailView.vue'), meta: { public: true } },
    { path: '/forgot-password', name: 'forgot-password', component: () => import('./views/ForgotPasswordView.vue'), meta: { public: true } },
    { path: '/reset-password', name: 'reset-password', component: () => import('./views/ResetPasswordView.vue'), meta: { public: true } },
    { path: '/', name: 'dashboard', component: () => import('./views/DashboardView.vue') },
    { path: '/tickers/new', name: 'ticker-new', component: () => import('./views/TickerAddView.vue'), meta: { focus: true } },
    { path: '/tickers/:id', name: 'ticker-detail', component: () => import('./views/TickerDetailView.vue'), props: true },
    { path: '/tickers/:id/edit', name: 'ticker-edit', component: () => import('./views/TickerEditView.vue'), props: true, meta: { focus: true } },
    { path: '/events', name: 'events', component: () => import('./views/EventsView.vue') },
    { path: '/events/:id', name: 'event-detail', component: () => import('./views/EventDetailView.vue'), props: true },
    { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue') },
    { path: '/settings/sources', name: 'settings-sources', component: () => import('./views/BlockedSourcesView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.ready) await auth.bootstrap()

  if (REGISTRATION_ONLY.includes(to.name as string) && !auth.registrationEnabled) {
    return { name: auth.isAuthenticated ? 'dashboard' : 'login' }
  }
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (GUEST_ONLY.includes(to.name as string) && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

// The stock last opened, so the watchlist can scroll back to it on return.
let lastTickerId: string | null = null

export function takeLastTickerId(): string | null {
  const id = lastTickerId
  lastTickerId = null
  return id
}

router.afterEach((to) => {
  const name = to.name as string
  if (name === 'ticker-detail' || name === 'ticker-edit') lastTickerId = String(to.params.id)
  // Picked chart period and return position only live within a stock's pages.
  if (!['ticker-detail', 'ticker-edit', 'event-detail'].includes(name)) {
    resetChartRange()
    if (name !== 'dashboard') lastTickerId = null
  }
})

export default router

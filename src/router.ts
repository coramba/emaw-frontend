import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true } },
    { path: '/', name: 'dashboard', component: () => import('./views/DashboardView.vue') },
    { path: '/tickers/new', name: 'ticker-new', component: () => import('./views/TickerFormView.vue') },
    { path: '/tickers/:id', name: 'ticker-detail', component: () => import('./views/TickerDetailView.vue'), props: true },
    { path: '/tickers/:id/edit', name: 'ticker-edit', component: () => import('./views/TickerFormView.vue'), props: true },
    { path: '/events', name: 'events', component: () => import('./views/EventsView.vue') },
    { path: '/events/:id', name: 'event-detail', component: () => import('./views/EventDetailView.vue'), props: true },
    { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.ready) await auth.bootstrap()

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router

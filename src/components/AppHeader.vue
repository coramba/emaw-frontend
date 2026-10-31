<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppLogo from './AppLogo.vue'
import UserMenu from './UserMenu.vue'
import Icon, { type IconName } from './Icon.vue'

const route = useRoute()
const { t } = useI18n()

const TABS: { to: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { to: '/', label: 'nav.watchlist', icon: 'watchlist', match: (p) => p === '/' || p.startsWith('/tickers') },
  { to: '/events', label: 'nav.investigations', icon: 'investigate', match: (p) => p.startsWith('/events') },
  { to: '/settings', label: 'nav.settings', icon: 'settings', match: (p) => p.startsWith('/settings') },
]
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <RouterLink to="/" class="brand" :aria-label="t('nav.watchlist')"><AppLogo :size="30" /></RouterLink>
      <nav class="top-nav" :aria-label="t('nav.main')">
        <RouterLink
          v-for="tab in TABS"
          :key="tab.to"
          :to="tab.to"
          :class="{ active: tab.match(route.path) }"
          :aria-current="tab.match(route.path) ? 'page' : undefined"
        >
          <Icon :name="tab.icon" :size="18" />{{ t(tab.label) }}
        </RouterLink>
      </nav>
      <UserMenu />
    </div>
  </header>

  <nav v-if="!route.meta.focus" class="tabbar" :aria-label="t('nav.main')">
    <RouterLink
      v-for="tab in TABS"
      :key="tab.to"
      :to="tab.to"
      :class="{ active: tab.match(route.path) }"
      :aria-current="tab.match(route.path) ? 'page' : undefined"
    >
      <Icon :name="tab.icon" :size="22" />
      <span>{{ t(tab.label) }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(12px);
  padding-top: env(safe-area-inset-top, 0px);
}
.topbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1080px;
  height: 60px;
  margin: 0 auto;
  padding: 0 16px;
}
.brand:hover { text-decoration: none; }

.top-nav { display: none; gap: 4px; margin-left: auto; margin-right: 12px; }
.top-nav a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  color: var(--ink-2);
  font-weight: 600;
  font-size: 0.92rem;
}
.top-nav a:hover { text-decoration: none; background: var(--surface); color: var(--ink); }
.top-nav a.active { background: var(--surface); color: var(--ink); box-shadow: inset 0 0 0 1px var(--line); }

.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  height: calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--line);
}
.tabbar a {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--ink-3);
  font-size: 0.72rem;
  font-weight: 600;
}
.tabbar a:hover { text-decoration: none; }
.tabbar a.active { color: var(--tide); }

@media (min-width: 900px) {
  .topbar-inner { padding: 0 32px; height: 68px; }
  .top-nav { display: flex; }
  .tabbar { display: none; }
}
</style>

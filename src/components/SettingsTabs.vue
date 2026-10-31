<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

// Page title + sub-navigation shared by the Settings pages.
const { t } = useI18n()
const TABS = [
  { to: '/settings', label: 'settings.tabs.general' },
  { to: '/settings/sources', label: 'settings.tabs.sources' },
]
</script>

<template>
  <header class="page-head settings-head">
    <h1>{{ t('settings.title') }}</h1>
    <nav class="tabs" :aria-label="t('settings.title')">
      <RouterLink v-for="tab in TABS" :key="tab.to" :to="tab.to" exact-active-class="active">
        {{ t(tab.label) }}
      </RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.settings-head { flex-direction: column; align-items: stretch; gap: 14px; margin-bottom: 8px; }
.tabs { display: flex; gap: 22px; border-bottom: 1px solid var(--line); }
.tabs a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-bottom: -1px;
  border-bottom: 2px solid transparent;
  color: var(--ink-2);
  font-weight: 600;
  font-size: 0.95rem;
}
.tabs a:hover { text-decoration: none; color: var(--ink); }
.tabs a.active { color: var(--ink); border-bottom-color: var(--tide); }
</style>

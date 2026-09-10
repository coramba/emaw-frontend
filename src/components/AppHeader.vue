<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { LOCALES, setLocale, type Locale } from '../i18n'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()

const LOCALE_NAMES: Record<Locale, string> = { en: 'EN', sk: 'SK', ru: 'RU' }

const menuOpen = ref(false)
const root = ref<HTMLElement | null>(null)

function close() {
  menuOpen.value = false
}
function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) close()
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
watch(() => route.fullPath, close)

function onLocaleChange(e: Event) {
  setLocale((e.target as HTMLSelectElement).value as Locale)
}

async function logout() {
  close()
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="app-header" ref="root">
    <div class="app-header-inner">
      <RouterLink to="/" class="brand" @click="close">{{ t('app.name') }}</RouterLink>

      <button
        class="hamburger ghost small"
        :aria-label="t('nav.menu')"
        :aria-expanded="menuOpen"
        @click.stop="menuOpen = !menuOpen"
      >
        ☰
      </button>

      <nav :class="{ open: menuOpen }">
        <RouterLink to="/"><button class="ghost small">{{ t('nav.dashboard') }}</button></RouterLink>
        <RouterLink to="/events"><button class="ghost small">{{ t('nav.events') }}</button></RouterLink>
        <RouterLink to="/settings"><button class="ghost small">{{ t('nav.settings') }}</button></RouterLink>
        <select class="lang-select" :value="locale" @change="onLocaleChange" :aria-label="t('nav.language')">
          <option v-for="l in LOCALES" :key="l" :value="l">{{ LOCALE_NAMES[l] }}</option>
        </select>
        <button class="ghost small" @click="logout">{{ t('nav.signOut') }}</button>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.lang-select {
  width: auto;
  min-height: 32px;
  padding: 4px 6px;
  font-size: 0.8rem;
}
</style>

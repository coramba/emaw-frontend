<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { THEMES, setTheme, theme } from '../theme'
import Icon from './Icon.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const email = computed(() => auth.user?.email ?? '')
const THEME_ICONS = { system: 'monitor', light: 'sun', dark: 'moon' } as const

function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
watch(() => route.fullPath, () => (open.value = false))

async function signOut() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div ref="root" class="user-menu">
    <button
      type="button"
      class="avatar-btn"
      :aria-label="t('userMenu.open', { email })"
      :aria-expanded="open"
      :title="email"
      @click.stop="open = !open"
    >
      <span class="avatar">{{ email.charAt(0).toUpperCase() }}</span>
    </button>

    <div v-if="open" class="popover" role="menu">
      <div class="who">
        <span class="avatar lg">{{ email.charAt(0).toUpperCase() }}</span>
        <div class="grow">
          <div class="tiny faint">{{ t('userMenu.signedInAs') }}</div>
          <div class="truncate email">{{ email }}</div>
        </div>
      </div>

      <div class="group">
        <div class="tiny faint">{{ t('settings.appearanceTitle') }}</div>
        <div class="seg theme-seg" role="group" :aria-label="t('settings.appearanceTitle')">
          <button
            v-for="value in THEMES"
            :key="value"
            type="button"
            :aria-pressed="theme === value"
            @click="setTheme(value)"
          >
            <Icon :name="THEME_ICONS[value]" :size="16" />{{ t(`settings.appearance.${value}`) }}
          </button>
        </div>
      </div>

      <div class="links">
        <RouterLink to="/settings" class="item"><Icon name="settings" :size="18" />{{ t('nav.settings') }}</RouterLink>
        <button type="button" class="item" @click="signOut"><Icon name="logout" :size="18" />{{ t('nav.signOut') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-menu { position: relative; }
.avatar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--tide-soft);
  color: var(--tide-strong);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.95rem;
}
.avatar-btn:hover .avatar,
.avatar-btn[aria-expanded='true'] .avatar { box-shadow: 0 0 0 2px var(--tide); }
.avatar.lg { width: 42px; height: 42px; font-size: 1.1rem; }

.popover {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 40;
  width: min(300px, calc(100vw - 32px));
  padding: 8px;
  border-radius: var(--r-lg);
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-pop);
}
.who { display: flex; align-items: center; gap: 12px; padding: 10px 10px 14px; }
.email { font-weight: 600; }
.group { padding: 12px 10px; border-top: 1px solid var(--line); }
.group .tiny { margin-bottom: 8px; }
.theme-seg { display: flex; }
.theme-seg button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 4px 8px; }
.links { border-top: 1px solid var(--line); padding-top: 6px; }
.item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink);
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
}
.item:hover { background: var(--surface-2); text-decoration: none; }
.item svg { color: var(--ink-3); }
</style>

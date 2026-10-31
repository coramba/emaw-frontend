<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from './Icon.vue'

const { t } = useI18n()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const up = ref(false)

// No stopPropagation on the toggle: the document click must reach the other
// open menus so they close. Opens upward when the fixed tab bar would cover it.
async function toggle() {
  open.value = !open.value
  if (!open.value) return
  up.value = false
  await nextTick()
  const tabbar = document.querySelector<HTMLElement>('.tabbar')?.offsetHeight ?? 0
  up.value = !!menu.value && menu.value.getBoundingClientRect().bottom > window.innerHeight - tabbar
}

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
</script>

<template>
  <div class="menu-wrap" ref="root">
    <button
      type="button"
      class="icon-btn outlined"
      :aria-label="t('common.moreActions')"
      :aria-expanded="open"
      @click.prevent="toggle"
    >
      <Icon name="more" :size="22" />
    </button>
    <div v-if="open" ref="menu" class="menu" :class="{ up }" role="menu" @click="open = false">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.menu-wrap { position: relative; }
.menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 40;
  min-width: 220px;
  padding: 6px;
  border-radius: var(--r-md);
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-pop);
}
.menu.up { top: auto; bottom: calc(100% + 6px); }
.menu :slotted(button) {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink);
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
}
.menu :slotted(button:hover) { background: var(--surface-2); }
.menu :slotted(button.danger) { color: var(--drop); }
.menu :slotted(button svg) { color: var(--ink-3); }
.menu :slotted(button.danger svg) { color: var(--drop); }
</style>

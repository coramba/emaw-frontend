<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from './Icon.vue'

const { t } = useI18n()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

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
      @click.stop.prevent="open = !open"
    >
      <Icon name="more" :size="22" />
    </button>
    <div v-if="open" class="menu" role="menu" @click="open = false">
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

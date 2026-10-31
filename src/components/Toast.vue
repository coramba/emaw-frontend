<script setup lang="ts">
import { toasts } from '../toast'
import Icon from './Icon.vue'
</script>

<template>
  <div class="toasts" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="item in toasts" :key="item.id" class="toast" :class="item.tone">
        <Icon :name="item.tone === 'error' ? 'alert' : 'check'" :size="18" />
        <span>{{ item.message }}</span>
        <RouterLink v-if="item.link" :to="item.link.to" class="toast-link">{{ item.link.label }}</RouterLink>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  left: 50%;
  bottom: calc(var(--tabbar-h) + 16px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: 80;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(420px, calc(100vw - 32px));
  pointer-events: none;
}
@media (min-width: 900px) {
  .toasts { bottom: 24px; }
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--r-md);
  background: var(--ink);
  color: var(--bg);
  font-size: 0.92rem;
  box-shadow: var(--shadow-pop);
}
.toast-link { margin-left: auto; flex-shrink: 0; pointer-events: auto; color: var(--tide-soft); font-weight: 650; white-space: nowrap; }
.toast.error svg { color: var(--drop); }
.toast.ok svg { color: var(--tide); }
.toast-enter-active, .toast-leave-active { transition: opacity 0.2s, transform 0.2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>

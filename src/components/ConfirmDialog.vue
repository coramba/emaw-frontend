<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  title: string
  message: string
  confirmLabel?: string
  busy?: boolean
  error?: string
  tone?: 'danger' | 'primary'
}>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const { t } = useI18n()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && !props.busy) emit('cancel')
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div class="scrim" @click.self="!busy && emit('cancel')">
      <div class="sheet" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{{ title }}</h2>
        <p class="muted">{{ message }}</p>
        <p v-if="error" class="notice error">{{ error }}</p>
        <div class="actions">
          <button type="button" class="btn quiet" :disabled="busy" @click="emit('cancel')">{{ t('common.cancel') }}</button>
          <button type="button" class="btn" :class="tone ?? 'danger'" :disabled="busy" @click="emit('confirm')">
            {{ confirmLabel ?? t('common.remove') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: var(--scrim);
}
.sheet {
  width: 100%;
  padding: 24px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  background: var(--surface);
  box-shadow: var(--shadow-pop);
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: rise 0.2s ease-out;
}
.actions { display: flex; gap: 12px; margin-top: 8px; }
.actions .btn { flex: 1; }
@keyframes rise { from { transform: translateY(24px); opacity: 0; } }
@media (min-width: 600px) {
  .scrim { align-items: center; padding: 24px; }
  .sheet { max-width: 420px; border-radius: var(--r-lg); padding: 24px; }
  .actions { justify-content: flex-end; }
  .actions .btn { flex: 0 0 auto; }
}
</style>

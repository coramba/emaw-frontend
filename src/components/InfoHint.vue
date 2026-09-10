<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{ text: string }>()
const { t } = useI18n()
const open = ref(false)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
watch(open, (v) => {
  if (v) document.addEventListener('keydown', onKey)
  else document.removeEventListener('keydown', onKey)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <button
    type="button"
    class="info-btn"
    :aria-label="t('common.moreInfo')"
    @click.stop.prevent="open = true"
  >
    ?
  </button>

  <Teleport to="body">
    <div v-if="open" class="info-overlay" @click="open = false">
      <div class="info-modal" role="tooltip">{{ text }}</div>
    </div>
  </Teleport>
</template>

<style scoped>
.info-btn {
  width: 16px;
  height: 16px;
  min-height: 0;
  padding: 0;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-dim);
  cursor: pointer;
  vertical-align: middle;
}
</style>

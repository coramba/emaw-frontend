<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ title: string; message: string; confirmLabel?: string; busy?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const { t } = useI18n()
</script>

<template>
  <div class="overlay" @click.self="emit('cancel')">
    <div class="dialog stack" role="dialog" aria-modal="true">
      <h2>{{ title }}</h2>
      <p class="muted">{{ message }}</p>
      <div class="row between">
        <button class="ghost" @click="emit('cancel')">{{ t('common.cancel') }}</button>
        <button class="danger" :disabled="busy" @click="emit('confirm')">
          {{ confirmLabel ?? t('common.remove') }}
        </button>
      </div>
    </div>
  </div>
</template>

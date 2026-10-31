<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Icon from './Icon.vue'

defineProps<{ on: boolean; size?: number }>()
defineEmits<{ toggle: [] }>()
const { t } = useI18n()
</script>

<template>
  <button
    type="button"
    class="icon-btn fav"
    :class="{ on }"
    :aria-pressed="on"
    :aria-label="t(on ? 'favorites.remove' : 'favorites.add')"
    :title="t(on ? 'favorites.remove' : 'favorites.add')"
    @click.stop.prevent="$emit('toggle')"
  >
    <Icon name="star" :size="size ?? 20" :filled="on" />
  </button>
</template>

<style scoped>
.fav { color: var(--ink-3); }
.fav:hover { color: var(--amber); }
.fav.on { color: var(--amber); }
</style>

<script setup lang="ts">
import { fmtPct, pctClass } from '../format'

defineProps<{ value: number | null; label?: string }>()
</script>

<template>
  <span class="change-pct mono">
    <span v-if="label" class="muted">{{ label }}</span>
    <span class="change" :class="pctClass(value)">{{ fmtPct(value) }}</span>
  </span>
</template>

<style scoped>
.change-pct {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
}
</style>

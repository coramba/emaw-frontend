<script setup lang="ts">
import { fmtPct, pctClass } from '../format'

// Arrow + sign so direction never relies on color alone.
defineProps<{ value: number | null; label?: string }>()
</script>

<template>
  <span class="chg" :class="pctClass(value)">
    <span aria-hidden="true">{{ value === null || value === 0 ? '' : value > 0 ? '▲ ' : '▼ ' }}</span>{{ fmtPct(value) }}<span v-if="label" class="lbl">{{ label }}</span>
  </span>
</template>

<style scoped>
.lbl { color: var(--ink-3); font-weight: 500; margin-left: 0.3em; }
</style>

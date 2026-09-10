<script setup lang="ts">
import { stateLabel } from '../format'

defineProps<{ state: string; label?: string }>()
</script>

<template>
  <span class="badge" :class="state">{{ label ?? stateLabel(state) }}</span>
</template>

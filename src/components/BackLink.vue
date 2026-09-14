<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{ to: string; label: string }>()
</script>

<template>
  <RouterLink :to="to" class="back-link" :aria-label="label">‹</RouterLink>
</template>

<style scoped>
.back-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font-size: 1.3rem;
  line-height: 1;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.back-link:hover {
  text-decoration: none;
  background: var(--surface);
}
</style>

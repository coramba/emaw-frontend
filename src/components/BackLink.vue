<script setup lang="ts">
import { RouterLink } from 'vue-router'
import Icon from './Icon.vue'

defineProps<{ to: string; label: string }>()
</script>

<template>
  <RouterLink :to="to" class="icon-btn outlined" :aria-label="label" :title="label"><Icon name="back" /></RouterLink>
</template>

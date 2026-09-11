<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'
import AppHeader from './components/AppHeader.vue'

const route = useRoute()
const showChrome = computed(() => !route.meta.public)
</script>

<template>
  <AppHeader v-if="showChrome" />
  <main class="container">
    <!-- key by path so views remount when only a route param changes
         (e.g. /tickers/new -> /tickers/:id/edit, or between detail pages) -->
    <RouterView :key="route.path" />
  </main>
</template>

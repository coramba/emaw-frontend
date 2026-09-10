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
    <RouterView />
  </main>
</template>

<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import Toast from './components/Toast.vue'

const route = useRoute()
</script>

<template>
  <AppHeader v-if="!route.meta.public" />
  <!-- key by path so views remount when only a route param changes -->
  <RouterView :key="route.path" />
  <Toast />
</template>

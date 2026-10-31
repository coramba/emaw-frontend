<script setup lang="ts">
withDefaults(defineProps<{ size?: number; wordmark?: boolean }>(), { size: 32, wordmark: true })
</script>

<template>
  <span class="logo">
    <svg :width="size" :height="size" viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="116" fill="#13294B" />
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M244 300 L458 178" stroke="#2BD67B" stroke-width="22" />
        <path d="M244 300 L458 356" stroke="#FF5A5F" stroke-width="22" />
        <path d="M44 214 L110 232 L156 112 L244 300" stroke="#FFFFFF" stroke-width="30" />
      </g>
      <circle cx="244" cy="300" r="80" fill="#13294B" stroke="#13294B" stroke-width="62" />
      <path d="M182 362 L102 442" stroke="#FF8A1F" stroke-width="54" stroke-linecap="round" />
      <circle cx="244" cy="300" r="80" fill="none" stroke="#FF8A1F" stroke-width="40" />
      <circle cx="244" cy="300" r="24" fill="#FF5A5F" />
    </svg>
    <span v-if="wordmark" class="word">Dropwatch</span>
  </span>
</template>

<style scoped>
.logo { display: inline-flex; align-items: center; gap: 10px; color: var(--ink); }
.word { font-family: var(--font-display); font-weight: 750; font-size: 1.2rem; letter-spacing: -0.02em; }
</style>

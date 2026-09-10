<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '../api'
import type { TriggerEvent } from '../types'
import EventListItem from '../components/EventListItem.vue'

const { t } = useI18n()
const events = ref<TriggerEvent[]>([])
const loading = ref(true)

onMounted(async () => {
  events.value = (await api.get<{ events: TriggerEvent[] }>('/api/events?limit=100')).events
  loading.value = false
})
</script>

<template>
  <h1>{{ t('events.title') }}</h1>
  <p v-if="loading" class="empty">{{ t('common.loading') }}</p>
  <div v-else-if="events.length" class="card">
    <EventListItem v-for="e in events" :key="e.id" :event="e" show-symbol />
  </div>
  <p v-else class="empty">{{ t('events.empty') }}</p>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '../api'
import type { TriggerEvent } from '../types'
import { fmtDay } from '../format'
import EventListItem from '../components/EventListItem.vue'
import Icon from '../components/Icon.vue'

const { t } = useI18n()
const events = ref<TriggerEvent[]>([])
const loading = ref(true)
const error = ref(false)
const filter = ref<'all' | 'attention'>('all')

function needsAttention(e: TriggerEvent): boolean {
  const s = e.investigationStatus
  return s === 'pending' || s === 'running' || s === 'failed' || e.report?.verificationStatus === 'needs_review'
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (dayKey(d) === dayKey(today)) return t('events.today')
  if (dayKey(d) === dayKey(yesterday)) return t('events.yesterday')
  return fmtDay(iso)
}

// Events arrive newest first; keep that order and cut into local calendar days.
const groups = computed(() => {
  const out: { key: string; label: string; items: TriggerEvent[] }[] = []
  for (const e of events.value) {
    if (filter.value === 'attention' && !needsAttention(e)) continue
    const key = dayKey(new Date(e.createdAt))
    const last = out[out.length - 1]
    if (last?.key === key) last.items.push(e)
    else out.push({ key, label: dayLabel(e.createdAt), items: [e] })
  }
  return out
})

async function load() {
  loading.value = true
  error.value = false
  try {
    events.value = (await api.get<{ events: TriggerEvent[] }>('/api/events?limit=100')).events
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="page">
    <header class="page-head">
      <div class="grow">
        <h1>{{ t('events.title') }}</h1>
        <p class="muted">{{ t('events.intro') }}</p>
      </div>
    </header>

    <template v-if="loading">
      <div class="skeleton" style="height: 20px; width: 120px; margin-top: 28px"></div>
      <div class="skeleton" style="height: 240px; margin-top: 12px; border-radius: var(--r-lg)"></div>
    </template>

    <div v-else-if="error" class="notice error load-error">
      <Icon name="alert" />
      <span class="grow">{{ t('events.loadFailed') }}</span>
      <button type="button" class="btn sm" @click="load">{{ t('events.retry') }}</button>
    </div>

    <div v-else-if="!events.length" class="panel empty-state">
      <h2>{{ t('events.emptyTitle') }}</h2>
      <p>{{ t('events.emptyText') }}</p>
      <RouterLink to="/" class="btn">{{ t('events.toWatchlist') }}</RouterLink>
    </div>

    <template v-else>
      <div class="seg" role="group" :aria-label="t('events.filterLabel')">
        <button type="button" :aria-pressed="filter === 'all'" @click="filter = 'all'">{{ t('events.filterAll') }}</button>
        <button type="button" :aria-pressed="filter === 'attention'" @click="filter = 'attention'">
          {{ t('events.filterAttention') }}
        </button>
      </div>

      <p v-if="!groups.length" class="empty-state">{{ t('events.noneNeedAttention') }}</p>

      <section v-for="g in groups" :key="g.key" class="section day">
        <div class="section-head">
          <h2>{{ g.label }}</h2>
          <span class="hint">{{ t('events.count', { n: g.items.length }, g.items.length) }}</span>
        </div>
        <div class="panel tight">
          <EventListItem v-for="e in g.items" :key="e.id" :event="e" show-symbol />
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.page-head p { margin-top: 6px; }
.day { margin-top: 24px; }
.day h2 { font-size: 1.05rem; }
.load-error { align-items: center; }
</style>

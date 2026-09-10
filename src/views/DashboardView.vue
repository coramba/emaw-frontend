<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '../api'
import type { Ticker } from '../types'
import TickerCard from '../components/TickerCard.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const { t } = useI18n()
const tickers = ref<Ticker[]>([])
const loading = ref(true)
const error = ref('')
const running = ref(false)
const cycleNote = ref('')
const toRemove = ref<Ticker | null>(null)
const removing = ref(false)

const sorted = computed(() =>
  [...tickers.value].sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.symbol.localeCompare(b.symbol)),
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    tickers.value = (await api.get<{ tickers: Ticker[] }>('/api/tickers')).tickers
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : t('dashboard.loadFailed')
  } finally {
    loading.value = false
  }
}

async function runCycle() {
  running.value = true
  cycleNote.value = ''
  try {
    const { result } = await api.post<{ result: Record<string, number> }>('/api/monitor/run')
    cycleNote.value = t('dashboard.cycleResult', result)
    await load()
  } catch {
    cycleNote.value = t('dashboard.cycleFailed')
  } finally {
    running.value = false
  }
}

async function setEnabled(ticker: Ticker, enabled: boolean) {
  await api.post(`/api/tickers/${ticker.id}/${enabled ? 'enable' : 'disable'}`)
  await load()
}

async function confirmRemove() {
  if (!toRemove.value) return
  removing.value = true
  try {
    await api.del(`/api/tickers/${toRemove.value.id}`)
    toRemove.value = null
    await load()
  } finally {
    removing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="row between" style="margin-top: 16px">
    <h1 style="margin: 0">{{ t('dashboard.title') }}</h1>
    <RouterLink to="/tickers/new"><button class="primary small">{{ t('dashboard.addTicker') }}</button></RouterLink>
  </div>

  <div class="row between" style="margin: 12px 0">
    <button class="small" :disabled="running" @click="runCycle">
      {{ running ? t('dashboard.running') : t('dashboard.runCheck') }}
    </button>
    <span class="muted">{{ cycleNote }}</span>
  </div>

  <p v-if="error" class="alert error">{{ error }}</p>
  <p v-if="loading" class="empty">{{ t('common.loading') }}</p>

  <div v-else-if="sorted.length" class="ticker-grid">
    <TickerCard
      v-for="ticker in sorted"
      :key="ticker.id"
      :ticker="ticker"
      @enable="setEnabled($event, true)"
      @disable="setEnabled($event, false)"
      @remove="toRemove = $event"
    />
  </div>

  <div v-else class="empty">
    <p>{{ t('dashboard.empty') }}</p>
    <RouterLink to="/tickers/new"><button class="primary">{{ t('dashboard.addFirst') }}</button></RouterLink>
  </div>

  <ConfirmDialog
    v-if="toRemove"
    :title="t('dashboard.removeTitle')"
    :message="t('dashboard.removeMessage', { symbol: toRemove.symbol })"
    :confirm-label="t('common.remove')"
    :busy="removing"
    @cancel="toRemove = null"
    @confirm="confirmRemove"
  />
</template>

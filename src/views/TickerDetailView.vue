<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '../api'
import type { InvestigationReport, MarketSnapshot, Ticker, TriggerEvent } from '../types'
import { fmtDate, fmtNum, fmtTime } from '../format'
import StateBadge from '../components/StateBadge.vue'
import ChangePct from '../components/ChangePct.vue'
import EventListItem from '../components/EventListItem.vue'
import ReportBlock from '../components/ReportBlock.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { t } = useI18n()

const ticker = ref<Ticker | null>(null)
const snapshots = ref<MarketSnapshot[]>([])
const events = ref<TriggerEvent[]>([])
const reports = ref<InvestigationReport[]>([])
const loading = ref(true)
const confirmRemove = ref(false)

async function load() {
  loading.value = true
  const data = await api.get<{
    ticker: Ticker
    snapshots: MarketSnapshot[]
    events: TriggerEvent[]
    reports: InvestigationReport[]
  }>(`/api/tickers/${props.id}`)
  ticker.value = data.ticker
  snapshots.value = data.snapshots
  events.value = data.events
  reports.value = data.reports
  loading.value = false
}

async function setEnabled(enabled: boolean) {
  await api.post(`/api/tickers/${props.id}/${enabled ? 'enable' : 'disable'}`)
  await load()
}

async function remove() {
  await api.del(`/api/tickers/${props.id}`)
  router.push('/')
}

onMounted(load)
</script>

<template>
  <p v-if="loading" class="empty">{{ t('common.loading') }}</p>

  <template v-else-if="ticker">
    <div class="row between" style="margin-top: 16px">
      <h1 style="margin: 0">{{ ticker.symbol }}</h1>
      <StateBadge :state="ticker.state" />
    </div>
    <p class="muted">{{ ticker.name }} · {{ ticker.exchange }} · {{ ticker.currency }}</p>

    <div class="card stack">
      <div class="row between">
        <div class="big-number mono">{{ ticker.lastPrice !== null ? fmtNum(ticker.lastPrice) : '—' }}</div>
        <div class="col-right">
          <ChangePct :value="ticker.lastDayChangePct" label="1d" />
          <ChangePct :value="ticker.lastFiveDayChangePct" label="5d" />
        </div>
      </div>
      <span class="muted">{{ t('ticker.lastChecked', { time: fmtTime(ticker.lastCheckedAt) }) }}</span>
      <p v-if="ticker.lastError" class="alert error" style="margin: 0">{{ ticker.lastError }}</p>

      <div class="row wrap" style="gap: 8px">
        <RouterLink :to="`/tickers/${ticker.id}/edit`"><button class="small">{{ t('common.editThresholds') }}</button></RouterLink>
        <button class="small" v-if="ticker.enabled" @click="setEnabled(false)">{{ t('common.disable') }}</button>
        <button class="small" v-else @click="setEnabled(true)">{{ t('common.enable') }}</button>
        <button class="small danger" @click="confirmRemove = true">{{ t('common.remove') }}</button>
      </div>
    </div>

    <h2>{{ t('ticker.recentEvents') }}</h2>
    <div class="card" v-if="events.length">
      <EventListItem v-for="e in events" :key="e.id" :event="e" />
    </div>
    <p v-else class="empty">{{ t('ticker.noEvents') }}</p>

    <h2>{{ t('ticker.reports') }}</h2>
    <template v-if="reports.length">
      <ReportBlock v-for="r in reports" :key="r.id" :report="r" />
    </template>
    <p v-else class="empty">{{ t('ticker.noReports') }}</p>

    <h2>{{ t('ticker.snapshots') }}</h2>
    <div class="card" v-if="snapshots.length">
      <div v-for="s in snapshots.slice(0, 12)" :key="s.id" class="list-item row between">
        <span class="muted">{{ fmtDate(s.capturedAt) }}</span>
        <span class="mono">{{ fmtNum(s.price) }}</span>
        <ChangePct :value="s.dayChangePct" />
      </div>
    </div>
    <p v-else class="empty">{{ t('ticker.noSnapshots') }}</p>
  </template>

  <ConfirmDialog
    v-if="confirmRemove"
    :title="t('dashboard.removeTitle')"
    :message="t('dashboard.removeMessage', { symbol: ticker?.symbol })"
    :confirm-label="t('common.remove')"
    @cancel="confirmRemove = false"
    @confirm="remove"
  />
</template>

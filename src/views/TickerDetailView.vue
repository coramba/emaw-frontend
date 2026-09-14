<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '../api'
import type { MarketSnapshot, Ticker, TriggerEvent } from '../types'
import { fmtDate, fmtNum, fmtPct, fmtTime, fmtVolume } from '../format'
import StateBadge from '../components/StateBadge.vue'
import ChangePct from '../components/ChangePct.vue'
import EventListItem from '../components/EventListItem.vue'
import ReportBlock from '../components/ReportBlock.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import OverflowMenu from '../components/OverflowMenu.vue'
import BackLink from '../components/BackLink.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { t } = useI18n()

const ticker = ref<Ticker | null>(null)
const snapshots = ref<MarketSnapshot[]>([])
const events = ref<TriggerEvent[]>([])
const loading = ref(true)
const error = ref('')
const confirmRemove = ref(false)
const confirmRearm = ref(false)
const removing = ref(false)
const removeError = ref('')
const rearming = ref(false)
const rearmError = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await api.get<{
      ticker: Ticker
      snapshots: MarketSnapshot[]
      events: TriggerEvent[]
    }>(`/api/tickers/${props.id}`)
    ticker.value = data.ticker
    snapshots.value = data.snapshots
    events.value = data.events
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : t('ticker.loadFailed')
  } finally {
    loading.value = false
  }
}

// snapshots and events are sorted newest-first by the API
const latestSnapshot = computed(() => snapshots.value[0] ?? null)
const mostRecentReport = computed(() => events.value[0]?.report ?? null)
const volumeRatio = computed(() => {
  const s = latestSnapshot.value
  return s && s.volume !== null && s.averageVolume ? s.volume / s.averageVolume : null
})

async function setEnabled(enabled: boolean) {
  await api.post(`/api/tickers/${props.id}/${enabled ? 'enable' : 'disable'}`)
  await load()
}

async function resetState() {
  rearming.value = true
  rearmError.value = ''
  try {
    await api.post(`/api/tickers/${props.id}/reset`)
    confirmRearm.value = false
    await load()
  } catch (e) {
    rearmError.value = e instanceof ApiError ? e.message : t('common.genericError')
  } finally {
    rearming.value = false
  }
}

async function remove() {
  removing.value = true
  removeError.value = ''
  try {
    await api.del(`/api/tickers/${props.id}`)
    router.push('/')
  } catch (e) {
    removeError.value = e instanceof ApiError ? e.message : t('common.genericError')
  } finally {
    removing.value = false
  }
}

onMounted(load)
</script>

<template>
  <p v-if="loading" class="empty">{{ t('common.loading') }}</p>

  <div v-else-if="error" class="stack">
    <p class="alert error">{{ error }}</p>
    <RouterLink to="/"><button>{{ t('nav.dashboard') }}</button></RouterLink>
  </div>

  <template v-else-if="ticker">
    <Breadcrumbs :items="[{ label: t('nav.dashboard'), to: '/' }, { label: ticker.symbol }]" />
    <div class="row between" style="margin-top: 10px">
      <div class="row" style="gap: 10px; align-items: center">
        <BackLink to="/" :label="t('nav.backToDashboard')" />
        <h1 style="margin: 0">{{ ticker.symbol }}</h1>
      </div>
      <StateBadge :state="ticker.state" />
    </div>
    <p class="muted">{{ ticker.name }} · {{ ticker.exchange }} · {{ ticker.currency }}</p>

    <div class="card stack">
      <div class="row between">
        <div class="big-number mono">
          {{ ticker.lastPrice !== null ? fmtNum(ticker.lastPrice) : '—' }}
          <span class="muted" style="font-size: 0.7rem">{{ ticker.currency }}</span>
        </div>
        <div class="row" style="gap: 6px">
          <RouterLink
            :to="`/tickers/${ticker.id}/edit`"
            class="btn icon-btn"
            :title="t('common.editThresholds')"
            :aria-label="t('common.editThresholds')"
          >⚙</RouterLink>
          <button
            type="button"
            class="icon-btn"
            @click="rearmError = ''; confirmRearm = true"
            :title="t('common.resetState')"
            :aria-label="t('common.resetState')"
          >↻</button>
          <OverflowMenu>
            <button v-if="ticker.enabled" @click="setEnabled(false)">{{ t('common.disable') }}</button>
            <button v-else @click="setEnabled(true)">{{ t('common.enable') }}</button>
            <button class="danger" @click="removeError = ''; confirmRemove = true">{{ t('common.remove') }}</button>
          </OverflowMenu>
        </div>
      </div>

      <div class="change-row">
        <ChangePct :value="ticker.lastDayChangePct" label="1d" />
        <ChangePct :value="ticker.lastFiveDayChangePct" label="5d" />
        <span class="muted">· {{ t('ticker.lastChecked', { time: fmtTime(ticker.lastCheckedAt) }) }}</span>
      </div>
      <span v-if="ticker.state === 'cooldown' && ticker.lastDayChangePct !== null" class="muted">
        {{ t('ticker.cooldownHint', { value: fmtPct(ticker.lastDayChangePct) }) }}
      </span>

      <div class="field-grid" v-if="latestSnapshot">
        <div>
          <span class="muted" style="font-size: 0.78rem">{{ t('ticker.open') }}</span><br />
          <span class="mono">{{ fmtNum(latestSnapshot.open) }}</span>
        </div>
        <div>
          <span class="muted" style="font-size: 0.78rem">{{ t('ticker.dayRange') }}</span><br />
          <span class="mono">{{ fmtNum(latestSnapshot.dayLow) }}–{{ fmtNum(latestSnapshot.dayHigh) }}</span>
        </div>
        <div>
          <span class="muted" style="font-size: 0.78rem">{{ t('ticker.prevClose') }}</span><br />
          <span class="mono">{{ fmtNum(latestSnapshot.previousClose) }}</span>
        </div>
        <div>
          <span class="muted" style="font-size: 0.78rem">{{ t('ticker.volume') }}</span><br />
          <span class="mono">{{ fmtVolume(latestSnapshot.volume) }}</span>
          <span v-if="volumeRatio !== null" class="badge info" style="margin-left: 6px">
            {{ volumeRatio >= 1 ? '↑' : '↓' }} {{ t('ticker.volumeVsAvg', { value: volumeRatio.toFixed(2) }) }}
          </span>
        </div>
      </div>

      <p v-if="ticker.lastError" class="alert error" style="margin: 0">{{ ticker.lastError }}</p>
    </div>

    <!-- Full report only for the still-open (cooldown) event — otherwise the
         event list below is the way to reach any investigation. -->
    <ReportBlock v-if="ticker.state === 'cooldown' && mostRecentReport" :report="mostRecentReport" />

    <h2>{{ t('ticker.recentEvents') }}</h2>
    <template v-if="events.length">
      <EventListItem v-for="e in events" :key="e.id" :event="e" />
    </template>
    <p v-else class="empty">{{ t('ticker.noEvents') }}</p>

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
    :busy="removing"
    :error="removeError"
    @cancel="!removing && (confirmRemove = false)"
    @confirm="remove"
  />

  <ConfirmDialog
    v-if="confirmRearm"
    :title="t('ticker.rearmTitle')"
    :message="t('ticker.rearmMessage', { symbol: ticker?.symbol })"
    :confirm-label="t('common.resetState')"
    :busy="rearming"
    :error="rearmError"
    @cancel="!rearming && (confirmRearm = false)"
    @confirm="resetState"
  />
</template>

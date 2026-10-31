<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { takeLastTickerId } from '../router'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '../api'
import type { AccountPause, MonitoringState, Ticker } from '../types'
import { fmtDate, fmtTime } from '../format'
import { toast } from '../toast'
import TickerCard from '../components/TickerCard.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import Icon from '../components/Icon.vue'

const ATTENTION: MonitoringState[] = ['triggered', 'investigating', 'cooldown', 'error']

const { t } = useI18n()
const tickers = ref<Ticker[]>([])
const pause = ref<AccountPause | null>(null)
const loading = ref(true)
const error = ref(false)
const running = ref(false)
const toRemove = ref<Ticker | null>(null)
const removing = ref(false)
const removeError = ref('')

// Favorites first within each section, then by symbol.
const bySymbol = computed(() =>
  [...tickers.value].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.symbol.localeCompare(b.symbol)),
)
const attention = computed(() => bySymbol.value.filter((tk) => tk.enabled && ATTENTION.includes(tk.state)))
const watching = computed(() => bySymbol.value.filter((tk) => tk.enabled && !ATTENTION.includes(tk.state)))
const paused = computed(() => bySymbol.value.filter((tk) => !tk.enabled))

const headline = computed(() => {
  const total = tickers.value.length
  const n = attention.value.length
  if (n && total === 1) return t('dashboard.oneNeedsLook', { symbol: attention.value[0].symbol })
  if (n) return t('dashboard.needLook', { n, total }, n)
  if (!paused.value.length || watching.value.length) return t('dashboard.allQuiet', { n: total }, total)
  return t('dashboard.allPaused')
})

const lastCheck = computed(() => {
  const times = tickers.value.map((tk) => tk.lastCheckedAt).filter((v): v is string => !!v).sort()
  return times.length ? t('dashboard.lastCheck', { time: fmtTime(times[times.length - 1]) }) : t('dashboard.noChecksYet')
})

async function load(quiet = false) {
  if (!quiet) loading.value = true
  error.value = false
  try {
    const data = await api.get<{ tickers: Ticker[]; pause: AccountPause | null }>('/api/tickers')
    tickers.value = data.tickers
    pause.value = data.pause
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

async function checkNow() {
  running.value = true
  try {
    const { result } = await api.post<{ result: { checked: number; events: number; errors: number } }>('/api/monitor/run')
    const parts = result.checked
      ? [t('dashboard.checked', { n: result.checked }, result.checked), result.events ? t('dashboard.newAlerts', { n: result.events }, result.events) : t('dashboard.noNewAlerts')]
      : [t('dashboard.nothingDue')]
    if (result.errors) parts.push(t('dashboard.checkErrors', { n: result.errors }, result.errors))
    toast(parts.join(' '), result.errors ? 'error' : 'ok')
    await load(true)
  } catch {
    toast(t('dashboard.checkFailed'), 'error')
  } finally {
    running.value = false
  }
}

async function setEnabled(ticker: Ticker, enabled: boolean) {
  try {
    await api.post(`/api/tickers/${ticker.id}/${enabled ? 'enable' : 'disable'}`)
    toast(t(enabled ? 'dashboard.resumedToast' : 'dashboard.pausedToast', { symbol: ticker.symbol }))
    await load(true)
  } catch {
    toast(t('common.genericError'), 'error')
  }
}

async function toggleFavorite(ticker: Ticker) {
  const favorite = !ticker.favorite
  ticker.favorite = favorite
  try {
    await api.patch(`/api/tickers/${ticker.id}`, { favorite })
  } catch {
    ticker.favorite = !favorite
    toast(t('favorites.failed'), 'error')
  }
}

async function confirmRemove() {
  if (!toRemove.value) return
  removing.value = true
  removeError.value = ''
  try {
    await api.del(`/api/tickers/${toRemove.value.id}`)
    toast(t('dashboard.removed', { symbol: toRemove.value.symbol }))
    toRemove.value = null
    await load(true)
  } catch {
    removeError.value = t('common.genericError')
  } finally {
    removing.value = false
  }
}

onMounted(async () => {
  const returnTo = takeLastTickerId()
  await load()
  if (!returnTo) return
  await nextTick()
  document.querySelector(`[data-ticker-id="${returnTo}"]`)?.scrollIntoView({ block: 'center' })
})
</script>

<template>
  <main class="page">
    <template v-if="loading">
      <div class="page-head"><div class="skeleton" style="height: 36px; width: 70%"></div></div>
      <div class="cards">
        <div v-for="i in 2" :key="i" class="skeleton" style="height: 168px; border-radius: var(--r-lg)"></div>
      </div>
      <div class="skeleton" style="height: 220px; margin-top: 28px; border-radius: var(--r-lg)"></div>
    </template>

    <div v-else-if="error" class="notice error load-error">
      <Icon name="alert" />
      <span class="grow">{{ t('dashboard.loadFailed') }}</span>
      <button type="button" class="btn sm" @click="load()">{{ t('dashboard.retry') }}</button>
    </div>

    <div v-else-if="!tickers.length" class="panel empty-state">
      <h1>{{ t('dashboard.emptyTitle') }}</h1>
      <p>{{ t('dashboard.emptyText') }}</p>
      <RouterLink to="/tickers/new" class="btn primary"><Icon name="plus" />{{ t('dashboard.addFirst') }}</RouterLink>
    </div>

    <template v-else>
      <header class="page-head">
        <div class="grow">
          <h1>{{ headline }}</h1>
          <p class="muted small">{{ lastCheck }}</p>
        </div>
        <button
          type="button"
          class="btn check-btn"
          :disabled="running || !!pause"
          :aria-label="t('dashboard.checkNow')"
          @click="checkNow"
        >
          <Icon name="refresh" :class="{ spin: running }" />
          <span class="label">{{ running ? t('dashboard.checking') : t('dashboard.checkNow') }}</span>
        </button>
        <RouterLink to="/tickers/new" class="btn primary"><Icon name="plus" />{{ t('dashboard.addStock') }}</RouterLink>
      </header>

      <RouterLink v-if="pause" to="/settings" class="notice warn pause-banner">
        <Icon name="pause" :size="18" />
        <span class="grow">{{ pause.until ? t('pauseAll.activeUntil', { date: fmtDate(pause.until) }) : t('pauseAll.activeIndefinite') }}</span>
        <Icon name="chevron" :size="16" />
      </RouterLink>

      <section v-if="attention.length" class="section">
        <div class="section-head">
          <h2>{{ t('dashboard.needsLookTitle') }}</h2>
        </div>
        <div class="cards">
          <TickerCard
            v-for="tk in attention"
            :key="tk.id"
            :ticker="tk"
            variant="attention"
            @disable="setEnabled($event, false)"
            @enable="setEnabled($event, true)"
            @remove="toRemove = $event"
            @favorite="toggleFavorite"
          />
        </div>
      </section>

      <section v-if="watching.length" class="section">
        <div class="section-head">
          <h2>{{ t('dashboard.watchingTitle') }}</h2>
          <span class="hint">{{ t('dashboard.watchingHint') }}</span>
        </div>
        <div class="panel tight">
          <TickerCard
            v-for="tk in watching"
            :key="tk.id"
            :ticker="tk"
            @disable="setEnabled($event, false)"
            @enable="setEnabled($event, true)"
            @remove="toRemove = $event"
            @favorite="toggleFavorite"
          />
        </div>
      </section>

      <section v-if="paused.length" class="section">
        <div class="section-head">
          <h2>{{ t('dashboard.pausedTitle') }}</h2>
          <span class="hint">{{ t('dashboard.pausedHint') }}</span>
        </div>
        <div class="panel tight">
          <TickerCard
            v-for="tk in paused"
            :key="tk.id"
            :ticker="tk"
            @disable="setEnabled($event, false)"
            @enable="setEnabled($event, true)"
            @remove="toRemove = $event"
            @favorite="toggleFavorite"
          />
        </div>
      </section>
    </template>

    <ConfirmDialog
      v-if="toRemove"
      :title="t('dashboard.removeTitle')"
      :message="t('dashboard.removeMessage', { symbol: toRemove.symbol })"
      :confirm-label="t('common.remove')"
      :busy="removing"
      :error="removeError"
      @cancel="toRemove = null; removeError = ''"
      @confirm="confirmRemove"
    />
  </main>
</template>

<style scoped>
.pause-banner { align-items: center; margin-top: 16px; font-weight: 600; }
.pause-banner:hover { text-decoration: none; }
.page-head { flex-wrap: wrap; align-items: flex-start; }
.page-head h1 { margin-bottom: 4px; }
.section-head { flex-wrap: wrap; row-gap: 2px; }
.cards { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 700px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; } }
@media (min-width: 1000px) { .cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.load-error { align-items: center; margin-top: 16px; }
.empty-state { margin-top: 24px; }
.empty-state h1 { margin-bottom: 8px; font-size: 1.5rem; }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Phone: headline full width, then the two actions; "check" collapses to an icon button. */
@media (max-width: 599px) {
  .page-head .grow { flex-basis: 100%; }
  .page-head .btn.primary { order: 1; flex: 1; }
  .check-btn { order: 2; width: 44px; padding: 0; }
  .check-btn .label { display: none; }
}
@media (min-width: 600px) {
  .page-head .btn { margin-top: 2px; }
}
</style>

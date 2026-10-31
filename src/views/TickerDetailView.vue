<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '../api'
import { defaultRange, loadDefaultRange, rememberRange, rememberedRange } from '../chartRange'
import type { HistoryPoint, HistoryRange, MarketSnapshot, Ticker, TriggerEvent } from '../types'
import { classificationLabel, fmtDate, fmtDay, fmtPrice, fmtTime, fmtVolume } from '../format'
import { describeRules, matchPreset } from '../rules'
import { toast } from '../toast'
import StateBadge from '../components/StateBadge.vue'
import ChangePct from '../components/ChangePct.vue'
import EventListItem from '../components/EventListItem.vue'
import PriceChart from '../components/PriceChart.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import OverflowMenu from '../components/OverflowMenu.vue'
import BackLink from '../components/BackLink.vue'
import Icon from '../components/Icon.vue'
import FavoriteButton from '../components/FavoriteButton.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { t } = useI18n()

const ticker = ref<Ticker | null>(null)
const snapshots = ref<MarketSnapshot[]>([])
const events = ref<TriggerEvent[]>([])
const loading = ref(true)
const loadFailed = ref(false)

async function load() {
  loadFailed.value = false
  try {
    const data = await api.get<{ ticker: Ticker; snapshots: MarketSnapshot[]; events: TriggerEvent[] }>(
      `/api/tickers/${props.id}`,
    )
    ticker.value = data.ticker
    snapshots.value = data.snapshots
    events.value = data.events
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

function retry() {
  loading.value = true
  load()
}

// ---- chart history (fetched separately so the page isn't blocked) ----
const range = ref<HistoryRange>(rememberedRange(props.id) ?? defaultRange.value)
const points = ref<HistoryPoint[]>([])
const historyLoading = ref(true)
const historyFailed = ref(false)
let historySeq = 0

async function loadHistory() {
  const seq = ++historySeq
  historyLoading.value = true
  historyFailed.value = false
  try {
    const data = await api.get<{ points: HistoryPoint[] }>(`/api/tickers/${props.id}/history?range=${range.value}`)
    if (seq === historySeq) points.value = data.points
  } catch {
    if (seq === historySeq) historyFailed.value = true
  } finally {
    if (seq === historySeq) historyLoading.value = false
  }
}
onMounted(async () => {
  load()
  if (!rememberedRange(props.id)) {
    await loadDefaultRange()
    range.value = defaultRange.value
  }
  loadHistory()
  watch(range, (r) => {
    rememberRange(props.id, r)
    loadHistory()
  })
})

// ---- derived presentation ----
const latest = computed(() => snapshots.value[0] ?? null)
const checks = computed(() => snapshots.value.slice(0, 10))

const volumeRatio = computed(() => {
  const s = latest.value
  return s && s.volume !== null && s.averageVolume ? s.volume / s.averageVolume : null
})

const dayBar = computed(() => {
  const s = latest.value
  if (!s || s.dayLow === null || s.dayHigh === null || s.dayHigh <= s.dayLow) return null
  const pos = ((s.price - s.dayLow) / (s.dayHigh - s.dayLow)) * 100
  return { low: s.dayLow, high: s.dayHigh, pos: Math.min(100, Math.max(0, pos)) }
})

const presetName = computed(() => {
  if (!ticker.value) return ''
  const key = matchPreset(ticker.value.config)
  return t(`ticker.rules.preset.${key ?? 'custom'}`)
})
const ruleSentences = computed(() => (ticker.value ? describeRules(ticker.value.config) : []))

const active = computed(() => {
  const a = ticker.value?.activeEvent
  if (!a) return null
  const ev = events.value.find((e) => e.id === a.id) ?? null
  const status = ev?.investigationStatus ?? null
  return {
    id: a.id,
    pct: Math.abs(a.dayChangePct ?? a.severityPct).toFixed(1) + '%',
    date: fmtDay(a.createdAt),
    level: a.escalationLevel,
    report: ev?.report?.summary ? ev.report : null,
    investigating: status === 'pending' || status === 'running',
  }
})

const canReset = computed(
  () => !!ticker.value && (!!ticker.value.activeEvent || !['armed', 'disabled'].includes(ticker.value.state)),
)

// ---- actions ----
const busy = ref(false)
const confirm = ref<'reset' | 'remove' | null>(null)
const confirmError = ref('')

async function setEnabled(enabled: boolean) {
  const symbol = ticker.value?.symbol
  try {
    await api.post(`/api/tickers/${props.id}/${enabled ? 'enable' : 'disable'}`)
    toast(t(enabled ? 'ticker.toast.resumed' : 'ticker.toast.paused', { symbol }))
    await load()
  } catch {
    toast(t('ticker.toast.failed'), 'error')
  }
}

async function toggleFavorite() {
  const tk = ticker.value
  if (!tk) return
  const favorite = !tk.favorite
  tk.favorite = favorite
  try {
    await api.patch(`/api/tickers/${props.id}`, { favorite })
  } catch {
    tk.favorite = !favorite
    toast(t('favorites.failed'), 'error')
  }
}

async function setTelegramAlerts(telegramAlerts: boolean) {
  const tk = ticker.value
  if (!tk) return
  try {
    await api.patch(`/api/tickers/${props.id}`, { telegramAlerts })
    tk.telegramAlerts = telegramAlerts
    toast(t(telegramAlerts ? 'tickerAlerts.onToast' : 'tickerAlerts.offToast', { symbol: tk.symbol }))
  } catch {
    toast(t('ticker.toast.failed'), 'error')
  }
}

function ask(kind: 'reset' | 'remove') {
  confirmError.value = ''
  confirm.value = kind
}

async function onConfirm() {
  const kind = confirm.value
  const symbol = ticker.value?.symbol
  busy.value = true
  confirmError.value = ''
  try {
    if (kind === 'reset') {
      await api.post(`/api/tickers/${props.id}/reset`)
      confirm.value = null
      toast(t('ticker.toast.reset'))
      await load()
    } else {
      await api.del(`/api/tickers/${props.id}`)
      confirm.value = null
      toast(t('ticker.toast.removed', { symbol }))
      router.push('/')
    }
  } catch {
    confirmError.value = t('ticker.toast.failed')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page">
    <!-- loading skeleton -->
    <template v-if="loading">
      <div class="page-head">
        <BackLink to="/" :label="t('ticker.back')" />
        <div class="grow"><div class="skeleton" style="height: 30px; width: 120px"></div></div>
      </div>
      <div class="layout">
        <div class="main">
          <div class="panel">
            <div class="skeleton" style="height: 40px; width: 180px"></div>
            <div class="skeleton" style="height: 18px; width: 220px; margin-top: 12px"></div>
            <div class="skeleton sk-chart"></div>
          </div>
        </div>
        <div class="side">
          <div class="skeleton" style="height: 220px; border-radius: var(--r-lg)"></div>
        </div>
      </div>
    </template>

    <!-- load error -->
    <template v-else-if="loadFailed || !ticker">
      <div class="page-head">
        <BackLink to="/" :label="t('ticker.back')" />
      </div>
      <div class="panel empty-state">
        <h2>{{ t('ticker.loadFailed') }}</h2>
        <p>{{ t('ticker.loadFailedHint') }}</p>
        <button type="button" class="btn primary" @click="retry"><Icon name="refresh" />{{ t('ticker.retry') }}</button>
      </div>
    </template>

    <template v-else>
      <header class="page-head detail-head">
        <BackLink to="/" :label="t('ticker.back')" />
        <div class="title">
          <h1 class="symbol truncate">{{ ticker.symbol }}</h1>
          <FavoriteButton :on="ticker.favorite" @toggle="toggleFavorite" />
        </div>
        <div class="meta">
          <span v-if="ticker.name" class="truncate company">{{ ticker.name }}</span>
          <span v-if="ticker.exchange" class="exch tiny">{{ ticker.exchange }}</span>
          <StateBadge :state="ticker.state" />
          <span v-if="!ticker.telegramAlerts" class="pill muted-pill" :title="t('tickerAlerts.offHint')">
            <Icon name="bell-off" :size="14" /><span class="off-label">{{ t('tickerAlerts.offPill') }}</span>
          </span>
        </div>
        <RouterLink :to="`/tickers/${ticker.id}/edit`" class="btn edit-btn" :aria-label="t('ticker.editRules')">
          <Icon name="sliders" /><span class="edit-label">{{ t('ticker.editRules') }}</span>
        </RouterLink>
        <OverflowMenu>
          <button v-if="ticker.enabled" type="button" role="menuitem" @click="setEnabled(false)">
            <Icon name="pause" />{{ t('ticker.pause') }}
          </button>
          <button v-else type="button" role="menuitem" @click="setEnabled(true)">
            <Icon name="play" />{{ t('ticker.resume') }}
          </button>
          <button type="button" role="menuitem" @click="setTelegramAlerts(!ticker.telegramAlerts)">
            <Icon :name="ticker.telegramAlerts ? 'bell-off' : 'bell'" />
            {{ t(ticker.telegramAlerts ? 'tickerAlerts.turnOff' : 'tickerAlerts.turnOn') }}
          </button>
          <button v-if="canReset" type="button" role="menuitem" @click="ask('reset')">
            <Icon name="rearm" />{{ t('ticker.resetAlert') }}
          </button>
          <button type="button" role="menuitem" class="danger" @click="ask('remove')">
            <Icon name="trash" />{{ t('ticker.remove') }}
          </button>
        </OverflowMenu>
      </header>

      <div class="layout">
        <div class="main">
          <section class="panel hero" :aria-label="t('ticker.priceLabel')">
            <div class="price-block">
              <p class="price num">{{ fmtPrice(ticker.lastPrice, ticker.currency) }}</p>
              <div class="changes">
                <ChangePct :value="ticker.lastDayChangePct" :label="t('ticker.change.today')" />
                <ChangePct :value="ticker.lastFiveDayChangePct" :label="t('ticker.change.fiveDays')" />
              </div>
              <p class="small faint updated">
                <Icon name="clock" :size="14" />{{ t('ticker.updated', { time: fmtTime(ticker.lastCheckedAt) }) }}
              </p>
              <p v-if="ticker.state !== 'error'" class="small muted">{{ t(`stateHint.${ticker.state}`) }}</p>
            </div>

            <div v-if="ticker.state === 'error'" class="notice error">
              <Icon name="alert" :size="18" />
              <div>
                <p><strong>{{ t('ticker.error.title') }}</strong></p>
                <p class="small">{{ t('ticker.error.body') }}</p>
                <p v-if="ticker.lastError" class="tiny faint tech">{{ ticker.lastError }}</p>
              </div>
            </div>

            <PriceChart
              v-model:range="range"
              class="hero-chart"
              :points="points"
              :events="events"
              :currency="ticker.currency"
              :loading="historyLoading"
              :error="historyFailed"
              @retry="loadHistory"
            />
          </section>

          <section v-if="active" class="panel alert-banner" :class="{ investigating: active.investigating }">
            <div class="alert-head">
              <span class="alert-icon" aria-hidden="true"><Icon :name="active.investigating ? 'sparkle' : 'down'" :size="18" /></span>
              <div class="grow">
                <h2 class="alert-title">{{ t('ticker.alert.title', { pct: active.pct, date: active.date }) }}</h2>
                <p v-if="active.level > 1" class="small muted">{{ t('timeline.further', { n: active.level }) }}</p>
              </div>
            </div>
            <p v-if="active.investigating && !active.report" class="looking small">
              <span class="pulse" aria-hidden="true"></span>{{ t('ticker.alert.investigating') }}
            </p>
            <div v-if="active.report" class="alert-report">
              <span v-if="active.report.classification" class="pill ai">{{ classificationLabel(active.report.classification) }}</span>
              <p class="summary small">{{ active.report.summary }}</p>
            </div>
            <RouterLink :to="`/events/${active.id}`" class="btn sm alert-link">
              {{ t(active.report ? 'ticker.alert.read' : 'ticker.alert.open') }}<Icon name="chevron" :size="16" />
            </RouterLink>
          </section>

          <section class="section">
            <div class="section-head">
              <h2>{{ t('ticker.timeline.title') }}</h2>
              <span v-if="events.length" class="hint">{{ t('ticker.timeline.count', events.length) }}</span>
            </div>
            <div v-if="events.length" class="panel tight timeline">
              <EventListItem v-for="e in events" :key="e.id" :event="e" timeline />
            </div>
            <div v-else class="panel empty-timeline">
              <span class="empty-icon" aria-hidden="true"><Icon name="watchlist" :size="22" /></span>
              <p class="muted small">{{ t('ticker.timeline.empty') }}</p>
            </div>
          </section>
        </div>

        <aside class="side">
          <section v-if="latest" class="panel">
            <div class="section-head">
              <h2>{{ t('ticker.today.title') }}</h2>
              <span class="hint">{{ fmtTime(latest.capturedAt) }}</span>
            </div>
            <dl class="stats">
              <div class="stat">
                <dt>{{ t('ticker.today.open') }}</dt>
                <dd class="num">{{ fmtPrice(latest.open, ticker.currency) }}</dd>
              </div>
              <div v-if="dayBar" class="stat range">
                <dt>{{ t('ticker.today.range') }}</dt>
                <dd>
                  <div class="bar" role="img" :aria-label="t('ticker.today.rangeAria', { low: fmtPrice(dayBar.low, ticker.currency), high: fmtPrice(dayBar.high, ticker.currency), price: fmtPrice(latest.price, ticker.currency) })">
                    <span class="bar-mark" :style="{ left: dayBar.pos + '%' }"></span>
                  </div>
                  <div class="bar-ends tiny faint num">
                    <span>{{ fmtPrice(dayBar.low, ticker.currency) }}</span>
                    <span>{{ fmtPrice(dayBar.high, ticker.currency) }}</span>
                  </div>
                </dd>
              </div>
              <div class="stat">
                <dt>{{ t('ticker.today.prevClose') }}</dt>
                <dd class="num">{{ fmtPrice(latest.previousClose, ticker.currency) }}</dd>
              </div>
              <div class="stat">
                <dt>{{ t('ticker.today.volume') }}</dt>
                <dd class="num">
                  {{ fmtVolume(latest.volume) }}
                  <span v-if="volumeRatio !== null" class="vol-hint" :class="{ high: volumeRatio >= 1.5 }">
                    {{ t('ticker.today.vsNormal', { x: volumeRatio.toFixed(1) }) }}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          <section class="panel">
            <div class="section-head">
              <h2>{{ t('ticker.rules.title') }}</h2>
              <RouterLink :to="`/tickers/${ticker.id}/edit`" class="small">{{ t('ticker.rules.edit') }}</RouterLink>
            </div>
            <p class="preset">
              <span class="pill tide">{{ presetName }}</span>
            </p>
            <p class="small muted rules-intro">{{ t('ticker.rules.intro') }}</p>
            <ul v-if="ruleSentences.length" class="rules">
              <li v-for="s in ruleSentences" :key="s" class="small">{{ s }}</li>
            </ul>
            <p v-else class="small muted">{{ t('ticker.rules.none') }}</p>
          </section>

          <details class="panel checks">
            <summary>
              <h2>{{ t('ticker.checks.title') }}</h2>
              <Icon name="chevron" :size="18" class="chev" />
            </summary>
            <ul v-if="checks.length" class="check-list">
              <li v-for="s in checks" :key="s.id">
                <span class="small muted">{{ fmtDate(s.capturedAt) }}</span>
                <span class="num small">{{ fmtPrice(s.price, ticker.currency) }}</span>
                <ChangePct class="small" :value="s.dayChangePct" />
              </li>
            </ul>
            <p v-else class="small muted">{{ t('ticker.checks.empty') }}</p>
          </details>
        </aside>
      </div>
    </template>

    <ConfirmDialog
      v-if="confirm === 'reset'"
      :title="t('ticker.confirmReset.title')"
      :message="t('ticker.confirmReset.message')"
      :confirm-label="t('ticker.resetAlert')"
      tone="primary"
      :busy="busy"
      :error="confirmError"
      @cancel="confirm = null"
      @confirm="onConfirm"
    />
    <ConfirmDialog
      v-if="confirm === 'remove'"
      :title="t('ticker.confirmRemove.title', { symbol: ticker?.symbol })"
      :message="t('ticker.confirmRemove.message', { symbol: ticker?.symbol })"
      :confirm-label="t('ticker.remove')"
      :busy="busy"
      :error="confirmError"
      @cancel="confirm = null"
      @confirm="onConfirm"
    />
  </div>
</template>

<style scoped>
/* ---- header: back, symbol and actions on one row; status + company below the symbol ---- */
.detail-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  grid-template-areas: 'back title edit menu' 'meta meta meta meta';
  align-items: center;
  gap: 8px 10px;
}
.detail-head > :first-child { grid-area: back; }
.title { grid-area: title; display: flex; align-items: center; gap: 2px; min-width: 0; }
.symbol { font-size: 1.9rem; letter-spacing: -0.02em; }
.edit-btn { grid-area: edit; }
.detail-head > :last-child { grid-area: menu; }
.meta { grid-area: meta; display: flex; align-items: center; gap: 8px; min-width: 0; }
@media (min-width: 600px) {
  .detail-head { grid-template-areas: 'back title edit menu' '. meta . .'; column-gap: 14px; }
}
.meta > * { flex-shrink: 0; }
.meta > .company { flex-shrink: 1; color: var(--ink-2); font-size: 0.92rem; }
.muted-pill { color: var(--ink-3); }
/* Phones: bell-off icon only, so the company name keeps its room. */
@media (max-width: 599px) {
  .muted-pill { padding: 3px 6px; }
  .off-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
}
.exch {
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid var(--line);
  color: var(--ink-3);
  font-weight: 600;
}
@media (max-width: 599px) {
  .edit-btn { width: 44px; padding: 0; }
  .edit-label { display: none; }
}

/* ---- layout ---- */
.layout { display: grid; gap: 16px; }
.main, .side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.main > .section { margin-top: 12px; }
@media (min-width: 900px) {
  .layout { grid-template-columns: minmax(0, 1fr) 340px; gap: 24px; align-items: start; }
  .side { position: sticky; top: 16px; }
}

/* ---- hero: price + chart ---- */
.hero { display: flex; flex-direction: column; gap: 20px; }
.price {
  font-family: var(--font-display);
  font-size: 2.6rem;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
}
@media (min-width: 900px) {
  .price { font-size: 3rem; }
}
.changes { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 8px 0 6px; font-size: 1rem; }
.updated { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.tech { margin-top: 6px; word-break: break-word; }
.hero-chart { margin-top: 4px; }
.sk-chart { height: 220px; margin-top: 28px; }
@media (min-width: 900px) {
  .sk-chart { height: 300px; }
}

/* ---- active alert banner ---- */
.alert-banner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-color: color-mix(in srgb, var(--drop) 40%, var(--line));
  background: linear-gradient(180deg, var(--drop-soft), var(--surface) 70%);
}
.alert-banner.investigating {
  border-color: color-mix(in srgb, var(--amber) 40%, var(--line));
  background: linear-gradient(180deg, var(--amber-soft), var(--surface) 70%);
}
.alert-head { display: flex; align-items: center; gap: 12px; }
.alert-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--drop);
  color: var(--surface);
}
.investigating .alert-icon { background: var(--amber); }
.alert-title { font-size: 1.15rem; }
.looking { display: flex; align-items: center; gap: 10px; color: var(--amber); font-weight: 600; }
.pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--amber);
  animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse { 50% { opacity: 0.25; } }
.alert-report { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.summary {
  color: var(--ink);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.alert-link { align-self: flex-start; }

/* ---- timeline ---- */
.timeline { padding: 8px; }
.empty-timeline { display: flex; align-items: center; gap: 14px; }
.empty-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--tide-soft);
  color: var(--tide);
}

/* ---- side panels ---- */
.side .section-head { margin-bottom: 14px; }
.stats { margin: 0; }
.stat {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--line);
}
.stat:first-child { border-top: 0; padding-top: 0; }
.stat:last-child { padding-bottom: 0; }
.stat dt { color: var(--ink-2); font-size: 0.9rem; }
.stat dd { margin: 0; font-weight: 600; text-align: right; }
.stat.range { flex-direction: column; align-items: stretch; gap: 10px; }
.stat.range dd { text-align: left; font-weight: 400; }
.bar {
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--drop-soft), var(--rise-soft));
}
.bar-mark {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  border-radius: 50%;
  background: var(--ink);
  border: 3px solid var(--surface);
}
.bar-ends { display: flex; justify-content: space-between; margin-top: 6px; }
.vol-hint { display: block; font-size: 0.8rem; font-weight: 500; color: var(--ink-3); }
.vol-hint.high { color: var(--amber); font-weight: 600; }

.preset { margin-bottom: 10px; }
.rules-intro { margin-bottom: 6px; }
.rules { margin: 0; padding: 0; list-style: none; }
.rules li {
  position: relative;
  padding: 6px 0 6px 18px;
  color: var(--ink);
}
.rules li::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 14px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tide);
}

.checks summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 28px;
  cursor: pointer;
  list-style: none;
}
.checks summary::-webkit-details-marker { display: none; }
.chev { color: var(--ink-3); transition: transform 0.15s; }
.checks[open] .chev { transform: rotate(90deg); }
.check-list { margin: 14px 0 0; padding: 0; list-style: none; }
.check-list li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: baseline;
  gap: 12px;
  padding: 9px 0;
  border-top: 1px solid var(--line);
}
</style>

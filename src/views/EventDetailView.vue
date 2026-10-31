<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '../api'
import { REINVESTIGATE_MODELS, type InvestigationReport, type TriggerEvent, type TriggerReason } from '../types'
import { fmtDate, fmtNum, reasonLabel, verificationLabel } from '../format'
import { toast } from '../toast'
import ChangePct from '../components/ChangePct.vue'
import ReportBlock from '../components/ReportBlock.vue'
import BackLink from '../components/BackLink.vue'
import Icon from '../components/Icon.vue'

const props = defineProps<{ id: string }>()
const { t, te } = useI18n()
const event = ref<TriggerEvent | null>(null)
const loading = ref(true)
const loadError = ref<'notFound' | 'failed' | null>(null)

const reports = computed(() => event.value?.reports ?? (event.value?.report ? [event.value.report] : []))
const activeReportId = ref<number | null>(null)
const activeReport = computed(() => reports.value.find((r) => r.id === activeReportId.value) ?? null)

// severityPct is the backend's measure of how far it fell for this alert (the
// largest triggering drop), so it stays correct when e.g. only 5-day fired.
const dropPct = computed(() => {
  const e = event.value
  if (!e) return ''
  return Math.abs(e.severityPct || e.dayChangePct || 0).toFixed(1)
})

function tabLabel(r: InvestigationReport): string {
  // Pre-migration primary reports have no stored model — fall back to "Original".
  if (r.model) return r.model
  return r.isPrimary ? t('report.original') : '—'
}
const isBusy = (r: InvestigationReport) => r.status === 'pending' || r.status === 'running'
// A report is also "busy" while a manual AI source check is queued/running on it.
const needsPolling = (r: InvestigationReport) => isBusy(r) || r.events.some((e) => e.verification?.aiCheckPending)
const pendingChecks = () =>
  reports.value.flatMap((r) => r.events.map((e, i) => (e.verification?.aiCheckPending ? `${r.id}:${i}` : '')).filter(Boolean))

// 1 decimal, no trailing zero: 5 -> "5", -8.9588 -> "9", 2.54 -> "2.5"
const short = (n: number) => String(Math.round(Math.abs(n) * 10) / 10)

// Presentation-only restatement of what the backend already decided fired.
function reasonSentence(r: TriggerReason): string {
  const key = `investigation.reasonSentence.${r.type}`
  if (!te(key)) return t('investigation.reasonSentence.other', { reason: reasonLabel(r.type), observed: fmtNum(r.observed), threshold: fmtNum(r.threshold) })
  return t(key, {
    observed: short(r.observed),
    threshold: short(r.threshold),
    volume: short(event.value?.volumeRatio ?? 0),
  })
}

const selectedModel = ref('')
const submitting = ref(false)
const reinvestigateError = ref('')
// A model already has a non-failed attempt on this event — offer it disabled rather than hide it,
// so it's clear at a glance which models have already weighed in.
const usedModels = computed(
  () => new Set(reports.value.filter((r) => r.status !== 'failed').map((r) => r.model).filter((m): m is string => m !== null)),
)

let pollTimer: ReturnType<typeof setInterval> | null = null

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function startPollingIfNeeded() {
  stopPolling()
  if (!reports.value.some(needsPolling)) return
  pollTimer = setInterval(async () => {
    try {
      await load(false)
    } catch {
      // transient poll failure — keep the last good data and try again next tick
    }
    if (!reports.value.some(needsPolling)) stopPolling()
  }, 4000)
}

async function fetchEvent() {
  const wasPending = pendingChecks()
  event.value = (await api.get<{ event: TriggerEvent }>(`/api/events/${props.id}`)).event
  for (const key of wasPending) {
    const [rid, i] = key.split(':').map(Number)
    const v = reports.value.find((r) => r.id === rid)?.events[i]?.verification
    if (v && !v.aiCheckPending) toast(t('verify.checkFinished', { verdict: verificationLabel(v.status) }))
  }
  if (activeReportId.value === null) {
    activeReportId.value = event.value.report?.id ?? reports.value[0]?.id ?? null
  }
}

async function load(showLoading = true) {
  if (!showLoading) {
    await fetchEvent()
    startPollingIfNeeded()
    return
  }
  loading.value = true
  loadError.value = null
  try {
    await fetchEvent()
    startPollingIfNeeded()
  } catch (e) {
    loadError.value = e instanceof ApiError && e.status === 404 ? 'notFound' : 'failed'
  } finally {
    loading.value = false
  }
}

async function reinvestigate() {
  const model = selectedModel.value
  if (!model || submitting.value) return
  submitting.value = true
  reinvestigateError.value = ''
  try {
    const { report } = await api.post<{ report: InvestigationReport | null }>(`/api/events/${props.id}/reinvestigate`, { model })
    selectedModel.value = ''
    await load(false)
    if (report) activeReportId.value = report.id
    toast(t('investigation.asked', { model }))
    // Show the new tab and its "researching" state instead of leaving the user at the form.
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  } catch (e) {
    reinvestigateError.value = e instanceof ApiError && e.status < 500 ? e.message : t('investigation.askFailed')
  } finally {
    submitting.value = false
  }
}

// Manual AI check accepted: swap in the returned report (its source now pending) and poll.
function replaceReport(report: InvestigationReport) {
  const e = event.value
  if (!e) return
  if (e.reports) e.reports = e.reports.map((r) => (r.id === report.id ? report : r))
  if (e.report?.id === report.id) e.report = report
  startPollingIfNeeded()
}

function reloadQuietly() {
  load(false).catch(() => {})
}

onMounted(() => load())
onUnmounted(stopPolling)
</script>

<template>
  <div class="page">
    <!-- Loading -->
    <template v-if="loading">
      <div class="page-head">
        <div class="skeleton" style="width: 44px; height: 44px; border-radius: 50%"></div>
        <div class="skeleton" style="width: 180px; height: 18px"></div>
      </div>
      <div class="skeleton" style="width: min(560px, 90%); height: 44px; margin-bottom: 12px"></div>
      <div class="skeleton" style="width: 160px; height: 16px; margin-bottom: 28px"></div>
      <div class="layout">
        <div class="skeleton" style="height: 320px; border-radius: var(--r-lg)"></div>
        <div class="skeleton side-skel" style="height: 220px; border-radius: var(--r-lg)"></div>
      </div>
    </template>

    <!-- Not found / error -->
    <template v-else-if="loadError || !event">
      <div class="page-head">
        <BackLink to="/events" :label="t('investigation.backToList')" />
      </div>
      <div class="empty-state">
        <h2>{{ loadError === 'notFound' ? t('investigation.notFoundTitle') : t('investigation.loadFailedTitle') }}</h2>
        <p>{{ loadError === 'notFound' ? t('investigation.notFoundHint') : t('investigation.loadFailedHint') }}</p>
        <button v-if="loadError !== 'notFound'" type="button" class="btn primary" @click="load()">
          <Icon name="refresh" :size="18" />{{ t('investigation.retry') }}
        </button>
        <RouterLink v-else to="/events" class="btn">{{ t('investigation.backToList') }}</RouterLink>
      </div>
    </template>

    <template v-else>
      <div class="page-head">
        <BackLink :to="`/tickers/${event.tickerId}`" :label="t('investigation.backTo', { symbol: event.symbol })" />
        <div class="grow crumb">
          <RouterLink :to="`/tickers/${event.tickerId}`" class="sym">{{ event.symbol }}</RouterLink>
          <span v-if="event.companyName" class="muted small truncate">{{ event.companyName }}</span>
        </div>
      </div>

      <header class="hero">
        <h1 class="question">{{ t('investigation.headline', { symbol: event.symbol, pct: dropPct }) }}</h1>
        <div class="hero-meta">
          <span class="small muted num"><Icon name="clock" :size="15" />{{ fmtDate(event.createdAt) }}</span>
          <span v-if="event.escalationLevel > 1" class="pill drop">
            <Icon name="down" :size="14" />{{ t('investigation.fellFurther', { n: event.escalationLevel }) }}
          </span>
        </div>
      </header>

      <div class="layout">
        <div class="main">
          <div v-if="reports.length > 1" class="tabs">
            <div class="seg" role="group" :aria-label="t('investigation.versions')">
              <button
                v-for="r in reports"
                :key="r.id"
                type="button"
                :aria-pressed="r.id === activeReportId"
                @click="activeReportId = r.id"
              >
                <span v-if="isBusy(r)" class="busy-dot" aria-hidden="true"></span>{{ tabLabel(r) }}
              </button>
            </div>
          </div>

          <ReportBlock
            v-if="activeReport"
            :key="activeReport.id"
            :report="activeReport"
            @report="replaceReport"
            @blocked="reloadQuietly"
          />
          <div v-else class="panel notice-panel">
            <p class="muted">{{ t('investigation.notInvestigated') }}</p>
          </div>
        </div>

        <aside class="side">
          <section class="panel facts">
            <h2>{{ t('investigation.whatHappened') }}</h2>
            <p class="small muted facts-when">{{ t('investigation.whatHappenedAt', { date: fmtDate(event.createdAt) }) }}</p>
            <dl class="stats">
              <div>
                <dt>{{ t('investigation.priceAtAlert') }}</dt>
                <dd class="num big">{{ fmtNum(event.price) }}</dd>
              </div>
              <div v-if="event.previousClose !== null">
                <dt>{{ t('investigation.prevClose') }}</dt>
                <dd class="num">{{ fmtNum(event.previousClose) }}</dd>
              </div>
              <div v-if="event.dayChangePct !== null">
                <dt>{{ t('investigation.today') }}</dt>
                <dd><ChangePct :value="event.dayChangePct" /></dd>
              </div>
              <div v-if="event.fiveDayChangePct !== null">
                <dt>{{ t('investigation.fiveDay') }}</dt>
                <dd><ChangePct :value="event.fiveDayChangePct" /></dd>
              </div>
              <div v-if="event.intradayChangePct !== null">
                <dt>{{ t('investigation.intraday') }}</dt>
                <dd><ChangePct :value="event.intradayChangePct" /></dd>
              </div>
              <div v-if="event.volumeRatio !== null">
                <dt>{{ t('investigation.volume') }}</dt>
                <dd class="num">{{ t('investigation.volumeNormal', { x: fmtNum(event.volumeRatio, 1) }) }}</dd>
              </div>
            </dl>

            <template v-if="event.reasons.length">
              <h3 class="why-head">{{ t('investigation.whyAlerted') }}</h3>
              <ul class="reasons">
                <li v-for="(r, i) in event.reasons" :key="i">
                  <Icon name="bell" :size="16" />
                  <span>{{ reasonSentence(r) }}</span>
                </li>
              </ul>
            </template>
          </section>

          <details class="panel second">
            <summary>
              <span class="sum-title"><Icon name="sparkle" :size="18" />{{ t('investigation.secondOpinion') }}</span>
              <Icon name="chevron" :size="18" class="chev" />
            </summary>
            <div class="second-body">
              <p class="small muted">{{ t('investigation.secondOpinionHint') }}</p>
              <div>
                <label class="field-label" for="model-select">{{ t('investigation.model') }}</label>
                <select id="model-select" v-model="selectedModel" class="input">
                  <option value="">{{ t('investigation.selectModel') }}</option>
                  <option v-for="m in REINVESTIGATE_MODELS" :key="m" :value="m" :disabled="usedModels.has(m)">
                    {{ usedModels.has(m) ? t('investigation.alreadyUsed', { model: m }) : m }}
                  </option>
                </select>
              </div>
              <button type="button" class="btn primary block" :disabled="!selectedModel || submitting" @click="reinvestigate">
                {{ submitting ? t('investigation.asking') : selectedModel ? t('investigation.ask', { model: selectedModel }) : t('investigation.askGeneric') }}
              </button>
              <p v-if="reinvestigateError" class="field-error" role="alert">{{ reinvestigateError }}</p>
            </div>
          </details>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.crumb { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.sym { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; color: var(--ink); }

.hero { margin: 4px 0 24px; }
.question {
  font-size: clamp(2rem, 7.5vw, 3rem);
  line-height: 1.05;
  font-weight: 750;
  letter-spacing: -0.025em;
  max-width: 20ch;
  text-wrap: balance;
}
.hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  margin-top: 14px;
}
.hero-meta > .small { display: inline-flex; align-items: center; gap: 6px; }

.layout { display: grid; gap: 28px; }
.main, .side { min-width: 0; }
.side > * + * { margin-top: 16px; }
@media (min-width: 960px) {
  .layout { grid-template-columns: minmax(0, 1fr) 320px; align-items: start; gap: 24px; }
  .side { position: sticky; top: 16px; }
}
@media (max-width: 959px) {
  .side-skel { display: none; }
}

.tabs { margin-bottom: 14px; overflow-x: auto; }
.busy-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 50%;
  background: var(--ai);
  vertical-align: 1px;
  animation: blink 1.2s ease-in-out infinite;
}
@keyframes blink { 50% { opacity: 0.25; } }

/* ---------- what happened ---------- */
.facts h2 { margin-bottom: 14px; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; margin: 0; }
.stats dt { font-size: 0.8rem; color: var(--ink-2); }
.stats dd { margin: 2px 0 0; font-weight: 600; }
.stats dd.big { font-family: var(--font-display); font-size: 1.35rem; font-weight: 700; line-height: 1.2; }
.why-head { margin: 20px 0 10px; padding-top: 16px; border-top: 1px solid var(--line); }
.reasons { list-style: none; margin: 0; padding: 0; }
.reasons li { display: flex; gap: 10px; align-items: flex-start; font-size: 0.92rem; line-height: 1.45; }
.reasons li + li { margin-top: 10px; }
.reasons li svg { flex-shrink: 0; margin-top: 2px; color: var(--drop); }

/* ---------- second opinion ---------- */
.second { padding: 0; }
.second summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 56px;
  padding: 14px 20px;
  cursor: pointer;
  list-style: none;
  font-weight: 650;
}
.second summary::-webkit-details-marker { display: none; }
.sum-title { display: inline-flex; align-items: center; gap: 10px; }
.sum-title svg { color: var(--ai); }
.chev { color: var(--ink-3); transition: transform 0.15s; }
.second[open] .chev { transform: rotate(90deg); }
.second-body { padding: 0 20px 20px; }
.second-body > * + * { margin-top: 14px; }
@media (max-width: 480px) {
  .second summary { padding: 14px 16px; }
  .second-body { padding: 0 16px 16px; }
}
.facts-when { margin: 2px 0 12px; }
</style>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '../api'
import { REINVESTIGATE_MODELS, type TriggerEvent } from '../types'
import { fmtDate, fmtNum, reasonLabel } from '../format'
import ChangePct from '../components/ChangePct.vue'
import ReportBlock from '../components/ReportBlock.vue'
import BackLink from '../components/BackLink.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const event = ref<TriggerEvent | null>(null)
const loading = ref(true)

const reports = computed(() => event.value?.reports ?? (event.value?.report ? [event.value.report] : []))
const activeReportId = ref<number | null>(null)
const activeReport = computed(() => reports.value.find((r) => r.id === activeReportId.value) ?? null)

function tabLabel(r: (typeof reports.value)[number]): string {
  // Pre-migration primary reports have no stored model — fall back to "Original".
  if (r.model) return r.model
  return r.isPrimary ? t('report.original') : '—'
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
  if (!reports.value.some((r) => r.status === 'pending' || r.status === 'running')) return
  pollTimer = setInterval(async () => {
    await load(false)
    if (!reports.value.some((r) => r.status === 'pending' || r.status === 'running')) stopPolling()
  }, 4000)
}

async function load(showLoading = true) {
  if (showLoading) loading.value = true
  event.value = (await api.get<{ event: TriggerEvent }>(`/api/events/${props.id}`)).event
  if (activeReportId.value === null) {
    activeReportId.value = event.value.report?.id ?? reports.value[0]?.id ?? null
  }
  loading.value = false
  startPollingIfNeeded()
}

async function reinvestigate() {
  if (!selectedModel.value || submitting.value) return
  submitting.value = true
  reinvestigateError.value = ''
  try {
    const { report } = await api.post<{ report: TriggerEvent['report'] }>(`/api/events/${props.id}/reinvestigate`, {
      model: selectedModel.value,
    })
    selectedModel.value = ''
    await load(false)
    if (report) activeReportId.value = report.id
  } catch (e) {
    reinvestigateError.value = e instanceof ApiError ? e.message : t('report.reinvestigateFailed')
  } finally {
    submitting.value = false
  }
}

onMounted(() => load())
onUnmounted(stopPolling)
</script>

<template>
  <p v-if="loading" class="empty">{{ t('common.loading') }}</p>
  <template v-else-if="event">
    <Breadcrumbs
      :items="[
        { label: t('nav.dashboard'), to: '/' },
        { label: event.symbol, to: `/tickers/${event.tickerId}` },
        { label: t('report.title') },
      ]"
    />
    <div class="row between" style="margin-top: 10px">
      <div class="row" style="gap: 10px; align-items: center">
        <BackLink :to="`/tickers/${event.tickerId}`" :label="t('nav.backToTicker')" />
        <h1 style="margin: 0">{{ event.symbol }}</h1>
      </div>
      <span v-if="event.escalationLevel > 1" class="badge triggered">
        {{ t('events.escalationLevel', { n: event.escalationLevel }) }}
      </span>
    </div>
    <p class="muted">{{ event.companyName }} · {{ fmtDate(event.createdAt) }}</p>

    <div class="card stack">
      <div class="change-row">
        <span class="mono">{{ t('events.price', { value: fmtNum(event.price) }) }}</span>
        <span class="muted mono" v-if="event.previousClose">
          {{ t('events.prevClose', { value: fmtNum(event.previousClose) }) }}
        </span>
      </div>
      <div class="change-row">
        <ChangePct :value="event.dayChangePct" label="1d" />
        <ChangePct v-if="event.fiveDayChangePct !== null" :value="event.fiveDayChangePct" label="5d" />
        <ChangePct v-if="event.intradayChangePct !== null" :value="event.intradayChangePct" label="intra" />
        <span class="muted mono" v-if="event.volumeRatio">
          {{ t('events.volumeRatio', { value: event.volumeRatio.toFixed(1) }) }}
        </span>
      </div>
      <div>
        <h3>{{ t('events.conditions') }}</h3>
        <ul>
          <li v-for="(r, i) in event.reasons" :key="i">
            {{ t('events.conditionRow', { reason: reasonLabel(r.type), threshold: r.threshold, observed: r.observed }) }}
          </li>
        </ul>
      </div>
    </div>

    <div class="row wrap tabs" v-if="reports.length > 1">
      <button
        v-for="r in reports"
        :key="r.id"
        type="button"
        class="small"
        :class="{ active: r.id === activeReportId }"
        @click="activeReportId = r.id"
      >
        {{ tabLabel(r) }}
      </button>
    </div>

    <ReportBlock v-if="activeReport" :report="activeReport" />
    <p v-else class="empty">{{ t('events.eventNotInvestigated') }}</p>

    <div class="card stack">
      <h3 style="margin: 0">{{ t('report.reinvestigateTitle') }}</h3>
      <div class="row wrap" style="gap: 8px">
        <select v-model="selectedModel" style="width: auto; flex: 1; min-width: 160px">
          <option value="">{{ t('report.selectModel') }}</option>
          <option v-for="m in REINVESTIGATE_MODELS" :key="m" :value="m" :disabled="usedModels.has(m)">
            {{ m }}
          </option>
        </select>
        <button class="small" :disabled="!selectedModel || submitting" @click="reinvestigate">
          {{ submitting ? t('report.reinvestigating') : t('report.reinvestigateButton') }}
        </button>
      </div>
      <p v-if="reinvestigateError" class="alert error" style="margin: 0">{{ reinvestigateError }}</p>
    </div>
  </template>
</template>

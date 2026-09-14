<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '../api'
import type { TriggerEvent } from '../types'
import { fmtDate, fmtNum, reasonLabel } from '../format'
import ChangePct from '../components/ChangePct.vue'
import ReportBlock from '../components/ReportBlock.vue'
import BackLink from '../components/BackLink.vue'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const event = ref<TriggerEvent | null>(null)
const loading = ref(true)

onMounted(async () => {
  event.value = (await api.get<{ event: TriggerEvent }>(`/api/events/${props.id}`)).event
  loading.value = false
})
</script>

<template>
  <p v-if="loading" class="empty">{{ t('common.loading') }}</p>
  <template v-else-if="event">
    <div class="row between" style="margin-top: 16px">
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

    <ReportBlock v-if="event.report" :report="event.report" />
    <p v-else class="empty">{{ t('events.eventNotInvestigated') }}</p>
  </template>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { TriggerEvent } from '../types'
import { classificationLabel, fmtDate, impactLevelLabel, investigationStatusLabel, recoveryLikelihoodLabel, reasonLabel } from '../format'
import ChangePct from './ChangePct.vue'

defineProps<{ event: TriggerEvent; showSymbol?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <RouterLink :to="`/events/${event.id}`" class="card stack event-card">
    <span v-if="event.investigationStatus" class="badge status-corner" :class="event.investigationStatus">
      {{ investigationStatusLabel(event.investigationStatus) }}
    </span>

    <div class="row" style="gap: 8px">
      <strong v-if="showSymbol">{{ event.symbol }}</strong>
      <span class="badge triggered">
        {{ event.escalationLevel > 1 ? t('events.escalationLevel', { n: event.escalationLevel }) : t('state.triggered') }}
      </span>
      <span class="muted">{{ fmtDate(event.createdAt) }}</span>
    </div>

    <div class="change-row">
      <ChangePct :value="event.dayChangePct" label="1d" />
      <ChangePct v-if="event.fiveDayChangePct !== null" :value="event.fiveDayChangePct" label="5d" />
      <ChangePct v-if="event.intradayChangePct !== null" :value="event.intradayChangePct" label="intra" />
    </div>

    <div class="muted">{{ event.reasons.map((r) => reasonLabel(r.type)).join(', ') }}</div>

    <span v-if="!event.investigationStatus" class="muted">{{ t('events.notInvestigated') }}</span>

    <div v-if="event.report?.summary" class="assessment-pad change-row" style="font-size: 0.85rem">
      <span v-if="event.report.classification" class="muted">
        {{ t('report.cause') }}: <strong>{{ classificationLabel(event.report.classification) }}</strong>
      </span>
      <span v-if="event.report.assessment?.fundamentalImpact" class="muted">
        {{ t('report.impact') }}: {{ impactLevelLabel(event.report.assessment.fundamentalImpact) }}
      </span>
      <span v-if="event.report.assessment?.recoveryLikelihood" class="muted">
        {{ t('report.recoveryLabel') }}: {{ recoveryLikelihoodLabel(event.report.assessment.recoveryLikelihood) }}
      </span>
    </div>
  </RouterLink>
</template>

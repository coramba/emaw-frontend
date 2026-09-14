<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { TriggerEvent } from '../types'
import { classificationLabel, fmtDate, investigationStatusLabel, reasonLabel } from '../format'
import ChangePct from './ChangePct.vue'

defineProps<{ event: TriggerEvent; showSymbol?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <RouterLink :to="`/events/${event.id}`" class="list-item stack">
    <div class="row" :class="{ between: showSymbol || event.escalationLevel > 1 }">
      <div class="row" style="gap: 8px" v-if="showSymbol || event.escalationLevel > 1">
        <strong v-if="showSymbol">{{ event.symbol }}</strong>
        <span v-if="event.escalationLevel > 1" class="badge triggered">
          {{ t('events.escalationLevel', { n: event.escalationLevel }) }}
        </span>
      </div>
      <span class="muted">{{ fmtDate(event.createdAt) }}</span>
    </div>
    <div class="change-row">
      <ChangePct :value="event.dayChangePct" label="1d" />
      <ChangePct v-if="event.fiveDayChangePct !== null" :value="event.fiveDayChangePct" label="5d" />
      <ChangePct v-if="event.intradayChangePct !== null" :value="event.intradayChangePct" label="intra" />
    </div>
    <div class="muted">{{ event.reasons.map((r) => reasonLabel(r.type)).join(', ') }}</div>
    <div class="row between">
      <span v-if="event.investigationStatus" class="badge" :class="event.investigationStatus">
        {{ investigationStatusLabel(event.investigationStatus) }}
      </span>
      <span v-else class="muted">{{ t('events.notInvestigated') }}</span>
      <span v-if="event.report?.classification" class="muted">
        {{ classificationLabel(event.report.classification) }}
      </span>
    </div>
  </RouterLink>
</template>

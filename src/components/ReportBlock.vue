<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { InvestigationReport } from '../types'
import {
  classificationLabel,
  eventRoleLabel,
  fmtDate,
  impactLevelLabel,
  investigationStatusLabel,
  isHttpUrl,
  overreactionLabel,
  recoveryLikelihoodLabel,
  sourceTypeLabel,
} from '../format'

defineProps<{ report: InvestigationReport }>()
const { t } = useI18n()

function roleBadgeClass(role: string): string {
  if (role === 'primary_cause') return 'triggered'
  if (role === 'alternative_explanation') return 'cooldown'
  return 'info'
}
</script>

<template>
  <div class="card stack">
    <div class="row between">
      <h3 style="margin: 0">{{ t('report.title') }}</h3>
      <span class="badge" :class="report.status">{{ investigationStatusLabel(report.status) }}</span>
    </div>
    <span class="muted">{{ t('report.reportedAt', { date: fmtDate(report.createdAt) }) }}</span>

    <p v-if="report.status === 'failed'" class="alert error" style="margin: 0">
      {{ report.error ?? t('report.failed') }}
    </p>

    <template v-if="report.summary">
      <p style="margin: 0">{{ report.summary }}</p>
      <div class="assessment-pad stack">
        <div class="change-row">
          <span class="muted">{{ t('report.cause') }}: <strong>{{ report.classification ? classificationLabel(report.classification) : classificationLabel('unclear') }}</strong></span>
          <span class="muted" v-if="report.confidence !== null">{{ t('report.confidence') }}: {{ report.confidence.toFixed(2) }}</span>
          <span class="muted" v-if="report.assessment?.fundamentalImpact">
            {{ t('report.impact') }}: {{ impactLevelLabel(report.assessment.fundamentalImpact) }}
          </span>
          <span class="muted" v-if="report.assessment?.recoveryLikelihood">
            {{ t('report.recoveryLabel') }}: {{ recoveryLikelihoodLabel(report.assessment.recoveryLikelihood) }}
          </span>
          <span class="muted" v-if="report.assessment?.potentialOverreaction">
            {{ t('report.overreactionLabel') }}: {{ overreactionLabel(report.assessment.potentialOverreaction) }}
          </span>
        </div>
        <p v-if="report.assessment?.recoveryRationale" class="muted" style="margin: 0; font-style: italic">
          {{ report.assessment.recoveryRationale }}
        </p>
      </div>
    </template>

    <p v-if="report.insufficientEvidence" class="alert info" style="margin: 0">
      {{ t('report.insufficient') }}
    </p>

    <div v-if="report.events.length" class="stack">
      <h3 style="margin: 4px 0">{{ t('report.evidence') }}</h3>
      <div v-for="(ev, i) in report.events" :key="i" class="list-item stack">
        <div class="row between" style="gap: 8px; align-items: baseline">
          <a v-if="isHttpUrl(ev.sourceUrl)" :href="ev.sourceUrl" target="_blank" rel="noopener"><strong>{{ ev.title }}</strong></a>
          <strong v-else>{{ ev.title }}</strong>
          <span v-if="ev.role" class="badge" :class="roleBadgeClass(ev.role)">{{ eventRoleLabel(ev.role) }}</span>
        </div>
        <div class="muted" v-if="ev.publishedAt || ev.sourceName || ev.sourceType">
          <template v-if="ev.publishedAt">{{ fmtDate(ev.publishedAt) }}<template v-if="ev.sourceName || ev.sourceType"> · </template></template>
          <template v-if="ev.sourceName">{{ ev.sourceName }}<template v-if="ev.sourceType"> · </template></template>
          <template v-if="ev.sourceType">{{ sourceTypeLabel(ev.sourceType) }}</template>
        </div>
        <div>{{ ev.summary }}</div>
      </div>
    </div>
  </div>
</template>

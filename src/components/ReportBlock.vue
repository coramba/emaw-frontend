<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { InvestigationReport } from '../types'
import { classificationLabel, fmtDate, investigationStatusLabel } from '../format'

defineProps<{ report: InvestigationReport }>()
const { t } = useI18n()
</script>

<template>
  <div class="card stack">
    <div class="row between">
      <h3 style="margin: 0">{{ t('report.title') }}</h3>
      <span class="badge" :class="report.status">{{ investigationStatusLabel(report.status) }}</span>
    </div>

    <p v-if="report.status === 'failed'" class="alert error" style="margin: 0">
      {{ report.error ?? t('report.failed') }}
    </p>

    <template v-if="report.summary">
      <p style="margin: 0">{{ report.summary }}</p>
      <div class="change-row">
        <span class="muted">{{ t('report.cause') }}: <strong>{{ report.classification ? classificationLabel(report.classification) : classificationLabel('unclear') }}</strong></span>
        <span class="muted" v-if="report.confidence !== null">{{ t('report.confidence') }}: {{ report.confidence.toFixed(2) }}</span>
        <span class="muted" v-if="report.assessment?.fundamentalImpact">
          {{ t('report.impact') }}: {{ report.assessment.fundamentalImpact }}
        </span>
        <span class="muted" v-if="report.assessment?.potentialOverreaction">{{ t('report.overreaction') }}</span>
      </div>
    </template>

    <p v-if="report.insufficientEvidence" class="alert info" style="margin: 0">
      {{ t('report.insufficient') }}
    </p>

    <div v-if="report.events.length" class="stack">
      <h3 style="margin: 4px 0">{{ t('report.evidence') }}</h3>
      <div v-for="(ev, i) in report.events" :key="i" class="list-item stack">
        <a v-if="ev.sourceUrl" :href="ev.sourceUrl" target="_blank" rel="noopener"><strong>{{ ev.title }}</strong></a>
        <strong v-else>{{ ev.title }}</strong>
        <span class="muted" v-if="ev.publishedAt">{{ fmtDate(ev.publishedAt) }}</span>
        <span>{{ ev.summary }}</span>
      </div>
    </div>

    <span class="muted">{{ t('report.reportedAt', { date: fmtDate(report.createdAt) }) }}</span>
  </div>
</template>

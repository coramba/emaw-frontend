<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { TriggerEvent } from '../types'
import { classificationLabel, fmtDate } from '../format'
import Icon, { type IconName } from './Icon.vue'

// `timeline` draws a node + connecting line in a left gutter (stock detail);
// without it the row is a plain list row (Investigations page).
const props = defineProps<{ event: TriggerEvent; showSymbol?: boolean; timeline?: boolean }>()
const { t } = useI18n()

const pct = computed(() => Math.abs(props.event.dayChangePct ?? props.event.severityPct).toFixed(1) + '%')

const status = computed<{ key: string; tone: string; icon: IconName }>(() => {
  const e = props.event
  switch (e.investigationStatus) {
    case 'pending':
    case 'running':
      return { key: 'investigating', tone: 'amber', icon: 'clock' }
    case 'completed':
      if (e.report?.verificationStatus === 'needs_review') return { key: 'review', tone: 'amber', icon: 'alert' }
      if (e.report?.causeFound === false) return { key: 'noCause', tone: '', icon: 'info' }
      return { key: 'found', tone: 'rise', icon: 'check' }
    case 'insufficient':
      return { key: 'noCause', tone: '', icon: 'info' }
    case 'failed':
      return { key: 'failed', tone: 'drop', icon: 'alert' }
    default:
      return { key: 'none', tone: '', icon: 'dot' }
  }
})
</script>

<template>
  <RouterLink :to="`/events/${event.id}`" class="ev" :class="{ timeline, [`st-${status.key}`]: true }">
    <span v-if="timeline" class="node" aria-hidden="true"><Icon name="down" :size="14" /></span>

    <div class="body">
      <div class="top">
        <span class="when small faint num">{{ fmtDate(event.createdAt) }}</span>
        <span class="pill" :class="status.tone"><Icon :name="status.icon" :size="14" />{{ t(`timeline.status.${status.key}`) }}</span>
      </div>

      <h3 class="headline">
        <span v-if="showSymbol" class="sym">{{ event.symbol }}</span>
        <span class="fell">{{ t('timeline.fell', { pct }) }}</span>
        <span v-if="event.escalationLevel > 1" class="further">{{ t('timeline.further', { n: event.escalationLevel }) }}</span>
      </h3>

      <p v-if="event.report?.summary || event.report?.classification" class="cause small muted">
        <span v-if="event.report.classification" class="pill ai chip">{{ classificationLabel(event.report.classification) }}</span>
        {{ event.report.summary }}
      </p>
    </div>

    <Icon name="chevron" :size="18" class="go" />
  </RouterLink>
</template>

<style scoped>
.ev {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 20px;
  color: inherit;
  border-top: 1px solid var(--line);
}
.ev:first-child { border-top: 0; }
.ev:hover { text-decoration: none; background: var(--surface-2); }
@media (max-width: 480px) {
  .ev { padding: 14px 16px; }
}

.body { flex: 1; min-width: 0; }
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.headline {
  margin-top: 4px;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 1.1rem;
}
.sym { font-family: var(--font-display); font-weight: 700; letter-spacing: 0; }
.fell { color: var(--drop); font-variant-numeric: tabular-nums; }
.further { font-family: var(--font-ui); font-size: 0.85rem; font-weight: 600; color: var(--ink-2); }

.cause {
  margin-top: 8px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.chip { margin-right: 6px; padding: 1px 10px; vertical-align: 1px; }
.go { color: var(--ink-3); flex-shrink: 0; align-self: center; }

/* ---- timeline mode ---- */
.ev.timeline { border-top: 0; padding-left: 12px; border-radius: var(--r-md); }
.ev.timeline::before {
  content: '';
  position: absolute;
  left: 25px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--line);
}
.ev.timeline:first-child::before { top: 30px; }
.ev.timeline:last-child::before { bottom: calc(100% - 30px); }
.ev.timeline:only-child::before { display: none; }
.node {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-top: 2px;
  border-radius: 50%;
  background: var(--drop-soft);
  color: var(--drop);
  box-shadow: 0 0 0 4px var(--surface);
}
.st-investigating .node { background: var(--amber-soft); color: var(--amber); }
</style>

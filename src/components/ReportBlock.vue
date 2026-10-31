<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { InvestigationReport } from '../types'
import {
  classificationLabel,
  eventRoleLabel,
  fmtDate,
  fmtDay,
  impactLevelLabel,
  isHttpUrl,
  overreactionLabel,
  recoveryLikelihoodLabel,
  sourceTypeLabel,
} from '../format'
import Icon from './Icon.vue'
import SourceCheckMenu from './SourceCheckMenu.vue'

const props = defineProps<{ report: InvestigationReport }>()
const emit = defineEmits<{ report: [report: InvestigationReport]; blocked: [] }>()
const { t } = useI18n()

const inProgress = computed(() => props.report.status === 'pending' || props.report.status === 'running')
const noCause = computed(() => props.report.status === 'insufficient' || props.report.insufficientEvidence === true)

interface Tile {
  key: string
  label: string
  value: string
  help: string
  meter?: number
  sub?: string
}

// Presentation-only wording bands for the AI's own confidence number.
function confidenceWord(c: number): string {
  return t(`report.confidenceLevel.${c >= 0.75 ? 'high' : c >= 0.5 ? 'medium' : 'low'}`)
}

const tiles = computed<Tile[]>(() => {
  const r = props.report
  const a = r.assessment ?? {}
  const list: Tile[] = []
  if (r.classification) {
    list.push({ key: 'cause', label: t('report.tiles.cause'), value: classificationLabel(r.classification), help: t('report.tiles.causeHelp') })
  }
  if (r.confidence !== null) {
    list.push({
      key: 'confidence',
      label: t('report.tiles.confidence'),
      value: `${Math.round(r.confidence * 100)}%`,
      sub: confidenceWord(r.confidence),
      meter: r.confidence,
      help: t('report.tiles.confidenceHelp'),
    })
  }
  if (a.fundamentalImpact) {
    list.push({ key: 'impact', label: t('report.tiles.impact'), value: impactLevelLabel(a.fundamentalImpact), help: t('report.tiles.impactHelp') })
  }
  if (a.potentialOverreaction) {
    list.push({ key: 'overreaction', label: t('report.tiles.overreaction'), value: overreactionLabel(a.potentialOverreaction), help: t('report.tiles.overreactionHelp') })
  }
  if (a.recoveryLikelihood) {
    list.push({ key: 'recovery', label: t('report.tiles.recovery'), value: recoveryLikelihoodLabel(a.recoveryLikelihood), help: t('report.tiles.recoveryHelp') })
  }
  return list
})
const showHelp = ref(false)

// A primary_cause source that fails verification undermines the whole
// conclusion more than a supporting one — call it out explicitly.
const primaryUnverified = computed(() =>
  props.report.events.some((e) => e.role === 'primary_cause' && e.verification?.status === 'probable_hallucination'),
)

function roleTone(role: string): string {
  return role === 'primary_cause' ? 'tide' : ''
}
</script>

<template>
  <div class="report">
    <!-- In progress -->
    <section v-if="inProgress" class="panel researching" aria-live="polite">
      <span class="orb" aria-hidden="true"><Icon name="sparkle" :size="22" /></span>
      <div>
        <h2>{{ t('report.researching') }}</h2>
        <p class="muted">{{ t('report.researchingHint') }}</p>
      </div>
    </section>

    <template v-else>
      <section class="panel answer">
        <div class="answer-head">
          <span class="pill ai"><Icon name="sparkle" :size="14" />{{ t('report.aiAnswer') }}</span>
          <span class="tiny faint">{{ t('report.researchedAt', { date: fmtDate(report.completedAt ?? report.createdAt) }) }}</span>
        </div>

        <div v-if="report.status === 'failed'" class="notice error">
          <Icon name="alert" :size="18" />
          <div>
            <strong>{{ t('report.failedTitle') }}</strong>
            <p>{{ t('report.failedHint') }}</p>
            <p v-if="report.error" class="tiny err-detail">{{ t('report.errorDetail', { error: report.error }) }}</p>
          </div>
        </div>

        <div v-else-if="noCause" class="notice">
          <Icon name="info" :size="18" />
          <div>
            <strong class="notice-title">{{ t('report.noCauseTitle') }}</strong>
            <p>{{ t('report.noCauseHint') }}</p>
          </div>
        </div>

        <div v-if="primaryUnverified" class="notice error">
          <Icon name="alert" :size="18" />
          <p>{{ t('report.primaryUnverified') }}</p>
        </div>
        <div v-else-if="report.verificationStatus === 'needs_review'" class="notice warn">
          <Icon name="alert" :size="18" />
          <p>{{ t('report.needsReviewNotice') }}</p>
        </div>

        <p v-if="report.summary" class="summary">{{ report.summary }}</p>

        <template v-if="tiles.length">
          <div class="tiles">
            <div v-for="tile in tiles" :key="tile.key" class="inset tile" :class="`t-${tile.key}`" :title="tile.help">
              <span class="tile-label small muted">{{ tile.label }}</span>
              <span class="tile-value">
                <span class="num">{{ tile.value }}</span>
                <span v-if="tile.sub" class="tile-sub">{{ tile.sub }}</span>
              </span>
              <span v-if="tile.meter !== undefined" class="meter" aria-hidden="true">
                <span :style="{ width: `${Math.round(tile.meter * 100)}%` }"></span>
              </span>
              <span v-if="showHelp" class="tiny faint tile-help">{{ tile.help }}</span>
            </div>
          </div>
          <button type="button" class="help-toggle tiny" :aria-expanded="showHelp" @click="showHelp = !showHelp">
            <Icon name="info" :size="14" />{{ showHelp ? t('report.hideHelp') : t('report.showHelp') }}
          </button>
        </template>

        <blockquote v-if="report.assessment?.recoveryRationale" class="rationale">
          {{ report.assessment.recoveryRationale }}
        </blockquote>
      </section>

      <section v-if="report.events.length" class="section">
        <div class="section-head">
          <h2>{{ t('report.sources', { n: report.events.length }) }}</h2>
        </div>
        <p class="small muted sources-hint">{{ t('report.sourcesHint') }}</p>

        <ul class="sources">
          <li v-for="(ev, i) in report.events" :key="i" class="panel source" :class="{ blocked: ev.blocked }">
            <div class="source-top">
              <span v-if="ev.role" class="pill" :class="roleTone(ev.role)">{{ eventRoleLabel(ev.role) }}</span>
              <span v-if="ev.blocked" class="pill"><Icon name="ban" :size="13" />{{ t('verify.blocked') }}</span>
              <SourceCheckMenu
                v-if="ev.verification || isHttpUrl(ev.sourceUrl)"
                :source="ev"
                :report-id="report.id"
                :index="i"
                @report="emit('report', $event)"
                @blocked="emit('blocked')"
              />
            </div>

            <h3 class="source-title">
              <a v-if="isHttpUrl(ev.sourceUrl)" :href="ev.sourceUrl" target="_blank" rel="noopener">
                {{ ev.title }}<Icon name="external" :size="15" class="ext" />
              </a>
              <template v-else>{{ ev.title }}</template>
            </h3>

            <div v-if="ev.publishedAt || ev.sourceName || ev.sourceType" class="source-meta tiny muted">
              <span v-if="ev.publishedAt" class="num">{{ fmtDay(ev.publishedAt) }}</span>
              <span v-if="ev.sourceName">{{ ev.sourceName }}</span>
              <span v-if="ev.sourceType" class="type-tag">{{ sourceTypeLabel(ev.sourceType) }}</span>
            </div>

            <p class="source-summary">{{ ev.summary }}</p>

          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* ---------- in progress ---------- */
.researching {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  background: var(--ai-soft);
  border-color: transparent;
}
.researching h2 { color: var(--ai); margin-bottom: 4px; }
.orb {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--surface);
  color: var(--ai);
}
.orb::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--ai);
  opacity: 0;
  animation: ping 1.8s ease-out infinite;
}
@keyframes ping {
  0% { transform: scale(0.85); opacity: 0.6; }
  100% { transform: scale(1.25); opacity: 0; }
}

/* ---------- answer ---------- */
.answer > * + * { margin-top: 16px; }
.answer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.notice p + p { margin-top: 4px; }
.notice-title { color: var(--ink); }
.err-detail { opacity: 0.75; margin-top: 6px; word-break: break-word; }

.summary {
  font-size: 1.075rem;
  line-height: 1.6;
  max-width: 70ch;
  color: var(--ink);
}

.tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.tile {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.t-cause { grid-column: span 2; }
@media (min-width: 600px) {
  .tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
.tile-value {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 650;
  line-height: 1.25;
  color: var(--ink);
}
.tile-sub { font-family: var(--font-ui); font-size: 0.85rem; font-weight: 600; color: var(--ink-2); }
.meter {
  display: block;
  height: 4px;
  margin-top: 4px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
}
.meter span { display: block; height: 100%; border-radius: inherit; background: var(--ai); }
.tile-help { line-height: 1.35; margin-top: 2px; }

.help-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px !important;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--ink-2);
  cursor: pointer;
}
.help-toggle:hover { color: var(--ink); }

.rationale {
  margin: 16px 0 0;
  padding: 2px 0 2px 14px;
  border-left: 3px solid var(--line);
  color: var(--ink-2);
  font-style: italic;
  max-width: 70ch;
}

/* ---------- sources ---------- */
.sources-hint { margin: -6px 0 12px; }
.sources { list-style: none; margin: 0; padding: 0; }
.sources > li + li { margin-top: 12px; }
.source > * + * { margin-top: 10px; }
.source-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.source.blocked > :not(.source-top) { opacity: 0.55; }

.source-title { font-family: var(--font-ui); font-size: 1rem; font-weight: 650; line-height: 1.4; }
.source-title a { color: var(--ink); }
.source-title a:hover { color: var(--tide); }
.ext { display: inline-block; vertical-align: -2px; margin-left: 6px; color: var(--ink-3); }
.source-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
}
.type-tag {
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: 999px;
}
.source-summary { color: var(--ink-2); line-height: 1.55; max-width: 70ch; }
</style>

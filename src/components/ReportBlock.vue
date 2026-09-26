<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { InvestigationReport, SourceVerification } from '../types'
import { computed, ref } from 'vue'
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
  verificationDotClass,
  verificationLabel,
} from '../format'

const props = defineProps<{ report: InvestigationReport }>()
const { t } = useI18n()

function roleBadgeClass(role: string): string {
  if (role === 'primary_cause') return 'triggered'
  if (role === 'alternative_explanation') return 'cooldown'
  return 'info'
}

// The mechanical (automatic) reading for each dimension. Older stored
// reports predate the split and only have one combined status covering both
// — mirror it on both sides rather than fabricating an "unknown".
function existenceOf(v: SourceVerification): string {
  return v.existence ?? v.status
}
function contentOf(v: SourceVerification): string | null {
  return v.content !== undefined ? v.content : v.status
}

// The final, combined-with-AI verdict for each dimension — what the dot
// actually shows. Kept deliberately separate from existenceOf/contentOf
// (the raw automatic reading) and from the AI's own raw verdict (below): all
// three get their own line in the details pad rather than being merged into
// one value with a "(source)" tag, which reads as contradictory when e.g. a
// mechanical 403 and an AI "verified" show side by side.
function finalExistence(v: SourceVerification): string {
  if (v.aiCheck?.urlValid === true) return 'verified'
  if (v.aiCheck?.urlValid === false) return 'probable_hallucination'
  return existenceOf(v)
}
function finalContent(v: SourceVerification): string | null {
  if (v.aiCheck?.claimSupportedBySource === true) return 'verified'
  if (v.aiCheck?.claimSupportedBySource === false) return 'probable_hallucination'
  return contentOf(v)
}

// Raw AI tri-state (true/false/unclear-or-not-run) rendered as its own label,
// independent of what the mechanical pass found.
function aiVerdictLabel(verdict: boolean | null | undefined): string {
  if (verdict === true) return verificationLabel('verified')
  if (verdict === false) return verificationLabel('probable_hallucination')
  return t('report.unknown')
}

function verificationTooltip(v: SourceVerification): string {
  const content = finalContent(v)
  let text = `${t('report.existence')}: ${verificationLabel(finalExistence(v))} · ${t('report.contentMatch')}: ${content ? verificationLabel(content) : t('report.unknown')}`
  if (v.aiCheck?.reason) text += ` — ${t('report.aiCheckLabel')}: ${v.aiCheck.reason}`
  return text
}

const expandedDetails = ref<Set<number>>(new Set())
function toggleDetails(i: number) {
  const next = new Set(expandedDetails.value)
  if (next.has(i)) next.delete(i)
  else next.add(i)
  expandedDetails.value = next
}

// A primary_cause source that fails verification undermines the whole
// conclusion more than a supporting one — call it out explicitly.
const primaryUnverified = computed(() =>
  props.report.events.some((e) => e.role === 'primary_cause' && e.verification?.status === 'probable_hallucination'),
)

// Most news sites block automated fetches, so the verifier often can't check a
// source itself — copying a keyword lets the reader paste it into the page's
// own search/Ctrl+F to check it by hand in seconds.
const copiedKey = ref<string | null>(null)

async function copyText(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    setTimeout(() => {
      if (copiedKey.value === key) copiedKey.value = null
    }, 1200)
  } catch {
    // Clipboard access denied/unsupported — silently do nothing rather than error.
  }
}

function verificationPrompt(summary: string, sourceUrl: string): string {
  return `Please check if this statement/conclusion:\n${summary}\n\nmatches and stems from this article: ${sourceUrl}\n\nAlso confirm that given url is valid and existing. Answer in Russian language.`
}
</script>

<template>
  <div class="card stack">
    <div class="row between">
      <h3 style="margin: 0">{{ t('report.title') }}</h3>
      <div class="row" style="gap: 6px; flex-wrap: wrap; justify-content: flex-end">
        <span v-if="report.verificationStatus === 'needs_review'" class="badge cooldown">{{ t('report.needsReview') }}</span>
        <span class="badge" :class="report.status">{{ investigationStatusLabel(report.status) }}</span>
      </div>
    </div>
    <span class="muted">{{ t('report.reportedAt', { date: fmtDate(report.createdAt) }) }}</span>
    <p v-if="primaryUnverified" class="alert error" style="margin: 0">{{ t('report.primaryUnverified') }}</p>

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
          <div class="row" style="gap: 6px; align-items: baseline">
            <span
              v-if="ev.verification"
              class="status-dot"
              :title="verificationTooltip(ev.verification)"
              :aria-label="verificationTooltip(ev.verification)"
            >
              <span :class="verificationDotClass(finalExistence(ev.verification))"></span>
              <span :class="finalContent(ev.verification) ? verificationDotClass(finalContent(ev.verification)!) : ''"></span>
            </span>
            <a v-if="isHttpUrl(ev.sourceUrl)" :href="ev.sourceUrl" target="_blank" rel="noopener"><strong>{{ ev.title }}</strong></a>
            <strong v-else>{{ ev.title }}</strong>
          </div>
          <span v-if="ev.role" class="badge" :class="roleBadgeClass(ev.role)">{{ eventRoleLabel(ev.role) }}</span>
        </div>
        <div class="muted" v-if="ev.publishedAt || ev.sourceName || ev.sourceType">
          <template v-if="ev.publishedAt">{{ fmtDate(ev.publishedAt) }}<template v-if="ev.sourceName || ev.sourceType"> · </template></template>
          <template v-if="ev.sourceName">{{ ev.sourceName }}<template v-if="ev.sourceType"> · </template></template>
          <template v-if="ev.sourceType">{{ sourceTypeLabel(ev.sourceType) }}</template>
        </div>
        <div>{{ ev.summary }}</div>
        <div class="row wrap" style="gap: 8px" v-if="isHttpUrl(ev.sourceUrl) || ev.verification">
          <button
            v-if="isHttpUrl(ev.sourceUrl)"
            type="button"
            class="small violet"
            :class="{ copied: copiedKey === `${i}-prompt` }"
            :title="t('report.copyVerificationPrompt')"
            @click="copyText(verificationPrompt(ev.summary, ev.sourceUrl), `${i}-prompt`)"
          >
            {{ copiedKey === `${i}-prompt` ? t('report.copied') : t('report.verificationPrompt') }}
          </button>
          <button v-if="ev.verification" type="button" class="small" @click="toggleDetails(i)">
            {{ expandedDetails.has(i) ? t('report.hideDetails') : t('report.showDetails') }}
          </button>
        </div>
        <div v-if="ev.verification && expandedDetails.has(i)" class="assessment-pad stack" style="font-size: 0.85rem">
          <div class="muted">
            {{ t('report.existenceAutomatic') }}: <strong>{{ verificationLabel(existenceOf(ev.verification)) }}</strong>
            <template v-if="ev.verification.httpStatus"> (HTTP {{ ev.verification.httpStatus }})</template>
          </div>
          <div class="muted">
            {{ t('report.contentAutomatic') }}: <strong>{{ contentOf(ev.verification) ? verificationLabel(contentOf(ev.verification)!) : t('report.unknown') }}</strong>
            <template v-if="ev.verification.totalKeywords"> ({{ ev.verification.matchedKeywords }}/{{ ev.verification.totalKeywords }} {{ t('report.keywords') }})</template>
          </div>
          <div class="muted">
            {{ t('report.existenceAiCheck') }}: <strong>{{ aiVerdictLabel(ev.verification.aiCheck?.urlValid) }}</strong>
          </div>
          <div class="muted">
            {{ t('report.contentAiCheck') }}: <strong>{{ aiVerdictLabel(ev.verification.aiCheck?.claimSupportedBySource) }}</strong>
          </div>
          <p v-if="ev.verification.aiCheck?.reason" class="muted" style="margin: 0; font-style: italic">{{ t('report.aiCheckLabel') }}: {{ ev.verification.aiCheck.reason }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

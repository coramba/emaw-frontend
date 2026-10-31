<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '../api'
import type { InvestigationReport, ReportEvent, SourceVerification } from '../types'
import { isHttpUrl, verificationDotClass, verificationLabel } from '../format'
import { toast } from '../toast'
import Icon from './Icon.vue'

const props = defineProps<{ source: ReportEvent; reportId: number; index: number }>()
const emit = defineEmits<{ report: [report: InvestigationReport]; blocked: [] }>()
const { t } = useI18n()
const headId = useId()

const v = computed(() => props.source.verification ?? null)
const http = computed(() => isHttpUrl(props.source.sourceUrl))
const domain = computed(() => {
  try {
    return new URL(props.source.sourceUrl).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return props.source.sourceUrl
  }
})

// The mechanical (automatic) reading for each dimension. Older stored
// reports predate the split and only have one combined status covering both
// — mirror it on both sides rather than fabricating an "unknown".
function existenceOf(v: SourceVerification): string {
  return v.existence ?? v.status
}
function contentOf(v: SourceVerification): string | null {
  return v.content !== undefined ? v.content : v.status
}
// The final, combined-with-AI verdict for each dimension — what the dot shows.
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
// Raw AI tri-state (true/false/unclear-or-not-run), independent of the mechanical pass.
function aiVerdictLabel(verdict: boolean | null | undefined): string {
  if (verdict === true) return verificationLabel('verified')
  if (verdict === false) return verificationLabel('probable_hallucination')
  return t('report.unknown')
}
const dotOf = (s: string | null) => (s ? verificationDotClass(s) : 'unknown')
const aiStatus = (verdict: boolean | null | undefined) => (verdict === true ? 'verified' : verdict === false ? 'probable_hallucination' : null)
const reasonOpen = ref(false)
const answerOf = (s: string | null) => (s ? t(`verify.answer.${s}`) : t('report.unknown'))

const pending = computed(() => v.value?.aiCheckPending === true)
const verdict = computed(() => (v.value ? verificationLabel(v.value.status) : t('verify.notChecked')))
const dotLabel = computed(() => {
  if (!v.value) return verdict.value
  const content = finalContent(v.value)
  return t('report.dotLabel', {
    existence: verificationLabel(finalExistence(v.value)),
    content: content ? verificationLabel(content) : t('report.unknown'),
  })
})
// Display gate only — the backend re-checks eligibility (409 not_eligible).
const canRunCheck = computed(() => !!v.value && v.value.status === 'verified' && !v.value.aiCheck && !pending.value)

// ---- popover ----
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const confirming = ref(false)

function onDocPointer(e: PointerEvent) {
  if (root.value && !root.value.contains(e.target as Node)) close(false)
}
function onDocKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close(true)
}
function show() {
  open.value = true
  confirming.value = false
  document.addEventListener('pointerdown', onDocPointer)
  document.addEventListener('keydown', onDocKey)
  nextTick(() => panel.value?.focus())
}
function close(refocus: boolean) {
  if (!open.value) return
  open.value = false
  document.removeEventListener('pointerdown', onDocPointer)
  document.removeEventListener('keydown', onDocKey)
  if (refocus) trigger.value?.focus()
}
onBeforeUnmount(() => close(false))

// Keep Tab cycling inside the open popover.
function trapTab(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !panel.value) return
  const items = [...panel.value.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], summary')]
  if (!items.length) return
  const first = items[0], last = items[items.length - 1]
  const active = document.activeElement
  if (e.shiftKey && (active === first || active === panel.value)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

// ---- actions ----
const copied = ref(false)
async function copyPrompt() {
  const prompt = `Please check if this statement/conclusion:\n${props.source.summary}\n\nmatches and stems from this article: ${props.source.sourceUrl}\n\nAlso confirm that given url is valid and existing. Answer in Russian language.`
  try {
    await navigator.clipboard.writeText(prompt)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    // Clipboard access denied/unsupported — silently do nothing rather than error.
  }
}

const starting = ref(false)
async function runCheck() {
  starting.value = true
  try {
    const { report } = await api.post<{ report: InvestigationReport }>(`/api/reports/${props.reportId}/sources/${props.index}/ai-check`)
    emit('report', report)
  } catch (e) {
    const code = e instanceof ApiError ? e.code : null
    const key = code === 'check_in_progress' ? 'checkRunning' : code === 'not_eligible' ? 'notEligible'
      : e instanceof ApiError && e.status === 503 ? 'aiUnavailable' : 'checkFailed'
    toast(t(`verify.${key}`), 'error')
  } finally {
    starting.value = false
  }
}

const blocking = ref(false)
async function block() {
  blocking.value = true
  try {
    await api.post('/api/blocked-sources', { source: props.source.sourceUrl })
    toast(t('verify.blockedToast', { domain: domain.value }), 'ok', { to: '/settings/sources', label: t('verify.manage') })
    close(true)
    emit('blocked')
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      toast(t('verify.alreadyBlocked'))
      close(true)
      emit('blocked')
    } else toast(t('verify.blockFailed'), 'error')
  } finally {
    blocking.value = false
  }
}
</script>

<template>
  <div ref="root" class="check-menu">
    <button
      ref="trigger"
      type="button"
      class="trigger"
      :class="pending ? 'v-pending' : v ? `v-${verificationDotClass(v.status)}` : 'v-none'"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :title="dotLabel"
      @click="open ? close(false) : show()"
    >
      <span v-if="pending" class="pulse" aria-hidden="true"></span>
      <span v-else-if="v" class="split-dot" aria-hidden="true">
        <span :class="dotOf(finalExistence(v))"></span><span :class="dotOf(finalContent(v))"></span>
      </span>
      <span v-else class="split-dot" aria-hidden="true"><span class="unknown"></span></span>
      <span>{{ pending ? t('verify.checking') : verdict }}</span>
      <span class="sr-only">{{ t('verify.details') }}</span>
      <Icon name="chevron" :size="14" class="caret" />
    </button>

    <template v-if="open">
      <div class="scrim" @click="close(true)"></div>
      <div ref="panel" class="pop" role="dialog" :aria-labelledby="headId" tabindex="-1" @keydown="trapTab">
        <div class="pop-head">
          <span v-if="v" class="split-dot lg" aria-hidden="true">
            <span :class="dotOf(finalExistence(v))"></span><span :class="dotOf(finalContent(v))"></span>
          </span>
          <div class="grow">
            <h3 :id="headId">{{ verdict }}</h3>
            <p class="tiny muted truncate">{{ domain }}</p>
          </div>
          <button type="button" class="icon-btn close" :aria-label="t('verify.close')" @click="close(true)">
            <Icon name="close" :size="18" />
          </button>
        </div>

        <p class="small muted">{{ t(`verify.lead.${v ? v.status : 'none'}`) }}</p>

        <dl v-if="v" class="answers">
          <div>
            <dt>{{ t('verify.exists') }}</dt>
            <dd :class="dotOf(finalExistence(v))">{{ answerOf(finalExistence(v)) }}</dd>
          </div>
          <div>
            <dt>{{ t('verify.backs') }}</dt>
            <dd :class="dotOf(finalContent(v))">{{ answerOf(finalContent(v)) }}</dd>
          </div>
        </dl>

        <p v-if="pending" class="pending small" role="status">
          <span class="pulse" aria-hidden="true"></span>{{ t('verify.pending') }}
        </p>

        <details v-if="v" class="how">
          <summary class="small">{{ t('report.howChecked') }}<Icon name="chevron" :size="14" class="caret" /></summary>
          <div class="methods small">
            <section class="method">
              <h4><Icon name="refresh" :size="14" />{{ t('verify.method.auto') }}</h4>
              <dl>
                <div class="check">
                  <dt>{{ t('verify.row.exists') }}<small v-if="v.httpStatus" class="num">{{ t('report.httpStatus', { code: v.httpStatus }) }}</small><small v-else-if="v.fetchError">{{ t(`verify.fetchError.${v.fetchError}`) }}</small></dt>
                  <dd><span class="verdict" :class="dotOf(existenceOf(v))"><i></i>{{ verificationLabel(existenceOf(v)) }}</span></dd>
                </div>
                <div class="check">
                  <dt>{{ t('verify.row.backs') }}<small v-if="v.totalKeywords" class="num">{{ t('report.keywordsMatched', { matched: v.matchedKeywords, total: v.totalKeywords }) }}</small></dt>
                  <dd><span class="verdict" :class="dotOf(contentOf(v))"><i></i>{{ contentOf(v) ? verificationLabel(contentOf(v)!) : t('report.unknown') }}</span></dd>
                </div>
              </dl>
            </section>
            <section class="method">
              <h4><Icon name="sparkle" :size="14" />{{ t('verify.method.ai') }}<span v-if="v.aiCheck?.manual" class="tag">{{ t('verify.manualCheck') }}</span></h4>
              <p v-if="!v.aiCheck" class="not-run">{{ t('verify.method.aiNotRun') }}</p>
              <template v-else>
                <dl>
                  <div class="check">
                    <dt>{{ t('verify.row.exists') }}</dt>
                    <dd><span class="verdict" :class="dotOf(aiStatus(v.aiCheck.urlValid))"><i></i>{{ aiVerdictLabel(v.aiCheck.urlValid) }}</span></dd>
                  </div>
                  <div class="check">
                    <dt>{{ t('verify.row.backs') }}</dt>
                    <dd><span class="verdict" :class="dotOf(aiStatus(v.aiCheck.claimSupportedBySource))"><i></i>{{ aiVerdictLabel(v.aiCheck.claimSupportedBySource) }}</span></dd>
                  </div>
                </dl>
                <blockquote v-if="v.aiCheck.reason" class="reason" :class="{ open: reasonOpen }">{{ v.aiCheck.reason }}</blockquote>
                <button v-if="(v.aiCheck.reason?.length ?? 0) > 180" type="button" class="more" @click="reasonOpen = !reasonOpen">
                  {{ reasonOpen ? t('verify.showLess') : t('verify.showMore') }}
                </button>
              </template>
            </section>
          </div>
        </details>

        <div class="actions">
          <button v-if="canRunCheck" type="button" class="act ai" :disabled="starting" @click="runCheck">
            <Icon name="sparkle" :size="18" />
            <span>{{ t('verify.runCheck') }}<small>{{ t('verify.runCheckHint') }}</small></span>
          </button>
          <button v-if="http" type="button" class="act" @click="copyPrompt">
            <Icon :name="copied ? 'check' : 'copy'" :size="18" />
            <span aria-live="polite">{{ copied ? t('report.copied') : t('report.copyPrompt') }}<small>{{ t('report.copyPromptHelp') }}</small></span>
          </button>
          <p v-if="source.blocked" class="blocked-note small muted">
            <Icon name="ban" :size="16" />
            <span>{{ t('verify.isBlocked', { domain }) }} <RouterLink to="/settings/sources">{{ t('verify.manage') }}</RouterLink></span>
          </p>
          <template v-else-if="http">
            <button v-if="!confirming" type="button" class="act danger" @click="confirming = true">
              <Icon name="ban" :size="18" />
              <span>{{ t('verify.block', { domain }) }}</span>
            </button>
            <div v-else class="inset confirm" role="group" :aria-label="t('verify.block', { domain })">
              <p class="small">{{ t('verify.blockConfirm', { domain }) }}</p>
              <div class="confirm-row">
                <button type="button" class="btn sm quiet" :disabled="blocking" @click="confirming = false">{{ t('common.cancel') }}</button>
                <button type="button" class="btn sm danger" :disabled="blocking" @click="block">{{ t('verify.blockYes') }}</button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.check-menu { position: relative; margin-left: auto; }

.trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin: -8px -10px -8px 0;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: none;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.trigger:hover, .trigger[aria-expanded='true'] { background: var(--surface-2); }
.v-verified { color: var(--rise); }
.v-questionable { color: var(--amber); }
.v-hallucination { color: var(--drop); }
.v-pending { color: var(--ai); }
.v-none { color: var(--ink-2); }
.caret { transform: rotate(90deg); opacity: 0.7; transition: transform 0.15s; }
.trigger[aria-expanded='true'] .caret { transform: rotate(-90deg); }

/* Left half = does the link exist, right half = does the page back the claim. */
.split-dot {
  display: inline-flex;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 3px var(--line);
}
.split-dot.lg { width: 20px; height: 20px; margin: 4px 2px 0; }
.split-dot span { flex: 1; background: var(--line); }
.split-dot span + span { border-left: 1px solid var(--surface); }
.split-dot .verified { background: var(--rise); }
.split-dot .questionable { background: var(--amber); }
.split-dot .hallucination { background: var(--drop); }

.pulse {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--ai);
  animation: blink 1.2s ease-in-out infinite;
}
@keyframes blink { 50% { opacity: 0.25; } }
@media (prefers-reduced-motion: reduce) { .pulse { animation: none; } }

/* ---------- popover / sheet ---------- */
.scrim { display: none; }
.pop {
  position: absolute;
  right: -10px;
  top: calc(100% + 10px);
  z-index: 40;
  width: 360px;
  max-width: calc(100vw - 32px);
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
  color: var(--ink);
  text-align: left;
}
.pop:focus { outline: none; }
.pop > * + * { margin-top: 12px; }
@media (max-width: 599px) {
  .scrim { display: block; position: fixed; inset: 0; z-index: 90; background: var(--scrim); }
  .pop {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 91;
    width: auto;
    max-width: none;
    max-height: 85vh;
    overflow-y: auto;
    padding: 20px 16px calc(16px + env(safe-area-inset-bottom, 0px));
    border-radius: var(--r-lg) var(--r-lg) 0 0;
    animation: rise 0.2s ease-out;
  }
}
@keyframes rise { from { transform: translateY(24px); opacity: 0; } }

.pop-head { display: flex; align-items: flex-start; gap: 12px; }
.pop-head h3 { font-size: 1.15rem; }
.close { margin: -8px -8px 0 0; }

.answers { display: grid; gap: 1px; margin: 12px 0 0; border-radius: var(--r-sm); overflow: hidden; background: var(--line); }
.answers div { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 12px; background: var(--surface-2); }
.answers dt { font-size: 0.9rem; color: var(--ink); }
.answers dd { margin: 0; font-weight: 650; font-size: 0.9rem; white-space: nowrap; }
.answers dd.verified { color: var(--rise); }
.answers dd.questionable { color: var(--amber); }
.answers dd.hallucination { color: var(--drop); }
.answers dd.unknown { color: var(--ink-3); }

.pending {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--r-sm);
  background: var(--ai-soft);
  color: var(--ai);
  font-weight: 600;
}

.how summary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  color: var(--ink-2);
  font-weight: 600;
  cursor: pointer;
  list-style: none;
}
.how summary::-webkit-details-marker { display: none; }
.how summary .caret { transform: none; }
.how[open] summary .caret { transform: rotate(90deg); }
/* "How we checked": one block per method, label left, verdict chip right, detail under the label. */
.methods { display: grid; gap: 10px; margin-top: 6px; }
.method { background: var(--surface-2); border-radius: var(--r-md); padding: 10px 12px 12px; }
.method h4 { display: flex; align-items: center; gap: 6px; margin: 0 0 6px; font: 600 0.8rem var(--font-ui); color: var(--ink-2); }
.method h4 .tag { margin-left: auto; font-weight: 600; color: var(--ai); }
.method dl { margin: 0; }
.check { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 7px 0; }
.check + .check { border-top: 1px solid var(--line); }
.check dt { color: var(--ink); display: flex; flex-direction: column; gap: 1px; }
.check dt small { color: var(--ink-3); font-size: 0.78rem; }
.check dd { margin: 0; flex-shrink: 0; }
.verdict { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; white-space: nowrap; }
.verdict i { width: 8px; height: 8px; border-radius: 50%; background: var(--ink-3); }
.verdict.verified { color: var(--rise); }
.verdict.verified i { background: var(--rise); }
.verdict.questionable { color: var(--amber); }
.verdict.questionable i { background: var(--amber); }
.verdict.hallucination { color: var(--drop); }
.verdict.hallucination i { background: var(--drop); }
.verdict.unknown { color: var(--ink-3); }
.not-run { margin: 0; color: var(--ink-3); }
.reason {
  margin: 8px 0 0;
  padding-left: 10px;
  border-left: 2px solid var(--ai);
  color: var(--ink-2);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.reason.open { display: block; }
.more { margin-top: 4px; padding: 4px 0; border: 0; background: none; color: var(--tide); font-weight: 600; font-size: 0.82rem; cursor: pointer; }

.actions { margin: 12px -8px 0; padding-top: 8px; border-top: 1px solid var(--line); }
.act {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 10px 8px;
  border: 0;
  border-radius: var(--r-sm);
  background: none;
  font-size: 0.95rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}
.act:hover:not(:disabled) { background: var(--surface-2); }
.act:disabled { opacity: 0.5; cursor: default; }
.act svg { flex-shrink: 0; margin-top: 1px; color: var(--ink-3); }
.act small { display: block; font-size: 0.8rem; font-weight: 500; color: var(--ink-2); line-height: 1.4; }
.act.ai svg { color: var(--ai); }
.act.danger, .act.danger svg { color: var(--drop); }
.confirm { margin: 4px 8px; }
.confirm-row { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
.blocked-note { display: flex; gap: 10px; padding: 10px 8px; }
.blocked-note svg { flex-shrink: 0; margin-top: 2px; }
</style>

<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TriggerConfig } from '../types'
import { PRESETS, PRESET_KEYS, fmtMinutes, matchPreset, type PresetKey, type RuleFields } from '../rules'
import Icon from './Icon.vue'

// Presentation only: edits TriggerConfig fields that the backend validates and
// evaluates. Nothing here decides whether an alert fires.

type Field = keyof TriggerConfig
type RuleField = keyof RuleFields
// slot name in the translated sentence ('pct' | 'x' | 'window' | 'time') -> field
type Slots = Record<string, Field>
interface Row { key: string; slots: Slots; help?: boolean }

const props = defineProps<{
  modelValue: Partial<TriggerConfig>
  advanced?: boolean
  errors?: Record<string, string>
}>()
const emit = defineEmits<{ 'update:modelValue': [Partial<TriggerConfig>] }>()
const { t } = useI18n()
const uid = useId()

const RULES: Row[] = [
  { key: 'daily', slots: { pct: 'dailyChangePct' } },
  { key: 'fiveDay', slots: { pct: 'fiveDayChangePct' } },
  { key: 'intraday', slots: { pct: 'intradayChangePct', window: 'intradayWindowMinutes' } },
  { key: 'volume', slots: { x: 'volumeMultiplier' }, help: true },
  { key: 'combined', slots: { pct: 'moderateDailyChangePct', x: 'moderateVolumeMultiplier' } },
]
const AFTER: Row[] = [
  { key: 'escalation', slots: { pct: 'escalationStepPct' } },
  { key: 'rearm', slots: { pct: 'rearmRecoveryPct' } },
  { key: 'cooldown', slots: { time: 'cooldownMinutes' } },
  { key: 'refresh', slots: { time: 'investigationRefreshMinutes' } },
]
// Users type a positive drop; the backend stores drops as negative percentages.
const NEGATIVE = new Set<Field>(['dailyChangePct', 'fiveDayChangePct', 'intradayChangePct', 'moderateDailyChangePct'])
const OPTIONS: Partial<Record<Field, number[]>> = {
  intradayWindowMinutes: [5, 15, 30, 60, 120, 240],
  cooldownMinutes: [5, 15, 30, 60, 120, 240, 360, 720, 1440],
  investigationRefreshMinutes: [15, 30, 60, 120, 180, 360, 720, 1440],
}

const preset = computed(() => matchPreset(props.modelValue))
const open = ref(!!props.advanced || preset.value === null)
// Last value of a rule that was switched off, restored when it is switched back on.
const remembered = reactive<Partial<Record<Field, number>>>({})

const toggleFields = (row: Row) => Object.values(row.slots).filter((f) => f in PRESETS.balanced && f !== 'intradayWindowMinutes') as RuleField[]
const enabled = (row: Row) => toggleFields(row).every((f) => props.modelValue[f] != null)
// Backend range messages speak in negative percentages; users type positive drops.
const rowError = (row: Row) =>
  Object.values(row.slots)
    .map((f) => props.errors?.[f] && (NEGATIVE.has(f) ? t('thresholds.invalidDrop') : props.errors[f]))
    .find(Boolean)

watch(
  () => props.errors,
  (e) => {
    if (e && RULES.some((r) => rowError(r))) open.value = true
  },
)

function update(patch: Partial<TriggerConfig>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

function applyPreset(key: PresetKey) {
  update(PRESETS[key])
}

function toggle(row: Row, on: boolean) {
  const patch: Partial<Record<Field, number | null>> = {}
  for (const f of toggleFields(row)) {
    if (on) {
      patch[f] = remembered[f] ?? PRESETS.balanced[f]
    } else {
      remembered[f] = props.modelValue[f] ?? undefined
      patch[f] = null
    }
  }
  update(patch as Partial<TriggerConfig>)
}

function shown(f: Field): string {
  const v = props.modelValue[f] ?? remembered[f] ?? (PRESETS.balanced as Partial<TriggerConfig>)[f]
  return v == null ? '' : String(NEGATIVE.has(f) ? Math.abs(v) : v)
}

function onNumber(f: Field, e: Event) {
  const raw = (e.target as HTMLInputElement).value.trim().replace(',', '.')
  const n = Number(raw)
  if (raw === '' || !Number.isFinite(n)) return
  update({ [f]: NEGATIVE.has(f) ? -Math.abs(n) : n })
}

// Snap an emptied / invalid field back to the value we actually hold.
function onBlur(f: Field, e: Event) {
  ;(e.target as HTMLInputElement).value = shown(f)
}

function options(f: Field): number[] {
  const list = OPTIONS[f] ?? []
  const cur = props.modelValue[f]
  return typeof cur === 'number' && !list.includes(cur) ? [...list, cur].sort((a, b) => a - b) : list
}
</script>

<template>
  <div class="tf">
    <div class="presets" role="radiogroup" :aria-label="t('thresholds.presetsLabel')">
      <label v-for="(key, i) in PRESET_KEYS" :key="key" class="preset" :class="{ on: preset === key }">
        <input
          type="radio"
          class="sr-only"
          :name="`preset-${uid}`"
          :value="key"
          :checked="preset === key"
          @change="applyPreset(key)"
        />
        <span class="meter" aria-hidden="true"><i v-for="n in 3" :key="n" :class="{ fill: n <= i + 1 }" /></span>
        <span class="preset-name">
          {{ t(`thresholds.preset.${key}.name`) }}
          <span v-if="key === 'balanced'" class="pill tide rec">{{ t('thresholds.recommended') }}</span>
        </span>
        <span class="preset-desc">{{ t(`thresholds.preset.${key}.desc`) }}</span>
        <span class="tick" aria-hidden="true"><Icon v-if="preset === key" name="check" :size="14" /></span>
      </label>
    </div>

    <p v-if="preset === null" class="custom">
      <span class="pill"><Icon name="sliders" :size="14" />{{ t('thresholds.custom') }}</span>
      <span class="muted small">{{ t('thresholds.customHint') }}</span>
    </p>

    <button
      type="button"
      class="disclosure"
      :aria-expanded="open"
      :aria-controls="`rules-${uid}`"
      @click="open = !open"
    >
      <Icon name="sliders" :size="18" />
      <span class="grow">{{ t('thresholds.customize') }}</span>
      <Icon name="chevron" :size="18" class="chev" />
    </button>

    <div v-show="open" :id="`rules-${uid}`" class="panel tight rules">
      <p class="rules-intro muted small">{{ t('thresholds.anyOf') }}</p>
      <div v-for="row in RULES" :key="row.key" class="rule" :class="{ off: !enabled(row) }">
        <label class="switch">
          <input
            type="checkbox"
            role="switch"
            :checked="enabled(row)"
            :aria-labelledby="`${uid}-${row.key}`"
            @change="toggle(row, ($event.target as HTMLInputElement).checked)"
          />
          <span />
        </label>
        <div class="rule-body">
          <i18n-t :id="`${uid}-${row.key}`" :keypath="`thresholds.rule.${row.key}`" tag="p" class="sentence" scope="global">
            <template v-for="(field, slot) in row.slots" :key="slot" #[slot]>
              <select
                v-if="slot === 'window'"
                class="input sel-in"
                :class="{ invalid: errors?.[field] }"
                :disabled="!enabled(row)"
                :aria-label="t(`thresholds.field.${field}`)"
                :value="modelValue[field]"
                @change="update({ [field]: Number(($event.target as HTMLSelectElement).value) })"
              >
                <option v-for="m in options(field)" :key="m" :value="m">{{ fmtMinutes(m) }}</option>
              </select>
              <input
                v-else
                type="text"
                inputmode="decimal"
                autocomplete="off"
                class="input num-in num"
                :class="{ invalid: errors?.[field] }"
                :disabled="!enabled(row)"
                :aria-label="t(`thresholds.field.${field}`)"
                :aria-invalid="!!errors?.[field]"
                :value="shown(field)"
                @input="onNumber(field, $event)"
                @blur="onBlur(field, $event)"
              />
            </template>
          </i18n-t>
          <p v-if="row.help" class="field-help">{{ t('thresholds.volumeHelp') }}</p>
          <p v-if="rowError(row)" class="field-error">{{ rowError(row) }}</p>
        </div>
      </div>
    </div>

    <section v-if="advanced" class="section">
      <div class="section-head"><h2>{{ t('thresholds.afterTitle') }}</h2></div>
      <p class="muted small after-intro">{{ t('thresholds.afterHint') }}</p>
      <div class="panel tight rules">
        <div v-for="row in AFTER" :key="row.key" class="rule">
          <div class="rule-body">
            <i18n-t :keypath="`thresholds.after.${row.key}`" tag="p" class="sentence" scope="global">
              <template v-for="(field, slot) in row.slots" :key="slot" #[slot]>
                <select
                  v-if="slot === 'time'"
                  class="input sel-in"
                  :class="{ invalid: errors?.[field] }"
                  :aria-label="t(`thresholds.field.${field}`)"
                  :value="modelValue[field]"
                  @change="update({ [field]: Number(($event.target as HTMLSelectElement).value) })"
                >
                  <option v-for="m in options(field)" :key="m" :value="m">{{ fmtMinutes(m) }}</option>
                </select>
                <input
                  v-else
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  class="input num-in num"
                  :class="{ invalid: errors?.[field] }"
                  :aria-label="t(`thresholds.field.${field}`)"
                  :aria-invalid="!!errors?.[field]"
                  :value="shown(field)"
                  @input="onNumber(field, $event)"
                  @blur="onBlur(field, $event)"
                />
              </template>
            </i18n-t>
            <p class="field-help">{{ t(`thresholds.after.${row.key}Help`) }}</p>
            <p v-if="rowError(row)" class="field-error">{{ rowError(row) }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.presets {
  display: grid;
  gap: 10px;
}
.preset {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-areas: 'meter name tick' 'meter desc tick';
  align-items: center;
  column-gap: 14px;
  row-gap: 2px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}
.preset:hover { border-color: var(--ink-3); }
.preset.on { border-color: var(--tide); background: var(--tide-soft); box-shadow: inset 0 0 0 1px var(--tide); }
.preset:has(input:focus-visible) { outline: 2px solid var(--tide); outline-offset: 2px; }

.meter { grid-area: meter; display: flex; align-items: flex-end; gap: 3px; height: 22px; }
.meter i { width: 5px; border-radius: 3px; background: var(--line); }
.meter i:nth-child(1) { height: 8px; }
.meter i:nth-child(2) { height: 15px; }
.meter i:nth-child(3) { height: 22px; }
.meter i.fill { background: var(--tide); }

.preset-name {
  grid-area: name;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-family: var(--font-display);
  font-weight: 650;
  font-size: 1.05rem;
  color: var(--ink);
}
.rec { font-family: var(--font-ui); font-size: 0.72rem; padding: 1px 8px; }
.preset.on .rec { background: var(--surface); }
.preset-desc { grid-area: desc; font-size: 0.88rem; color: var(--ink-2); }

.tick {
  grid-area: tick;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid var(--line);
  color: var(--on-tide);
}
.preset.on .tick { background: var(--tide); border-color: var(--tide); }

@media (min-width: 620px) {
  .presets { grid-template-columns: repeat(3, 1fr); }
  .preset {
    grid-template-columns: 1fr auto;
    grid-template-areas: 'meter tick' 'name name' 'desc desc';
    align-items: start;
    align-content: start;
    row-gap: 6px;
    padding: 16px;
  }
  .preset-name { margin-top: 6px; }
}

.custom { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 10px; margin-top: 12px; }

.disclosure {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  margin-top: 14px;
  padding: 10px 4px;
  border: 0;
  background: transparent;
  color: var(--tide);
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}
.disclosure .chev { color: var(--ink-3); transition: transform 0.18s; }
.disclosure[aria-expanded='true'] .chev { transform: rotate(90deg); }

.rules-intro { padding: 14px 20px 4px; }
.rule {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 20px;
  border-top: 1px solid var(--line);
}
.rules-intro + .rule { border-top: 0; }
.rule:first-child { border-top: 0; }
.rule .switch { margin-top: 11px; }
.rule-body { flex: 1; min-width: 0; }
.rule.off .sentence { color: var(--ink-3); }

.sentence { color: var(--ink); line-height: 1.5; }
.num-in,
.sel-in {
  display: inline-block;
  vertical-align: baseline;
  width: auto;
  min-height: 44px;
  margin: 3px 4px;
  font-weight: 600;
}
.num-in { width: 3.8em; padding: 8px 6px; text-align: center; }
.sel-in { padding: 8px 32px 8px 12px; background-position: right 12px center; }
.num-in:disabled,
.sel-in:disabled { background-color: var(--surface-2); color: var(--ink-3); }
.sentence .num-in:first-child,
.sentence .sel-in:first-child { margin-left: 0; }

.after-intro { margin: -4px 0 12px; }

@media (max-width: 480px) {
  .rules-intro { padding: 12px 16px 2px; }
  .rule { padding: 12px 16px; gap: 12px; }
}
</style>

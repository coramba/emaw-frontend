import { i18n } from './i18n'
import type { TriggerConfig } from './types'

// Presentation-only helpers for alert rules. Presets merely prefill fields the
// backend validates and evaluates; nothing here decides whether a rule fired.

export type PresetKey = 'relaxed' | 'balanced' | 'sensitive'

export type RuleFields = Pick<
  TriggerConfig,
  | 'dailyChangePct'
  | 'fiveDayChangePct'
  | 'intradayChangePct'
  | 'intradayWindowMinutes'
  | 'volumeMultiplier'
  | 'moderateDailyChangePct'
  | 'moderateVolumeMultiplier'
>

// "balanced" mirrors the backend TriggerConfig defaults.
export const PRESETS: Record<PresetKey, RuleFields> = {
  relaxed: {
    dailyChangePct: -8,
    fiveDayChangePct: -15,
    intradayChangePct: -5,
    intradayWindowMinutes: 60,
    volumeMultiplier: 5,
    moderateDailyChangePct: -4,
    moderateVolumeMultiplier: 3,
  },
  balanced: {
    dailyChangePct: -5,
    fiveDayChangePct: -10,
    intradayChangePct: -3,
    intradayWindowMinutes: 30,
    volumeMultiplier: 3,
    moderateDailyChangePct: -2.5,
    moderateVolumeMultiplier: 2,
  },
  sensitive: {
    dailyChangePct: -3,
    fiveDayChangePct: -6,
    intradayChangePct: -2,
    intradayWindowMinutes: 15,
    volumeMultiplier: 2,
    moderateDailyChangePct: -1.5,
    moderateVolumeMultiplier: 1.5,
  },
}

export const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[]

export function matchPreset(config: Partial<TriggerConfig>): PresetKey | null {
  return (
    PRESET_KEYS.find((key) =>
      (Object.keys(PRESETS[key]) as (keyof RuleFields)[]).every((f) => config[f] === PRESETS[key][f]),
    ) ?? null
  )
}

const t = (key: string, named: Record<string, unknown> = {}) => i18n.global.t(key, named)
const abs = (n: number) => String(Math.abs(n))

/** "30 min", "2 h", "1 day" */
export function fmtMinutes(min: number): string {
  if (min < 60) return t('units.min', { n: min })
  if (min < 1440 || min % 1440 !== 0) return t('units.hours', { n: +(min / 60).toFixed(1) })
  return i18n.global.t('units.days', min / 1440)
}

/** One plain-language sentence per enabled rule, e.g. "Falls 5% in one day". */
export function describeRules(c: TriggerConfig): string[] {
  const out: string[] = []
  if (c.dailyChangePct !== null) out.push(t('rules.sentence.daily', { pct: abs(c.dailyChangePct) }))
  if (c.fiveDayChangePct !== null) out.push(t('rules.sentence.fiveDay', { pct: abs(c.fiveDayChangePct) }))
  if (c.intradayChangePct !== null)
    out.push(t('rules.sentence.intraday', { pct: abs(c.intradayChangePct), window: fmtMinutes(c.intradayWindowMinutes) }))
  if (c.volumeMultiplier !== null) out.push(t('rules.sentence.volume', { x: c.volumeMultiplier }))
  if (c.moderateDailyChangePct !== null && c.moderateVolumeMultiplier !== null)
    out.push(t('rules.sentence.combined', { pct: abs(c.moderateDailyChangePct), x: c.moderateVolumeMultiplier }))
  return out
}

import { i18n } from './i18n'

const t = (key: string, named?: Record<string, unknown>) => i18n.global.t(key, named ?? {})

export function fmtNum(n: number | null | undefined, digits = 2): string {
  return n === null || n === undefined ? '—' : n.toFixed(digits)
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const v = n.toLocaleString(i18n.global.locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' })
  return `${v}%`
}

export function pctClass(n: number | null | undefined): string {
  if (n === null || n === undefined || n === 0) return 'flat'
  return n > 0 ? 'up' : 'down'
}

function fmtIntl(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(i18n.global.locale.value, opts)
}

// "11 Sep 2026, 14:21" in the UI locale
export function fmtDate(iso: string | null | undefined): string {
  return fmtIntl(iso, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// "11 Sep 2026"
export function fmtDay(iso: string | null | undefined): string {
  return fmtIntl(iso, { day: 'numeric', month: 'short', year: 'numeric' })
}

// Price with the ticker's currency when known: "$118.40", "€42.10", "118.40 CHF"
export function fmtPrice(n: number | null | undefined, currency?: string | null): string {
  if (n === null || n === undefined) return '—'
  if (!currency) return n.toFixed(2)
  try {
    return n.toLocaleString(i18n.global.locale.value, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 })
  } catch {
    return `${n.toFixed(2)} ${currency}`
  }
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return t('time.never')
  const d = new Date(iso)
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return t('time.justNow')
  if (diffMin < 60) return t('time.minAgo', { n: diffMin })
  if (diffMin < 1440) return t('time.hourAgo', { n: Math.round(diffMin / 60) })
  return fmtDate(iso)
}

export function stateLabel(state: string): string {
  return i18n.global.te(`state.${state}`) ? t(`state.${state}`) : state
}

export function reasonLabel(type: string): string {
  return i18n.global.te(`reason.${type}`) ? t(`reason.${type}`) : titleCase(type)
}

export function classificationLabel(c: string): string {
  return i18n.global.te(`classification.${c}`) ? t(`classification.${c}`) : titleCase(c)
}

export function investigationStatusLabel(s: string): string {
  return i18n.global.te(`investigationStatus.${s}`) ? t(`investigationStatus.${s}`) : s
}

export function recoveryLikelihoodLabel(v: string): string {
  return i18n.global.te(`report.recovery.${v}`) ? t(`report.recovery.${v}`) : titleCase(v)
}

export function impactLevelLabel(v: string): string {
  return i18n.global.te(`report.impactLevel.${v}`) ? t(`report.impactLevel.${v}`) : titleCase(v)
}

export function overreactionLabel(v: string): string {
  return i18n.global.te(`report.overreaction.${v}`) ? t(`report.overreaction.${v}`) : titleCase(v)
}

export function sourceTypeLabel(v: string): string {
  return i18n.global.te(`report.sourceType.${v}`) ? t(`report.sourceType.${v}`) : titleCase(v)
}

export function eventRoleLabel(v: string): string {
  return i18n.global.te(`report.role.${v}`) ? t(`report.role.${v}`) : titleCase(v)
}

export function verificationLabel(status: string): string {
  return i18n.global.te(`report.verification.${status}`) ? t(`report.verification.${status}`) : titleCase(status)
}

// Dot color class per source-verification status — its own names, deliberately
// not reusing 'completed'/'cooldown'/'failed' (those belong to ticker/badge
// state) even though the colors happen to match.
export function verificationDotClass(status: string): string {
  if (status === 'verified') return 'verified'
  if (status === 'probable_hallucination') return 'hallucination'
  return 'questionable'
}

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Compact share-volume display: 12345678 -> "12.35M"
export function fmtVolume(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

// Guards against rendering a non-URL string (e.g. an AI-provided source
// description) as a link — that would navigate within the SPA instead.
export function isHttpUrl(value: string | null | undefined): boolean {
  return !!value && /^https?:\/\//i.test(value)
}

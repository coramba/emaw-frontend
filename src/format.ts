import { i18n } from './i18n'

const t = (key: string, named?: Record<string, unknown>) => i18n.global.t(key, named ?? {})

export function fmtNum(n: number | null | undefined, digits = 2): string {
  return n === null || n === undefined ? '—' : n.toFixed(digits)
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function pctClass(n: number | null | undefined): string {
  if (n === null || n === undefined || n === 0) return ''
  return n > 0 ? 'up' : 'down'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "11 Sep 26, 14:21"
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}, ${p(d.getHours())}:${p(d.getMinutes())}`
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

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

import { ref } from 'vue'
import { api } from './api'
import type { AppSettings, HistoryRange } from './types'

export const HISTORY_RANGES: HistoryRange[] = ['5d', '1mo', '3mo', '1y']

// The user's default chart period (Settings), loaded once per session.
export const defaultRange = ref<HistoryRange>('1mo')
let loading: Promise<void> | null = null

export function loadDefaultRange(): Promise<void> {
  loading ??= api
    .get<{ settings: AppSettings }>('/api/settings')
    .then(({ settings }) => void (defaultRange.value = settings.defaultChartRange))
    .catch(() => void (loading = null))
  return loading
}

export function setDefaultRange(range: HistoryRange): void {
  defaultRange.value = range
  loading = Promise.resolve()
}

// A period picked on a stock page survives visits to that stock's sub-pages
// (alert rules, investigations); router.afterEach forgets it anywhere else.
let remembered: { tickerId: string; range: HistoryRange } | null = null

export function rememberRange(tickerId: string, range: HistoryRange): void {
  remembered = { tickerId, range }
}

export function rememberedRange(tickerId: string): HistoryRange | null {
  return remembered?.tickerId === tickerId ? remembered.range : null
}

export function resetChartRange(): void {
  remembered = null
}

export function resetChartPrefs(): void {
  resetChartRange()
  defaultRange.value = '1mo'
  loading = null
}

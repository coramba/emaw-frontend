export type MonitoringState =
  | 'armed'
  | 'triggered'
  | 'investigating'
  | 'cooldown'
  | 'disabled'
  | 'error'

export type InvestigationStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'insufficient'
  | 'failed'

export interface TriggerConfig {
  dailyChangePct: number | null
  fiveDayChangePct: number | null
  intradayChangePct: number | null
  volumeMultiplier: number | null
  moderateDailyChangePct: number | null
  moderateVolumeMultiplier: number | null
  rearmRecoveryPct: number
  escalationStepPct: number
  intradayWindowMinutes: number
  cooldownMinutes: number
  investigationRefreshMinutes: number
}

export interface ActiveEventSummary {
  id: number
  createdAt: string
  severityPct: number
  escalationLevel: number
  price: number
  dayChangePct: number | null
}

export interface Ticker {
  id: number
  symbol: string
  name: string | null
  exchange: string | null
  currency: string | null
  timezone: string | null
  enabled: boolean
  state: MonitoringState
  lastCheckedAt: string | null
  lastError: string | null
  lastPrice: number | null
  lastDayChangePct: number | null
  lastFiveDayChangePct: number | null
  createdAt: string
  config: TriggerConfig
  activeEvent: ActiveEventSummary | null
}

export interface TriggerReason {
  type: string
  threshold: number
  observed: number
}

export interface ReportEvent {
  title: string
  publishedAt: string | null
  summary: string
  sourceUrl: string
}

export interface InvestigationReport {
  id: number
  triggerEventId: number
  status: InvestigationStatus
  createdAt: string
  completedAt: string | null
  causeFound: boolean | null
  classification: string | null
  confidence: number | null
  summary: string | null
  events: ReportEvent[]
  assessment: { fundamentalImpact?: string; potentialOverreaction?: boolean } | null
  insufficientEvidence: boolean | null
  error: string | null
}

export interface TriggerEvent {
  id: number
  tickerId: number
  symbol: string
  companyName: string | null
  createdAt: string
  reasons: TriggerReason[]
  price: number
  previousClose: number | null
  dayChangePct: number | null
  fiveDayChangePct: number | null
  intradayChangePct: number | null
  volumeRatio: number | null
  severityPct: number
  escalationLevel: number
  parentEventId: number | null
  investigationStatus: InvestigationStatus | null
  report?: InvestigationReport | null
}

export interface MarketSnapshot {
  id: number
  capturedAt: string
  price: number
  previousClose: number | null
  open: number | null
  dayHigh: number | null
  dayLow: number | null
  volume: number | null
  averageVolume: number | null
  dayChangePct: number | null
  fiveDayChangePct: number | null
}

export interface AppSettings {
  telegramEnabled: boolean
  telegramChatId: string | null
}

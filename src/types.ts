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
  nextCheckAt: string | null
  lastError: string | null
  lastPrice: number | null
  lastDayChangePct: number | null
  lastFiveDayChangePct: number | null
  createdAt: string
  config: TriggerConfig
  activeEvent: ActiveEventSummary | null
  favorite: boolean
  /** Per-stock Telegram switch; the account-wide Telegram settings still apply on top. */
  telegramAlerts: boolean
}

export interface TriggerReason {
  type: string
  threshold: number
  observed: number
}

export type VerificationStatus = 'verified' | 'questionable' | 'probable_hallucination'

export interface AiSourceCheck {
  urlValid: boolean | null
  claimSupportedBySource: boolean | null
  reason: string
  /** The user asked for this check from the verification menu. */
  manual?: boolean
}

export interface SourceVerification {
  status: VerificationStatus
  /** Does the source exist at all (URL reachable / not 404-410 / not blocked). */
  existence: VerificationStatus
  /** Does the page's content actually back the claim — null ("unknown") when existence isn't confirmed and no AI opinion filled it in. */
  content: VerificationStatus | null
  httpStatus: number | null
  /** Why the page couldn't be fetched when no HTTP status came back. */
  fetchError?: 'no_such_domain' | 'refused' | 'timeout'
  matchedKeywords: number
  totalKeywords: number
  /** Present only when the mechanical check wasn't green — a second, independent AI opinion. */
  aiCheck?: AiSourceCheck
  /** A manual AI check is queued/running for this source. */
  aiCheckPending?: boolean
}

export interface ReportEvent {
  title: string
  publishedAt: string | null
  summary: string
  sourceUrl: string
  sourceName?: string
  sourceType?: string
  role?: string
  keywords?: string[]
  verification?: SourceVerification | null
  /** Source domain is on the owner's blocklist (computed by the backend). */
  blocked?: boolean
}

export interface InvestigationReport {
  id: number
  triggerEventId: number
  model: string | null
  isPrimary: boolean
  status: InvestigationStatus
  createdAt: string
  completedAt: string | null
  causeFound: boolean | null
  classification: string | null
  confidence: number | null
  summary: string | null
  events: ReportEvent[]
  assessment: {
    fundamentalImpact?: string
    potentialOverreaction?: string
    recoveryLikelihood?: string
    recoveryRationale?: string
  } | null
  insufficientEvidence: boolean | null
  error: string | null
  verificationStatus: 'verified' | 'needs_review' | null
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
  /** All investigation attempts (primary + manual re-investigations) — present on the event detail fetch only. */
  reports?: InvestigationReport[]
}

/** Fixed starter set for manual re-investigation — keep in sync with EventController::ALLOWED_MODELS. */
export const REINVESTIGATE_MODELS = ['gpt-5.4', 'gpt-5.5', 'gpt-6-sol', 'gpt-6-luna'] as const

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

/** Account-wide "pause all" while active; until null = until the user resumes. */
export interface AccountPause {
  until: string | null
}

export interface AppSettings {
  telegramEnabled: boolean
  telegramChatId: string | null
  defaultChartRange: HistoryRange
  pause: AccountPause | null
}

/** A domain the AI must not use as a source (covers its subdomains). */
export interface BlockedSource {
  id: number
  domain: string
  createdAt: string
}

export interface IntegrationCheck {
  ok: boolean
  detail: string
}

export interface IntegrationTestResult {
  openai: IntegrationCheck
  telegram: IntegrationCheck
}

/** Result of GET /api/tickers/lookup — a symbol preview before adding it. */
export interface TickerQuote {
  symbol: string
  name: string | null
  exchange: string | null
  currency: string | null
  price: number
  dayChangePct: number | null
  fiveDayChangePct: number | null
  existingTickerId: number | null
}

export type HistoryRange = '5d' | '1mo' | '3mo' | '1y'

export interface HistoryPoint {
  t: string
  close: number
}

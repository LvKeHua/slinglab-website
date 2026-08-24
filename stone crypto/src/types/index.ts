// === Core Data Types ===

export interface Trade {
  id: string
  time: string
  pair: string
  side: 'Long' | 'Short'
  price: number
  qty: number
  pnl: number
  roi: number
  strategy: string
  tags: string[]
  duration: string
  exchange: string
  fees: number
  notes: string
}

/** Enhanced closed trade record */
export interface ClosedTrade {
  id: number
  symbol: string
  dir: 'Long' | 'Short'
  size: number
  entry: number
  exit: number
  holdTime: string
  realisedPnl: number
  rMultiple: number
  exchange: 'Binance' | 'Bybit'
  account: string
  entryTime: string
  exitTime: string
  sequence: number
  isWin: boolean
  isBreakeven: boolean
  // Analytics-extended fields (optional - may not exist in API data)
  fundingFee?: number
  makerFee?: number
  takerFee?: number
  orderType?: 'Market' | 'Limit' | 'Both'
  tradeTags?: string[]
}

export interface CalendarDayData {
  date: string
  trades: ClosedTrade[]
  totalPnl: number
  tradeCount: number
  winCount: number
  lossCount: number
}

export type BreakevenFilter = 'all' | 'win' | 'breakeven' | 'loss'
export type DirectionFilter = 'all' | 'long' | 'short'

export interface PerformanceFilter {
  account: string
  symbol: string
  limit: number
  timeRange: 'today' | 'this-week' | 'this-month' | 'this-year' | 'all-time'
  sortBy: 'time' | 'pnl'
  sortOrder: 'asc' | 'desc'
  breakevenFilter: BreakevenFilter
  directionFilter: DirectionFilter
}

export type TimeRange = PerformanceFilter['timeRange']

export type ReportingTimeRange = 'this-week' | 'this-month' | 'this-quarter' | 'this-year' | 'custom'
export type ReportingGroupBy = 'open' | 'close'

export interface ReportingFilter {
  account: string
  symbol: string
  timeRange: ReportingTimeRange
  customStartDate: string | null
  customEndDate: string | null
  groupBy: ReportingGroupBy
}

export interface TimeRangeOption {
  label: string
  value: TimeRange
}

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this-week" },
  { label: "This Month", value: "this-month" },
  { label: "This Year", value: "this-year" },
  { label: "All Time", value: "all-time" },
]

export const LIMIT_OPTIONS = [
  { label: "10", value: 10 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "All", value: Infinity },
] as const

export interface Position {
  id: string
  pair: string
  side: 'Long' | 'Short'
  size: number
  entry: number
  mark: number
  pnl: number
  roi: number
  leverage: number
  liquidation: number
  unrealizedPnl: number
  exchange: 'Binance' | 'Bybit'
}

export interface AccountSummary {
  netPnl: number
  grossPnl: number
  grossLoss: number
  winRate: number
  profitFactor: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  avgWin: number
  avgLoss: number
  avgRRRatio: number
  bestTrade: number
  worstTrade: number
  currentBalance: number
  openPositions: number
  avgTradeDuration: string
  totalFees: number
  sharpeRatio: number
}

export interface EquityPoint { date: string; value: number }
export interface DailyPnl { date: string; pnl: number }

export interface SideStats {
  side: 'Long' | 'Short'
  trades: number
  pnl: number
  winRate: number
  avgRoi: number
  volume: number
}

export interface TagStats {
  tag: string
  trades: number
  wins: number
  losses: number
  winRate: number
  pnl: number
  avgRoi: number
}

export interface DurationBucket {
  label: string
  trades: number
  wins: number
  pnl: number
  winRate: number
}

export interface SizeBucket {
  label: string
  trades: number
  wins: number
  pnl: number
  winRate: number
  minSize: number
  maxSize: number
}

export interface CalendarDay { day: number; pnl: number; count: number }

export interface JournalEntry {
  id: string
  tradeId: string
  trade: string
  content: string
  tags: string[]
  chartUrls: string[]
  createdAt: string
  confidence: number
  emotions: string[]
}

export interface TradeFilter {
  search: string
  side: 'All' | 'Long' | 'Short'
  dateRange: [Date | null, Date | null]
  strategy: string
  tag: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  account: string
  symbol: string
  limit: number
}

export interface ExchangeKeys { apiKey: string; secretKey: string }
export interface ExchangeStatus { configured: boolean; valid: boolean }
export interface SettingsStatus { binance: ExchangeStatus; bybit: ExchangeStatus }

export type DashboardTab = 'positions' | 'assets'
export type DashboardTimeRange = 'today' | 'this-week' | 'this-month' | 'this-quarter' | 'this-year' | 'all-time'
export type TraderBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL'

export const DASHBOARD_TIME_RANGE_OPTIONS: { label: string; value: DashboardTimeRange }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this-week" },
  { label: "This Month", value: "this-month" },
  { label: "This Quarter", value: "this-quarter" },
  { label: "This Year", value: "this-year" },
  { label: "All Time", value: "all-time" },
]

export interface Asset {
  symbol: string
  name: string
  price: number
  change24h: number
  volume24h: number
  spread: number
  holdings: number
  value: number
  unrealizedPnl: number
  side: 'Long' | 'Short'
  exchange?: string
}

export interface AssetBalance {
  symbol: string
  free: number
  locked: number
  valueUsdt: number
  priceUsdt: number
}

export interface AccountInfo {
  exchange: string
  configured: boolean
  valid: boolean
  assets: AssetBalance[]
  error?: string
}

/** Raw open position as returned by the Worker API (futures positionRisk) */
export interface ApiOpenPosition {
  symbol: string
  side: "Long" | "Short"
  size: number
  entryPrice: number
  markPrice: number
  unrealizedPnl: number
  leverage: number
  liquidationPrice: number
  exchange: "Binance" | "Bybit"
}

export interface DashboardResponse {
  closedTrades: ClosedTrade[]
  netWorth: number
  lastUpdated: string
  accounts?: AccountInfo[]
  openPositions?: ApiOpenPosition[]
}

export interface DashboardState {
  positions: Position[]
  assets: Asset[]
  accounts: AccountInfo[]
  closedTrades: ClosedTrade[]
  filteredClosedTrades: ClosedTrade[]
  netWorth: number
  userName: string
  dashboardTab: DashboardTab
  isLoading: boolean
  isSyncing: boolean
  error: string | null
  lastUpdated: string | null
}

export interface MockData {
  summary: AccountSummary
  equityCurve: EquityPoint[]
  dailyPnl: DailyPnl[]
  positions: Position[]
  trades: Trade[]
  sides: SideStats[]
  tags: TagStats[]
  durations: DurationBucket[]
  sizes: SizeBucket[]
  calendar: CalendarDay[]
  journal: JournalEntry[]
  closedTrades: ClosedTrade[]
  assets?: AssetBalance[]
}

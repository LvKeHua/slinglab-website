// === Closed Trade (shared) ===

export interface ClosedTrade {
  id: number
  symbol: string
  dir: "Long" | "Short"
  size: number
  entry: number
  exit: number
  holdTime: string
  realisedPnl: number
  rMultiple: number
  exchange: "Binance" | "Bybit"
  account: string
  entryTime: string
  exitTime: string
  sequence: number
  isWin: boolean          // true if realisedPnl > 0
  isBreakeven: boolean    // true if realisedPnl === 0
}

export interface AssetBalance {
  symbol: string
  free: number
  locked: number
  valueUsdt: number
  priceUsdt: number
}

export interface AccountInfo {
  exchange: "Binance" | "Bybit"
  configured: boolean
  valid: boolean
  assets: AssetBalance[]
  error?: string
}

export interface OpenPosition {
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
  openPositions?: OpenPosition[]
}

// === Frontend-facing types for MockData API ===

export interface Trade {
  id: string
  time: string
  pair: string
  side: "Long" | "Short"
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

export interface EquityPoint {
  date: string
  value: number
}

export interface DailyPnl {
  date: string
  pnl: number
}

export interface Position {
  id: string
  pair: string
  side: "Long" | "Short"
  size: number
  entry: number
  mark: number
  pnl: number
  roi: number
  leverage: number
  liquidation: number
  unrealizedPnl: number
  exchange?: string
}

export interface SideStats {
  side: "Long" | "Short"
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

export interface CalendarDay {
  day: number
  pnl: number
  count: number
}

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

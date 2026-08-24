/**
 * Analytics calculation utilities — CMM-style deep analysis
 * All functions are pure and operate on ClosedTrade[]
 */
import type { ClosedTrade, BreakevenFilter, DirectionFilter } from "@/types"

// ─── Time Range ────────────────────────────────────────────────────────────────

export type AnalyticsTimeRange = "today" | "this-week" | "this-month" | "this-quarter" | "this-year" | "all-time"

export const ANALYTICS_TIME_RANGE_OPTIONS: { label: string; value: AnalyticsTimeRange }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this-week" },
  { label: "This Month", value: "this-month" },
  { label: "This Quarter", value: "this-quarter" },
  { label: "This Year", value: "this-year" },
  { label: "All Time", value: "all-time" },
]

export const LAST_N_OPTIONS = [
  { label: "10", value: 10 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "All", value: Infinity },
] as const

export function filterTradesByTimeRange(trades: ClosedTrade[], range: AnalyticsTimeRange): ClosedTrade[] {
  if (range === "all-time") return trades
  const now = new Date()
  let start: Date
  switch (range) {
    case "today": start = new Date(now); start.setHours(0, 0, 0, 0); break
    case "this-week": { const d = now.getDay(); start = new Date(now); start.setDate(now.getDate() - d); start.setHours(0, 0, 0, 0); break }
    case "this-month": start = new Date(now.getFullYear(), now.getMonth(), 1); break
    case "this-quarter": { const q = Math.floor(now.getMonth() / 3); start = new Date(now.getFullYear(), q * 3, 1); break }
    case "this-year": start = new Date(now.getFullYear(), 0, 1); break
    default: return trades
  }
  return trades.filter(t => new Date(t.exitTime) >= start)
}

export function filterTradesByLastN(trades: ClosedTrade[], limit: number): ClosedTrade[] {
  if (!isFinite(limit) || limit >= trades.length) return trades
  return trades.slice(0, limit)
}

export function filterTradesByAccount(trades: ClosedTrade[], account: string): ClosedTrade[] {
  if (account === "All Accounts") return trades
  return trades.filter(t => t.exchange === account)
}

export function filterTradesBySymbol(trades: ClosedTrade[], symbol: string): ClosedTrade[] {
  if (!symbol || symbol === "All Symbols") return trades
  return trades.filter(t => t.symbol === symbol)
}

export function filterTradesByBreakeven(trades: ClosedTrade[], filter: BreakevenFilter): ClosedTrade[] {
  if (filter === "all") return trades
  if (filter === "win") return trades.filter(t => t.isWin)
  if (filter === "loss") return trades.filter(t => !t.isWin && !t.isBreakeven)
  return trades.filter(t => t.isBreakeven)
}

export function filterTradesByDirection(trades: ClosedTrade[], filter: DirectionFilter): ClosedTrade[] {
  if (filter === "all") return trades
  if (filter === "long") return trades.filter(t => t.dir === "Long")
  return trades.filter(t => t.dir === "Short")
}

export function getUniqueSymbols(trades: ClosedTrade[]): string[] {
  return [...new Set(trades.map(t => t.symbol))].sort()
}

export function getUniqueAccounts(trades: ClosedTrade[]): string[] {
  return [...new Set(trades.map(t => t.exchange))]
}

// ─── Helper: parse holdTime string to ms ─────────────────────────────────────

export function parseHoldTime(ht: string): number {
  let ms = 0
  const hMatch = ht.match(/(\d+)h/)
  const mMatch = ht.match(/(\d+)m(?!s)/)
  const sMatch = ht.match(/(\d+)s/)
  if (hMatch) ms += parseInt(hMatch[1]) * 3600000
  if (mMatch) ms += parseInt(mMatch[1]) * 60000
  if (sMatch) ms += parseInt(sMatch[1]) * 1000
  return ms
}

export function formatHoldTimeShort(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return h + "h " + m + "m " + s + "s"
  if (m > 0) return m + "m " + s + "s"
  return s + "s"
}

// ─── Statistics (12 metrics) ────────────────────────────────────────────────

export interface Statistics {
  totalGainLoss: number
  avgDailyGain: number
  tradingDays: number
  largestGain: number
  avgTradesPerDay: number
  maxConsecutiveWin: number
  largestLoss: number
  tradeExpectancy: number
  avgDailyVolume: number
  totalTradesVolume: number
  avgTradeWin: number
  avgTradeLoss: number
}

export function calculateStatistics(trades: ClosedTrade[]): Statistics {
  if (trades.length === 0) return { totalGainLoss: 0, avgDailyGain: 0, tradingDays: 0, largestGain: 0, avgTradesPerDay: 0, maxConsecutiveWin: 0, largestLoss: 0, tradeExpectancy: 0, avgDailyVolume: 0, totalTradesVolume: 0, avgTradeWin: 0, avgTradeLoss: 0 }

  const wins = trades.filter(t => t.isWin)
  const losses = trades.filter(t => !t.isWin && !t.isBreakeven)
  const totalGainLoss = trades.reduce((s, t) => s + t.realisedPnl, 0)
  const totalVolume = trades.reduce((s, t) => s + Math.abs(t.entry * t.size), 0)

  // trading days
  const days = new Set(trades.map(t => t.exitTime.slice(0, 10)))
  const tradingDays = days.size

  // max consecutive wins
  let maxConsec = 0, curConsec = 0
  for (const t of trades) {
    if (t.isWin) { curConsec++; maxConsec = Math.max(maxConsec, curConsec) }
    else { curConsec = 0 }
  }

  return {
    totalGainLoss: Math.round(totalGainLoss * 100) / 100,
    avgDailyGain: Math.round((totalGainLoss / tradingDays) * 100) / 100,
    tradingDays,
    largestGain: Math.round(Math.max(...trades.map(t => t.realisedPnl)) * 100) / 100,
    avgTradesPerDay: Math.round((trades.length / tradingDays) * 100) / 100,
    maxConsecutiveWin: maxConsec,
    largestLoss: Math.round(Math.min(...trades.map(t => t.realisedPnl)) * 100) / 100,
    tradeExpectancy: Math.round((totalGainLoss / trades.length) * 100) / 100,
    avgDailyVolume: Math.round((totalVolume / tradingDays) * 100) / 100,
    totalTradesVolume: Math.round(totalVolume * 100) / 100,
    avgTradeWin: wins.length > 0 ? Math.round((wins.reduce((s, t) => s + t.realisedPnl, 0) / wins.length) * 100) / 100 : 0,
    avgTradeLoss: losses.length > 0 ? Math.round((Math.abs(losses.reduce((s, t) => s + t.realisedPnl, 0)) / losses.length) * 100) / 100 : 0,
  }
}

// ─── Win Rate & Breakeven ───────────────────────────────────────────────────

export interface WinRateData {
  winRate: number
  wins: number
  breakeven: number
  losses: number
  total: number
}

export function calculateWinRate(trades: ClosedTrade[]): WinRateData {
  const wins = trades.filter(t => t.isWin).length
  const be = trades.filter(t => t.isBreakeven).length
  const losses = trades.filter(t => !t.isWin && !t.isBreakeven).length
  const total = trades.length
  return { winRate: total > 0 ? Math.round((wins / total) * 1000) / 10 : 0, wins, breakeven: be, losses, total }
}

// ─── Long/Short Ratio ──────────────────────────────────────────────────────

export interface LongShortRatioData {
  longCount: number
  shortCount: number
  longPct: number
  shortPct: number
}

export function calculateLongShortRatio(trades: ClosedTrade[]): LongShortRatioData {
  const longCount = trades.filter(t => t.dir === 'Long').length
  const shortCount = trades.filter(t => t.dir === 'Short').length
  const total = longCount + shortCount
  return { longCount, shortCount, longPct: total > 0 ? Math.round((longCount / total) * 100) : 0, shortPct: total > 0 ? Math.round((shortCount / total) * 100) : 0 }
}

// ─── Direction Deep Analysis (Longs/Shorts) ────────────────────────────────

export interface DirectionDeepStats {
  count: number
  pctOfTotal: number
  winRatio: number
  wins: number
  losses: number
  avgDuration: string
  totalPnL: number
  avgWin: number
  avgLoss: number
}

export function calculateDirectionDeep(trades: ClosedTrade[], direction: 'Long' | 'Short', allTrades: ClosedTrade[]): DirectionDeepStats {
  const dir = trades.filter(t => t.dir === direction)
  if (dir.length === 0) return { count: 0, pctOfTotal: 0, winRatio: 0, wins: 0, losses: 0, avgDuration: '0s', totalPnL: 0, avgWin: 0, avgLoss: 0 }

  const wins = dir.filter(t => t.isWin)
  const losses = dir.filter(t => !t.isWin && !t.isBreakeven)
  const avgWinPnl = wins.length > 0 ? wins.reduce((s, t) => s + t.realisedPnl, 0) / wins.length : 0
  const totalPnL = dir.reduce((s, t) => s + t.realisedPnl, 0)
  const avgDurMs = dir.reduce((s, t) => s + parseHoldTime(t.holdTime), 0) / dir.length

  return {
    count: dir.length,
    pctOfTotal: allTrades.length > 0 ? Math.round((dir.length / allTrades.length) * 100) : 0,
    winRatio: Math.round((wins.length / dir.length) * 1000) / 10,
    wins: wins.length,
    losses: losses.length,
    avgDuration: formatHoldTimeShort(avgDurMs),
    totalPnL: Math.round(totalPnL * 100) / 100,
    avgWin: Math.round(avgWinPnl * 100) / 100,
    avgLoss: losses.length > 0 ? Math.round(Math.abs(losses.reduce((s, t) => s + t.realisedPnl, 0) / losses.length) * 100) / 100 : 0,
  }
}

// ─── Winning/Losing Trades Comparison ──────────────────────────────────────

export interface WinLoseRow {
  direction: string
  count: number
  avgDuration: string
  totalVolume: number
  avgPnL: number
  avgSize: number
}

export interface WinLoseComparison {
  winning: { long: WinLoseRow; short: WinLoseRow; both: WinLoseRow }
  losing: { long: WinLoseRow; short: WinLoseRow; both: WinLoseRow }
}

function calcWinLoseRow(list: ClosedTrade[]): WinLoseRow {
  if (list.length === 0) return { direction: '', count: 0, avgDuration: '0s', totalVolume: 0, avgPnL: 0, avgSize: 0 }
  const avgDur = list.reduce((s, t) => s + parseHoldTime(t.holdTime), 0) / list.length
  const vol = list.reduce((s, t) => s + Math.abs(t.entry * t.size), 0)
  const avgPnl = list.reduce((s, t) => s + t.realisedPnl, 0) / list.length
  const avgSize = list.reduce((s, t) => s + Math.abs(t.entry * t.size), 0) / list.length
  return { direction: '', count: list.length, avgDuration: formatHoldTimeShort(avgDur), totalVolume: Math.round(vol * 100) / 100, avgPnL: Math.round(avgPnl * 10000) / 10000, avgSize: Math.round(avgSize * 100) / 100 }
}

export function calculateWinLoseComparison(trades: ClosedTrade[]): WinLoseComparison {
  const wins = trades.filter(t => t.isWin)
  const losses = trades.filter(t => !t.isWin && !t.isBreakeven)
  const calcBoth = (list: ClosedTrade[]) => calcWinLoseRow(list)
  return {
    winning: {
      long: { ...calcBoth(wins.filter(t => t.dir === 'Long')), direction: 'Long' },
      short: { ...calcBoth(wins.filter(t => t.dir === 'Short')), direction: 'Short' },
      both: { ...calcBoth(wins), direction: 'Both' },
    },
    losing: {
      long: { ...calcBoth(losses.filter(t => t.dir === 'Long')), direction: 'Long' },
      short: { ...calcBoth(losses.filter(t => t.dir === 'Short')), direction: 'Short' },
      both: { ...calcBoth(losses), direction: 'Both' },
    },
  }
}

// ─── Trade Result By Day ───────────────────────────────────────────────────

export interface DailyResult {
  date: string
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalPnl: number
  avgPnl: number
}

export function calculateTradeResultByDay(trades: ClosedTrade[], groupBy: 'open' | 'close' = 'open'): DailyResult[] {
  const map = new Map<string, ClosedTrade[]>()
  for (const t of trades) {
    const key = groupBy === 'open' ? t.entryTime.slice(0, 10) : t.exitTime.slice(0, 10)
    const list = map.get(key) ?? []
    list.push(t)
    map.set(key, list)
  }
  const results: DailyResult[] = []
  for (const [date, list] of map) {
    const wins = list.filter(t => t.isWin).length
    const losses = list.filter(t => !t.isWin && !t.isBreakeven).length
    const pnl = list.reduce((s, t) => s + t.realisedPnl, 0)
    results.push({ date, totalTrades: list.length, winningTrades: wins, losingTrades: losses, totalPnl: Math.round(pnl * 100) / 100, avgPnl: Math.round((pnl / list.length) * 100) / 100 })
  }
  return results.sort((a, b) => a.date.localeCompare(b.date))
}

// ─── Trade Result By Time (Hourly) ──────────────────────────────────────────

export interface HourlyResult {
  hour: number
  count: number
  totalPnl: number
  winRate: number
}

export function calculateTradeResultByTime(trades: ClosedTrade[], groupBy: 'open' | 'close' = 'open'): HourlyResult[] {
  const buckets = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, totalPnl: 0, winCount: 0 }))
  for (const t of trades) {
    const hour = groupBy === 'open' ? new Date(t.entryTime).getHours() : new Date(t.exitTime).getHours()
    buckets[hour].count++
    buckets[hour].totalPnl += t.realisedPnl
    if (t.isWin) buckets[hour].winCount++
  }
  return buckets.map(b => ({ hour: b.hour, count: b.count, totalPnl: Math.round(b.totalPnl * 100) / 100, winRate: b.count > 0 ? Math.round((b.winCount / b.count) * 1000) / 10 : 0 }))
}

// ─── Trade Duration Report ──────────────────────────────────────────────────

export interface DurationBucketData {
  label: string
  winCount: number
  winPnl: number
  lossCount: number
  lossPnl: number
  avgWinPnl: number
  avgLossPnl: number
}

const DURATION_BUCKETS = [
  { label: '< 1h', minMs: 0, maxMs: 3600000 },
  { label: '1-2h', minMs: 3600000, maxMs: 7200000 },
  { label: '2-4h', minMs: 7200000, maxMs: 14400000 },
  { label: '4-8h', minMs: 14400000, maxMs: 28800000 },
  { label: '8-12h', minMs: 28800000, maxMs: 43200000 },
  { label: '12-24h', minMs: 43200000, maxMs: 86400000 },
  { label: '> 24h', minMs: 86400000, maxMs: Infinity },
]

export function calculateDurationReport(trades: ClosedTrade[]): DurationBucketData[] {
  return DURATION_BUCKETS.map(bucket => {
    const inBucket = trades.filter(t => {
      const ms = parseHoldTime(t.holdTime)
      return ms >= bucket.minMs && ms < bucket.maxMs
    })
    const wins = inBucket.filter(t => t.isWin)
    const losses = inBucket.filter(t => !t.isWin && !t.isBreakeven)
    const winPnl = wins.reduce((s, t) => s + t.realisedPnl, 0)
    const lossPnl = losses.reduce((s, t) => s + t.realisedPnl, 0)
    return {
      label: bucket.label,
      winCount: wins.length,
      winPnl: Math.round(winPnl * 100) / 100,
      lossCount: losses.length,
      lossPnl: Math.round(lossPnl * 100) / 100,
      avgWinPnl: wins.length > 0 ? Math.round((winPnl / wins.length) * 100) / 100 : 0,
      avgLossPnl: losses.length > 0 ? Math.round((lossPnl / losses.length) * 100) / 100 : 0,
    }
  })
}

// ─── Trade Size Report ──────────────────────────────────────────────────────

export interface SizeBucketData {
  label: string
  winCount: number
  winPnl: number
  lossCount: number
  lossPnl: number
  avgWinPnl: number
  avgLossPnl: number
}

const SIZE_BUCKETS = [
  { label: '< $100', min: 0, max: 100 },
  { label: '$100 - $500', min: 100, max: 500 },
  { label: '$500 - $1K', min: 500, max: 1000 },
  { label: '$1K - $5K', min: 1000, max: 5000 },
  { label: '$5K - $10K', min: 5000, max: 10000 },
  { label: '> $10K', min: 10000, max: Infinity },
]

export function calculateSizeReport(trades: ClosedTrade[]): SizeBucketData[] {
  return SIZE_BUCKETS.map(bucket => {
    const inBucket = trades.filter(t => {
      const notional = Math.abs(t.entry * t.size)
      return notional >= bucket.min && notional < bucket.max
    })
    const wins = inBucket.filter(t => t.isWin)
    const losses = inBucket.filter(t => !t.isWin && !t.isBreakeven)
    const winPnl = wins.reduce((s, t) => s + t.realisedPnl, 0)
    const lossPnl = losses.reduce((s, t) => s + t.realisedPnl, 0)
    return {
      label: bucket.label,
      winCount: wins.length,
      winPnl: Math.round(winPnl * 100) / 100,
      lossCount: losses.length,
      lossPnl: Math.round(lossPnl * 100) / 100,
      avgWinPnl: wins.length > 0 ? Math.round((winPnl / wins.length) * 100) / 100 : 0,
      avgLossPnl: losses.length > 0 ? Math.round((lossPnl / losses.length) * 100) / 100 : 0,
    }
  })
}

// ─── Traded Symbols Report ──────────────────────────────────────────────────

export interface SymbolReportRow {
  symbol: string
  trades: number
  winRate: number
  avgDuration: string
  avgPnl: number
  totalPnl: number
  longVsShort: string
}

export function calculateSymbolReport(trades: ClosedTrade[]): SymbolReportRow[] {
  const map = new Map<string, ClosedTrade[]>()
  for (const t of trades) {
    const list = map.get(t.symbol) ?? []
    list.push(t)
    map.set(t.symbol, list)
  }
  const results: SymbolReportRow[] = []
  for (const [symbol, list] of map) {
    const wins = list.filter(t => t.isWin)
    const totalPnl = list.reduce((s, t) => s + t.realisedPnl, 0)
    const avgDurMs = list.reduce((s, t) => s + parseHoldTime(t.holdTime), 0) / list.length
    const longCount = list.filter(t => t.dir === 'Long').length
    const shortCount = list.filter(t => t.dir === 'Short').length
    results.push({
      symbol,
      trades: list.length,
      winRate: Math.round((wins.length / list.length) * 1000) / 10,
      avgDuration: formatHoldTimeShort(avgDurMs),
      avgPnl: Math.round((totalPnl / list.length) * 100) / 100,
      totalPnl: Math.round(totalPnl * 100) / 100,
      longVsShort: longCount + '/' + shortCount,
    })
  }
  return results.sort((a, b) => b.totalPnl - a.totalPnl)
}

// ─── Funding & Fees ──────────────────────────────────────────────────────────

export interface FundingFeesData {
  fundingReceived: number
  fundingPaid: number
  netFunding: number
  makerRebates: number
  marketFeesPaid: number
  netFees: number
}

export function calculateFundingFees(trades: ClosedTrade[]): FundingFeesData {
  const fundingReceived = trades.reduce((s, t) => s + (t.fundingFee && t.fundingFee > 0 ? t.fundingFee : 0), 0)
  const fundingPaid = trades.reduce((s, t) => s + (t.fundingFee && t.fundingFee < 0 ? Math.abs(t.fundingFee) : 0), 0)
  const makerRebates = trades.reduce((s, t) => s + (t.makerFee ?? 0), 0)
  const marketFeesPaid = trades.reduce((s, t) => s + (t.takerFee ?? 0), 0)
  return {
    fundingReceived: Math.round(fundingReceived * 100) / 100,
    fundingPaid: Math.round(fundingPaid * 100) / 100,
    netFunding: Math.round((fundingReceived - fundingPaid) * 100) / 100,
    makerRebates: Math.round(makerRebates * 100) / 100,
    marketFeesPaid: Math.round(marketFeesPaid * 100) / 100,
    netFees: Math.round((makerRebates + marketFeesPaid) * 100) / 100,
  }
}

// ─── Order Type Study ────────────────────────────────────────────────────────

export interface OrderTypeStudyData {
  justMarket: { count: number; pct: number; pnl: number }
  justLimit: { count: number; pct: number; pnl: number }
  both: { count: number; pct: number; pnl: number }
}

export function calculateOrderTypeStudy(trades: ClosedTrade[]): OrderTypeStudyData {
  const market = trades.filter(t => !t.orderType || t.orderType === 'Market')
  const limit = trades.filter(t => t.orderType === 'Limit')
  const both = trades.filter(t => t.orderType === 'Both')
  const total = trades.length || 1
  return {
    justMarket: { count: market.length, pct: Math.round((market.length / total) * 1000) / 10, pnl: Math.round(market.reduce((s, t) => s + t.realisedPnl, 0) * 100) / 100 },
    justLimit: { count: limit.length, pct: Math.round((limit.length / total) * 1000) / 10, pnl: Math.round(limit.reduce((s, t) => s + t.realisedPnl, 0) * 100) / 100 },
    both: { count: both.length, pct: Math.round((both.length / total) * 1000) / 10, pnl: Math.round(both.reduce((s, t) => s + t.realisedPnl, 0) * 100) / 100 },
  }
}

// ─── Cumulative PnL & Drawdown ─────────────────────────────────────────────

export interface DrawdownData {
  maxDrawdownPct: number
  peakValue: number
  cumulativePnL: number[]
}

export function calculateDrawdown(trades: ClosedTrade[]): DrawdownData {
  if (trades.length === 0) return { maxDrawdownPct: 0, peakValue: 0, cumulativePnL: [] }
  const cumPnL: number[] = []
  let running = 0
  for (const t of trades) { running += t.realisedPnl; cumPnL.push(running) }
  let peak = cumPnL[0], maxDD = 0
  for (let i = 1; i < cumPnL.length; i++) {
    if (cumPnL[i] > peak) peak = cumPnL[i]
    const dd = peak - cumPnL[i]
    if (dd > maxDD) maxDD = dd
  }
  return { maxDrawdownPct: peak > 0 ? Math.round((maxDD / peak) * 10000) / 100 : 0, peakValue: Math.round(peak * 100) / 100, cumulativePnL: cumPnL }
}

// ─── PnL Distribution ──────────────────────────────────────────────────────

export interface PnLBucket {
  range: string
  count: number
  isPositive: boolean
}

export function calculatePnLDistribution(trades: ClosedTrade[], binSize = 50): PnLBucket[] {
  if (trades.length === 0) return []
  const pnls = trades.map(t => t.realisedPnl)
  const minPnL = Math.min(...pnls)
  const maxPnL = Math.max(...pnls)
  const startBin = Math.floor(minPnL / binSize) * binSize
  const endBin = Math.ceil(maxPnL / binSize) * binSize
  const buckets: PnLBucket[] = []
  for (let lo = startBin; lo < endBin; lo += binSize) {
    const hi = lo + binSize
    const count = pnls.filter(p => p >= lo && p < hi).length
    buckets.push({ range: (lo >= 0 ? "+" : "") + lo + " to " + (hi >= 0 ? "+" : "") + hi, count, isPositive: lo >= 0 })
  }
  return buckets
}

export function getAnalyticsTimeRangeLabel(range: AnalyticsTimeRange): string {
  const map: Record<AnalyticsTimeRange, string> = { today: "Today", "this-week": "This Week", "this-month": "This Month", "this-quarter": "This Quarter", "this-year": "This Year", "all-time": "All Time" }
  return map[range] ?? range
}



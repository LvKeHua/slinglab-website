/**
 * Reporting calculation utilities — CMM-style time-range analysis
 * Reuses analytics functions where possible, adds reporting-specific logic
 */
import type { ClosedTrade } from "@/types"
import {
  calculateTradeResultByDay,
  calculateTradeResultByTime,
  calculateDurationReport,
  calculateSizeReport,
  calculateSymbolReport,
  getUniqueSymbols,
  getUniqueAccounts,
  filterTradesByAccount,
  filterTradesBySymbol,
  type DailyResult,
  type HourlyResult,
  type DurationBucketData,
  type SizeBucketData,
  type SymbolReportRow,
} from "@/utils/analytics"

// ─── Time Range ────────────────────────────────────────────────────────────────

export type ReportingTimeRange = "this-week" | "this-month" | "this-quarter" | "this-year" | "custom"

export const REPORTING_TIME_RANGE_OPTIONS: { label: string; value: ReportingTimeRange }[] = [
  { label: "This Week", value: "this-week" },
  { label: "This Month", value: "this-month" },
  { label: "This Quarter", value: "this-quarter" },
  { label: "This Year", value: "this-year" },
  { label: "Custom", value: "custom" },
]

export function filterTradesByReportingTimeRange(
  trades: ClosedTrade[],
  range: ReportingTimeRange,
  groupBy: "open" | "close",
  customStart?: string | null,
  customEnd?: string | null,
): ClosedTrade[] {
  if (range === "custom") {
    const start = customStart ? new Date(customStart) : null
    const end = customEnd ? new Date(customEnd) : null
    if (end) end.setHours(23, 59, 59, 999)
    return trades.filter((t) => {
      const time = groupBy === "open" ? new Date(t.entryTime) : new Date(t.exitTime)
      if (start && time < start) return false
      if (end && time > end) return false
      return true
    })
  }
  const now = new Date()
  let start: Date
  switch (range) {
    case "this-week": {
      const d = now.getDay()
      start = new Date(now)
      start.setDate(now.getDate() - d)
      start.setHours(0, 0, 0, 0)
      break
    }
    case "this-month":
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case "this-quarter": {
      const q = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), q * 3, 1)
      break
    }
    case "this-year":
      start = new Date(now.getFullYear(), 0, 1)
      break
    default:
      return trades
  }
  return trades.filter((t) => {
    const time = groupBy === "open" ? new Date(t.entryTime) : new Date(t.exitTime)
    return time >= start
  })
}

// ─── Reporting Summary ─────────────────────────────────────────────────────────

export interface ReportingSummary {
  totalTrades: number
  winRate: number
  totalPnL: number
  profitFactor: number
  avgR: number
  bestTrade: number
  worstTrade: number
  avgHoldTime: string
}

function parseHoldTimeMs(ht: string): number {
  let ms = 0
  const h = ht.match(/(\d+)h/)
  const m = ht.match(/(\d+)m(?!s)/)
  const s = ht.match(/(\d+)s/)
  if (h) ms += parseInt(h[1]) * 3600000
  if (m) ms += parseInt(m[1]) * 60000
  if (s) ms += parseInt(s[1]) * 1000
  return ms
}

function formatHoldTimeShort(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return h + "h " + m + "m"
  if (m > 0) return m + "m " + s + "s"
  return s + "s"
}

export function calculateReportingSummary(trades: ClosedTrade[]): ReportingSummary {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalPnL: 0,
      profitFactor: 0,
      avgR: 0,
      bestTrade: 0,
      worstTrade: 0,
      avgHoldTime: "0s",
    }
  }
  const wins = trades.filter((t) => t.isWin)
  const losses = trades.filter((t) => !t.isWin && !t.isBreakeven)
  const totalPnL = trades.reduce((s, t) => s + t.realisedPnl, 0)
  const grossWin = wins.reduce((s, t) => s + t.realisedPnl, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.realisedPnl, 0))
  const avgHoldMs = trades.reduce((s, t) => s + parseHoldTimeMs(t.holdTime), 0) / trades.length
  return {
    totalTrades: trades.length,
    winRate: Math.round((wins.length / trades.length) * 10000) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    profitFactor: grossLoss > 0 ? Math.round((grossWin / grossLoss) * 100) / 100 : grossWin > 0 ? Infinity : 0,
    avgR: Math.round((trades.reduce((s, t) => s + t.rMultiple, 0) / trades.length) * 100) / 100,
    bestTrade: Math.round(Math.max(...trades.map((t) => t.realisedPnl)) * 100) / 100,
    worstTrade: Math.round(Math.min(...trades.map((t) => t.realisedPnl)) * 100) / 100,
    avgHoldTime: formatHoldTimeShort(avgHoldMs),
  }
}

// ─── Export Functions ──────────────────────────────────────────────────────────

const CSV_HEADERS = [
  "id",
  "symbol",
  "dir",
  "size",
  "entry",
  "exit",
  "holdTime",
  "realisedPnl",
  "rMultiple",
  "exchange",
  "account",
  "entryTime",
  "exitTime",
  "isWin",
  "isBreakeven",
]

export function exportToCSV(trades: ClosedTrade[]): string {
  const header = CSV_HEADERS.join(",")
  const rows = trades.map((t) =>
    CSV_HEADERS.map((h) => {
      const val = t[h as keyof ClosedTrade]
      if (typeof val === "string" && val.includes(",")) return '"' + val + '"'
      return String(val ?? "")
    }).join(","),
  )
  return [header, ...rows].join("\n")
}

export function exportToJSON(trades: ClosedTrade[]): string {
  return JSON.stringify(trades, null, 2)
}

// ─── Re-exports from analytics ─────────────────────────────────────────────────

export {
  calculateTradeResultByDay,
  calculateTradeResultByTime,
  calculateDurationReport,
  calculateSizeReport,
  calculateSymbolReport,
  getUniqueSymbols,
  getUniqueAccounts,
  filterTradesByAccount,
  filterTradesBySymbol,
}
export type { DailyResult, HourlyResult, DurationBucketData, SizeBucketData, SymbolReportRow }
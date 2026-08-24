import type { ClosedTrade, DashboardTimeRange } from "@/types"

/**
 * Filter closed trades by dashboard time range.
 * Reuses the same logic as Performance page's filterByTimeRange
 * but supports the "this-quarter" option unique to Dashboard.
 */
export function filterDashboardTrades(
  trades: ClosedTrade[],
  range: DashboardTimeRange
): ClosedTrade[] {
  const now = new Date()
  let start: Date

  switch (range) {
    case "today": {
      start = new Date(now)
      start.setHours(0, 0, 0, 0)
      break
    }
    case "this-week": {
      const day = now.getDay()
      start = new Date(now)
      start.setDate(now.getDate() - day)
      start.setHours(0, 0, 0, 0)
      break
    }
    case "this-month":
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case "this-quarter": {
      const quarter = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), quarter * 3, 1)
      break
    }
    case "this-year":
      start = new Date(now.getFullYear(), 0, 1)
      break
    case "all-time":
      return trades
    default:
      return trades
  }

  return trades.filter((t) => new Date(t.exitTime) >= start)
}

/**
 * Get the display label for a dashboard time range.
 */
export function getDashboardTimeRangeLabel(range: DashboardTimeRange): string {
  const map: Record<DashboardTimeRange, string> = {
    "today": "Today",
    "this-week": "This Week",
    "this-month": "This Month",
    "this-quarter": "This Quarter",
    "this-year": "This Year",
    "all-time": "All Time",
  }
  return map[range] ?? range
}

/**
 * Calculate the number of unique trading days within a set of trades.
 */
export function getTradingDays(trades: ClosedTrade[]): number {
  if (trades.length === 0) return 0
  const days = new Set(trades.map((t) => t.exitTime.slice(0, 10)))
  return days.size
}
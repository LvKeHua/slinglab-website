import { useMemo } from "react"
import type { ClosedTrade, TimeRange, BreakevenFilter, DirectionFilter } from "@/types"

export function filterByTimeRange(trades: ClosedTrade[], range: TimeRange): ClosedTrade[] {
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
    case "this-year":
      start = new Date(now.getFullYear(), 0, 1)
      break
    case "all-time":
    default:
      return trades
  }
  return trades.filter((t) => new Date(t.exitTime) >= start)
}

export function getSymbolOptions(account: string, trades: ClosedTrade[]): string[] {
  const filtered = account === "All Accounts"
    ? trades
    : trades.filter((t) => t.exchange === account)
  const symbols = Array.from(new Set(filtered.map((t) => t.symbol)))
  return ["All Symbols", ...symbols.sort()]
}

export interface SortConfig {
  sortBy: "time" | "pnl"
  sortOrder: "asc" | "desc"
}

/**
 * Parse holdTime string like "2h 9m 42s" or "45m 12s" into total seconds
 */
export function parseHoldTime(holdTime: string): number {
  let totalSeconds = 0
  const hMatch = holdTime.match(/(\d+)h/)
  const mMatch = holdTime.match(/(\d+)m/)
  const sMatch = holdTime.match(/(\d+)s/)
  if (hMatch) totalSeconds += parseInt(hMatch[1]) * 3600
  if (mMatch) totalSeconds += parseInt(mMatch[1]) * 60
  if (sMatch) totalSeconds += parseInt(sMatch[1])
  return totalSeconds
}

export function useFilteredTrades(
  closedTrades: ClosedTrade[],
  account: string,
  symbol: string,
  limit: number,
  timeRange: TimeRange,
  sort?: SortConfig,
  breakevenFilter: BreakevenFilter = "all",
  directionFilter: DirectionFilter = "all"
): ClosedTrade[] {
  return useMemo(() => {
    let result = closedTrades

    // 1. Account filter
    if (account !== "All Accounts") {
      result = result.filter((t) => t.exchange === account)
    }

    // 2. Symbol filter
    if (symbol !== "All Symbols") {
      result = result.filter((t) => t.symbol === symbol)
    }

    // 3. Time range filter
    result = filterByTimeRange(result, timeRange)

    // 4. Breakeven filter (W/be/L)
    if (breakevenFilter === "win") {
      result = result.filter((t) => t.isWin)
    } else if (breakevenFilter === "loss") {
      result = result.filter((t) => !t.isWin && !t.isBreakeven)
    } else if (breakevenFilter === "breakeven") {
      result = result.filter((t) => t.isBreakeven)
    }

    // 5. Direction filter (Long/Short)
    if (directionFilter === "long") {
      result = result.filter((t) => t.dir === "Long")
    } else if (directionFilter === "short") {
      result = result.filter((t) => t.dir === "Short")
    }

    // 6. Sort
    if (sort) {
      const arr = [...result]
      if (sort.sortBy === "time") {
        arr.sort((a, b) => {
          const diff = new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime()
          return sort.sortOrder === "asc" ? diff : -diff
        })
      } else {
        arr.sort((a, b) => {
          const diff = a.realisedPnl - b.realisedPnl
          return sort.sortOrder === "asc" ? diff : -diff
        })
      }
      result = arr
    } else {
      // Default sort: time descending (newest first)
      result = [...result].sort(
        (a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime()
      )
    }

    // 7. Limit (take first N after sorting)
    if (limit !== Infinity && limit > 0) {
      result = result.slice(0, limit)
    }

    return result
  }, [closedTrades, account, symbol, limit, timeRange, sort, breakevenFilter, directionFilter])
}
import { useMemo } from "react"
import type { ClosedTrade, CalendarDayData } from "@/types"

/**
 * Aggregate closed trades into calendar day data for the PnL calendar.
 * Groups trades by their exit date (YYYY-MM-DD).
 */
export function useCalendarData(closedTrades: ClosedTrade[]): CalendarDayData[] {
  return useMemo(() => {
    const map = new Map<string, ClosedTrade[]>()

    for (const t of closedTrades) {
      const dateKey = t.exitTime.slice(0, 10) // "2026-07-23"
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(t)
    }

    const days: CalendarDayData[] = []
    for (const [date, trades] of map) {
      const totalPnl = trades.reduce((s, t) => s + t.realisedPnl, 0)
      const winCount = trades.filter((t) => t.isWin).length
      const lossCount = trades.filter((t) => t.realisedPnl < 0).length
      days.push({
        date,
        trades: trades.sort(
          (a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime()
        ),
        totalPnl: Math.round(totalPnl * 100) / 100,
        tradeCount: trades.length,
        winCount,
        lossCount,
      })
    }

    // Sort by date ascending
    days.sort((a, b) => a.date.localeCompare(b.date))
    return days
  }, [closedTrades])
}
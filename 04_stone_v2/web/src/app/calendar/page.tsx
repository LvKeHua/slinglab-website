"use client"

/**
 * Calendar — Mazino-style PnL calendar with month navigation and summary.
 * Aggregates closed trades by exit date; click a day for its trades.
 */
import { useMemo, useState } from "react"
import { useApiData } from "@/hooks/use-api-data"
import { useCalendarData } from "@/hooks/useCalendarData"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CalendarDayData } from "@/types"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function fmtUsd(v: number): string {
  const sign = v > 0 ? "+" : ""
  return `${sign}$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

export default function CalendarPage() {
  const { data, isLoading, error } = useApiData()
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDay, setSelectedDay] = useState<CalendarDayData | null>(null)

  const calendarDays = useCalendarData(data?.closedTrades ?? [])

  const { cells, monthTotal, monthWins, monthLosses, monthTrades } = useMemo(() => {
    const { year, month } = cursor
    const firstDay = new Date(year, month, 1).getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`
    const dayMap = new Map<number, CalendarDayData>()
    let total = 0
    let wins = 0
    let losses = 0
    let trades = 0
    for (const day of calendarDays) {
      if (!day.date.startsWith(prefix)) continue
      dayMap.set(parseInt(day.date.split("-")[2], 10), day)
      total += day.totalPnl
      wins += day.winCount
      losses += day.lossCount
      trades += day.tradeCount
    }
    const cells: Array<{ day: number; data: CalendarDayData | null }> = []
    for (let i = 0; i < firstDay; i++) cells.push({ day: 0, data: null })
    for (let d = 1; d <= totalDays; d++) cells.push({ day: d, data: dayMap.get(d) ?? null })
    return {
      cells,
      monthTotal: Math.round(total * 100) / 100,
      monthWins: wins,
      monthLosses: losses,
      monthTrades: trades,
    }
  }, [calendarDays, cursor])

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading calendar...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>

  const monthName = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  const moveMonth = (delta: number) => {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Daily PnL from your closed trades
        </p>
      </div>

      {/* Month summary */}
      <div className="flex flex-wrap gap-6 font-mono text-sm">
        <div>
          <span className="block text-xs text-muted-foreground">Month PnL</span>
          <span className={cn("font-semibold", monthTotal >= 0 ? "text-green-500" : "text-red-500")}>
            {fmtUsd(monthTotal)}
          </span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">Trades</span>
          <span>{monthTrades}</span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">Wins</span>
          <span className="text-green-500">{monthWins}</span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">Losses</span>
          <span className="text-red-500">{monthLosses}</span>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => moveMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="min-w-[170px] text-center text-lg font-semibold">{monthName}</h2>
        <Button variant="outline" size="icon" onClick={() => moveMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((d) => (
              <div key={d} className="pb-1 text-center text-xs uppercase text-muted-foreground">
                {d}
              </div>
            ))}
            {cells.map((cell, i) =>
              cell.day === 0 ? (
                <div key={`pad-${i}`} className="invisible min-h-[78px]" />
              ) : (
                <button
                  key={cell.day}
                  onClick={() => cell.data && setSelectedDay(cell.data)}
                  className={cn(
                    "min-h-[78px] rounded-md border border-border bg-card p-1.5 text-left text-xs transition-colors",
                    cell.data ? "cursor-pointer hover:border-primary" : "opacity-35",
                    selectedDay?.date === cell.data?.date && "outline outline-2 outline-primary",
                  )}
                >
                  <div className="text-muted-foreground">{cell.day}</div>
                  {cell.data && (
                    <>
                      <div className={cn(
                        "mt-1.5 font-mono font-semibold",
                        cell.data.totalPnl > 0 ? "text-green-500" : cell.data.totalPnl < 0 ? "text-red-500" : "text-muted-foreground",
                      )}>
                        {fmtUsd(cell.data.totalPnl)}
                      </div>
                      <div className="mt-0.5 text-muted-foreground">
                        {cell.data.tradeCount} trade{cell.data.tradeCount === 1 ? "" : "s"}
                      </div>
                    </>
                  )}
                </button>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* Day detail */}
      {selectedDay && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{selectedDay.date}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-6 font-mono text-sm">
              <span className={cn(selectedDay.totalPnl >= 0 ? "text-green-500" : "text-red-500")}>
                {fmtUsd(selectedDay.totalPnl)}
              </span>
              <span className="text-muted-foreground">{selectedDay.tradeCount} trades</span>
              <span className="text-green-500">{selectedDay.winCount}W</span>
              <span className="text-red-500">{selectedDay.lossCount}L</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">Symbol</th>
                    <th className="pb-2 pr-4">Side</th>
                    <th className="pb-2 pr-4 text-right">Entry</th>
                    <th className="pb-2 pr-4 text-right">Exit</th>
                    <th className="pb-2 pr-4 text-right">R</th>
                    <th className="pb-2 text-right">PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDay.trades.map((t) => (
                    <tr key={t.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium">{t.symbol}</td>
                      <td className={cn("py-2 pr-4 font-mono text-xs", t.dir === "Long" ? "text-green-500" : "text-red-500")}>
                        {t.dir}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">{t.entry}</td>
                      <td className="py-2 pr-4 text-right font-mono">{t.exit}</td>
                      <td className="py-2 pr-4 text-right font-mono">{t.rMultiple.toFixed(2)}</td>
                      <td className={cn("py-2 text-right font-mono", t.realisedPnl >= 0 ? "text-green-500" : "text-red-500")}>
                        {fmtUsd(t.realisedPnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

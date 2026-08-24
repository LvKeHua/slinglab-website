"use client"

/**
 * Intelligence — CMM-style rule-based insights derived from closed trades.
 * Pure local computation: streaks, expectancy, time-of-day edge, symbol
 * concentration, risk-of-ruin, and behavioral flags.
 */
import { useMemo } from "react"
import { useApiData } from "@/hooks/use-api-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ClosedTrade } from "@/types"

interface Insight {
  title: string
  detail: string
  tone: "positive" | "negative" | "neutral"
}

function fmtUsd(v: number): string {
  const sign = v > 0 ? "+" : ""
  return `${sign}$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

function buildInsights(trades: ClosedTrade[]): Insight[] {
  const out: Insight[] = []
  if (trades.length === 0) return out

  const wins = trades.filter((t) => t.isWin)
  const losses = trades.filter((t) => !t.isWin && !t.isBreakeven)
  const winRate = trades.length > 0 ? wins.length / trades.length : 0
  const grossWin = wins.reduce((s, t) => s + t.realisedPnl, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.realisedPnl, 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0
  const avgWin = wins.length > 0 ? grossWin / wins.length : 0
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0
  const expectancy = trades.reduce((s, t) => s + t.realisedPnl, 0) / trades.length

  // Streaks
  let maxWinStreak = 0
  let maxLossStreak = 0
  let curWin = 0
  let curLoss = 0
  for (const t of trades) {
    if (t.isWin) { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin) }
    else if (!t.isBreakeven) { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss) }
    else { curWin = 0; curLoss = 0 }
  }

  // Time-of-day edge
  const hourPnl = new Map<number, { pnl: number; count: number }>()
  for (const t of trades) {
    const hour = new Date(t.exitTime).getHours()
    const row = hourPnl.get(hour) ?? { pnl: 0, count: 0 }
    row.pnl += t.realisedPnl
    row.count++
    hourPnl.set(hour, row)
  }
  const bestHour = [...hourPnl.entries()].sort((a, b) => b[1].pnl - a[1].pnl)[0]
  const worstHour = [...hourPnl.entries()].sort((a, b) => a[1].pnl - b[1].pnl)[0]

  // Symbol concentration
  const symbolPnl = new Map<string, { pnl: number; count: number }>()
  for (const t of trades) {
    const row = symbolPnl.get(t.symbol) ?? { pnl: 0, count: 0 }
    row.pnl += t.realisedPnl
    row.count++
    symbolPnl.set(t.symbol, row)
  }
  const bestSymbol = [...symbolPnl.entries()].sort((a, b) => b[1].pnl - a[1].pnl)[0]
  const worstSymbol = [...symbolPnl.entries()].sort((a, b) => a[1].pnl - b[1].pnl)[0]
  const topSymbolShare = bestSymbol ? bestSymbol[1].count / trades.length : 0

  // Direction edge
  const longTrades = trades.filter((t) => t.dir === "Long")
  const shortTrades = trades.filter((t) => t.dir === "Short")
  const longPnl = longTrades.reduce((s, t) => s + t.realisedPnl, 0)
  const shortPnl = shortTrades.reduce((s, t) => s + t.realisedPnl, 0)

  // Expectancy
  out.push({
    title: "Trade Expectancy",
    detail: `${fmtUsd(expectancy)} per trade across ${trades.length} trades`,
    tone: expectancy > 0 ? "positive" : expectancy < 0 ? "negative" : "neutral",
  })

  // Profit factor
  out.push({
    title: "Profit Factor",
    detail: profitFactor === Infinity ? "No losing trades" : `${profitFactor.toFixed(2)} (${fmtUsd(grossWin)} win / ${fmtUsd(grossLoss)} loss)`,
    tone: profitFactor >= 1.5 ? "positive" : profitFactor < 1 ? "negative" : "neutral",
  })

  // Win rate vs payoff
  if (winRate > 0 && avgLoss > 0) {
    const payoff = avgWin / avgLoss
    const breakevenRate = 1 / (1 + payoff)
    out.push({
      title: "Win Rate vs Payoff",
      detail: `${(winRate * 100).toFixed(0)}% win rate, ${payoff.toFixed(2)} payoff ratio — breakeven needs ${(breakevenRate * 100).toFixed(0)}%`,
      tone: winRate > breakevenRate ? "positive" : "negative",
    })
  }

  // Streaks
  out.push({
    title: "Streaks",
    detail: `Max ${maxWinStreak} wins in a row, max ${maxLossStreak} losses in a row`,
    tone: maxLossStreak >= 5 ? "negative" : "neutral",
  })

  // Time of day
  if (bestHour && bestHour[1].count >= 3) {
    out.push({
      title: "Best Trading Hour",
      detail: `${String(bestHour[0]).padStart(2, "0")}:00 UTC — ${fmtUsd(bestHour[1].pnl)} across ${bestHour[1].count} trades`,
      tone: "positive",
    })
  }
  if (worstHour && worstHour[1].count >= 3 && worstHour[1].pnl < 0) {
    out.push({
      title: "Worst Trading Hour",
      detail: `${String(worstHour[0]).padStart(2, "0")}:00 UTC — ${fmtUsd(worstHour[1].pnl)} across ${worstHour[1].count} trades`,
      tone: "negative",
    })
  }

  // Symbol edge
  if (bestSymbol && bestSymbol[1].count >= 3) {
    out.push({
      title: "Best Symbol",
      detail: `${bestSymbol[0]} — ${fmtUsd(bestSymbol[1].pnl)} across ${bestSymbol[1].count} trades`,
      tone: "positive",
    })
  }
  if (worstSymbol && worstSymbol[1].count >= 3 && worstSymbol[1].pnl < 0) {
    out.push({
      title: "Worst Symbol",
      detail: `${worstSymbol[0]} — ${fmtUsd(worstSymbol[1].pnl)} across ${worstSymbol[1].count} trades`,
      tone: "negative",
    })
  }
  if (topSymbolShare > 0.5) {
    out.push({
      title: "Concentration Risk",
      detail: `${(topSymbolShare * 100).toFixed(0)}% of trades on ${bestSymbol[0]} — diversify or size down`,
      tone: "negative",
    })
  }

  // Direction edge
  if (longTrades.length >= 3 && shortTrades.length >= 3) {
    const longAvg = longPnl / longTrades.length
    const shortAvg = shortPnl / shortTrades.length
    out.push({
      title: "Direction Edge",
      detail: `Long avg ${fmtUsd(longAvg)} (${longTrades.length}) vs Short avg ${fmtUsd(shortAvg)} (${shortTrades.length})`,
      tone: Math.abs(longAvg - shortAvg) > Math.abs(longAvg) * 0.3 ? "positive" : "neutral",
    })
  }

  return out
}

const toneStyles: Record<Insight["tone"], string> = {
  positive: "border-green-500/30 bg-green-500/5",
  negative: "border-red-500/30 bg-red-500/5",
  neutral: "border-border bg-card",
}

export default function IntelligencePage() {
  const { data, isLoading, error } = useApiData()

  const insights = useMemo(
    () => buildInsights(data?.closedTrades ?? []),
    [data?.closedTrades],
  )

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Analyzing your trading...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Rule-based insights derived from your closed trades
        </p>
      </div>

      {insights.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No trades yet — sync your accounts or add manual trades to unlock insights.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {insights.map((insight) => (
            <Card key={insight.title} className={cn(toneStyles[insight.tone])}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{insight.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{insight.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn, formatCurrency } from "@/lib/utils"
import type { ClosedTrade } from "@/types"

interface CoreMetricsProps {
  closedTrades: ClosedTrade[]
}

export function CoreMetrics({ closedTrades }: CoreMetricsProps) {
  const metrics = useMemo(() => {
    const totalPnl = closedTrades.reduce((s, t) => s + t.realisedPnl, 0)
    const totalVolume = closedTrades.reduce((s, t) => s + Math.abs(t.size * t.entry), 0)
    const longCount = closedTrades.filter((t) => t.dir === "Long").length
    const shortCount = closedTrades.filter((t) => t.dir === "Short").length
    const longPnl = closedTrades.filter((t) => t.dir === "Long").reduce((s, t) => s + t.realisedPnl, 0)
    const shortPnl = closedTrades.filter((t) => t.dir === "Short").reduce((s, t) => s + t.realisedPnl, 0)
    const wins = closedTrades.filter((t) => t.realisedPnl > 0).length
    const losses = closedTrades.filter((t) => t.realisedPnl < 0).length
    const total = closedTrades.length
    const winRate = total > 0 ? (wins / total) * 100 : 0
    const avgR = total > 0
      ? closedTrades.reduce((s, t) => s + t.rMultiple, 0) / total
      : 0
    const grossProfit = closedTrades
      .filter((t) => t.realisedPnl > 0)
      .reduce((s, t) => s + t.realisedPnl, 0)
    const grossLoss = Math.abs(
      closedTrades
        .filter((t) => t.realisedPnl < 0)
        .reduce((s, t) => s + t.realisedPnl, 0)
    )
    const profitFactor =
      grossLoss > 0
        ? grossProfit / grossLoss
        : grossProfit > 0
          ? Infinity
          : 0

    return {
      totalPnl, totalVolume, longCount, shortCount, longPnl, shortPnl,
      winRate, avgR, profitFactor, wins, losses, total,
    }
  }, [closedTrades])

  const fmt = (value: number) => {
    const abs = Math.abs(value)
    if (abs >= 1_000_000) return `${value >= 0 ? "+" : "-"}$${(abs / 1_000_000).toFixed(2)}M`
    if (abs >= 1_000) return `${value >= 0 ? "+" : "-"}$${(abs / 1_000).toFixed(1)}K`
    return `${value >= 0 ? "+" : "-"}$${formatCurrency(abs)}`
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Total Gain/Loss */}
      <Card className="group hover:border-primary/30 transition-all duration-300 bg-card/50">
        <CardContent className="p-3 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Gain/Loss
          </p>
          <p className={cn(
            "text-base font-bold tabular-nums tracking-tight leading-none",
            metrics.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {fmt(metrics.totalPnl)}
          </p>
        </CardContent>
      </Card>

      {/* Traded Volume */}
      <Card className="group hover:border-primary/30 transition-all duration-300 bg-card/50">
        <CardContent className="p-3 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Traded Volume
          </p>
          <p className="text-base font-bold tabular-nums tracking-tight leading-none text-foreground">
            ${formatCurrency(metrics.totalVolume)}
          </p>
        </CardContent>
      </Card>

      {/* Long / Short Ratio */}
      <Card className="group hover:border-primary/30 transition-all duration-300 bg-card/50">
        <CardContent className="p-3 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Long / Short
          </p>
          <div className="flex items-baseline gap-1 leading-none">
            <span className="text-base font-bold text-emerald-400 tabular-nums">{metrics.longCount}</span>
            <span className="text-muted-foreground">:</span>
            <span className="text-base font-bold text-red-400 tabular-nums">{metrics.shortCount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Win Rate */}
      <Card className="group hover:border-primary/30 transition-all duration-300 bg-card/50">
        <CardContent className="p-3 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Win Rate
          </p>
          <p className={cn(
            "text-base font-bold tabular-nums tracking-tight leading-none",
            metrics.winRate >= 50 ? "text-emerald-400" : "text-red-400"
          )}>
            {metrics.winRate.toFixed(1)}%
          </p>
          <p className="text-[10px] text-muted-foreground leading-none">
            {metrics.wins}W / {metrics.losses}L
          </p>
        </CardContent>
      </Card>

      {/* Avg R per Trade */}
      <Card className="group hover:border-primary/30 transition-all duration-300 bg-card/50">
        <CardContent className="p-3 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Avg R / Trade
          </p>
          <p className={cn(
            "text-base font-bold tabular-nums tracking-tight leading-none",
            metrics.avgR >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {metrics.avgR >= 0 ? "+" : ""}{metrics.avgR.toFixed(2)}R
          </p>
        </CardContent>
      </Card>

      {/* Profit Factor */}
      <Card className="group hover:border-primary/30 transition-all duration-300 bg-card/50">
        <CardContent className="p-3 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Profit Factor
          </p>
          <p className={cn(
            "text-base font-bold tabular-nums tracking-tight leading-none",
            metrics.profitFactor >= 1.5 ? "text-emerald-400" :
            metrics.profitFactor >= 1 ? "text-foreground" : "text-red-400"
          )}>
            {metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
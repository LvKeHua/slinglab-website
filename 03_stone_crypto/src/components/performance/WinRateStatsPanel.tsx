"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn, formatCurrency } from "@/lib/utils"
import type { ClosedTrade, BreakevenFilter, DirectionFilter } from "@/types"

interface WinRateStatsPanelProps {
  closedTrades: ClosedTrade[]
  breakevenFilter: BreakevenFilter
  directionFilter: DirectionFilter
  onBreakevenFilterChange: (filter: BreakevenFilter) => void
  onDirectionFilterChange: (filter: DirectionFilter) => void
}

export function WinRateStatsPanel({
  closedTrades,
  breakevenFilter,
  directionFilter,
  onBreakevenFilterChange,
  onDirectionFilterChange,
}: WinRateStatsPanelProps) {
  const stats = useMemo(() => {
    const total = closedTrades.length
    if (total === 0) {
      return {
        totalTrades: 0,
        avgHold: "0s",
        expectancy: 0,
        winRate: 0,
        wins: 0,
        losses: 0,
        breakevens: 0,
        longCount: 0,
        shortCount: 0,
        longPnl: 0,
        shortPnl: 0,
        totalPnl: 0,
        totalVolume: 0,
      }
    }

    const wins = closedTrades.filter((t) => t.isWin).length
    const losses = closedTrades.filter((t) => !t.isWin && !t.isBreakeven).length
    const breakevens = closedTrades.filter((t) => t.isBreakeven).length
    const longCount = closedTrades.filter((t) => t.dir === "Long").length
    const shortCount = closedTrades.filter((t) => t.dir === "Short").length
    const longPnl = closedTrades.filter((t) => t.dir === "Long").reduce((s, t) => s + t.realisedPnl, 0)
    const shortPnl = closedTrades.filter((t) => t.dir === "Short").reduce((s, t) => s + t.realisedPnl, 0)
    const totalPnl = closedTrades.reduce((s, t) => s + t.realisedPnl, 0)
    const totalVolume = closedTrades.reduce((s, t) => s + Math.abs(t.size * t.entry), 0)
    const winRate = (wins / total) * 100

    // Avg hold time
    const totalHoldSeconds = closedTrades.reduce((s, t) => {
      const entry = new Date(t.entryTime).getTime()
      const exit = new Date(t.exitTime).getTime()
      return s + (exit - entry) / 1000
    }, 0)
    const avgHoldSeconds = totalHoldSeconds / total
    const h = Math.floor(avgHoldSeconds / 3600)
    const m = Math.floor((avgHoldSeconds % 3600) / 60)
    const s = Math.floor(avgHoldSeconds % 60)
    const avgHold = h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`

    // Expectancy = avg win * win% - avg loss * loss%
    const avgWin = wins > 0 ? closedTrades.filter((t) => t.isWin).reduce((s, t) => s + t.realisedPnl, 0) / wins : 0
    const avgLoss = losses > 0 ? Math.abs(closedTrades.filter((t) => !t.isWin && !t.isBreakeven).reduce((s, t) => s + t.realisedPnl, 0)) / losses : 0
    const winPct = wins / total
    const lossPct = losses / total
    const expectancy = Math.round((avgWin * winPct - avgLoss * lossPct) * 100) / 100

    return {
      totalTrades: total,
      avgHold,
      expectancy,
      winRate,
      wins,
      losses,
      breakevens,
      longCount,
      shortCount,
      longPnl,
      shortPnl,
      totalPnl,
      totalVolume,
    }
  }, [closedTrades])

  if (stats.totalTrades === 0) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 flex items-center justify-center text-muted-foreground text-sm">
          No trades to display
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* ── Stat Cards Row 1 ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card/50 hover:border-primary/30 transition-all">
          <CardContent className="p-3 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Trades
            </p>
            <p className="text-lg font-bold tabular-nums leading-none">{stats.totalTrades}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 hover:border-primary/30 transition-all">
          <CardContent className="p-3 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Avg Hold
            </p>
            <p className="text-lg font-bold tabular-nums leading-none">{stats.avgHold}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card/50 hover:border-primary/30 transition-all">
          <CardContent className="p-3 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Expectancy
            </p>
            <p className={cn(
              "text-lg font-bold tabular-nums leading-none",
              stats.expectancy >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {stats.expectancy >= 0 ? "+" : ""}{stats.expectancy.toFixed(1)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 hover:border-primary/30 transition-all">
          <CardContent className="p-3 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Win Rate
            </p>
            <p className={cn(
              "text-lg font-bold tabular-nums leading-none",
              stats.winRate >= 50 ? "text-emerald-400" : "text-red-400"
            )}>
              {stats.winRate.toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Breakeven Filter (W/be/L) ── */}
      <Card className="bg-card/50 hover:border-primary/30 transition-all">
        <CardContent className="p-3 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Breakeven Filter
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onBreakevenFilterChange(breakevenFilter === "win" ? "all" : "win")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-bold tabular-nums transition-all",
                breakevenFilter === "win"
                  ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                  : "bg-muted/30 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400"
              )}
            >
              {stats.wins}W
            </button>
            <button
              onClick={() => onBreakevenFilterChange(breakevenFilter === "breakeven" ? "all" : "breakeven")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-bold tabular-nums transition-all",
                breakevenFilter === "breakeven"
                  ? "bg-gray-500/20 text-gray-400 ring-1 ring-gray-500/40"
                  : "bg-muted/30 text-muted-foreground hover:bg-gray-500/10 hover:text-gray-400"
              )}
            >
              {stats.breakevens}be
            </button>
            <button
              onClick={() => onBreakevenFilterChange(breakevenFilter === "loss" ? "all" : "loss")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-bold tabular-nums transition-all",
                breakevenFilter === "loss"
                  ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/40"
                  : "bg-muted/30 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
              )}
            >
              {stats.losses}L
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Long / Short Ratio ── */}
      <Card className="bg-card/50 hover:border-primary/30 transition-all">
        <CardContent className="p-3 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Long / Short
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDirectionFilterChange(directionFilter === "long" ? "all" : "long")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-bold tabular-nums transition-all",
                directionFilter === "long"
                  ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                  : "bg-muted/30 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400"
              )}
            >
              {stats.longCount > 0 && stats.totalTrades > 0
                ? `${Math.round((stats.longCount / stats.totalTrades) * 100)}%`
                : "0%"}
              <span className="ml-0.5 opacity-70">({stats.longCount})</span>
            </button>
            <span className="text-[10px] text-muted-foreground">/</span>
            <button
              onClick={() => onDirectionFilterChange(directionFilter === "short" ? "all" : "short")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-bold tabular-nums transition-all",
                directionFilter === "short"
                  ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/40"
                  : "bg-muted/30 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
              )}
            >
              {stats.shortCount > 0 && stats.totalTrades > 0
                ? `${Math.round((stats.shortCount / stats.totalTrades) * 100)}%`
                : "0%"}
              <span className="ml-0.5 opacity-70">({stats.shortCount})</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Total Gain/Loss & Traded Volume ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card/50 hover:border-primary/30 transition-all">
          <CardContent className="p-3 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Gain/Loss
            </p>
            <p className={cn(
              "text-sm font-bold tabular-nums leading-none",
              stats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {stats.totalPnl >= 0 ? "+" : ""}${formatCurrency(Math.abs(stats.totalPnl))}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 hover:border-primary/30 transition-all">
          <CardContent className="p-3 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Traded Volume
            </p>
            <p className="text-sm font-bold tabular-nums leading-none text-foreground">
              ${formatCurrency(stats.totalVolume)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
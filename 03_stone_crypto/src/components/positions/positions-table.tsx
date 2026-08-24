"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn, formatPnL } from "@/lib/utils"
import type { Position } from "@/types"

interface PositionsTableProps {
  positions: Position[]
}

export function PositionsTable({ positions }: PositionsTableProps) {
  const totalUnrealized = positions.reduce((sum, p) => sum + p.pnl, 0)
  const totalSize = positions.reduce((sum, p) => sum + p.size * p.entry, 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open Positions</p>
            <p className="text-2xl font-bold mt-1">{positions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold mt-1">${totalSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unrealized PnL</p>
            <p className={cn("text-2xl font-bold mt-1", totalUnrealized >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {formatPnL(totalUnrealized)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Positions Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Pair</th>
                <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Side</th>
                <th className="text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Size</th>
                <th className="text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Entry</th>
                <th className="text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Mark</th>
                <th className="text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">PnL</th>
                <th className="text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">ROI</th>
                <th className="text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Leverage</th>
                <th className="text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Liq. Price</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const pnlPct = ((pos.mark - pos.entry) / pos.entry) * 100 * (pos.side === 'Long' ? 1 : -1) * pos.leverage
                const progressValue = Math.min(Math.max(((pos.mark - pos.entry) / pos.entry) * 100 + 50, 0), 100)
                return (
                  <tr key={pos.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-3 text-xs font-semibold">{pos.pair}</td>
                    <td className="px-3 py-3">
                      <span className={cn("text-xs font-medium", pos.side === 'Long' ? 'text-emerald-400' : 'text-red-400')}>
                        {pos.side === 'Long' ? '▲' : '▼'} {pos.side}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs tabular-nums text-right">{pos.size}</td>
                    <td className="px-3 py-3 text-xs tabular-nums text-right">${pos.entry.toLocaleString()}</td>
                    <td className="px-3 py-3 text-xs tabular-nums text-right">${pos.mark.toLocaleString()}</td>
                    <td className={cn("px-3 py-3 text-xs font-semibold tabular-nums text-right", pos.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {formatPnL(pos.pnl)}
                    </td>
                    <td className={cn("px-3 py-3 text-xs tabular-nums text-right", pos.roi >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {pos.roi >= 0 ? '+' : ''}{pos.roi.toFixed(2)}%
                    </td>
                    <td className="px-3 py-3 text-xs tabular-nums text-right">{pos.leverage}x</td>
                    <td className="px-3 py-3 text-xs tabular-nums text-right text-muted-foreground">
                      ${pos.liquidation > 0 ? pos.liquidation.toLocaleString() : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* PnL Progress Bars */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {positions.map((pos) => {
          const pnlPct = ((pos.mark - pos.entry) / pos.entry) * 100 * (pos.side === 'Long' ? 1 : -1) * pos.leverage
          const absPnlPct = Math.abs(pnlPct)
          return (
            <Card key={pos.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{pos.pair}</span>
                    <span className={cn("text-xs font-medium", pos.side === 'Long' ? 'text-emerald-400' : 'text-red-400')}>
                      {pos.side === 'Long' ? '▲' : '▼'}
                    </span>
                  </div>
                  <span className={cn("text-sm font-bold", pos.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {formatPnL(pos.pnl)}
                  </span>
                </div>
                <Progress
                  value={pnlPct >= 0 ? 50 + Math.min(absPnlPct * 5, 50) : 50 - Math.min(absPnlPct * 5, 50)}
                  className="h-2"
                  indicatorClassName={pnlPct >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
                />
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>{pos.side === 'Long' ? '▼' : '▲'} -{pos.roi >= 0 ? '∞' : (pnlPct < 0 ? absPnlPct.toFixed(1) : '0.0')}%</span>
                  <span className="font-semibold">{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%</span>
                  <span>{pos.side === 'Long' ? '▲' : '▼'} +{pnlPct >= 0 ? absPnlPct.toFixed(1) : '0.0'}%</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

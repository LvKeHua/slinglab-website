"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, formatPnL } from "@/lib/utils"
import type { SideStats } from "@/types"

interface SideBreakdownProps {
  sides: SideStats[]
}

export function SideBreakdown({ sides }: SideBreakdownProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Side Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {sides.map((side) => (
            <div
              key={side.side}
              className="rounded-lg border bg-card/50 p-3 text-center space-y-1"
            >
              <p
                className={cn(
                  "text-lg font-bold",
                  side.side === 'Long' ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                {side.side === 'Long' ? '▲' : '▼'}
              </p>
              <p className="text-xs text-muted-foreground">{side.trades} trades</p>
              <div className="flex justify-center gap-3 text-xs">
                <span className="text-emerald-400">{side.winRate.toFixed(1)}% WR</span>
              </div>
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  side.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                {formatPnL(side.pnl)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

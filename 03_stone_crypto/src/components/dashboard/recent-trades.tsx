"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn, formatPnL } from "@/lib/utils"
import type { Trade } from "@/types"

interface RecentTradesProps {
  trades: Trade[]
}

export function RecentTrades({ trades }: RecentTradesProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Recent Trades
          <span className="ml-2 text-xs text-muted-foreground font-normal">({trades.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[320px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Time</th>
                <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Pair</th>
                <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Side</th>
                <th className="text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">PnL</th>
                <th className="text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">ROI</th>
                <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Strategy</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">{trade.time}</td>
                  <td className="px-3 py-2 text-xs font-medium">{trade.pair}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        trade.side === 'Long' ? 'text-emerald-400' : 'text-red-400'
                      )}
                    >
                      {trade.side === 'Long' ? '▲' : '▼'} {trade.side}
                    </span>
                  </td>
                  <td className={cn("px-3 py-2 text-xs font-semibold tabular-nums text-right", trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {formatPnL(trade.pnl)}
                  </td>
                  <td className={cn("px-3 py-2 text-xs tabular-nums text-right", trade.roi >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {trade.roi >= 0 ? '+' : ''}{trade.roi.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{trade.strategy}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, formatCurrency, formatPnL } from "@/lib/utils"
import type { WinLoseComparison, WinLoseRow } from "@/utils/analytics"

function TradeTable({ title, rows, isWin }: { title: string; rows: { long: WinLoseRow; short: WinLoseRow; both: WinLoseRow }; isWin: boolean }) {
  const allRows = [rows.both, rows.long, rows.short]
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className={cn("text-sm font-medium", isWin ? "text-emerald-400" : "text-red-400")}>{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-muted-foreground">Type</th>
                <th className="px-3 py-2 text-right text-muted-foreground">No. of trades</th>
                <th className="px-3 py-2 text-right text-muted-foreground">Avg Duration</th>
                <th className="px-3 py-2 text-right text-muted-foreground">Avg Size</th>
                <th className="px-3 py-2 text-right text-muted-foreground">{isWin ? "Avg Gain" : "Avg Loss"}</th>
              </tr>
            </thead>
            <tbody>
              {allRows.map((row) => (
                <tr key={row.direction} className="border-b border-border/50">
                  <td className={cn("px-3 py-2 font-medium", row.direction === "Long" ? "text-emerald-400" : row.direction === "Short" ? "text-red-400" : "text-foreground")}>{row.direction}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.avgDuration}</td>

                  <td className="px-3 py-2 text-right tabular-nums">${formatCurrency(row.avgSize)}</td>
                  <td className={cn("px-3 py-2 text-right tabular-nums font-medium", row.avgPnL >= 0 ? "text-emerald-400" : "text-red-400")}>{formatPnL(row.avgPnL)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export function WinningLosingTrades({ data }: { data: WinLoseComparison }) {
  return (
    <div className="space-y-4">
      <TradeTable title="Winning Trades" rows={data.winning} isWin={true} />
      <TradeTable title="Losing Trades" rows={data.losing} isWin={false} />
    </div>
  )
}

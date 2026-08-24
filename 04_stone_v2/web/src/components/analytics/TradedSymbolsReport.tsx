"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, formatPnL } from "@/lib/utils"
import type { SymbolReportRow } from "@/utils/analytics"

interface TradedSymbolsReportProps {
  data: SymbolReportRow[]
}

export function TradedSymbolsReport({ data }: TradedSymbolsReportProps) {
  if (data.length === 0) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No symbol data available</CardContent></Card>
  }

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Traded Symbols Report</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-muted-foreground">Symbol</th>
                <th className="px-3 py-2 text-right text-muted-foreground">Trade Count</th>
                <th className="px-3 py-2 text-right text-muted-foreground">Win Rate</th>
                <th className="px-3 py-2 text-right text-muted-foreground">Long Vs Short</th>
                <th className="px-3 py-2 text-right text-muted-foreground">Avg Trade Duration</th>
                <th className="px-3 py-2 text-right text-muted-foreground">Avg Gain</th>
                <th className="px-3 py-2 text-right text-muted-foreground">Total Gain</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.symbol} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="px-3 py-2 font-medium">{row.symbol}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.trades}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.winRate}%</td>
                  <td className="px-3 py-2 text-right tabular-nums"><span className="text-emerald-400">{row.longVsShort.split('/')[0]}</span>/<span className="text-red-400">{row.longVsShort.split('/')[1]}</span></td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.avgDuration}</td>
                  <td className={cn("px-3 py-2 text-right tabular-nums font-medium", row.avgPnl >= 0 ? "text-emerald-400" : "text-red-400")}>{formatPnL(row.avgPnl)}</td>
                  <td className={cn("px-3 py-2 text-right tabular-nums font-medium", row.totalPnl >= 0 ? "text-emerald-400" : "text-red-400")}>{formatPnL(row.totalPnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

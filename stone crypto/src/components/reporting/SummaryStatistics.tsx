"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReportingSummary } from "@/utils/reporting"

interface SummaryStatisticsProps {
  summary: ReportingSummary
}

function formatPnL(v: number): string {
  const abs = Math.abs(v)
  const prefix = v >= 0 ? "+" : "-"
  if (abs >= 1_000_000) return prefix + "$" + (abs / 1_000_000).toFixed(2) + "M"
  if (abs >= 1_000) return prefix + "$" + (abs / 1_000).toFixed(1) + "K"
  return prefix + "$" + abs.toFixed(2)
}

export function SummaryStatistics({ summary }: SummaryStatisticsProps) {
  const items: { key: string; label: string; value: string; color: "green" | "red" | "neutral" }[] = [
    { key: "totalTrades", label: "Total Trades", value: String(summary.totalTrades), color: "neutral" },
    { key: "winRate", label: "Win Rate", value: summary.winRate.toFixed(2) + "%", color: "neutral" },
    { key: "totalPnL", label: "Total P&L", value: formatPnL(summary.totalPnL), color: summary.totalPnL >= 0 ? "green" : "red" },
    { key: "profitFactor", label: "Profit Factor", value: summary.profitFactor === Infinity ? "∞" : summary.profitFactor.toFixed(2), color: "neutral" },
    { key: "avgR", label: "Avg R", value: summary.avgR.toFixed(2), color: "neutral" },
    { key: "bestTrade", label: "Best Trade", value: formatPnL(summary.bestTrade), color: "green" },
    { key: "worstTrade", label: "Worst Trade", value: "-$" + Math.abs(summary.worstTrade).toFixed(2), color: "red" },
    { key: "avgHoldTime", label: "Avg Hold Time", value: summary.avgHoldTime, color: "neutral" },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.key} className="py-3 px-4">
          <div className="text-xs text-muted-foreground">{item.label}</div>
          <div
            className={cn(
              "text-sm font-semibold tabular-nums mt-1",
              item.color === "green" && "text-emerald-400",
              item.color === "red" && "text-red-400",
              item.color === "neutral" && "text-foreground",
            )}
          >
            {item.value}
          </div>
        </Card>
      ))}
    </div>
  )
}
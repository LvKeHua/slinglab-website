"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Statistics } from "@/utils/analytics"

interface StatisticsGridProps { statistics: Statistics }

const statItems: { key: keyof Statistics; label: string; format: "pnl" | "number" | "pct" | "volume" | "loss"; suffix?: string }[] = [
  { key: "totalGainLoss", label: "Total Gain/Loss", format: "pnl" },
  { key: "tradeExpectancy", label: "Trade Expectancy", format: "pnl" },
  { key: "avgDailyGain", label: "Avg Daily Gain", format: "pnl" },
  { key: "avgDailyVolume", label: "Avg Daily Volume", format: "pnl" },
  { key: "largestGain", label: "Largest Gain", format: "pnl" },
  { key: "totalTradesVolume", label: "Total Trades Volume", format: "volume" },
  { key: "avgTradesPerDay", label: "Avg # of Trades/day", format: "number" },
  { key: "avgTradeWin", label: "Avg Trade Win", format: "pnl" },
  { key: "maxConsecutiveWin", label: "Max Consecutive Win", format: "number" },
  { key: "avgTradeLoss", label: "Avg Trade Loss", format: "loss" },
  { key: "largestLoss", label: "Largest Losses", format: "loss" },
  { key: "tradingDays", label: "Trading Days", format: "number" },
]

function formatStat(value: number, format: string, suffix?: string): string {
  if (format === "pnl") {
    const abs = Math.abs(value)
    const prefix = value >= 0 ? "+" : "-"
    if (abs >= 1_000_000) return prefix + "$" + (abs / 1_000_000).toFixed(2) + "M"
    if (abs >= 1_000) return prefix + "$" + (abs / 1_000).toFixed(1) + "K"
    return prefix + "$" + abs.toFixed(2)
  }
  if (format === "volume") {
    const abs = Math.abs(value)
    if (abs >= 1_000_000) return "$" + (abs / 1_000_000).toFixed(2) + "M"
    if (abs >= 1_000) return "$" + (abs / 1_000).toFixed(1) + "K"
    return "$" + abs.toFixed(2)
  }
  if (format === "loss") {
    return "-$" + Math.abs(value).toFixed(2)
  }
  return value.toFixed(2) + (suffix ? " " + suffix : "")
}

export function StatisticsGrid({ statistics }: StatisticsGridProps) {
  const left = statItems.slice(0, 6)
  const right = statItems.slice(6, 12)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        {left.map((item) => {
          const value = statistics[item.key] as number
          const isPnl = item.format === "pnl" || item.format === "loss"
          return (
            <Card key={item.key} className="py-2 px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className={cn(
                  "text-sm font-semibold tabular-nums",
                  isPnl && value > 0 && "text-emerald-400",
                  isPnl && value < 0 && "text-red-400",
                  !isPnl && "text-foreground",
                )}>
                  {formatStat(value, item.format, item.key === "avgTradesPerDay" || item.key === "tradingDays" ? `(${statistics.tradingDays} days)` : undefined)}
                </span>
              </div>
            </Card>
          )
        })}
      </div>
      <div className="space-y-2">
        {right.map((item) => {
          const value = statistics[item.key] as number
          const isPnl = item.format === "pnl" || item.format === "loss"
          return (
            <Card key={item.key} className="py-2 px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className={cn(
                  "text-sm font-semibold tabular-nums",
                  isPnl && value > 0 && "text-emerald-400",
                  isPnl && value < 0 && "text-red-400",
                  !isPnl && "text-foreground",
                )}>
                  {formatStat(value, item.format)}
                </span>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}




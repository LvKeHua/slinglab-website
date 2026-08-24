"use client"

import Link from "next/link"
import { useDashboardStore } from "@/stores"
import { useAnalytics } from "@/hooks/useAnalytics"
import { getDashboardTimeRangeLabel } from "@/lib/time-filters"
import { cn, formatCurrency, formatPnL } from "@/lib/utils"
import { ArrowRight } from "lucide-react"
import type { CMMMetrics } from "@/hooks/useAnalytics"

interface MetricCardProps {
  label: string
  value: string
  subtext?: string
  positive?: boolean
}

function MetricCard({ label, value, subtext, positive }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-bold tabular-nums",
          positive === true && "text-emerald-400",
          positive === false && "text-red-400",
          positive === undefined && "text-foreground"
        )}
      >
        {value}
      </p>
      {subtext && (
        <p className="text-[10px] text-muted-foreground tabular-nums">{subtext}</p>
      )}
    </div>
  )
}

export function AnalyticsPanel() {
  const { filteredClosedTrades, netWorth, dashboardTimeRange } = useDashboardStore()
  // Analytics must match the selected time range. The previous fallback to
  // closedTrades (all trades) showed all-time numbers under a "This Year"
  // label whenever the filtered set was empty.
  const tradesToAnalyze = filteredClosedTrades
  const { metrics } = useAnalytics(tradesToAnalyze)

  const timeLabel = getDashboardTimeRangeLabel(dashboardTimeRange)

  // CMM 12-item metric grid (2 columns × 6 rows)
  // Left column: Total Gain/Loss, Largest Gain, Avg Trade Loss, Trade Expectancy, Total Trades Volume, Max Consecutive Loss
  // Right column: Avg Daily Gain, Avg # of Trades/day, Avg Trade Win, Max Consecutive Win, Avg Daily Volume, Largest Loss
  const metricGrid: { label: string; value: string; subtext?: string; positive?: boolean }[] = [
    {
      label: "Total Gain/Loss",
      value: formatPnL(metrics.totalGainLoss),
      positive: metrics.totalGainLoss >= 0,
    },
    {
      label: "Avg Daily Gain",
      value: formatPnL(metrics.avgDailyGain),
      positive: metrics.avgDailyGain >= 0,
    },
    {
      label: "Largest Gain",
      value: formatPnL(metrics.largestGain),
      positive: true,
    },
    {
      label: "Avg # of Trades/day",
      value: metrics.avgTradesPerDay.toFixed(1),
    },
    {
      label: "Avg Trade Loss",
      value: formatPnL(-metrics.avgTradeLoss),
      positive: false,
    },
    {
      label: "Max Consecutive Win",
      value: String(metrics.maxConsecutiveWin),
      positive: true,
    },
    {
      label: "Trade Expectancy",
      value: formatPnL(metrics.tradeExpectancy),
      positive: metrics.tradeExpectancy >= 0,
    },
    {
      label: "Avg Daily Volume",
      value: "$" + formatCurrency(metrics.avgDailyVolume),
    },
    {
      label: "Total Trades Volume",
      value: "$" + formatCurrency(metrics.totalTradesVolume),
    },
    {
      label: "Avg Trade Win",
      value: formatPnL(metrics.avgTradeWin),
      positive: true,
    },
    {
      label: "Max Consecutive Loss",
      value: String(metrics.maxConsecutiveLoss),
      positive: false,
    },
    {
      label: "Largest Loss",
      value: formatPnL(metrics.largestLoss),
      positive: false,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Net Worth */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Net Worth
        </p>
        <p className="text-2xl font-bold tabular-nums text-cmm-gold mt-1">
          ${formatCurrency(netWorth)}
        </p>
      </div>

      {/* Analytics title row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Analytics</h3>
          <span className="text-xs text-muted-foreground">{timeLabel}</span>
        </div>
        <Link
          href="/analytics"
          className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors group"
        >
          Go To Analytics
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* 2×6 Metric Grid */}
      <div className="grid grid-cols-2 gap-2">
        {metricGrid.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>
    </div>
  )
}
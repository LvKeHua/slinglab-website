"use client"

import Link from "next/link"
import { useDashboardStore } from "@/stores"
import { useAnalytics } from "@/hooks/useAnalytics"
import { RefreshCw, ArrowRight } from "lucide-react"
import { cn, formatPnL } from "@/lib/utils"
import { DASHBOARD_TIME_RANGE_OPTIONS } from "@/types"
import type { TraderBias, DashboardTimeRange } from "@/types"

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good Morning"
  if (h < 17) return "Good Afternoon"
  return "Good Evening"
}

function BiasTag({ bias }: { bias: TraderBias }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider",
        bias === "BULLISH" && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        bias === "BEARISH" && "bg-red-500/15 text-red-400 border border-red-500/30",
        bias === "NEUTRAL" && "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          bias === "BULLISH" && "bg-emerald-400",
          bias === "BEARISH" && "bg-red-400",
          bias === "NEUTRAL" && "bg-yellow-400"
        )}
      />
      {bias}
    </span>
  )
}

export function DashboardHeader() {
  const {
    closedTrades,
    filteredClosedTrades,
    netWorth,
    isSyncing,
    userName,
    syncFromExchange,
    lastUpdated,
    dashboardTimeRange,
    setDashboardTimeRange,
  } = useDashboardStore()

  // Use filteredClosedTrades for header stats, fallback to closedTrades if filter hasn't been applied yet
  const tradesForStats = filteredClosedTrades.length > 0 ? filteredClosedTrades : closedTrades
  const { bias, todayPnL, todayTrades, weekPnL } = useAnalytics(tradesForStats)

  return (
    <div className="space-y-3">
      {/* Row 1: Greeting + Bias + Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {userName}
          </h1>
          <BiasTag bias={bias} />
        </div>
        <button
          onClick={syncFromExchange}
          disabled={isSyncing}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:bg-muted",
            isSyncing && "opacity-50 cursor-wait"
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
          {isSyncing ? "Syncing..." : "Refresh"}
        </button>
      </div>

      {/* Row 2: Time filter + Stats + Performance link */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Time range filter buttons */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {DASHBOARD_TIME_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDashboardTimeRange(opt.value as DashboardTimeRange)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                dashboardTimeRange === opt.value
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Today</span>
            <span className={cn("font-semibold tabular-nums", todayPnL >= 0 ? "text-emerald-400" : "text-red-400")}>
              {formatPnL(todayPnL)}
            </span>
            <span className="text-muted-foreground text-xs">({todayTrades} trades)</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Net Worth</span>
            <span className="font-semibold tabular-nums text-cmm-gold">
              ${netWorth.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Performance link */}
        <Link
          href="/performance"
          className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors group"
        >
          Performance
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>

        {lastUpdated && (
          <>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-muted-foreground">
              Updated {new Date(lastUpdated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
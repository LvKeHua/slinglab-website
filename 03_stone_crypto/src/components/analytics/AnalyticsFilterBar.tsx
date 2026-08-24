"use client"

import { useDashboardStore, useAnalyticsStore } from "@/stores"
import { DataFilterBar } from "@/components/shared/DataFilterBar"
import { cn } from "@/lib/utils"
import type { AnalyticsTimeRange } from "@/utils/analytics"
import { ANALYTICS_TIME_RANGE_OPTIONS } from "@/utils/analytics"
import { useConfiguredExchanges } from "@/hooks/useConfiguredExchanges"

export function AnalyticsFilterBar() {
  const { closedTrades } = useDashboardStore()
  const { analyticsFilter, setAnalyticsFilter } = useAnalyticsStore()
  const { configuredExchanges } = useConfiguredExchanges()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DataFilterBar
        closedTrades={closedTrades}
        selectedAccount={analyticsFilter.account}
        selectedSymbol={analyticsFilter.symbol}
        selectedLimit={isFinite(analyticsFilter.lastN) ? analyticsFilter.lastN : 50}
        onAccountChange={(v) => setAnalyticsFilter({ account: v, symbol: "All Symbols" })}
        onSymbolChange={(v) => setAnalyticsFilter({ symbol: v })}
        onLimitChange={(v) => setAnalyticsFilter({ lastN: v === "all" ? Infinity : parseInt(v, 10) })}
        showTradesLimit={true}
        configuredExchanges={configuredExchanges}
      />

      {/* Time Range - Analytics-specific */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
        {ANALYTICS_TIME_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setAnalyticsFilter({ timeRange: opt.value as AnalyticsTimeRange })}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              analyticsFilter.timeRange === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
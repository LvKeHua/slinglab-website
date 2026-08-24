"use client"

import { useDashboardStore, useReportingStore } from "@/stores"
import { DataFilterBar } from "@/components/shared/DataFilterBar"
import { cn } from "@/lib/utils"
import type { ReportingTimeRange, ReportingGroupBy } from "@/types"
import { useConfiguredExchanges } from "@/hooks/useConfiguredExchanges"

const TIME_RANGE_OPTIONS: { label: string; value: ReportingTimeRange }[] = [
  { label: "This Week", value: "this-week" },
  { label: "This Month", value: "this-month" },
  { label: "This Quarter", value: "this-quarter" },
  { label: "This Year", value: "this-year" },
]

const GROUP_BY_OPTIONS: { label: string; value: ReportingGroupBy }[] = [
  { label: "Close Date", value: "close" },
  { label: "Open Date", value: "open" },
]

export function ReportingFilterBar() {
  const { closedTrades } = useDashboardStore()
  const { reportingFilter, setReportingFilter } = useReportingStore()
  const { configuredExchanges } = useConfiguredExchanges()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DataFilterBar
        closedTrades={closedTrades}
        selectedAccount={reportingFilter.account}
        selectedSymbol={reportingFilter.symbol === "No Symbols" ? "All Symbols" : reportingFilter.symbol}
        selectedLimit={50}
        onAccountChange={(v) => setReportingFilter({ account: v, symbol: "All Symbols" })}
        onSymbolChange={(v) => setReportingFilter({ symbol: v })}
        onLimitChange={() => {}} // Reporting doesn't need limit control
        showTradesLimit={false}
        configuredExchanges={configuredExchanges}
      />

      {/* Time Range - Reporting specific */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
        {TIME_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setReportingFilter({ timeRange: opt.value })}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              reportingFilter.timeRange === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Group By - Reporting specific */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Group By</span>
        <select
          value={reportingFilter.groupBy}
          onChange={(e) => setReportingFilter({ groupBy: e.target.value as ReportingGroupBy })}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
        >
          {GROUP_BY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
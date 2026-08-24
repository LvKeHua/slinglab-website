"use client"

import { useReportingStore } from "@/stores"
import { REPORTING_TIME_RANGE_OPTIONS } from "@/utils/reporting"
import { cn } from "@/lib/utils"
import type { ReportingTimeRange } from "@/types"

export function TimeRangeSelector() {
  const { reportingFilter, setReportingFilter } = useReportingStore()

  const getRangeLabel = () => {
    if (reportingFilter.timeRange !== "custom") {
      const opt = REPORTING_TIME_RANGE_OPTIONS.find((o) => o.value === reportingFilter.timeRange)
      return opt?.label || ""
    }
    if (reportingFilter.customStartDate && reportingFilter.customEndDate) {
      return reportingFilter.customStartDate + " — " + reportingFilter.customEndDate
    }
    return "Select date range"
  }

  return (
    <div className="space-y-3">
      {/* Preset buttons */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
        {REPORTING_TIME_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setReportingFilter({ timeRange: opt.value as ReportingTimeRange })}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              reportingFilter.timeRange === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Date pickers (only visible when Custom selected) */}
      {reportingFilter.timeRange === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={reportingFilter.customStartDate || ""}
            onChange={(e) => setReportingFilter({ customStartDate: e.target.value || null })}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <input
            type="date"
            value={reportingFilter.customEndDate || ""}
            onChange={(e) => setReportingFilter({ customEndDate: e.target.value || null })}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground"
          />
        </div>
      )}

      {/* Current range display */}
      <p className="text-xs text-muted-foreground">{getRangeLabel()}</p>
    </div>
  )
}
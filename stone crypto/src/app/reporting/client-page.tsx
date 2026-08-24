"use client"

import { useEffect } from "react"
import { useDashboardStore } from "@/stores"
import { useReportingData } from "@/hooks/useReportingData"
import { ReportingFilterBar } from "@/components/reporting/ReportingFilterBar"
import { TimeRangeSelector } from "@/components/reporting/TimeRangeSelector"
import { SummaryStatistics } from "@/components/reporting/SummaryStatistics"
import { TimeBasedAnalysis } from "@/components/reporting/TimeBasedAnalysis"
import { SymbolBasedAnalysis } from "@/components/reporting/SymbolBasedAnalysis"
import { DurationBasedAnalysis } from "@/components/reporting/DurationBasedAnalysis"
import { SizeBasedAnalysis } from "@/components/reporting/SizeBasedAnalysis"
import { ExportActions } from "@/components/reporting/ExportActions"
import { LoadingSpinner } from "@/components/dashboard/LoadingSpinner"
import { AlertCircle } from "lucide-react"

export default function ReportingClient() {
  const { loadFromBackend, isLoading, error } = useDashboardStore()
  const {
    filteredTrades,
    summary,
    dailyResults,
    hourlyResults,
    durationReport,
    sizeReport,
    symbolReport,
    csvData,
    jsonData,
  } = useReportingData()

  useEffect(() => {
    loadFromBackend()
  }, [loadFromBackend])

  if (isLoading) {
    return <LoadingSpinner message="Loading reporting" submessage="Fetching your trading data..." />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm font-medium text-red-400">Failed to load reporting data</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <button
          onClick={() => loadFromBackend()}
          className="mt-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-muted transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (filteredTrades.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reporting</h1>
            <p className="text-sm text-muted-foreground mt-1">Flexible time-range trading analysis</p>
          </div>
          <ReportingFilterBar />
        </div>
        <TimeRangeSelector />
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <p className="text-sm text-muted-foreground">No trades match the current filters</p>
          <p className="text-xs text-muted-foreground">Try adjusting your time range or account filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reporting</h1>
          <p className="text-sm text-muted-foreground mt-1">Flexible time-range trading analysis</p>
        </div>
        <ReportingFilterBar />
      </div>

      {/* Time Range Selector */}
      <TimeRangeSelector />

      {/* Summary Statistics */}
      <SummaryStatistics summary={summary} />

      {/* Time-Based Analysis */}
      <TimeBasedAnalysis dailyResults={dailyResults} hourlyResults={hourlyResults} />

      {/* Symbol-Based Analysis */}
      <SymbolBasedAnalysis data={symbolReport} />

      {/* Duration-Based Analysis */}
      <DurationBasedAnalysis data={durationReport} trades={filteredTrades} />

      {/* Size-Based Analysis */}
      <SizeBasedAnalysis data={sizeReport} trades={filteredTrades} />

      {/* Export Actions */}
      <ExportActions csvData={csvData} jsonData={jsonData} />
    </div>
  )
}
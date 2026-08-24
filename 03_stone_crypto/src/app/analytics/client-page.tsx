"use client"

import { useEffect } from "react"
import { useDashboardStore } from "@/stores"
import { useAnalyticsData } from "@/hooks/useAnalyticsData"
import { AnalyticsFilterBar } from "@/components/analytics/AnalyticsFilterBar"
import { StatisticsGrid } from "@/components/analytics/StatisticsGrid"
import { WinRateBreakevenCard } from "@/components/analytics/WinRateBreakevenCard"
import { LongShortRatioCard } from "@/components/analytics/LongShortRatioCard"
import { LongsShortsAnalysis } from "@/components/analytics/LongsShortsAnalysis"
import { WinningLosingTrades } from "@/components/analytics/WinningLosingTrades"
import { TradeResultByDay } from "@/components/analytics/TradeResultByDay"
import { TradeResultByTime } from "@/components/analytics/TradeResultByTime"
import { TradeDurationReport } from "@/components/analytics/TradeDurationReport"
import { TradeSizeReport } from "@/components/analytics/TradeSizeReport"
import { TradedSymbolsReport } from "@/components/analytics/TradedSymbolsReport"
import { FundingFeesSection } from "@/components/analytics/FundingFeesSection"
import { OrderTypeStudy } from "@/components/analytics/OrderTypeStudy"
import { TagsReport } from "@/components/analytics/TagsReport"
import { DrawdownChart } from "@/components/analytics/DrawdownChart"
import { PnLDistribution } from "@/components/analytics/PnLDistribution"
import { LoadingSpinner } from "@/components/dashboard/LoadingSpinner"
import { AlertCircle } from "lucide-react"

export default function AnalyticsClient() {
  const { loadFromBackend, isLoading, error } = useDashboardStore()
  const {
    filteredTrades, statistics, winRate, longShortRatio,
    longsDeep, shortsDeep, winLoseComparison,
    dailyResults, hourlyResults, durationReport, sizeReport,
    symbolReport, fundingFees, orderTypeStudy,
    drawdown, pnlDistribution,
    analyticsFilter, setAnalyticsFilter,
  } = useAnalyticsData()

  useEffect(() => { loadFromBackend() }, [loadFromBackend])

  if (isLoading) {
    return <LoadingSpinner message="Loading analytics" submessage="Fetching your trading data..." />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm font-medium text-red-400">Failed to load analytics data</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <button onClick={() => loadFromBackend()} className="mt-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-muted transition-colors">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Deep dive into your trading performance</p>
        </div>
        <AnalyticsFilterBar />
      </div>

      {/* Statistics */}
      <StatisticsGrid statistics={statistics} />

      {/* Win Rate & Long/Short Ratio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WinRateBreakevenCard
          data={winRate}
          breakevenFilter={analyticsFilter.breakevenFilter}
          onBreakevenFilterChange={(f) => setAnalyticsFilter({ breakevenFilter: f })}
        />
        <LongShortRatioCard
          data={longShortRatio}
          directionFilter={analyticsFilter.directionFilter}
          onDirectionFilterChange={(f) => setAnalyticsFilter({ directionFilter: f })}
        />
      </div>

      {/* Longs / Shorts Deep Analysis */}
      <LongsShortsAnalysis longs={longsDeep} shorts={shortsDeep} totalTrades={filteredTrades.length} />

      {/* Winning / Losing Trades Comparison */}
      <WinningLosingTrades data={winLoseComparison} />

      {/* Trade Result By Day */}
      <TradeResultByDay data={dailyResults} groupBy={analyticsFilter.groupBy} onGroupByChange={(g) => setAnalyticsFilter({ groupBy: g })} />

      {/* Trade Result By Time */}
      <TradeResultByTime data={hourlyResults} groupBy={analyticsFilter.groupBy} onGroupByChange={(g) => setAnalyticsFilter({ groupBy: g })} />

      {/* Duration Report */}
      <TradeDurationReport data={durationReport} />

      {/* Size Report */}
      <TradeSizeReport data={sizeReport} />

      {/* Symbol Report */}
      <TradedSymbolsReport data={symbolReport} />

      {/* Funding & Fees */}
      <FundingFeesSection data={fundingFees} />

      {/* Order Type Study */}
      <OrderTypeStudy data={orderTypeStudy} />

      {/* Tags Report */}
      <TagsReport />

      {/* Drawdown & PnL Distribution */}
      <DrawdownChart data={drawdown} />
      <PnLDistribution data={pnlDistribution} />
    </div>
  )
}

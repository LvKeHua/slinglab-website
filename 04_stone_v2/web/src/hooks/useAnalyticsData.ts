"use client"

import { useMemo } from "react"
import { useDashboardStore, useAnalyticsStore } from "@/stores"
import {
  filterTradesByTimeRange,
  filterTradesByLastN,
  filterTradesByAccount,
  filterTradesBySymbol,
  filterTradesByBreakeven,
  filterTradesByDirection,
  calculateStatistics,
  calculateWinRate,
  calculateLongShortRatio,
  calculateDirectionDeep,
  calculateWinLoseComparison,
  calculateTradeResultByDay,
  calculateTradeResultByTime,
  calculateDurationReport,
  calculateSizeReport,
  calculateSymbolReport,
  calculateFundingFees,
  calculateOrderTypeStudy,
  calculateDrawdown,
  calculatePnLDistribution,
  type Statistics,
  type WinRateData,
  type LongShortRatioData,
  type DirectionDeepStats,
  type WinLoseComparison,
  type DailyResult,
  type HourlyResult,
  type DurationBucketData,
  type SizeBucketData,
  type SymbolReportRow,
  type FundingFeesData,
  type OrderTypeStudyData,
  type DrawdownData,
  type PnLBucket,
} from "@/utils/analytics"

export function useAnalyticsData() {
  const { closedTrades, loadFromBackend, isLoading, error } = useDashboardStore()
  const { analyticsFilter, setAnalyticsFilter } = useAnalyticsStore()

  const filteredTradesForStats = useMemo(() => {
    let trades = closedTrades.slice()
    trades = filterTradesByTimeRange(trades, analyticsFilter.timeRange)
    trades = filterTradesByAccount(trades, analyticsFilter.account)
    trades = filterTradesBySymbol(trades, analyticsFilter.symbol)
    // NOTE: lastN limit intentionally excluded — row cap only, doesn't affect stats
    trades = filterTradesByBreakeven(trades, analyticsFilter.breakevenFilter)
    trades = filterTradesByDirection(trades, analyticsFilter.directionFilter)
    return trades
  }, [closedTrades, analyticsFilter])

  // filteredTrades = filteredTradesForStats + lastN limit (for display only)
  const filteredTrades = useMemo(() => {
    return filterTradesByLastN(filteredTradesForStats, analyticsFilter.lastN)
  }, [filteredTradesForStats, analyticsFilter.lastN])

  const statistics = useMemo(() => calculateStatistics(filteredTradesForStats), [filteredTradesForStats])
  const winRate = useMemo(() => calculateWinRate(filteredTradesForStats), [filteredTradesForStats])
  const longShortRatio = useMemo(() => calculateLongShortRatio(filteredTradesForStats), [filteredTradesForStats])
  const longsDeep = useMemo(() => calculateDirectionDeep(filteredTradesForStats, "Long", filteredTradesForStats), [filteredTradesForStats])
  const shortsDeep = useMemo(() => calculateDirectionDeep(filteredTradesForStats, "Short", filteredTradesForStats), [filteredTradesForStats])
  const winLoseComparison = useMemo(() => calculateWinLoseComparison(filteredTradesForStats), [filteredTradesForStats])
  const dailyResults = useMemo(() => calculateTradeResultByDay(filteredTradesForStats, analyticsFilter.groupBy), [filteredTradesForStats, analyticsFilter.groupBy])
  const hourlyResults = useMemo(() => calculateTradeResultByTime(filteredTradesForStats, analyticsFilter.groupBy), [filteredTradesForStats, analyticsFilter.groupBy])
  const durationReport = useMemo(() => calculateDurationReport(filteredTradesForStats), [filteredTradesForStats])
  const sizeReport = useMemo(() => calculateSizeReport(filteredTradesForStats), [filteredTradesForStats])
  const symbolReport = useMemo(() => calculateSymbolReport(filteredTradesForStats), [filteredTradesForStats])
  const fundingFees = useMemo(() => calculateFundingFees(filteredTradesForStats), [filteredTradesForStats])
  const orderTypeStudy = useMemo(() => calculateOrderTypeStudy(filteredTradesForStats), [filteredTradesForStats])
  const drawdown = useMemo(() => calculateDrawdown(filteredTradesForStats), [filteredTradesForStats])
  const pnlDistribution = useMemo(() => calculatePnLDistribution(filteredTradesForStats), [filteredTradesForStats])

  return {
    filteredTrades,
    statistics,
    winRate,
    longShortRatio,
    longsDeep,
    shortsDeep,
    winLoseComparison,
    dailyResults,
    hourlyResults,
    durationReport,
    sizeReport,
    symbolReport,
    fundingFees,
    orderTypeStudy,
    drawdown,
    pnlDistribution,
    analyticsFilter,
    setAnalyticsFilter,
    loadFromBackend,
    isLoading,
    error,
  }
}

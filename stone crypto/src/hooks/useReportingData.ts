"use client"

import { useMemo } from "react"
import { useDashboardStore, useReportingStore } from "@/stores"
import {
  filterTradesByReportingTimeRange,
  calculateReportingSummary,
  calculateTradeResultByDay,
  calculateTradeResultByTime,
  calculateDurationReport,
  calculateSizeReport,
  calculateSymbolReport,
  getUniqueSymbols,
  getUniqueAccounts,
  filterTradesByAccount,
  filterTradesBySymbol,
  exportToCSV,
  exportToJSON,
  type ReportingSummary,
  type DailyResult,
  type HourlyResult,
  type DurationBucketData,
  type SizeBucketData,
  type SymbolReportRow,
} from "@/utils/reporting"

export function useReportingData() {
  const { closedTrades, loadFromBackend, isLoading, error } = useDashboardStore()
  const { reportingFilter, setReportingFilter } = useReportingStore()

  const accounts = useMemo(() => getUniqueAccounts(closedTrades), [closedTrades])
  const symbols = useMemo(() => {
    const source =
      reportingFilter.account === "All Accounts"
        ? closedTrades
        : closedTrades.filter((t) => t.exchange === reportingFilter.account)
    return getUniqueSymbols(source)
  }, [closedTrades, reportingFilter.account])

  const filteredTrades = useMemo(() => {
    let trades = closedTrades.slice()
    trades = filterTradesByAccount(trades, reportingFilter.account)
    trades = filterTradesBySymbol(trades, reportingFilter.symbol)
    trades = filterTradesByReportingTimeRange(
      trades,
      reportingFilter.timeRange,
      reportingFilter.groupBy,
      reportingFilter.customStartDate,
      reportingFilter.customEndDate,
    )
    return trades
  }, [closedTrades, reportingFilter])

  const summary = useMemo(() => calculateReportingSummary(filteredTrades), [filteredTrades])
  const dailyResults = useMemo(
    () => calculateTradeResultByDay(filteredTrades, reportingFilter.groupBy),
    [filteredTrades, reportingFilter.groupBy],
  )
  const hourlyResults = useMemo(
    () => calculateTradeResultByTime(filteredTrades, reportingFilter.groupBy),
    [filteredTrades, reportingFilter.groupBy],
  )
  const durationReport = useMemo(() => calculateDurationReport(filteredTrades), [filteredTrades])
  const sizeReport = useMemo(() => calculateSizeReport(filteredTrades), [filteredTrades])
  const symbolReport = useMemo(() => calculateSymbolReport(filteredTrades), [filteredTrades])

  const csvData = useMemo(() => exportToCSV(filteredTrades), [filteredTrades])
  const jsonData = useMemo(() => exportToJSON(filteredTrades), [filteredTrades])

  return {
    filteredTrades,
    summary,
    dailyResults,
    hourlyResults,
    durationReport,
    sizeReport,
    symbolReport,
    accounts,
    symbols,
    csvData,
    jsonData,
    reportingFilter,
    setReportingFilter,
    loadFromBackend,
    isLoading,
    error,
  }
}
"use client"

import { useCallback, useState, useMemo } from "react"
import { useApiData } from "@/hooks/use-api-data"
import { usePerformanceStore } from "@/stores"
import { filterByTimeRange, getSymbolOptions, type SortConfig } from "@/hooks/useFilteredTrades"
import { useCalendarData } from "@/hooks/useCalendarData"
import { useConfiguredExchanges } from "@/hooks/useConfiguredExchanges"
import { FilterBar } from "@/components/performance/FilterBar"
import { CoreMetrics } from "@/components/performance/CoreMetrics"
import { MainAccountPnlChart } from "@/components/performance/MainAccountPnlChart"
import { WinRateStatsPanel } from "@/components/performance/WinRateStatsPanel"
import { RnLCalendar } from "@/components/performance/RnLCalendar"
import { TradeHistoryList } from "@/components/performance/TradeHistoryList"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TIME_RANGE_OPTIONS } from "@/types"
import type { TimeRange, ClosedTrade } from "@/types"

export default function PerformanceClient() {
  const { data, isLoading, error } = useApiData()
  const { perfFilter, setPerfFilter } = usePerformanceStore()
  const { configuredExchanges } = useConfiguredExchanges()
  const [sort, setSort] = useState<SortConfig>({ sortBy: "time", sortOrder: "desc" })

  // All hooks must be called before any conditional returns
  const closedTrades = useMemo(() => {
    const raw = data?.closedTrades ?? []
    // Add computed isWin/isBreakeven fields
    return raw.map((t) => ({
      ...t,
      isWin: t.realisedPnl > 0,
      isBreakeven: t.realisedPnl === 0,
    }))
  }, [data?.closedTrades])

  const calendarDays = useCalendarData(closedTrades)

  const filteredTradesForStats = useMemo(() => {
    let result: ClosedTrade[] = closedTrades

    // 1. Account filter
    if (perfFilter.account !== "All Accounts") {
      result = result.filter((t) => t.exchange === perfFilter.account)
    }

    // 2. Symbol filter
    if (perfFilter.symbol !== "All Symbols") {
      result = result.filter((t) => t.symbol === perfFilter.symbol)
    }

    // 3. Time range filter
    result = filterByTimeRange(result, perfFilter.timeRange)

    // 4. Breakeven filter (W/be/L)
    if (perfFilter.breakevenFilter === "win") {
      result = result.filter((t) => t.isWin)
    } else if (perfFilter.breakevenFilter === "loss") {
      result = result.filter((t) => t.realisedPnl < 0)
    } else if (perfFilter.breakevenFilter === "breakeven") {
      result = result.filter((t) => t.isBreakeven)
    }

    // 5. Direction filter (Long/Short)
    if (perfFilter.directionFilter === "long") {
      result = result.filter((t) => t.dir === "Long")
    } else if (perfFilter.directionFilter === "short") {
      result = result.filter((t) => t.dir === "Short")
    }

    // 6. Sort
    if (sort) {
      const arr = [...result]
      if (sort.sortBy === "time") {
        arr.sort((a, b) => {
          const diff = new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime()
          return sort.sortOrder === "asc" ? diff : -diff
        })
      } else {
        arr.sort((a, b) => {
          const diff = a.realisedPnl - b.realisedPnl
          return sort.sortOrder === "asc" ? diff : -diff
        })
      }
      result = arr
    } else {
      result = [...result].sort(
        (a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime()
      )
    }

    return result
  }, [closedTrades, perfFilter.account, perfFilter.symbol, perfFilter.timeRange, perfFilter.breakevenFilter, perfFilter.directionFilter, sort])

  // filteredTrades = filteredTradesForStats + limit (row cap only, doesn't affect stats)
  const filteredTrades = useMemo(() => {
    if (perfFilter.limit !== Infinity && perfFilter.limit > 0) {
      return filteredTradesForStats.slice(0, perfFilter.limit)
    }
    return filteredTradesForStats
  }, [filteredTradesForStats, perfFilter.limit])

  // Handlers
  const handleAccountChange = useCallback(
    (account: string) => {
      setPerfFilter({ account, symbol: "All Symbols" })
    },
    [setPerfFilter]
  )

  const handleSymbolChange = useCallback(
    (symbol: string) => setPerfFilter({ symbol }),
    [setPerfFilter]
  )

  const handleLimitChange = useCallback(
    (limit: string) => setPerfFilter({ limit: Number(limit) }),
    [setPerfFilter]
  )

  const handleTimeRangeChange = useCallback(
    (range: TimeRange) => setPerfFilter({ timeRange: range }),
    [setPerfFilter]
  )

  const handleBreakevenFilterChange = useCallback(
    (filter: "all" | "win" | "breakeven" | "loss") => setPerfFilter({ breakevenFilter: filter }),
    [setPerfFilter]
  )

  const handleDirectionFilterChange = useCallback(
    (filter: "all" | "long" | "short") => setPerfFilter({ directionFilter: filter }),
    [setPerfFilter]
  )

  // Conditional renders AFTER all hooks
  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading performance data...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      {/* ── Header Row: Title + Time Filter ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance</h1>
        </div>
        <div className="flex items-center gap-1">
          {TIME_RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant="outline"
              size="sm"
              onClick={() => handleTimeRangeChange(opt.value)}
              className={cn(
                "h-8 text-xs px-3",
                perfFilter.timeRange === opt.value &&
                  "bg-primary/10 border-primary/40 text-primary"
              )}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Filter Bar: Account / Symbol / Last N Trades ── */}
      <FilterBar
        closedTrades={closedTrades}
        selectedAccount={perfFilter.account}
        selectedSymbol={perfFilter.symbol}
        selectedLimit={perfFilter.limit}
        onAccountChange={handleAccountChange}
        onSymbolChange={handleSymbolChange}
        onLimitChange={handleLimitChange}
        configuredExchanges={configuredExchanges}
      />

      {/* ── Core Metrics ── */}
      <CoreMetrics closedTrades={filteredTradesForStats} />

      {/* ── PNL Chart + Stats Panel (side by side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MainAccountPnlChart closedTrades={filteredTradesForStats} />
        </div>
        <div>
          <WinRateStatsPanel
            closedTrades={filteredTradesForStats}
            breakevenFilter={perfFilter.breakevenFilter}
            directionFilter={perfFilter.directionFilter}
            onBreakevenFilterChange={handleBreakevenFilterChange}
            onDirectionFilterChange={handleDirectionFilterChange}
          />
        </div>
      </div>

      {/* ── RnL Calendar ── */}
      <RnLCalendar calendarDays={calendarDays} />

      {/* ── Trade History ── */}
      <TradeHistoryList closedTrades={filteredTrades} />
    </div>
  )
}
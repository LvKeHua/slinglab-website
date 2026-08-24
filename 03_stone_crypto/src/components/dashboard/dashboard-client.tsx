"use client"

import { useEffect, useMemo } from "react"
import { useDashboardStore } from "@/stores"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { DashboardTabs } from "@/components/dashboard/DashboardTabs"
import { PositionsTable } from "@/components/dashboard/PositionsTable"
import { AssetsTable } from "@/components/dashboard/AssetsTable"
import { AnalyticsPanel } from "@/components/dashboard/AnalyticsPanel"
import { ClosedTradesTable } from "@/components/dashboard/ClosedTradesTable"
import { LoadingSpinner } from "@/components/dashboard/LoadingSpinner"
import { DataFilterBar } from "@/components/shared/DataFilterBar"
import { Card, CardContent } from "@/components/ui/card"
import { getDashboardTimeRangeLabel } from "@/lib/time-filters"
import { AlertCircle } from "lucide-react"
import { useConfiguredExchanges } from "@/hooks/useConfiguredExchanges"
import type { Asset, AssetBalance } from "@/types"

/** Convert a single AssetBalance to an Asset for display */
function assetBalanceToAsset(balance: AssetBalance, exchange: string): Asset {
  return {
    symbol: balance.symbol,
    name: balance.symbol,
    price: balance.priceUsdt,
    change24h: 0,
    volume24h: 0,
    spread: 0,
    holdings: balance.free + balance.locked,
    value: balance.valueUsdt,
    unrealizedPnl: 0,
    side: 'Long',
    exchange,
  }
}

export default function DashboardClient() {
  const { configuredExchanges } = useConfiguredExchanges()
  const {
    positions,
    assets,
    accounts,
    closedTrades,
    filteredClosedTrades,
    dashboardTab,
    dashboardTimeRange,
    dashboardAccount,
    dashboardSymbol,
    dashboardLimit,
    setDashboardFilter,
    isLoading,
    error,
    loadFromBackend,
  } = useDashboardStore()

  // Compute displayed assets based on account filter
  const displayedAssets = useMemo(() => {
    // If we have real account data, filter by selected account
    if (accounts.length > 0) {
      if (dashboardAccount === "All Accounts") {
        // Combine assets from all valid accounts, tagging each with its exchange
        const allAssets: Asset[] = []
        for (const account of accounts) {
          if (!account.valid || account.error) continue
          for (const balance of account.assets) {
            allAssets.push(assetBalanceToAsset(balance, account.exchange))
          }
        }
        return allAssets
      } else {
        // Show only the selected exchange's assets
        const account = accounts.find((a) => a.exchange === dashboardAccount)
        if (account && account.valid && !account.error) {
          return account.assets.map((b) => assetBalanceToAsset(b, account.exchange))
        }
        return []
      }
    }
    // Fallback: use store assets (from mock data)
    return assets
  }, [accounts, dashboardAccount, assets])

  // Check if any account has an error
  const balanceError = useMemo(() => {
    const errAccounts = accounts.filter((a) => a.error)
    if (errAccounts.length === 0) return null
    return errAccounts.map((a) => `${a.exchange}: ${a.error}`).join("; ")
  }, [accounts])

  useEffect(() => {
    loadFromBackend()
  }, [loadFromBackend])

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard" submessage="Fetching your trading data..." />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm font-medium text-red-400">Failed to load dashboard</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <button
          onClick={loadFromBackend}
          className="mt-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-muted transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  const timeLabel = getDashboardTimeRangeLabel(dashboardTimeRange)
  // Stats use the full filtered set; display applies the limit as a row cap
  const tradesForStats = filteredClosedTrades
  const tradesToShow = dashboardLimit > 0
    ? filteredClosedTrades.slice(0, dashboardLimit)
    : filteredClosedTrades

  return (
    <div className="space-y-6">
      {/* Header: Greeting + Bias + Time Filter + Stats + Performance link + Refresh */}
      <DashboardHeader />

      {/* Balance error warning */}
      {balanceError && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
          <p className="text-xs text-yellow-400">
            Some accounts could not load balances: {balanceError}
          </p>
        </div>
      )}

      {/* Filter Bar: Account + Symbol + Trades Limit */}
      <DataFilterBar
        closedTrades={closedTrades}
        selectedAccount={dashboardAccount}
        selectedSymbol={dashboardSymbol}
        selectedLimit={dashboardLimit}
        onAccountChange={(v) => setDashboardFilter({ dashboardAccount: v })}
        onSymbolChange={(v) => setDashboardFilter({ dashboardSymbol: v })}
        onLimitChange={(v) => setDashboardFilter({ dashboardLimit: Number(v) })}
        configuredExchanges={configuredExchanges}
      />

      {/* Main Content: 70/30 two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left Column (70%): Tabs + Table + Closed Trades */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <DashboardTabs />
            <span className="text-xs text-muted-foreground tabular-nums">
              {dashboardTab === "positions"
                ? `${positions.length} position${positions.length !== 1 ? "s" : ""}`
                : `${displayedAssets.length} asset${displayedAssets.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          <Card>
            <CardContent className="p-0">
              {dashboardTab === "positions" ? (
                <PositionsTable positions={positions} />
              ) : (
                <AssetsTable assets={displayedAssets} />
              )}
            </CardContent>
          </Card>

          {/* Closed Trades Table */}
          <Card>
            <CardContent className="p-4">
              <ClosedTradesTable
                trades={tradesToShow}
                timeLabel={timeLabel}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column (30%): Net Worth + Analytics Grid */}
        <AnalyticsPanel />
      </div>
    </div>
  )
}
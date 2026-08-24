"use client"

import { useMemo, useState } from "react"
import { useApiData } from "@/hooks/use-api-data"
import { TradesTable } from "@/components/trades/trades-table"
import { DataFilterBar } from "@/components/shared/DataFilterBar"
import { useConfiguredExchanges } from "@/hooks/useConfiguredExchanges"

export default function TradesPage() {
  const { data, isLoading, error } = useApiData()
  const { configuredExchanges } = useConfiguredExchanges()
  const [account, setAccount] = useState("All Accounts")
  const [symbol, setSymbol] = useState("All Symbols")
  const [limit, setLimit] = useState(50)

  const closedTrades = data?.closedTrades ?? []

  // Apply account filter to closedTrades (for DataFilterBar) and to trades (for TradesTable)
  const filteredTrades = useMemo(() => {
    if (!data) return []
    let result = data.trades ?? []

    if (account !== "All Accounts") {
      result = result.filter(t => t.exchange === account)
    }

    // Trade uses `pair` as the symbol equivalent
    if (symbol !== "All Symbols") {
      result = result.filter(t => t.pair === symbol)
    }

    // Apply limit (row cap)
    if (limit > 0 && limit !== Infinity) {
      result = result.slice(0, limit)
    }

    return result
  }, [data, account, symbol, limit])

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading trades...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trades</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete trade history — {filteredTrades.length} of {(data.trades ?? []).length} total trades
        </p>
      </div>
      <DataFilterBar
        closedTrades={closedTrades}
        selectedAccount={account}
        selectedSymbol={symbol}
        selectedLimit={limit}
        onAccountChange={(v) => { setAccount(v); setSymbol("All Symbols") }}
        onSymbolChange={setSymbol}
        onLimitChange={(v) => setLimit(Number(v))}
        configuredExchanges={configuredExchanges}
      />
      <TradesTable trades={filteredTrades} />
    </div>
  )
}
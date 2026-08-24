"use client"

import { useState } from "react"
import { useApiData } from "@/hooks/use-api-data"
import { PositionsTable } from "@/components/positions/positions-table"
import { DataFilterBar } from "@/components/shared/DataFilterBar"
import { useConfiguredExchanges } from "@/hooks/useConfiguredExchanges"

export default function PositionsPage() {
  const { data, isLoading, error } = useApiData()
  const { configuredExchanges } = useConfiguredExchanges()
  const [account, setAccount] = useState("All Accounts")
  const [symbol, setSymbol] = useState("All Symbols")

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading positions...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>
  if (!data) return null

  const { positions } = data

  // Filter by account (using exchange field)
  const filteredByAccount = account === "All Accounts"
    ? positions
    : positions.filter(p => p.exchange === account)

  // Filter by symbol (using pair field since positions use "pair" not "symbol")
  const filteredPositions = symbol === "All Symbols"
    ? filteredByAccount
    : filteredByAccount.filter(p => p.pair === symbol)

  // Use closedTrades to derive dropdown options for DataFilterBar
  const closedTradesForFilter = data.closedTrades ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Positions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {filteredPositions.length} open positions
        </p>
      </div>
      <DataFilterBar
        closedTrades={closedTradesForFilter}
        selectedAccount={account}
        selectedSymbol={symbol}
        selectedLimit={50}
        onAccountChange={(v) => { setAccount(v); setSymbol("All Symbols") }}
        onSymbolChange={setSymbol}
        onLimitChange={() => {}}
        showTradesLimit={false}
        configuredExchanges={configuredExchanges}
      />
      <PositionsTable positions={filteredPositions} />
    </div>
  )
}
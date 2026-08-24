"use client"

/**
 * Portfolio — cross-exchange open positions with unified leverage.
 * Consumes /api/positions (persisted snapshot from last sync).
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import { getPortfolioPositions, syncAll } from "@/lib/api-client"
import type { PortfolioPositions, OpenPosition } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"

function fmtUsd(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function fmtSignedUsd(v: number): string {
  const sign = v > 0 ? "+" : ""
  return `${sign}${fmtUsd(v)}`
}

export function PortfolioView() {
  const [data, setData] = useState<PortfolioPositions | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exchangeFilter, setExchangeFilter] = useState("All")
  const [sortKey, setSortKey] = useState<"notionalUsd" | "pnl" | "roi">("notionalUsd")
  const [sortDesc, setSortDesc] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setData(await getPortfolioPositions())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      await syncAll()
      await load()
    } finally {
      setSyncing(false)
    }
  }, [load])

  const positions = useMemo(() => {
    if (!data) return []
    let list = data.positions
    if (exchangeFilter !== "All") list = list.filter((p) => p.exchange === exchangeFilter)
    const sorted = [...list].sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      return sortDesc ? vb - va : va - vb
    })
    return sorted
  }, [data, exchangeFilter, sortKey, sortDesc])

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading portfolio...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>
  if (!data) return null

  const exchanges = ["All", ...data.byExchange.map((e) => e.exchange)]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unified view of open positions across all exchanges
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} variant="outline">
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unified Leverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold">
              {data.leverage !== null ? `${data.leverage}x` : "—"}
            </div>
            {!data.marginKnown && data.positions.length > 0 && (
              <p className="mt-2 flex items-center gap-1 text-xs text-amber-500">
                <TriangleAlert className="h-3 w-3" />
                Margin unknown on some exchanges
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Σ |notional| / Σ margin
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Exposure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold">{fmtUsd(data.notionalTotal)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Long {fmtUsd(data.longNotional)} · Short {fmtUsd(data.shortNotional)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margin Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold">{fmtUsd(data.marginTotal)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.positions.length} open positions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unrealized PnL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-mono font-bold", data.pnlTotal >= 0 ? "text-green-500" : "text-red-500")}>
              {fmtSignedUsd(data.pnlTotal)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">across all positions</p>
          </CardContent>
        </Card>
      </div>

      {/* Exchange breakdown */}
      {data.byExchange.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By Exchange</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-4">Exchange</th>
                    <th className="pb-2 pr-4 text-right">Positions</th>
                    <th className="pb-2 pr-4 text-right">Notional</th>
                    <th className="pb-2 pr-4 text-right">Margin</th>
                    <th className="pb-2 pr-4 text-right">Leverage</th>
                    <th className="pb-2 text-right">uPnL</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byExchange.map((e) => (
                    <tr key={e.exchange} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium">{e.exchange}</td>
                      <td className="py-2 pr-4 text-right font-mono">{e.count}</td>
                      <td className="py-2 pr-4 text-right font-mono">{fmtUsd(e.notional)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{fmtUsd(e.margin)}</td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {e.marginKnown && e.margin > 0
                          ? `${Math.round((e.notional / e.margin) * 100) / 100}x`
                          : "—"}
                      </td>
                      <td className={cn("py-2 text-right font-mono", e.pnl >= 0 ? "text-green-500" : "text-red-500")}>
                        {fmtSignedUsd(e.pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Position list */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Open Positions</CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={exchangeFilter}
              onChange={(e) => setExchangeFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              {exchanges.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="notionalUsd">Notional</option>
              <option value="pnl">PnL</option>
              <option value="roi">ROI</option>
            </select>
            <Button variant="ghost" size="sm" onClick={() => setSortDesc(!sortDesc)}>
              {sortDesc ? "↓" : "↑"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No open positions. Sync your accounts to populate this view.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-4">Exchange</th>
                    <th className="pb-2 pr-4">Symbol</th>
                    <th className="pb-2 pr-4">Side</th>
                    <th className="pb-2 pr-4 text-right">Size</th>
                    <th className="pb-2 pr-4 text-right">Entry</th>
                    <th className="pb-2 pr-4 text-right">Mark</th>
                    <th className="pb-2 pr-4 text-right">Notional</th>
                    <th className="pb-2 pr-4 text-right">Lev</th>
                    <th className="pb-2 pr-4 text-right">Liq</th>
                    <th className="pb-2 pr-4 text-right">ROI</th>
                    <th className="pb-2 text-right">uPnL</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p: OpenPosition, i: number) => (
                    <tr key={`${p.exchange}-${p.symbol}-${i}`} className="border-b border-border/50">
                      <td className="py-2 pr-4 text-muted-foreground">{p.exchange}</td>
                      <td className="py-2 pr-4 font-medium">{p.symbol}</td>
                      <td className={cn("py-2 pr-4 font-mono text-xs", p.side === "Long" ? "text-green-500" : "text-red-500")}>
                        {p.side}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">{p.size}</td>
                      <td className="py-2 pr-4 text-right font-mono">{p.entryPrice.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right font-mono">{p.markPrice.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right font-mono">{fmtUsd(p.notionalUsd)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{p.leverage > 0 ? `${p.leverage}x` : "—"}</td>
                      <td className="py-2 pr-4 text-right font-mono text-muted-foreground">
                        {p.liquidationPrice ? p.liquidationPrice.toLocaleString() : "—"}
                      </td>
                      <td className={cn("py-2 pr-4 text-right font-mono", p.roi >= 0 ? "text-green-500" : "text-red-500")}>
                        {p.roi.toFixed(1)}%
                      </td>
                      <td className={cn("py-2 text-right font-mono", p.pnl >= 0 ? "text-green-500" : "text-red-500")}>
                        {fmtSignedUsd(p.pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Last synced: {new Date(data.updatedAt).toLocaleString()}
      </p>
    </div>
  )
}

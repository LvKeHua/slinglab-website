"use client"

/**
 * Market Radar — CMM Hypertracker-style public market scan.
 * Pulls Binance USDT-M futures public endpoints (no API key):
 *  - 24h tickers (movers, volume)
 *  - premium index (funding rate)
 *  - open interest
 *  - recent force orders (liquidations)
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface Ticker {
  symbol: string
  lastPrice: number
  priceChangePercent: number
  quoteVolume: number
}

interface Funding {
  symbol: string
  lastFundingRate: number
}

interface Liquidation {
  symbol: string
  side: string
  price: number
  origQty: number
  time: number
}

type SortKey = "change" | "volume" | "funding"

function fmtUsd(v: number): string {
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

export default function MarketRadarPage() {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [funding, setFunding] = useState<Funding[]>([])
  const [liquidations, setLiquidations] = useState<Liquidation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("change")
  const [limit, setLimit] = useState(20)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/market-radar")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as {
        tickers: Ticker[]
        funding: Funding[]
        liquidations: Liquidation[]
      }
      setTickers(data.tickers)
      setFunding(data.funding)
      setLiquidations(data.liquidations)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const rows = useMemo(() => {
    const fundingMap = new Map(funding.map((f) => [f.symbol, f.lastFundingRate]))
    const merged = tickers.map((t) => ({
      ...t,
      fundingRate: fundingMap.get(t.symbol) ?? 0,
    }))
    const sorted = [...merged].sort((a, b) => {
      switch (sortKey) {
        case "change": return b.priceChangePercent - a.priceChangePercent
        case "volume": return b.quoteVolume - a.quoteVolume
        case "funding": return b.fundingRate - a.fundingRate
      }
    })
    return sorted.slice(0, limit)
  }, [tickers, funding, sortKey, limit])

  const topGainers = useMemo(
    () => [...tickers].sort((a, b) => b.priceChangePercent - a.priceChangePercent).slice(0, 5),
    [tickers],
  )
  const topLosers = useMemo(
    () => [...tickers].sort((a, b) => a.priceChangePercent - b.priceChangePercent).slice(0, 5),
    [tickers],
  )
  const extremeFunding = useMemo(
    () => [...funding].sort((a, b) => Math.abs(b.lastFundingRate) - Math.abs(a.lastFundingRate)).slice(0, 5),
    [funding],
  )

  if (loading) return <div className="p-8 text-center text-muted-foreground">Scanning market...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Market Radar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Public USDT-M futures scan — movers, funding, liquidations
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Top movers */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-500">Top Gainers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {topGainers.map((t) => (
              <div key={t.symbol} className="flex justify-between font-mono text-sm">
                <span>{t.symbol}</span>
                <span className="text-green-500">+{t.priceChangePercent.toFixed(2)}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-500">Top Losers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {topLosers.map((t) => (
              <div key={t.symbol} className="flex justify-between font-mono text-sm">
                <span>{t.symbol}</span>
                <span className="text-red-500">{t.priceChangePercent.toFixed(2)}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-500">Extreme Funding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {extremeFunding.map((f) => (
              <div key={f.symbol} className="flex justify-between font-mono text-sm">
                <span>{f.symbol}</span>
                <span className={cn(f.lastFundingRate >= 0 ? "text-green-500" : "text-red-500")}>
                  {f.lastFundingRate >= 0 ? "+" : ""}{f.lastFundingRate.toFixed(4)}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Main table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>USDT-M Futures</CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="change">24h Change</option>
              <option value="volume">Volume</option>
              <option value="funding">Funding</option>
            </select>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2 pr-4">Symbol</th>
                  <th className="pb-2 pr-4 text-right">Price</th>
                  <th className="pb-2 pr-4 text-right">24h %</th>
                  <th className="pb-2 pr-4 text-right">Volume</th>
                  <th className="pb-2 text-right">Funding</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.symbol} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium">{t.symbol}</td>
                    <td className="py-2 pr-4 text-right font-mono">{t.lastPrice.toLocaleString()}</td>
                    <td className={cn(
                      "py-2 pr-4 text-right font-mono",
                      t.priceChangePercent >= 0 ? "text-green-500" : "text-red-500",
                    )}>
                      {t.priceChangePercent >= 0 ? "+" : ""}{t.priceChangePercent.toFixed(2)}%
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">{fmtUsd(t.quoteVolume)}</td>
                    <td className={cn(
                      "py-2 text-right font-mono",
                      t.fundingRate >= 0 ? "text-green-500" : "text-red-500",
                    )}>
                      {t.fundingRate >= 0 ? "+" : ""}{t.fundingRate.toFixed(4)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent liquidations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Liquidations</CardTitle>
        </CardHeader>
        <CardContent>
          {liquidations.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No recent liquidations</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">Symbol</th>
                    <th className="pb-2 pr-4">Side</th>
                    <th className="pb-2 pr-4 text-right">Price</th>
                    <th className="pb-2 pr-4 text-right">Qty</th>
                    <th className="pb-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {liquidations.map((l, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium">{l.symbol}</td>
                      <td className={cn(
                        "py-2 pr-4 font-mono text-xs",
                        l.side === "SELL" ? "text-red-500" : "text-green-500",
                      )}>
                        {l.side === "SELL" ? "Long Liq" : "Short Liq"}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">{Number(l.price).toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right font-mono">{Number(l.origQty).toFixed(3)}</td>
                      <td className="py-2 text-right font-mono text-muted-foreground">
                        {new Date(l.time).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

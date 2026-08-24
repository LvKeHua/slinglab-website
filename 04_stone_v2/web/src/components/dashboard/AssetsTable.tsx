"use client"

import { useState, useMemo } from "react"
import { cn, formatCurrency, formatPct, formatQuantity } from "@/lib/utils"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { Asset } from "@/types"

type SortKey = "symbol" | "exchange" | "price" | "change24h" | "volume24h" | "spread" | "holdings" | "value" | "unrealizedPnl"
type SortDir = "asc" | "desc"

interface AssetsTableProps {
  assets: Asset[]
}

export function AssetsTable({ assets }: AssetsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("value")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const sorted = useMemo(() => {
    return [...assets].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "symbol": cmp = a.symbol.localeCompare(b.symbol); break
        case "exchange": cmp = (a.exchange ?? "").localeCompare(b.exchange ?? ""); break
        case "price": cmp = a.price - b.price; break
        case "change24h": cmp = a.change24h - b.change24h; break
        case "volume24h": cmp = a.volume24h - b.volume24h; break
        case "spread": cmp = a.spread - b.spread; break
        case "holdings": cmp = a.holdings - b.holdings; break
        case "value": cmp = a.value - b.value; break
        case "unrealizedPnl": cmp = a.unrealizedPnl - b.unrealizedPnl; break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [assets, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-30" />
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    )
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No assets found</p>
        <p className="text-xs mt-1">Assets will appear here when you have holdings</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {([
              ["Symbol", "symbol"],
              ["Exchange", "exchange"],
              ["Price", "price"],
              ["24h", "change24h"],
              ["Volume", "volume24h"],
              ["Spread", "spread"],
              ["Holdings", "holdings"],
              ["Value", "value"],
              ["PnL", "unrealizedPnl"],
            ] as [string, SortKey][]).map(([label, key]) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                className="cursor-pointer select-none text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2 hover:text-foreground transition-colors"
              >
                <span className="inline-flex items-center gap-1">
                  {label}
                  <SortIcon col={key} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((asset) => (
            <tr
              key={asset.symbol}
              className="border-b border-border/50 hover:bg-muted/20 transition-colors"
            >
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{asset.symbol}</span>
                  <span
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded",
                      asset.side === "Long"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    )}
                  >
                    {asset.side}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                {asset.exchange ? (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                    {asset.exchange}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-xs tabular-nums text-right">
                ${formatCurrency(asset.price)}
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 text-xs tabular-nums text-right font-medium",
                  asset.change24h >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {formatPct(asset.change24h)}
              </td>
              <td className="px-3 py-2.5 text-xs tabular-nums text-right text-muted-foreground">
                ${formatCurrency(asset.volume24h, true)}
              </td>
              <td className="px-3 py-2.5 text-xs tabular-nums text-right text-muted-foreground">
                {asset.spread.toFixed(2)}%
              </td>
              <td className="px-3 py-2.5 text-xs tabular-nums text-right">
                {formatQuantity(asset.holdings)}
              </td>
              <td className="px-3 py-2.5 text-xs tabular-nums text-right font-medium">
                ${formatCurrency(asset.value)}
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 text-xs font-semibold tabular-nums text-right",
                  asset.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {asset.unrealizedPnl >= 0 ? "+" : ""}${formatCurrency(Math.abs(asset.unrealizedPnl))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
"use client"

import { useState, useMemo } from "react"
import { cn, formatPrice, formatPnL, formatHoldTime } from "@/lib/utils"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { ClosedTrade } from "@/types"

type SortKey = "symbol" | "dir" | "size" | "entry" | "exit" | "holdTime" | "realisedPnl"
type SortDir = "asc" | "desc"

interface ClosedTradesTableProps {
  trades: ClosedTrade[]
  timeLabel: string
}

export function ClosedTradesTable({ trades, timeLabel }: ClosedTradesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("realisedPnl")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const sorted = useMemo(() => {
    return [...trades].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "symbol": cmp = a.symbol.localeCompare(b.symbol); break
        case "dir": cmp = a.dir.localeCompare(b.dir); break
        case "size": cmp = a.size - b.size; break
        case "entry": cmp = a.entry - b.entry; break
        case "exit": cmp = a.exit - b.exit; break
        case "holdTime": cmp = a.holdTime.localeCompare(b.holdTime); break
        case "realisedPnl": cmp = a.realisedPnl - b.realisedPnl; break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [trades, sortKey, sortDir])

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

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">
          Closed Trades
          <span className="ml-2 text-xs text-muted-foreground font-normal">
            ({trades.length})
          </span>
        </h3>
        <span className="text-xs text-muted-foreground">{timeLabel}</span>
      </div>

      {trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">No closed trades in this period</p>
          <p className="text-xs mt-1">Closed trades will appear here when you have settled positions</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {([
                  ["Symbol", "symbol"],
                  ["Dir", "dir"],
                  ["Size", "size"],
                  ["Entry", "entry"],
                  ["Exit", "exit"],
                  ["Hold Time", "holdTime"],
                  ["Realised PNL", "realisedPnl"],
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
              {sorted.map((trade) => (
                <tr
                  key={trade.id}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-3 py-2.5 text-xs font-semibold">{trade.symbol}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        trade.dir === "Long" ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      {trade.dir === "Long" ? "▲" : "▼"} {trade.dir}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs tabular-nums text-right">{trade.size}</td>
                  <td className="px-3 py-2.5 text-xs tabular-nums text-right">${formatPrice(trade.entry)}</td>
                  <td className="px-3 py-2.5 text-xs tabular-nums text-right">${formatPrice(trade.exit)}</td>
                  <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">{trade.holdTime}</td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-xs font-semibold tabular-nums text-right",
                      trade.realisedPnl >= 0 ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {formatPnL(trade.realisedPnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
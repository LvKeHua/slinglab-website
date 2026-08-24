"use client"

import { useState, useMemo } from "react"
import { cn, formatPnL, formatPrice, formatQuantity } from "@/lib/utils"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { Position } from "@/types"

type SortKey = "pair" | "side" | "size" | "entry" | "mark" | "pnl" | "roi" | "leverage"
type SortDir = "asc" | "desc"

interface PositionsTableProps {
  positions: Position[]
}

export function PositionsTable({ positions }: PositionsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("pnl")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const sorted = useMemo(() => {
    return [...positions].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "pair": cmp = a.pair.localeCompare(b.pair); break
        case "side": cmp = a.side.localeCompare(b.side); break
        case "size": cmp = a.size - b.size; break
        case "entry": cmp = a.entry - b.entry; break
        case "mark": cmp = a.mark - b.mark; break
        case "pnl": cmp = a.pnl - b.pnl; break
        case "roi": cmp = a.roi - b.roi; break
        case "leverage": cmp = a.leverage - b.leverage; break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [positions, sortKey, sortDir])

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

  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No open positions</p>
        <p className="text-xs mt-1">Positions will appear here when you have active trades</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {([
              ["Pair", "pair"],
              ["Side", "side"],
              ["Size", "size"],
              ["Entry", "entry"],
              ["Mark", "mark"],
              ["PnL", "pnl"],
              ["ROI", "roi"],
              ["Lev", "leverage"],
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
          {sorted.map((pos) => (
            <tr
              key={pos.id}
              className="border-b border-border/50 hover:bg-muted/20 transition-colors"
            >
              <td className="px-3 py-2.5 text-xs font-semibold">{pos.pair}</td>
              <td className="px-3 py-2.5">
                <span
                  className={cn(
                    "text-xs font-medium",
                    pos.side === "Long" ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {pos.side === "Long" ? "▲" : "▼"} {pos.side}
                </span>
              </td>
              <td className="px-3 py-2.5 text-xs tabular-nums text-right">
                {formatQuantity(pos.size)}
              </td>
              <td className="px-3 py-2.5 text-xs tabular-nums text-right">
                ${formatPrice(pos.entry)}
              </td>
              <td className="px-3 py-2.5 text-xs tabular-nums text-right">
                ${formatPrice(pos.mark)}
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 text-xs font-semibold tabular-nums text-right",
                  pos.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {formatPnL(pos.pnl)}
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 text-xs tabular-nums text-right",
                  pos.roi >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {pos.roi >= 0 ? "+" : ""}
                {pos.roi.toFixed(2)}%
              </td>
              <td className="px-3 py-2.5 text-xs tabular-nums text-right">
                {pos.leverage}x
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
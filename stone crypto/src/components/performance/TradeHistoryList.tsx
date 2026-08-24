"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn, formatCurrency, formatQuantity } from "@/lib/utils"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { ClosedTrade } from "@/types"

interface TradeHistoryListProps {
  closedTrades: ClosedTrade[]
}

export function TradeHistoryList({ closedTrades }: TradeHistoryListProps) {
  const [sortBy, setSortBy] = useState<"time" | "pnl">("time")
  const [sortAsc, setSortAsc] = useState(false)

  const sorted = useMemo(() => {
    const arr = [...closedTrades]
    if (sortBy === "time") {
      arr.sort((a, b) =>
        sortAsc
          ? new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime()
          : new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime()
      )
    } else {
      arr.sort((a, b) =>
        sortAsc ? a.realisedPnl - b.realisedPnl : b.realisedPnl - a.realisedPnl
      )
    }
    return arr
  }, [closedTrades, sortBy, sortAsc])

  const toggleSort = (field: "time" | "pnl") => {
    if (sortBy === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(field)
      setSortAsc(field === "time" ? false : true)
    }
  }

  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    const day = d.getDate().toString().padStart(2, "0")
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const mon = months[d.getMonth()]
    const yr = d.getFullYear().toString().slice(-2)
    return `${day}/${mon}/${yr}`
  }

  const fmtTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`
  }

  const fmtPnl = (pnl: number) => {
    const abs = formatCurrency(Math.abs(pnl))
    return pnl >= 0 ? `+$${abs}` : `-$${abs}`
  }

  const SortIcon = ({ field }: { field: "time" | "pnl" }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    return sortAsc
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          Trade History
          <span className="ml-2 text-xs text-muted-foreground font-normal">
            ({closedTrades.length} trades)
          </span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSort("time")}
            className={cn("h-7 text-xs gap-1", sortBy === "time" && "text-primary")}
          >
            <SortIcon field="time" />
            Time
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSort("pnl")}
            className={cn("h-7 text-xs gap-1", sortBy === "pnl" && "text-primary")}
          >
            <SortIcon field="pnl" />
            P&amp;L
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[600px]">
          <div className="px-2 pb-2">
            {sorted.map((trade, index) => (
              <div
                key={trade.id}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs transition-colors duration-150",
                  "border-b border-border/20 last:border-b-0",
                  index % 2 === 0 ? "bg-card/50" : "bg-muted/5",
                  "hover:bg-muted/10"
                )}
              >
                {/* Sequence number */}
                <span className="w-7 shrink-0 text-right text-muted-foreground/50 tabular-nums font-mono text-[11px]">
                  {trade.sequence}
                </span>

                {/* Exchange badge */}
                <span className={cn(
                  "w-[46px] shrink-0 text-[10px] font-semibold text-center px-1 py-0.5 rounded",
                  trade.exchange === "Binance"
                    ? "text-amber-400 bg-amber-500/10"
                    : "text-sky-400 bg-sky-500/10"
                )}>
                  {trade.exchange}
                </span>

                {/* Account */}
                <span className="w-[80px] shrink-0 text-[10px] text-muted-foreground/70 truncate">
                  {trade.account}
                </span>

                {/* Direction + Size */}
                <span className={cn(
                  "w-[60px] shrink-0 text-xs font-semibold tabular-nums",
                  trade.dir === "Long" ? "text-emerald-400" : "text-red-400"
                )}>
                  {trade.dir === "Long" ? "+" : "-"}{formatQuantity(trade.size)}
                </span>

                {/* Symbol */}
                <span className="w-[72px] shrink-0 font-bold text-xs tracking-tight">
                  {trade.symbol}
                </span>

                {/* Entry: $price@date - time */}
                <span className="flex-1 min-w-0 text-[11px] text-muted-foreground truncate">
                  <span className="font-semibold text-foreground">${formatCurrency(trade.entry)}</span>
                  <span className="text-muted-foreground/60">@{fmtDate(trade.entryTime)} - {fmtTime(trade.entryTime)}</span>
                </span>

                {/* Hold Time */}
                <span className="w-[70px] shrink-0 text-[10px] text-muted-foreground/60 tabular-nums text-center font-mono">
                  {trade.holdTime}
                </span>

                {/* Exit: $price@date - time */}
                <span className="flex-1 min-w-0 text-[11px] text-muted-foreground truncate">
                  <span className="font-semibold text-foreground">${formatCurrency(trade.exit)}</span>
                  <span className="text-muted-foreground/60">@{fmtDate(trade.exitTime)} - {fmtTime(trade.exitTime)}</span>
                </span>

                {/* PnL */}
                <span
                  className={cn(
                    "w-[85px] shrink-0 text-right text-xs font-bold tabular-nums font-mono",
                    trade.realisedPnl >= 0 ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {fmtPnl(trade.realisedPnl)}
                </span>
              </div>
            ))}

            {sorted.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No trades match the current filters.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
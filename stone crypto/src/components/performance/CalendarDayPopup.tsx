"use client"

import { useEffect, useRef } from "react"
import { cn, formatCurrency, formatQuantity } from "@/lib/utils"
import type { CalendarDayData, ClosedTrade } from "@/types"

interface CalendarDayPopupProps {
  dayData: CalendarDayData
  onClose: () => void
}

/**
 * Format ISO date string like CMM: "28/Jan/25"
 */
function fmtDate(iso: string) {
  const d = new Date(iso)
  const day = d.getDate().toString().padStart(2, "0")
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const mon = months[d.getMonth()]
  const yr = d.getFullYear().toString().slice(-2)
  return `${day}/${mon}/${yr}`
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`
}

function fmtPnl(pnl: number) {
  const abs = formatCurrency(Math.abs(pnl))
  return pnl >= 0 ? `+$${abs}` : `-$${abs}`
}

export function CalendarDayPopup({ dayData, onClose }: CalendarDayPopupProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEsc)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEsc)
    }
  }, [onClose])

  const dateLabel = new Date(dayData.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        ref={ref}
        className="w-[560px] max-h-[80vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-card/80">
          <div>
            <h3 className="text-sm font-semibold">{dateLabel}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dayData.tradeCount} trade{dayData.tradeCount !== 1 ? "s" : ""} ·{" "}
              <span className={dayData.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                {fmtPnl(dayData.totalPnl)}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Trade list */}
        <div className="overflow-y-auto max-h-[calc(80vh-64px)] px-3 py-2">
          {dayData.trades.map((trade: ClosedTrade) => (
            <div
              key={trade.id}
              className="flex items-center gap-1.5 px-3 py-2 text-xs hover:bg-muted/5 border-b border-border/20 last:border-b-0"
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

              {/* Entry */}
              <span className="flex-1 min-w-0 text-[11px] text-muted-foreground truncate">
                <span className="font-semibold text-foreground">${formatCurrency(trade.entry)}</span>
                <span className="text-muted-foreground/60">@{fmtDate(trade.entryTime)} - {fmtTime(trade.entryTime)}</span>
              </span>

              {/* Hold Time */}
              <span className="w-[70px] shrink-0 text-[10px] text-muted-foreground/60 tabular-nums text-center font-mono">
                {trade.holdTime}
              </span>

              {/* Exit */}
              <span className="flex-1 min-w-0 text-[11px] text-muted-foreground truncate">
                <span className="font-semibold text-foreground">${formatCurrency(trade.exit)}</span>
                <span className="text-muted-foreground/60">@{fmtDate(trade.exitTime)} - {fmtTime(trade.exitTime)}</span>
              </span>

              {/* PnL */}
              <span className={cn(
                "w-[85px] shrink-0 text-right text-xs font-bold tabular-nums font-mono",
                trade.realisedPnl >= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {fmtPnl(trade.realisedPnl)}
              </span>
            </div>
          ))}
        </div>

        {/* Footer summary */}
        <div className="px-5 py-2.5 border-t border-border/50 bg-muted/10 text-xs flex items-center justify-between">
          <span className="text-muted-foreground">
            {dayData.winCount}W / {dayData.tradeCount - dayData.winCount - dayData.lossCount}be / {dayData.lossCount}L
          </span>
          <span className={cn(
            "font-semibold tabular-nums",
            dayData.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            Total: {fmtPnl(dayData.totalPnl)}
          </span>
        </div>
      </div>
    </div>
  )
}
"use client"

import { useMemo } from "react"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { LIMIT_OPTIONS } from "@/types"
import { getSymbolOptions } from "@/hooks/useFilteredTrades"
import type { ClosedTrade } from "@/types"

interface FilterBarProps {
  closedTrades: ClosedTrade[]
  selectedAccount: string
  selectedSymbol: string
  selectedLimit: number
  onAccountChange: (v: string) => void
  onSymbolChange: (v: string) => void
  onLimitChange: (v: string) => void
  configuredExchanges?: string[]
}

export function FilterBar({
  closedTrades,
  selectedAccount,
  selectedSymbol,
  selectedLimit,
  onAccountChange,
  onSymbolChange,
  onLimitChange,
  configuredExchanges,
}: FilterBarProps) {
  const accountOptions = useMemo(() => {
    const tradeExchanges = closedTrades.map((t) => t.exchange).filter(Boolean)
    const merged = [...new Set([...(configuredExchanges ?? []), ...tradeExchanges])].sort()
    return ["All Accounts", ...merged]
  }, [closedTrades, configuredExchanges])

  const symbolOptions = useMemo(
    () => getSymbolOptions(selectedAccount, closedTrades),
    [closedTrades, selectedAccount]
  )

  return (
    <div className="flex flex-nowrap items-center gap-3 overflow-x-auto pb-1">
      {/* Account */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Account</span>
        <Select value={selectedAccount} onValueChange={onAccountChange}>
          <SelectTrigger className="w-[150px] h-8 text-xs bg-background border-border/60 hover:border-primary/40 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {accountOptions.map((opt) => (
              <SelectItem key={opt} value={opt} className="text-xs">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Symbol */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Symbol</span>
        <Select value={selectedSymbol} onValueChange={onSymbolChange}>
          <SelectTrigger className="w-[150px] h-8 text-xs bg-background border-border/60 hover:border-primary/40 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {symbolOptions.map((sym) => (
              <SelectItem key={sym} value={sym} className="text-xs">
                {sym}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Last N Trades */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Trades</span>
        <Select
          value={String(selectedLimit)}
          onValueChange={(v) => onLimitChange(v)}
        >
          <SelectTrigger className="w-[90px] h-8 text-xs bg-background border-border/60 hover:border-primary/40 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIMIT_OPTIONS.map((opt) => (
              <SelectItem key={String(opt.value)} value={String(opt.value)} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
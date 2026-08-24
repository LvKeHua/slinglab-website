"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { WinRateData } from "@/utils/analytics"
import type { BreakevenFilter } from "@/types"

interface WinRateBreakevenCardProps {
  data: WinRateData
  breakevenFilter: BreakevenFilter
  onBreakevenFilterChange: (f: BreakevenFilter) => void
}

export function WinRateBreakevenCard({ data, breakevenFilter, onBreakevenFilterChange }: WinRateBreakevenCardProps) {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Win Rate</span>
          <span className={cn("text-2xl font-bold tabular-nums", data.winRate >= 50 ? "text-emerald-400" : "text-red-400")}>
            {data.winRate}%
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <button
            onClick={() => onBreakevenFilterChange(breakevenFilter === "win" ? "all" : "win")}
            className={cn("px-2 py-0.5 rounded", breakevenFilter === "win" ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground hover:text-foreground")}
          >
            {data.wins}W
          </button>
          <button
            onClick={() => onBreakevenFilterChange(breakevenFilter === "breakeven" ? "all" : "breakeven")}
            className={cn("px-2 py-0.5 rounded", breakevenFilter === "breakeven" ? "bg-yellow-500/20 text-yellow-400" : "text-muted-foreground hover:text-foreground")}
          >
            {data.breakeven}be
          </button>
          <button
            onClick={() => onBreakevenFilterChange(breakevenFilter === "loss" ? "all" : "loss")}
            className={cn("px-2 py-0.5 rounded", breakevenFilter === "loss" ? "bg-red-500/20 text-red-400" : "text-muted-foreground hover:text-foreground")}
          >
            {data.losses}L
          </button>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: data.winRate + '%' }} />
        </div>
      </div>
    </Card>
  )
}
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LongShortRatioData } from "@/utils/analytics"
import type { DirectionFilter } from "@/types"

interface LongShortRatioCardProps {
  data: LongShortRatioData
  directionFilter: DirectionFilter
  onDirectionFilterChange: (f: DirectionFilter) => void
}

export function LongShortRatioCard({ data, directionFilter, onDirectionFilterChange }: LongShortRatioCardProps) {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <span className="text-sm font-medium text-foreground">Long / Short Ratio</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onDirectionFilterChange(directionFilter === "long" ? "all" : "long")}
            className={cn(
              "text-sm font-semibold px-2 py-0.5 rounded",
              directionFilter === "long" ? "bg-emerald-500/20 text-emerald-400" : "text-emerald-400 hover:bg-emerald-500/10"
            )}
          >
            Long {data.longPct}%({data.longCount})
          </button>
          <button
            onClick={() => onDirectionFilterChange(directionFilter === "short" ? "all" : "short")}
            className={cn(
              "text-sm font-semibold px-2 py-0.5 rounded",
              directionFilter === "short" ? "bg-red-500/20 text-red-400" : "text-red-400 hover:bg-red-500/10"
            )}
          >
            Short {data.shortPct}%({data.shortCount})
          </button>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all"
            style={{ width: data.longPct + '%' }}
          />
        </div>
      </div>
    </Card>
  )
}


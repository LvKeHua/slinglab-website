"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn, formatPnL } from "@/lib/utils"
import type { DirectionDeepStats } from "@/utils/analytics"

interface LongsShortsAnalysisProps {
  longs: DirectionDeepStats
  shorts: DirectionDeepStats
  totalTrades: number
}

function DirectionCard({ title, data, totalTrades, color }: { title: string; data: DirectionDeepStats; totalTrades: number; color: "emerald" | "red" }) {
  const colorMap = color === "emerald"
    ? { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
    : { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" }

  return (
    <Card className={cn("p-4", colorMap.border)}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={cn("text-lg font-bold", colorMap.text)}>{title}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {data.count} <span className={cn("font-semibold", colorMap.text)}>{data.pctOfTotal}%</span> of all your total trades were {title.toUpperCase()}
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{title} Trade Win Ratio</span><span className="font-semibold">{data.winRatio}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{data.wins} Wins / {data.losses} Losses</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Avg {title} Trade Duration</span><span className="font-semibold">{data.avgDuration}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total {title} Realised PNL</span><span className={cn("font-semibold", data.totalPnL >= 0 ? "text-emerald-400" : "text-red-400")}>{formatPnL(data.totalPnL)}</span></div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">Avg Win</span>
              <span className="font-semibold text-emerald-400">{data.wins > 0 ? `+$${data.avgWin.toFixed(2)}` : "N/A"}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">Avg Loss</span>
              <span className="font-semibold text-red-400">{data.losses > 0 ? `-$${data.avgLoss.toFixed(2)}` : "N/A"}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function LongsShortsAnalysis({ longs, shorts, totalTrades }: LongsShortsAnalysisProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <DirectionCard title="Longs" data={longs} totalTrades={totalTrades} color="emerald" />
      <DirectionCard title="Shorts" data={shorts} totalTrades={totalTrades} color="red" />
    </div>
  )
}

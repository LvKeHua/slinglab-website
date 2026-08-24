"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DailyResult } from "@/utils/analytics"
import { cn } from "@/lib/utils"

interface TradeResultByDayProps {
  data: DailyResult[]
  groupBy: "open" | "close"
  onGroupByChange: (g: "open" | "close") => void
}

export function TradeResultByDay({ data, groupBy, onGroupByChange }: TradeResultByDayProps) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Trade Result By Day</CardTitle>
        <div className="flex items-center gap-1 rounded border border-border bg-card p-0.5">
          <button onClick={() => onGroupByChange("open")} className={cn("rounded px-2 py-0.5 text-xs", groupBy === "open" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Open</button>
          <button onClick={() => onGroupByChange("close")} className={cn("rounded px-2 py-0.5 text-xs", groupBy === "close" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Close</button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(240 4% 12%)", border: "1px solid hsl(240 4% 20%)", borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={0} stroke="hsl(240 4% 30%)" />
              <Bar dataKey="totalPnl" fill="#34d399" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

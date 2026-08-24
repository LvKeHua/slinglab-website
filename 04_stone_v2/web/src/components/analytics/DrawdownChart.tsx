"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DrawdownData } from "@/utils/analytics"

interface DrawdownChartProps {
  data: DrawdownData
}

export function DrawdownChart({ data }: DrawdownChartProps) {
  if (data.cumulativePnL.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cumulative PnL & Drawdown</CardTitle></CardHeader>
        <CardContent><div className="flex items-center justify-center py-8 text-sm text-muted-foreground">No trade data available</div></CardContent>
      </Card>
    )
  }

  const chartData = data.cumulativePnL.map((value, index) => ({
    trade: index + 1,
    pnl: Math.round(value * 100) / 100,
  }))

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Cumulative PnL & Drawdown</CardTitle>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-400">Peak: ${data.peakValue.toLocaleString()}</span>
          <span className="text-red-400">Max DD: {data.maxDrawdownPct}%</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
              <XAxis dataKey="trade" tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(240 4% 12%)", border: "1px solid hsl(240 4% 20%)", borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={0} stroke="hsl(240 4% 30%)" />
              <Area type="monotone" dataKey="pnl" stroke="#34d399" fill="#34d399" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

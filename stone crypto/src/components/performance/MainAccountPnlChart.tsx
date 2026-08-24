"use client"

import { useMemo } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ClosedTrade } from "@/types"
import { formatCurrency } from "@/lib/utils"

interface MainAccountPnlChartProps {
  closedTrades: ClosedTrade[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value ?? 0
  return (
    <div className="rounded-lg border bg-card p-2.5 shadow-xl text-xs space-y-1">
      <p className="text-muted-foreground font-medium">{label}</p>
      <p className={`font-semibold tabular-nums ${value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
        {value >= 0 ? "+" : ""}${formatCurrency(Math.abs(value))}
      </p>
    </div>
  )
}

export function MainAccountPnlChart({ closedTrades }: MainAccountPnlChartProps) {
  const chartData = useMemo(() => {
    // Sort by exitTime ascending to build cumulative PNL
    const sorted = [...closedTrades].sort(
      (a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime()
    )
    let cum = 0
    return sorted.map((t) => {
      cum += t.realisedPnl
      return {
        date: t.exitTime.split("T")[0] || t.exitTime.slice(0, 10),
        value: Math.round(cum * 100) / 100,
      }
    })
  }, [closedTrades])

  const currentPnl = chartData.length > 0 ? chartData[chartData.length - 1].value : 0
  const isPositive = currentPnl >= 0

  // Calculate min/max for gradient reference
  const minValue = chartData.length > 0 ? Math.min(...chartData.map(d => d.value)) : 0
  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 0

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Main Account PNL</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cumulative</span>
          <span
            className={`text-lg font-bold tabular-nums ${
              isPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isPositive ? "+" : ""}${formatCurrency(Math.abs(currentPnl))}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="pnlGradPositive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pnlGradNegative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={0}
                stroke="hsl(240 4% 30%)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? "#34d399" : "#f87171"}
                strokeWidth={2}
                fill={isPositive ? "url(#pnlGradPositive)" : "url(#pnlGradNegative)"}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
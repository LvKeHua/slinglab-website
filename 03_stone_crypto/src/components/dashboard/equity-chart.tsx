"use client"

import { useState } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { EquityPoint, DailyPnl } from "@/types"
import { formatCurrency } from "@/lib/utils"

interface EquityChartProps {
  equityCurve: EquityPoint[]
  dailyPnl: DailyPnl[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-card p-2 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold tabular-nums">
        ${formatCurrency(payload[0]?.value ?? 0)}
      </p>
    </div>
  )
}

export function EquityChart({ equityCurve, dailyPnl }: EquityChartProps) {
  const [mode, setMode] = useState<'equity' | 'pnl'>('equity')

  return (
    <Card className="col-span-2">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          {mode === 'equity' ? 'Equity Curve' : 'Daily PnL'}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMode(mode === 'equity' ? 'pnl' : 'equity')}
          className="text-xs h-7"
        >
          Switch to {mode === 'equity' ? 'Daily PnL' : 'Equity'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            {mode === 'equity' ? (
              <AreaChart data={equityCurve} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(240 4% 46%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(240 4% 46%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} fill="url(#equityGrad)" />
              </AreaChart>
            ) : (
              <BarChart data={dailyPnl} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(240 4% 46%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(240 4% 46%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={24}>
          {dailyPnl.map((entry, idx) => (
            <Cell key={idx} fill={entry.pnl >= 0 ? '#34d399' : '#f87171'} />
          ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

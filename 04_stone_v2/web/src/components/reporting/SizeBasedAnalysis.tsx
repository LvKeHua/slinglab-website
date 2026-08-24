"use client"

import {
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ZAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SizeBucketData } from "@/utils/reporting"
import type { ClosedTrade } from "@/types"

interface SizeBasedAnalysisProps {
  data: SizeBucketData[]
  trades: ClosedTrade[]
}

const tooltipStyle = {
  background: "hsl(240 4% 12%)",
  border: "1px solid hsl(240 4% 20%)",
  borderRadius: 8,
  fontSize: 12,
}

export function SizeBasedAnalysis({ data, trades }: SizeBasedAnalysisProps) {
  const scatterData = trades.map((t) => ({
    x: t.size * t.entry,
    y: t.realisedPnl,
    z: t.size,
  }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Trade Size vs P&L</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Size ($)"
                  tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "Size ($)", position: "bottom", style: { fontSize: 10, fill: "hsl(240 4% 46%)" } }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="P&L"
                  tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <ZAxis type="number" dataKey="z" range={[40, 200]} name="Qty" />
                <Tooltip contentStyle={tooltipStyle} />
                <Scatter data={scatterData} fill="#f59e0b" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">P&L by Size</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="winCount" name="Win" fill="#34d399" radius={[2, 2, 0, 0]} />
                <Bar dataKey="lossCount" name="Loss" fill="#f87171" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
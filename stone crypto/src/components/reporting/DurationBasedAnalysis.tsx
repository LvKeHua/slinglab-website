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
import type { DurationBucketData } from "@/utils/reporting"
import type { ClosedTrade } from "@/types"

interface DurationBasedAnalysisProps {
  data: DurationBucketData[]
  trades: ClosedTrade[]
}

const tooltipStyle = {
  background: "hsl(240 4% 12%)",
  border: "1px solid hsl(240 4% 20%)",
  borderRadius: 8,
  fontSize: 12,
}

function parseHoldTimeMs(ht: string): number {
  let ms = 0
  const h = ht.match(/(\d+)h/)
  const m = ht.match(/(\d+)m(?!s)/)
  const s = ht.match(/(\d+)s/)
  if (h) ms += parseInt(h[1]) * 3600000
  if (m) ms += parseInt(m[1]) * 60000
  if (s) ms += parseInt(s[1]) * 1000
  return ms
}

export function DurationBasedAnalysis({ data, trades }: DurationBasedAnalysisProps) {
  const scatterData = trades.map((t) => ({
    x: parseHoldTimeMs(t.holdTime) / 3600000,
    y: t.realisedPnl,
    z: t.size,
  }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Hold Time vs P&L</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Hours"
                  tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "Hold Time (h)", position: "bottom", style: { fontSize: 10, fill: "hsl(240 4% 46%)" } }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="P&L"
                  tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <ZAxis type="number" dataKey="z" range={[40, 200]} name="Size" />
                <Tooltip contentStyle={tooltipStyle} />
                <Scatter data={scatterData} fill="#60a5fa" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">P&L by Duration</CardTitle>
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
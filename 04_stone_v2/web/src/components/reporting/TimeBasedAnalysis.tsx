"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DailyResult, HourlyResult } from "@/utils/reporting"

interface TimeBasedAnalysisProps {
  dailyResults: DailyResult[]
  hourlyResults: HourlyResult[]
}

const tooltipStyle = {
  background: "hsl(240 4% 12%)",
  border: "1px solid hsl(240 4% 20%)",
  borderRadius: 8,
  fontSize: 12,
}

export function TimeBasedAnalysis({ dailyResults, hourlyResults }: TimeBasedAnalysisProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">P&L by Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyResults} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={0} stroke="hsl(240 4% 30%)" />
                <Bar dataKey="totalPnl" name="P&L" fill="#34d399" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">P&L by Hour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyResults} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={0} stroke="hsl(240 4% 30%)" />
                <Bar dataKey="totalPnl" name="P&L" fill="#34d399" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
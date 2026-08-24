"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SizeBucketData } from "@/utils/analytics"

interface TradeSizeReportProps {
  data: SizeBucketData[]
}

export function TradeSizeReport({ data }: TradeSizeReportProps) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Trade Size Report</CardTitle></CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(240 4% 12%)", border: "1px solid hsl(240 4% 20%)", borderRadius: 8, fontSize: 12 }} />
              <Legend />
              <Bar dataKey="winCount" name="Win" fill="#34d399" radius={[2, 2, 0, 0]} />
              <Bar dataKey="lossCount" name="Loss" fill="#f87171" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

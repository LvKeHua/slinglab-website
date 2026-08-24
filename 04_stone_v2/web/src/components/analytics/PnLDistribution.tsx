"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PnLBucket } from "@/utils/analytics"

interface PnLDistributionProps {
  data: PnLBucket[]
}

export function PnLDistribution({ data }: PnLDistributionProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">PnL Distribution</CardTitle></CardHeader>
        <CardContent><div className="flex items-center justify-center py-8 text-sm text-muted-foreground">No trade data available</div></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">PnL Distribution</CardTitle></CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
              <XAxis dataKey="range" tick={{ fontSize: 9, fill: "hsl(240 4% 46%)" }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(240 4% 12%)", border: "1px solid hsl(240 4% 20%)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" name="Trades" fill="#34d399" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface WinLossChartProps {
  wins: number
  losses: number
}

export function WinLossChart({ wins, losses }: WinLossChartProps) {
  const data = [
    { name: 'Wins', value: wins },
    { name: 'Losses', value: losses },
  ]
  const COLORS = ['#34d399', '#f87171']

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Win / Loss</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx]} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

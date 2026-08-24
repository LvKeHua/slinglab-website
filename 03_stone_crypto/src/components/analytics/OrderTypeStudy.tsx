"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OrderTypeStudyData } from "@/utils/analytics"

interface OrderTypeStudyProps {
  data: OrderTypeStudyData
}

export function OrderTypeStudy({ data }: OrderTypeStudyProps) {
  const rows = [
    { label: "Just Market order", ...data.justMarket },
    { label: "Just Limit order", ...data.justLimit },
    { label: "Both Limit + Market order", ...data.both },
  ]

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Limit vs Market Order Study</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left font-medium pb-2">Trade Includes</th>
              <th className="text-right font-medium pb-2">Number of trades</th>
              <th className="text-right font-medium pb-2">Win ratio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b last:border-0">
                <td className="py-2 text-muted-foreground">{row.label}</td>
                <td className="py-2 text-right font-medium tabular-nums">{row.count}</td>
                <td className="py-2 text-right font-medium tabular-nums">{row.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

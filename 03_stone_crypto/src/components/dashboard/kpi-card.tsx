"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
}

export function KpiCard({ label, value, sub, icon, trend }: KpiCardProps) {
  return (
    <Card className="group hover:border-primary/30 transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums tracking-tight",
                trend === 'up' && "text-emerald-400",
                trend === 'down' && "text-red-400"
              )}
            >
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

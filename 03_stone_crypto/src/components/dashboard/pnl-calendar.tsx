"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CalendarDay } from "@/types"

interface PnlCalendarProps {
  calendar: CalendarDay[]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function PnlCalendar({ calendar }: PnlCalendarProps) {
  // Render the current month/year (previously hardcoded to July 2026).
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const today = now.getDate()
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">PnL Calendar · {monthName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map((d) => (
            <span key={d} className="text-center text-[10px] text-muted-foreground uppercase py-1">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
            const dayData = calendar.find((c) => c.day === d)
            const isToday = d === today
            const dow = new Date(2026, 6, d).getDay()
            const intensity = dayData && dayData.pnl > 0
              ? Math.min(Math.abs(dayData.pnl) / 800, 1)
              : 0

            return (
              <div
                key={d}
                className={cn(
                  "rounded-md p-1.5 text-center border transition-colors",
                  isToday && "border-primary ring-1 ring-primary",
                  !isToday && "border-transparent",
                  dow === 0 || dow === 6 ? "bg-muted/20" : "bg-card/50"
                )}
                style={
                  dayData && dayData.pnl > 0
                    ? { background: `rgba(16, 185, 129, ${0.05 + intensity * 0.3})` }
                    : dayData && dayData.pnl < 0
                    ? { background: 'rgba(239, 68, 68, 0.06)' }
                    : {}
                }
              >
                <p className="text-xs font-medium tabular-nums">{d}</p>
                <p
                  className={cn(
                    "text-[10px] tabular-nums leading-tight",
                    dayData && dayData.pnl > 0 && "text-emerald-400",
                    dayData && dayData.pnl < 0 && "text-red-400",
                    !dayData && "text-muted-foreground/50"
                  )}
                >
                  {dayData?.pnl != null ? `${dayData.pnl >= 0 ? '+' : ''}${dayData.pnl.toFixed(0)}` : '-'}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, formatCurrency } from "@/lib/utils"
import type { CalendarDayData } from "@/types"
import { CalendarDayPopup } from "./CalendarDayPopup"

interface RnLCalendarProps {
  calendarDays: CalendarDayData[]
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function RnLCalendar({ calendarDays }: RnLCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<CalendarDayData | null>(null)
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  // Render the current month/year. Trades are only mapped to cells that
  // actually fall within this month — previously a hardcoded date caused
  // historical trades to appear on wrong months/years.
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const today = now.getDate()
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  // Build a map of day -> CalendarDayData, restricted to the displayed month.
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`
  const dayMap = new Map<number, CalendarDayData>()
  for (const day of calendarDays) {
    if (!day.date.startsWith(monthPrefix)) continue
    dayMap.set(parseInt(day.date.split("-")[2], 10), day)
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            PnL Calendar · {monthName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((d) => (
              <span key={d} className="text-center text-[10px] text-muted-foreground uppercase py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the 1st */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day cells */}
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
              const dayData = dayMap.get(d)
              const isToday = d === today
              const dow = new Date(year, month, d).getDay()
              const hasTrades = !!dayData && dayData.tradeCount > 0
              const pnl = dayData?.totalPnl ?? 0
              const isHovered = hoveredDay === d

              // Color intensity based on PnL
              const intensity = dayData && pnl > 0
                ? Math.min(Math.abs(pnl) / 800, 1)
                : 0

              return (
                <div
                  key={d}
                  className={cn(
                    "rounded-md p-1.5 text-center border transition-all relative",
                    hasTrades && "cursor-pointer hover:ring-1 hover:ring-primary/40",
                    !hasTrades && "cursor-default",
                    isToday && "border-primary ring-1 ring-primary",
                    !isToday && !hasTrades && "border-transparent",
                    !isToday && hasTrades && "border-border/30",
                    isHovered && hasTrades && "bg-muted/10"
                  )}
                  style={
                    dayData && pnl > 0
                      ? { background: `rgba(16, 185, 129, ${0.05 + intensity * 0.3})` }
                      : dayData && pnl < 0
                        ? { background: "rgba(239, 68, 68, 0.06)" }
                        : {}
                  }
                  onClick={() => {
                    if (dayData && dayData.tradeCount > 0) {
                      setSelectedDay(dayData)
                    }
                  }}
                  onMouseEnter={() => setHoveredDay(d)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <p className="text-xs font-medium tabular-nums">{d}</p>
                  <p className={cn(
                    "text-[10px] tabular-nums leading-tight",
                    dayData && pnl > 0 && "text-emerald-400",
                    dayData && pnl < 0 && "text-red-400",
                    !dayData && "text-muted-foreground/50"
                  )}>
                    {dayData ? `${pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}` : "-"}
                  </p>

                  {/* Hover tooltip */}
                  {isHovered && dayData && dayData.tradeCount > 0 && (
                    <div className="absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-popover border border-border shadow-lg text-[10px] whitespace-nowrap">
                      <span className="text-muted-foreground">{dayData.tradeCount} trade{dayData.tradeCount > 1 ? "s" : ""}</span>
                      <span className="mx-1 text-muted-foreground/50">·</span>
                      <span className={pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
                      </span>
                    </div>
                  )}

                  {/* Dot indicator for days with trades */}
                  {hasTrades && (
                    <div className={cn(
                      "absolute top-0.5 right-0.5 w-1 h-1 rounded-full",
                      pnl > 0 ? "bg-emerald-400" : pnl < 0 ? "bg-red-400" : "bg-muted-foreground"
                    )} />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day detail popup */}
      {selectedDay && (
        <CalendarDayPopup
          dayData={selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  )
}
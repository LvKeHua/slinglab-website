"use client"

/**
 * Funding Heatmap — CMM Hypertracker-style funding-rate heatmap.
 * Rows = top USDT-M symbols by volume, columns = last 24 hours.
 * Green = longs pay (positive funding), red = shorts pay (negative).
 */
import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeatmapData {
  symbols: string[]
  hours: string[]
  matrix: number[][]
  updatedAt: string
}

function cellColor(rate: number): string {
  // Map funding rate to a green/red intensity; clamp at ±0.1%
  const clamped = Math.max(-0.1, Math.min(0.1, rate))
  const intensity = Math.abs(clamped) / 0.1
  if (rate >= 0) {
    return `rgba(34, 197, 94, ${0.08 + intensity * 0.75})`
  }
  return `rgba(239, 68, 68, ${0.08 + intensity * 0.75})`
}

export default function FundingHeatmapPage() {
  const [data, setData] = useState<HeatmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/funding-heatmap")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <div className="p-8 text-center text-muted-foreground">Building heatmap...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Funding Heatmap</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Funding rates over the last 24h — top 20 USDT-M symbols by volume
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            <span className="mr-3 inline-block h-3 w-3 rounded-sm bg-green-500/80 align-middle" />
            Longs pay
            <span className="ml-4 mr-3 inline-block h-3 w-3 rounded-sm bg-red-500/80 align-middle" />
            Shorts pay
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-[2px] text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-card pr-2 text-left font-medium text-muted-foreground">
                    Symbol
                  </th>
                  {data.hours.map((h) => (
                    <th key={h} className="min-w-[34px] px-0.5 text-center font-mono text-[10px] font-normal text-muted-foreground">
                      {h.slice(11, 13)}h
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.symbols.map((symbol, si) => (
                  <tr key={symbol}>
                    <td className="sticky left-0 bg-card pr-2 font-mono font-medium">
                      {symbol.replace("USDT", "")}
                    </td>
                    {data.matrix[si].map((rate, hi) => (
                      <td
                        key={hi}
                        title={`${symbol} ${data.hours[hi]}: ${rate >= 0 ? "+" : ""}${rate.toFixed(4)}%`}
                        className={cn("h-7 min-w-[34px] rounded-sm text-center font-mono text-[10px]")}
                        style={{ backgroundColor: cellColor(rate) }}
                      >
                        {Math.abs(rate) >= 0.05 ? `${rate >= 0 ? "+" : ""}${rate.toFixed(2)}` : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Updated {new Date(data.updatedAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

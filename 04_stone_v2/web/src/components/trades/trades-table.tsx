"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn, formatPnL, formatDate } from "@/lib/utils"
import type { Trade } from "@/types"
import { Search, ArrowUpDown, Download } from "lucide-react"

interface TradesTableProps {
  trades: Trade[]
}

export function TradesTable({ trades }: TradesTableProps) {
  const [search, setSearch] = useState("")
  const [sideFilter, setSideFilter] = useState<string>("All")
  const [strategyFilter, setStrategyFilter] = useState<string>("All")
  const [sortBy, setSortBy] = useState<string>("time")
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const pageSize = 25

  const strategies = useMemo(() => {
    const s = new Set(trades.map((t) => t.strategy))
    return Array.from(s)
  }, [trades])

  const filtered = useMemo(() => {
    let result = [...trades]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.pair.toLowerCase().includes(q) ||
          t.strategy.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    }
    if (sideFilter !== "All") {
      result = result.filter((t) => t.side === sideFilter)
    }
    if (strategyFilter !== "All") {
      result = result.filter((t) => t.strategy === strategyFilter)
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case "time": cmp = a.time.localeCompare(b.time); break
        case "pnl": cmp = a.pnl - b.pnl; break
        case "roi": cmp = a.roi - b.roi; break
        case "pair": cmp = a.pair.localeCompare(b.pair); break
        default: cmp = 0
      }
      return sortOrder === 'desc' ? -cmp : cmp
    })

    return result
  }, [trades, search, sideFilter, strategyFilter, sortBy, sortOrder])

  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize)
  const totalPages = Math.ceil(filtered.length / pageSize)

  const exportCsv = () => {
    const header = 'Time,Pair,Side,Price,Qty,PnL,ROI,Strategy,Tags,Duration,Exchange,Fees\n'
    const rows = filtered.map((t) =>
      `${t.time},${t.pair},${t.side},${t.price},${t.qty},${t.pnl.toFixed(2)},${t.roi.toFixed(2)},${t.strategy},"${t.tags.join('; ')}",${t.duration},${t.exchange},${t.fees.toFixed(2)}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'stone-trades.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <CardTitle className="text-sm font-medium">Trade History</CardTitle>
          <Button variant="outline" size="sm" onClick={exportCsv} className="text-xs h-8">
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by pair, strategy, tags..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={sideFilter} onValueChange={(v) => { setSideFilter(v); setPage(0) }}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Long">Long</SelectItem>
              <SelectItem value="Short">Short</SelectItem>
            </SelectContent>
          </Select>
          <Select value={strategyFilter} onValueChange={(v) => { setStrategyFilter(v); setPage(0) }}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {strategies.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[600px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  { key: 'time', label: 'Time' },
                  { key: 'pair', label: 'Pair' },
                  { key: '', label: 'Side' },
                  { key: 'price', label: 'Price' },
                  { key: 'qty', label: 'Qty' },
                  { key: 'pnl', label: 'PnL' },
                  { key: 'roi', label: 'ROI' },
                  { key: '', label: 'Strategy' },
                  { key: '', label: 'Tags' },
                  { key: '', label: 'Duration' },
                ].map((col) => (
                  <th
                    key={col.key || col.label}
                    className={cn(
                      "text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2",
                      col.key && "cursor-pointer hover:text-foreground select-none"
                    )}
                    onClick={() => col.key && toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortBy === col.key && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((trade) => (
                <tr key={trade.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">{trade.time}</td>
                  <td className="px-3 py-2 text-xs font-medium">{trade.pair}</td>
                  <td className="px-3 py-2">
                    <span className={cn("text-xs font-medium", trade.side === 'Long' ? 'text-emerald-400' : 'text-red-400')}>
                      {trade.side === 'Long' ? '▲' : '▼'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums">${trade.price.toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs tabular-nums">{trade.qty}</td>
                  <td className={cn("px-3 py-2 text-xs font-semibold tabular-nums", trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {formatPnL(trade.pnl)}
                  </td>
                  <td className={cn("px-3 py-2 text-xs tabular-nums", trade.roi >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {trade.roi >= 0 ? '+' : ''}{trade.roi.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{trade.strategy}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {trade.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0">{tag}</Badge>
                      ))}
                      {trade.tags.length > 2 && (
                        <span className="text-[9px] text-muted-foreground">+{trade.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">{trade.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

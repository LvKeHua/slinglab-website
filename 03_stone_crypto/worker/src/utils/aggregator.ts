import type { ClosedTrade, DashboardResponse } from "../types"
import { fetchBinanceTrades, type ProxyConfig } from "../services/binance.service"
import { fetchBybitTrades } from "../services/bybit.service"

interface ExchangeConfig {
  exchange: "Binance" | "Bybit"
  apiKey: string
  secretKey: string
  baseUrl?: string
  proxy?: ProxyConfig
}

export async function aggregateTrades(
  exchanges: ExchangeConfig[]
): Promise<DashboardResponse> {
  const allTrades: ClosedTrade[] = []

  // Fetch from all configured exchanges in parallel
  const results = await Promise.allSettled(
    exchanges.map(async (cfg) => {
      try {
        switch (cfg.exchange) {
          case "Binance":
            return await fetchBinanceTrades(cfg.apiKey, cfg.secretKey, cfg.baseUrl, cfg.proxy)
          case "Bybit":
            return await fetchBybitTrades(cfg.apiKey, cfg.secretKey, cfg.baseUrl, cfg.proxy)
          default:
            throw new Error(`Unknown exchange: ${cfg.exchange}`)
        }
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err))
        ;(wrapped as any).exchange = cfg.exchange
        throw wrapped
      }
    })
  )

  for (const result of results) {
    if (result.status === "fulfilled") {
      allTrades.push(...result.value)
    } else {
      const reason = result.reason
      const exchange = (reason as any)?.exchange ?? "unknown"
      const code = (reason as any)?.code
      const httpStatus = (reason as any)?.httpStatus
      const msg = (reason as any)?.msg

      if (code !== undefined) {
        const parts = [`[${exchange}] API error code=${code}`]
        if (httpStatus !== undefined) parts.push(`httpStatus=${httpStatus}`)
        if (msg) parts.push(`msg="${msg}"`)
        console.error(`Failed to fetch from exchange:`, parts.join(", "))
      } else {
        console.error(`[${exchange}] Failed to fetch from exchange:`, reason)
      }
    }
  }

  // Sort by exitTime descending (newest first)
  allTrades.sort((a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime())

  // Re-assign sequential IDs and compute isWin/isBreakeven
  const reindexed = allTrades.map((t, i) => ({
    ...t,
    id: allTrades.length - i,
    sequence: allTrades.length - i,
    isWin: t.realisedPnl > 0,
    isBreakeven: t.realisedPnl === 0,
  }))

  const netWorth = reindexed.reduce((sum, t) => sum + t.realisedPnl, 0) + 50000 // base balance

  return {
    closedTrades: reindexed,
    netWorth: Math.round(netWorth * 100) / 100,
    lastUpdated: new Date().toISOString(),
  }
}

export function filterTrades(
  trades: ClosedTrade[],
  filters: {
    exchange?: string
    symbol?: string
    limit?: number
    dateFrom?: string
    dateTo?: string
  }
): ClosedTrade[] {
  let result = trades

  if (filters.exchange && filters.exchange !== "All Accounts") {
    result = result.filter((t) => t.exchange === filters.exchange)
  }

  if (filters.symbol && filters.symbol !== "All Symbols") {
    result = result.filter((t) => t.symbol === filters.symbol)
  }

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom).getTime()
    result = result.filter((t) => new Date(t.exitTime).getTime() >= from)
  }

  if (filters.dateTo) {
    const to = new Date(filters.dateTo).getTime()
    result = result.filter((t) => new Date(t.exitTime).getTime() <= to)
  }

  if (filters.limit && filters.limit < result.length) {
    result = result.slice(0, filters.limit)
  }

  return result
}

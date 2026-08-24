import type { ClosedTrade, DashboardResponse } from "../types"
import { aggregateTrades } from "../utils/aggregator"
import { generateMockDashboard } from "../utils/mock-data"
import { getExchangeKeys } from "../utils/exchange-keys"
import { buildDashboardFromCaches } from "../services/sync.service"

interface Env {
  STONE_DATA: KVNamespace
  BINANCE_PROXY_URL?: string
  BINANCE_PROXY_SECRET?: string
  STONE_ENC_KEY?: string
}

interface CalendarDayResponse {
  date: string
  totalPnl: number
  tradeCount: number
  winCount: number
  lossCount: number
}

interface TradesByDateResponse {
  date: string
  trades: ClosedTrade[]
  totalPnl: number
  tradeCount: number
  winCount: number
  lossCount: number
}

async function getDashboardData(env: Env): Promise<DashboardResponse> {
  // Try cache first
  const cached = await env.STONE_DATA.get("dashboard_data", "json")
  if (cached) return cached as unknown as DashboardResponse

  // Rolling-sync caches (0 subrequests)
  const fromCaches = await buildDashboardFromCaches(env.STONE_DATA)
  if (fromCaches) return fromCaches

  const keys = await getExchangeKeys(env.STONE_DATA, env.STONE_ENC_KEY)
  if (keys.binance || keys.bybit) {
    const exchanges: Array<{
      exchange: "Binance" | "Bybit"
      apiKey: string
      secretKey: string
      proxy?: { url: string; secret: string }
    }> = []
    if (keys.binance) {
      exchanges.push({
        exchange: "Binance" as const,
        apiKey: keys.binance.apiKey,
        secretKey: keys.binance.secretKey,
        proxy:
          env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET
            ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET }
            : undefined,
      })
    }
    if (keys.bybit) {
      exchanges.push({ exchange: "Bybit" as const, apiKey: keys.bybit.apiKey, secretKey: keys.bybit.secretKey })
    }
    return aggregateTrades(exchanges)
  }

  return generateMockDashboard()
}

function aggregateCalendarDays(trades: ClosedTrade[]): CalendarDayResponse[] {
  const map = new Map<string, ClosedTrade[]>()

  for (const t of trades) {
    const dateKey = t.exitTime.slice(0, 10) // "2026-07-23"
    if (!map.has(dateKey)) map.set(dateKey, [])
    map.get(dateKey)!.push(t)
  }

  const days: CalendarDayResponse[] = []
  for (const [date, dayTrades] of map) {
    const totalPnl = dayTrades.reduce((s, t) => s + t.realisedPnl, 0)
    const winCount = dayTrades.filter((t) => t.realisedPnl > 0).length
    const lossCount = dayTrades.filter((t) => t.realisedPnl < 0).length
    days.push({
      date,
      totalPnl: Math.round(totalPnl * 100) / 100,
      tradeCount: dayTrades.length,
      winCount,
      lossCount,
    })
  }

  days.sort((a, b) => a.date.localeCompare(b.date))
  return days
}

export async function handleCalendarRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url)

  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://app.slinglab.xyz",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // GET /api/v1/calendar — aggregated day-level data
    if (url.pathname.endsWith("/api/v1/calendar")) {
      const data = await getDashboardData(env)

      // Apply optional filters
      let trades = data.closedTrades
      const exchange = url.searchParams.get("exchange")
      const symbol = url.searchParams.get("symbol")
      const dateFrom = url.searchParams.get("dateFrom")
      const dateTo = url.searchParams.get("dateTo")

      if (exchange && exchange !== "All Accounts") {
        trades = trades.filter((t) => t.exchange === exchange)
      }
      if (symbol && symbol !== "All Symbols") {
        trades = trades.filter((t) => t.symbol === symbol)
      }
      if (dateFrom) {
        const from = new Date(dateFrom).getTime()
        trades = trades.filter((t) => new Date(t.exitTime).getTime() >= from)
      }
      if (dateTo) {
        const to = new Date(dateTo).getTime()
        trades = trades.filter((t) => new Date(t.exitTime).getTime() <= to)
      }

      const calendar = aggregateCalendarDays(trades)
      return new Response(JSON.stringify({ calendar, lastUpdated: data.lastUpdated }), { headers: corsHeaders })
    }

    // GET /api/v1/trades/by-date?date=2026-07-23 — full trade details for a specific day
    if (url.pathname.endsWith("/api/v1/trades/by-date")) {
      const date = url.searchParams.get("date")
      if (!date) {
        return new Response(JSON.stringify({ error: "Missing date parameter. Usage: /api/v1/trades/by-date?date=2026-07-23" }), {
          status: 400,
          headers: corsHeaders,
        })
      }

      const data = await getDashboardData(env)
      const dayTrades = data.closedTrades.filter((t) => t.exitTime.startsWith(date))

      const totalPnl = dayTrades.reduce((s, t) => s + t.realisedPnl, 0)
      const winCount = dayTrades.filter((t) => t.realisedPnl > 0).length
      const lossCount = dayTrades.filter((t) => t.realisedPnl < 0).length

      const response: TradesByDateResponse = {
        date,
        trades: dayTrades.sort((a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime()),
        totalPnl: Math.round(totalPnl * 100) / 100,
        tradeCount: dayTrades.length,
        winCount,
        lossCount,
      }

      return new Response(JSON.stringify(response), { headers: corsHeaders })
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: corsHeaders,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
}
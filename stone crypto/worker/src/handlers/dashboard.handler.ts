import type { AccountInfo, AssetBalance, ClosedTrade, DashboardResponse, MockData, OpenPosition } from "../types"
import { aggregateTrades, filterTrades } from "../utils/aggregator"
import { generateMockDashboard, generateMockAssets } from "../utils/mock-data"
import { getExchangeKeys } from "../utils/exchange-keys"
import { fetchAccountBalancesDetailed, fetchBinanceFuturesPositions, fetchBinanceFuturesBalance, type ProxyConfig } from "../services/binance.service"
import { fetchBybitWalletBalances } from "../services/bybit.service"
import { buildDashboardFromCaches } from "../services/sync.service"

interface Env {
  STONE_DATA: KVNamespace
  BINANCE_PROXY_URL?: string
  BINANCE_PROXY_SECRET?: string
  STONE_ENC_KEY?: string
  BINANCE_API_KEY?: string
  BINANCE_SECRET_KEY?: string
}

function buildExchangeConfigs(
  env: Env,
  keys: { binance: { apiKey: string; secretKey: string } | null; bybit: { apiKey: string; secretKey: string } | null }
) {
  const proxy: ProxyConfig | undefined =
    env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET
      ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET }
      : undefined

  const exchanges: Array<{
    exchange: "Binance" | "Bybit"
    apiKey: string
    secretKey: string
    proxy?: ProxyConfig
  }> = []

  if (keys.binance) {
    exchanges.push({
      exchange: "Binance" as const,
      apiKey: keys.binance.apiKey,
      secretKey: keys.binance.secretKey,
      proxy,
    })
  }
  if (keys.bybit) {
    exchanges.push({
      exchange: "Bybit" as const,
      apiKey: keys.bybit.apiKey,
      secretKey: keys.bybit.secretKey,
    })
  }

  return exchanges
}

const ALLOWED_ORIGINS = [
  "https://app.slinglab.xyz",
  "http://localhost:3000",
  "http://localhost:3456",
]

/** Restrict CORS to known origins (previously wildcard — anyone could read the portfolio) */
function getDashboardCors(request: Request) {
  const origin = request.headers.get("Origin") || ""
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "https://app.slinglab.xyz"
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  }
}

export async function handleDashboardRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url)
  const method = request.method

  const corsHeaders = getDashboardCors(request)

  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (method === "GET" && url.pathname.endsWith("/api/v1/dashboard")) {
      return await getDashboard(env, corsHeaders)
    }

    if (method === "GET" && url.pathname.endsWith("/api/v1/data")) {
      return await getAllData(env, corsHeaders)
    }

    if (method === "GET" && url.pathname.endsWith("/api/v1/dashboard/filtered")) {
      return await getFilteredDashboard(url, env, corsHeaders)
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

async function resolveKeys(env: Env) {
  const keys = await getExchangeKeys(env.STONE_DATA, env.STONE_ENC_KEY)

  // Fallback: use env vars if KV keys are missing or invalid (e.g. old 16-char key)
  if ((!keys.binance || keys.binance.apiKey.length < 32) && env.BINANCE_API_KEY && env.BINANCE_SECRET_KEY) {
    keys.binance = { apiKey: env.BINANCE_API_KEY, secretKey: env.BINANCE_SECRET_KEY }
  }
  return keys
}

/**
 * Load dashboard data: KV cache (60s) → rolling-sync caches (0 subrequests) →
 * live fetch (first run before the cron has populated caches) → mock.
 */
async function loadDashboardData(
  env: Env,
  keys: { binance: { apiKey: string; secretKey: string } | null; bybit: { apiKey: string; secretKey: string } | null }
): Promise<DashboardResponse> {
  const cached = await env.STONE_DATA.get("dashboard_data", "json")
  if (cached) return cached as unknown as DashboardResponse

  const fromCaches = await buildDashboardFromCaches(env.STONE_DATA)
  if (fromCaches) return fromCaches

  if (keys.binance || keys.bybit) {
    return aggregateTrades(buildExchangeConfigs(env, keys))
  }
  return generateMockDashboard()
}

async function getDashboard(
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const keys = await resolveKeys(env)
  let data: DashboardResponse
  const accounts: AccountInfo[] = []
  let openPositions: OpenPosition[] = []
  let netAssetValue = 0

  if (keys.binance || keys.bybit) {
    // Trades come from the rolling-sync caches when available (0 subrequests).
    data = (await buildDashboardFromCaches(env.STONE_DATA)) ??
      (await aggregateTrades(buildExchangeConfigs(env, keys)))

    if (keys.binance) {
      try {
        const proxy: ProxyConfig | undefined =
          env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET
            ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET }
            : undefined

        const binanceAssets = await fetchAccountBalancesDetailed(
          keys.binance.apiKey,
          keys.binance.secretKey,
          undefined,
          proxy
        )
        accounts.push({
          exchange: "Binance",
          configured: true,
          valid: true,
          assets: binanceAssets,
        })
        netAssetValue += binanceAssets.reduce((s, a) => s + a.valueUsdt, 0)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error("[Dashboard] Binance balance fetch failed:", msg)
        accounts.push({
          exchange: "Binance",
          configured: true,
          valid: false,
          assets: [],
          error: msg,
        })
      }
    }

    if (keys.bybit) {
      const proxy: ProxyConfig | undefined =
        env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET
          ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET }
          : undefined
      const bybitAssets = await fetchBybitWalletBalances(keys.bybit.apiKey, keys.bybit.secretKey, undefined, proxy)
      accounts.push({
        exchange: "Bybit",
        configured: true,
        valid: true,
        assets: bybitAssets,
      })
      netAssetValue += bybitAssets.reduce((s, a) => s + a.valueUsdt, 0)
    }

    if (keys.binance) {
      try {
        const proxy: ProxyConfig | undefined =
          env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET
            ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET }
            : undefined

        openPositions = await fetchBinanceFuturesPositions(
          keys.binance.apiKey,
          keys.binance.secretKey,
          undefined,
          proxy
        )
        // Futures wallet balance (incl. unrealized pnl) — the real account value
        netAssetValue += await fetchBinanceFuturesBalance(
          keys.binance.apiKey,
          keys.binance.secretKey,
          undefined,
          proxy
        )
      } catch (err) {
        // Futures positions are optional — don't fail the whole dashboard
        console.error("[Dashboard] Binance futures positions fetch failed:", err instanceof Error ? err.message : String(err))
      }
    }

    data.accounts = accounts
    data.openPositions = openPositions
    // Real net worth from balances when available (falls back to the cached value)
    if (netAssetValue > 0) {
      data.netWorth = Math.round(netAssetValue * 100) / 100
    }
  } else {
    // Fall back to mock data
    data = generateMockDashboard()
  }

  // Short cache for filtered/data endpoints; the expensive exchange fetches
  // are the cron's job now, so 60s is plenty.
  try {
    await env.STONE_DATA.put("dashboard_data", JSON.stringify(data), {
      expirationTtl: 60,
    })
  } catch (_err) {
    console.error("KV put failed:", _err instanceof Error ? (_err as Error).message : _err)
  }

  return new Response(JSON.stringify(data), { headers: corsHeaders })
}

async function getFilteredDashboard(
  url: URL,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const exchange = url.searchParams.get("exchange") || undefined
  const symbol = url.searchParams.get("symbol") || undefined
  const limit = url.searchParams.get("limit")
    ? parseInt(url.searchParams.get("limit")!)
    : undefined
  const dateFrom = url.searchParams.get("dateFrom") || undefined
  const dateTo = url.searchParams.get("dateTo") || undefined

  const data = await loadDashboardData(env, await resolveKeys(env))

  const filtered = filterTrades(data.closedTrades, {
    exchange: exchange === "All Accounts" ? undefined : exchange,
    symbol: symbol === "All Symbols" ? undefined : symbol,
    limit,
    dateFrom,
    dateTo,
  })

  return new Response(
    JSON.stringify({
      closedTrades: filtered,
      total: filtered.length,
      netWorth: data.netWorth,
      lastUpdated: data.lastUpdated,
    }),
    { headers: corsHeaders }
  )
}

async function getAllData(
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const keys = await resolveKeys(env)
  const dashData = await loadDashboardData(env, keys)
  let closedTrades: ClosedTrade[] = dashData.closedTrades
  let assets: AssetBalance[] | undefined

  // Prefer balance data attached by the last live dashboard refresh
  if (dashData.accounts) {
    const binanceAccount = dashData.accounts.find((a) => a.exchange === "Binance")
    if (binanceAccount?.valid && binanceAccount.assets.length > 0) {
      assets = binanceAccount.assets
    }
  }

  // Live balance fetch when the dashboard was served from caches
  if (!assets && keys.binance) {
    try {
      const proxy: ProxyConfig | undefined =
        env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET
          ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET }
          : undefined
      assets = await fetchAccountBalancesDetailed(
        keys.binance.apiKey,
        keys.binance.secretKey,
        undefined,
        proxy
      )
    } catch (err) {
      console.error("[getAllData] Binance balance fetch failed:", err instanceof Error ? err.message : err)
    }
  }

  if (!assets) {
    assets = generateMockAssets()
  }

  // Build summary from closedTrades
  const wins = closedTrades.filter((t) => t.realisedPnl > 0)
  const losses = closedTrades.filter((t) => t.realisedPnl < 0)
  const totalPnl = closedTrades.reduce((s, t) => s + t.realisedPnl, 0)

  // Daily PnL + cumulative equity curve (previously hardcoded to a single point)
  const pnlByDay = new Map<string, number>()
  for (const t of closedTrades) {
    const day = t.exitTime.slice(0, 10)
    pnlByDay.set(day, (pnlByDay.get(day) ?? 0) + t.realisedPnl)
  }
  const sortedDays = [...pnlByDay.keys()].sort()
  const dailyPnl = sortedDays.map((day) => ({ date: day, pnl: Math.round(pnlByDay.get(day)! * 100) / 100 }))
  let cumulative = 0
  const equityCurve = sortedDays.map((day) => {
    cumulative += pnlByDay.get(day) ?? 0
    return { date: day, value: Math.round((dashData.netWorth - (totalPnl - cumulative)) * 100) / 100 }
  })

  // Average hold time from formatted strings (e.g. "1h 2m 3s")
  const parseHoldSeconds = (h: string) => {
    let s = 0
    const m = h.match(/(\d+)h/)
    const mi = h.match(/(\d+)m/)
    const se = h.match(/(\d+)s/)
    if (m) s += parseInt(m[1], 10) * 3600
    if (mi) s += parseInt(mi[1], 10) * 60
    if (se) s += parseInt(se[1], 10)
    return s
  }
  const totalHoldSec = closedTrades.reduce((s, t) => s + parseHoldSeconds(t.holdTime), 0)
  const avgHoldSec = closedTrades.length > 0 ? Math.round(totalHoldSec / closedTrades.length) : 0
  const avgTradeDuration = avgHoldSec > 0
    ? `${Math.floor(avgHoldSec / 3600)}h ${Math.floor((avgHoldSec % 3600) / 60)}m`
    : "0h 0m"

  const openPositions = dashData.openPositions ?? []

  const data: MockData = {
    summary: {
      netPnl: Math.round(totalPnl * 100) / 100,
      grossPnl: Math.round(wins.reduce((s, t) => s + t.realisedPnl, 0) * 100) / 100,
      grossLoss: Math.round(losses.reduce((s, t) => s + t.realisedPnl, 0) * 100) / 100,
      winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
      profitFactor: losses.reduce((s, t) => s + Math.abs(t.realisedPnl), 0) > 0
        ? wins.reduce((s, t) => s + t.realisedPnl, 0) / losses.reduce((s, t) => s + Math.abs(t.realisedPnl), 0)
        : 0,
      totalTrades: closedTrades.length,
      winningTrades: wins.length,
      losingTrades: losses.length,
      avgWin: wins.length > 0 ? wins.reduce((s, t) => s + t.realisedPnl, 0) / wins.length : 0,
      avgLoss: losses.length > 0 ? losses.reduce((s, t) => s + t.realisedPnl, 0) / losses.length : 0,
      avgRRRatio: 0,
      bestTrade: closedTrades.length > 0 ? Math.max(...closedTrades.map((t) => t.realisedPnl)) : 0,
      worstTrade: closedTrades.length > 0 ? Math.min(...closedTrades.map((t) => t.realisedPnl)) : 0,
      currentBalance: Math.round(dashData.netWorth * 100) / 100,
      openPositions: openPositions.length,
      avgTradeDuration,
      totalFees: 0,
      sharpeRatio: 0,
    },
    equityCurve,
    dailyPnl,
    positions: openPositions.map((p) => ({
      id: `${p.exchange}-${p.symbol}-${p.side}`,
      pair: p.symbol.replace("USDT", "/USDT"),
      side: p.side,
      size: p.size,
      entry: p.entryPrice,
      mark: p.markPrice,
      pnl: p.unrealizedPnl,
      roi: p.entryPrice > 0 ? (p.unrealizedPnl / (p.size * p.entryPrice)) * 100 : 0,
      leverage: p.leverage,
      liquidation: p.liquidationPrice,
      unrealizedPnl: p.unrealizedPnl,
      exchange: p.exchange,
    })),
    trades: closedTrades.map((t) => ({
      id: String(t.id),
      time: t.exitTime,
      pair: t.symbol,
      side: t.dir,
      price: t.exit,
      qty: t.size,
      pnl: t.realisedPnl,
      roi: t.size > 0 ? (t.realisedPnl / (t.entry * t.size)) * 100 : 0,
      strategy: "",
      tags: [],
      duration: t.holdTime,
      exchange: t.exchange,
      fees: 0,
      notes: "",
    })),
    sides: [
      { side: "Long" as const, trades: closedTrades.filter((t) => t.dir === "Long").length, pnl: Math.round(closedTrades.filter((t) => t.dir === "Long").reduce((s, t) => s + t.realisedPnl, 0) * 100) / 100, winRate: 0, avgRoi: 0, volume: 0 },
      { side: "Short" as const, trades: closedTrades.filter((t) => t.dir === "Short").length, pnl: Math.round(closedTrades.filter((t) => t.dir === "Short").reduce((s, t) => s + t.realisedPnl, 0) * 100) / 100, winRate: 0, avgRoi: 0, volume: 0 },
    ],
    tags: [],
    durations: [],
    sizes: [],
    calendar: [],
    journal: [],
    closedTrades,
    assets,
  }

  return new Response(JSON.stringify(data), { headers: corsHeaders })
}

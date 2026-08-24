/**
 * Binance API Service — Production-ready implementation
 *
 * Key fixes from audit:
 * - Commission deducted from realisedPnl
 * - Proper trade pairing (entry + exit as a closed trade)
 * - HMAC-SHA256 signing per Binance spec
 * - Fetch timeout (10s)
 * - Error code mapping with retry on rate limits
 * - No console.log of sensitive data
 */

import type { AssetBalance, ClosedTrade, OpenPosition } from "../types"
import { pairFillsFIFO, buildClosedTrades } from "../utils/pairing"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BinanceMyTrade {
  symbol: string
  id: number
  orderId: number
  orderListId: number
  price: string
  qty: string
  quoteQty: string
  commission: string
  commissionAsset: string
  time: number
  isBuyer: boolean
  isMaker: boolean
  isBestMatch: boolean
}

interface BinanceError {
  code: number
  msg: string
}

interface BinanceBalance {
  asset: string
  free: string
  locked: string
}

interface BinanceAccountInfo {
  balances: BinanceBalance[]
}

// ─── Proxy config ───────────────────────────────────────────────────────────

export interface ProxyConfig {
  url: string   // e.g. "https://stone-journal.vercel.app/api/binance-proxy"
  secret: string
}

// ─── Constants ─────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 10_000
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 1_000

// Binance error codes that warrant a retry
const RETRYABLE_CODES = new Set([
  -1001,  // DISCONNECTED
  -1003,  // TOO_MANY_REQUESTS (rate limit)
  -1015,  // TOO_MANY_ORDERS
  -1016,  // SERVICE_SHUTTING_DOWN
])

// ─── Error classes ──────────────────────────────────────────────────────────

class BinanceApiError extends Error {
  constructor(
    public readonly code: number,
    public readonly httpStatus: number,
    msg: string
  ) {
    super(`Binance API [${code}]: ${msg}`)
    this.name = "BinanceApiError"
  }

  get retryable(): boolean {
    return RETRYABLE_CODES.has(this.code)
  }
}

// ─── Signing ────────────────────────────────────────────────────────────────

async function hmacSha256(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// ─── Fetch with timeout ─────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    })
    return res
  } finally {
    clearTimeout(timer)
  }
}

// ─── Retry with exponential backoff ─────────────────────────────────────────

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = MAX_RETRIES,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs)

      if (!res.ok) {
        let errorCode = 0
        let errorMsg = ""
        try {
          const body: BinanceError | BinanceError[] = await res.json()
          if (Array.isArray(body) && body.length > 0) {
            errorCode = body[0].code
            errorMsg = body[0].msg
          } else if (!Array.isArray(body) && "code" in body) {
            errorCode = (body as BinanceError).code
            errorMsg = (body as BinanceError).msg
          }
        } catch {
          // Can't parse body — use HTTP status
          errorMsg = await res.text().catch(() => `HTTP ${res.status}`)
        }

        const err = new BinanceApiError(errorCode, res.status, errorMsg)

        if (err.retryable && attempt < maxRetries) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt)
          await new Promise((r) => setTimeout(r, delay))
          continue
        }

        throw err
      }

      return res
    } catch (err) {
      if (err instanceof BinanceApiError) throw err
      // AbortError (timeout) — retry
      if ((err as Error).name === "AbortError" && attempt < maxRetries) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError ?? new Error("Max retries exceeded")
}

// ─── Trade pairing logic ────────────────────────────────────────────────────

/**
 * Pair buy+sell fills on the same symbol into closed trades.
 *
 * Strategy: FIFO matching — match buys with sells on the same symbol
 * in chronological order. Each buy fills the earliest unmatched sell (for Long)
 * or each sell fills the earliest unmatched buy (for Short).
 *
 * This is the correct approach for spot trading where a single "trade"
 * consists of an entry fill and an exit fill.
 */
export function pairTrades(trades: BinanceMyTrade[]): ClosedTrade[] {
  const paired = pairFillsFIFO(
    trades.map((t) => ({
      symbol: t.symbol,
      time: t.time,
      // Normalize isBuyer: Binance API returns boolean, but JSON serialization
      // may turn it into a string or it could be missing entirely.
      isBuy: typeof t.isBuyer === "string" ? t.isBuyer === "true" : Boolean(t.isBuyer),
      price: Number(t.price),
      qty: Number(t.qty),
      commission: Number(t.commission) || 0,
    }))
  )

  return buildClosedTrades(paired, "Binance", 10000)
}

// ─── Fetch account balances ─────────────────────────────────────────────────

/**
 * Call GET /api/v3/account to discover which assets have non-zero balances.
 * Returns an array of asset strings (e.g. ["BTC", "ETH", "BNB"]).
 * Returns empty array on failure — does not crash the caller.
 */
async function fetchAccountBalances(
  apiKey: string,
  secretKey: string,
  baseUrl: string,
  proxy?: ProxyConfig
): Promise<string[]> {
  try {
    const timestamp = Date.now()
    const recvWindow = 5000
    const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`
    const signature = await hmacSha256(queryString, secretKey)

    let url: string
    let headers: Record<string, string>
    const accountPath = `/api/v3/account?${queryString}&signature=${signature}`

    if (proxy) {
      url = `${proxy.url}${accountPath}`
      headers = {
        "X-Proxy-Secret": proxy.secret,
        "X-Target-Host": new URL(baseUrl).hostname,
        "X-MBX-APIKEY": apiKey,
      }
    } else {
      // Direct call (fallback)
      url = `${baseUrl}${accountPath}`
      headers = { "X-MBX-APIKEY": apiKey }
    }

    const res = await fetchWithRetry(url, { headers })

    const account: BinanceAccountInfo = await res.json()

    if (!account || !Array.isArray(account.balances)) {
      console.error("[Binance] Unexpected account response shape:", JSON.stringify(account).substring(0, 200))
      return []
    }

    const assets = account.balances
      .filter((b) => Number(b.free) > 0 || Number(b.locked) > 0)
      .map((b) => b.asset)

    console.log(`[Binance] Account has ${assets.length} assets with non-zero balances: ${assets.join(", ")}`)
    return assets
  } catch (err) {
    console.error("[Binance] Failed to fetch account balances:", err)
    return []
  }
}

// ─── Fetch account balances detailed (with USDT values) ──────────────────────

/**
 * Fetch account balances with USDT values via /api/v3/ticker/price.
 * Returns AssetBalance[] with valueUsdt and priceUsdt computed.
 * Errors propagate to caller (dashboard.handler.ts) which sets valid:false with error message.
 */
export async function fetchAccountBalancesDetailed(
  apiKey: string,
  secretKey: string,
  baseUrl: string = "https://api1.binance.com",
  proxy?: ProxyConfig
): Promise<AssetBalance[]> {
  // Step 1: Fetch full account info to get free/locked amounts
    const timestamp = Date.now()
    const recvWindow = 5000
    const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`
    const signature = await hmacSha256(queryString, secretKey)

    let url: string
    let headers: Record<string, string>
    const accountPath = `/api/v3/account?${queryString}&signature=${signature}`

    if (proxy) {
      url = `${proxy.url}${accountPath}`
      headers = {
        "X-Proxy-Secret": proxy.secret,
        "X-Target-Host": new URL(baseUrl).hostname,
        "X-MBX-APIKEY": apiKey,
      }
    } else {
      url = `${baseUrl}${accountPath}`
      headers = { "X-MBX-APIKEY": apiKey }
    }

    const res = await fetchWithRetry(url, { headers })
    const account: BinanceAccountInfo = await res.json()

    if (!account || !Array.isArray(account.balances)) {
      console.error("[Binance] Unexpected account response shape for detailed balances")
      return []
    }

    // Filter to non-zero balances
    const nonZeroBalances = account.balances.filter(
      (b) => Number(b.free) > 0 || Number(b.locked) > 0
    )

    if (nonZeroBalances.length === 0) {
      return []
    }

    // Step 2: Fetch ALL prices in a single bulk call (1 subrequest vs N individual calls)
    // This is critical for staying within Cloudflare Worker's 50-subrequest limit
    const priceMap = new Map<string, number>()
    priceMap.set("USDT", 1) // USDT price is always 1

    try {
      const bulkPricePath = "/api/v3/ticker/price"
      let bulkPriceUrl: string
      let bulkPriceHeaders: Record<string, string> = {}

      if (proxy) {
        bulkPriceUrl = `${proxy.url}${bulkPricePath}`
        bulkPriceHeaders = {
          "X-Proxy-Secret": proxy.secret,
          "X-Target-Host": new URL(baseUrl).hostname,
        }
      } else {
        bulkPriceUrl = `${baseUrl}${bulkPricePath}`
      }

      // The bulk price payload (~2k pairs, ~150KB) is slow through the tunnel;
      // give it a dedicated, longer timeout so balances don't silently show $0.
      const bulkRes = await fetchWithRetry(bulkPriceUrl, { headers: bulkPriceHeaders }, MAX_RETRIES, 25_000)
      if (bulkRes.ok) {
        const allPrices: Array<{ symbol: string; price: string }> = await bulkRes.json()
        // Build a lookup: baseAsset -> price (e.g., "BTC" -> 65000.5)
        for (const p of allPrices) {
          if (p.symbol.endsWith("USDT")) {
            const baseAsset = p.symbol.slice(0, -4) // Remove "USDT" suffix
            priceMap.set(baseAsset, Number(p.price) || 0)
          }
        }
      } else {
        console.error("[Binance] Bulk price fetch failed, prices will be 0")
      }
    } catch (err) {
      console.error("[Binance] Bulk price fetch error:", err instanceof Error ? err.message : String(err))
    }

    // Step 3: Build AssetBalance[] with computed valueUsdt
    const assets: AssetBalance[] = nonZeroBalances.map((b) => {
      const free = Number(b.free)
      const locked = Number(b.locked)
      // Strip LD prefix for price lookup (e.g., LDDOGE → DOGE)
      const priceAsset = b.asset.startsWith("LD") ? b.asset.slice(2) : b.asset
      const priceUsdt = priceMap.get(priceAsset) ?? 0
      const valueUsdt = (free + locked) * priceUsdt

      return {
        symbol: b.asset,
        free: Math.round(free * 1e8) / 1e8,
        locked: Math.round(locked * 1e8) / 1e8,
        priceUsdt: Math.round(priceUsdt * 1e8) / 1e8,
        valueUsdt: Math.round(valueUsdt * 100) / 100,
      }
    })

    // Sort by valueUsdt descending
    assets.sort((a, b) => b.valueUsdt - a.valueUsdt)

    console.log(`[Binance] Detailed balances: ${assets.length} assets, total ~$${assets.reduce((s, a) => s + a.valueUsdt, 0).toFixed(2)}`)
    return assets
}

// ─── Fetch Binance Futures open positions ─────────────────────────────────

interface FuturesPosition {
  symbol: string
  positionAmt: string
  entryPrice: string
  markPrice: string
  unRealizedProfit: string
  liquidationPrice: string
  leverage: string
}

export async function fetchBinanceFuturesPositions(
  apiKey: string,
  secretKey: string,
  baseUrl: string = "https://fapi.binance.com",
  proxy?: ProxyConfig
): Promise<OpenPosition[]> {
  const timestamp = Date.now()
  const recvWindow = 5000
  const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`
  const signature = await hmacSha256(queryString, secretKey)
  const positionPath = `/fapi/v2/positionRisk?${queryString}&signature=${signature}`

  let url: string
  let headers: Record<string, string>
  if (proxy) {
    url = `${proxy.url}${positionPath}`
    headers = {
      "X-Proxy-Secret": proxy.secret,
      "X-Target-Host": "fapi.binance.com",
      "X-MBX-APIKEY": apiKey,
    }
  } else {
    url = `${baseUrl}${positionPath}`
    headers = { "X-MBX-APIKEY": apiKey }
  }

  const res = await fetchWithRetry(url, { headers })
  const positions: FuturesPosition[] = await res.json()

  // Filter to non-zero positions only
  const openPositions: OpenPosition[] = positions
    .filter((p) => Number(p.positionAmt) !== 0)
    .map((p) => ({
      symbol: p.symbol,
      side: Number(p.positionAmt) > 0 ? "Long" as const : "Short" as const,
      size: Math.abs(Number(p.positionAmt)),
      entryPrice: Number(p.entryPrice),
      markPrice: Number(p.markPrice),
      unrealizedPnl: Number(p.unRealizedProfit),
      leverage: Number(p.leverage),
      liquidationPrice: Number(p.liquidationPrice),
      exchange: "Binance" as const,
    }))

  console.log(`[Binance] Futures positions: ${openPositions.length} open`)
  return openPositions
}

// ─── Fetch Binance Futures wallet balance ─────────────────────────────────

/**
 * Returns the total futures wallet balance in USDT (wallet + unrealized pnl).
 * Falls back to 0 on any failure — the dashboard must not break on this.
 */
export async function fetchBinanceFuturesBalance(
  apiKey: string,
  secretKey: string,
  baseUrl: string = "https://fapi.binance.com",
  proxy?: ProxyConfig
): Promise<number> {
  try {
    const timestamp = Date.now()
    const queryString = `timestamp=${timestamp}&recvWindow=5000`
    const signature = await hmacSha256(queryString, secretKey)
    const balancePath = `/fapi/v2/balance?${queryString}&signature=${signature}`

    let url: string
    let headers: Record<string, string>
    if (proxy) {
      url = `${proxy.url}${balancePath}`
      headers = {
        "X-Proxy-Secret": proxy.secret,
        "X-Target-Host": "fapi.binance.com",
        "X-MBX-APIKEY": apiKey,
      }
    } else {
      url = `${baseUrl}${balancePath}`
      headers = { "X-MBX-APIKEY": apiKey }
    }

    const res = await fetchWithRetry(url, { headers })
    const balances: Array<{ asset: string; balance: string; unrealizedProfit: string }> = await res.json()
    const usdt = balances.find((b) => b.asset === "USDT")
    return usdt ? Number(usdt.balance) + Number(usdt.unrealizedProfit) : 0
  } catch (err) {
    console.error("[Binance] Futures balance fetch failed:", err instanceof Error ? err.message : err)
    return 0
  }
}

// ─── Fetch all Binance USDT spot trading pairs ────────────────────────────────

export async function fetchBinanceSpotSymbols(proxy?: ProxyConfig): Promise<string[]> {
  const exchangeInfoPath = "/api/v3/exchangeInfo"

  let url: string
  let headers: Record<string, string> = {}
  if (proxy) {
    url = `${proxy.url}${exchangeInfoPath}`
    headers = {
      "X-Proxy-Secret": proxy.secret,
      "X-Target-Host": "api1.binance.com",
    }
  } else {
    url = `https://api1.binance.com${exchangeInfoPath}`
  }

  const res = await fetchWithRetry(url, { headers })
  const data = await res.json() as {
    symbols: Array<{ symbol: string; status: string; isSpotTradingAllowed?: boolean }>
  }

  // Filter to USDT pairs that are trading
  const usdtPairs = (data.symbols || [])
    .filter((s) => s.symbol.endsWith("USDT") && s.status === "TRADING")
    .map((s) => s.symbol)

  console.log(`[Binance] Discovered ${usdtPairs.length} USDT spot trading pairs`)
  return usdtPairs
}

// ─── Incremental per-symbol myTrades (used by the sync engine) ───────────────

export interface MyTradesQuery {
  fromId?: number
  startTime?: number
  endTime?: number
}

/**
 * Fetch up to 1000 myTrades for a single symbol, optionally paginated.
 * Returns [] for error responses (invalid/delisted symbol) so the sync
 * engine can skip the symbol without failing the batch.
 */
export async function fetchSymbolMyTrades(
  apiKey: string,
  secretKey: string,
  symbol: string,
  baseUrl: string = "https://api1.binance.com",
  proxy?: ProxyConfig,
  query: MyTradesQuery = {}
): Promise<BinanceMyTrade[]> {
  const params = [`symbol=${symbol}`, `limit=1000`]
  if (query.fromId != null) params.push(`fromId=${query.fromId}`)
  if (query.startTime != null) params.push(`startTime=${query.startTime}`)
  if (query.endTime != null) params.push(`endTime=${query.endTime}`)
  params.push(`timestamp=${Date.now()}`, `recvWindow=5000`)
  const queryString = params.join("&")
  const signature = await hmacSha256(queryString, secretKey)

  let url: string
  let headers: Record<string, string>
  const tradesPath = `/api/v3/myTrades?${queryString}&signature=${signature}`

  if (proxy) {
    url = `${proxy.url}${tradesPath}`
    headers = {
      "X-Proxy-Secret": proxy.secret,
      "X-Target-Host": new URL(baseUrl).hostname,
      "X-MBX-APIKEY": apiKey,
    }
  } else {
    url = `${baseUrl}${tradesPath}`
    headers = { "X-MBX-APIKEY": apiKey }
  }

  const res = await fetchWithRetry(url, { headers })
  const trades = (await res.json()) as BinanceMyTrade[] | { code?: number; msg?: string }
  return Array.isArray(trades) ? trades : []
}

// ─── Main export ────────────────────────────────────────────────────────────

export async function fetchBinanceTrades(
  apiKey: string,
  secretKey: string,
  baseUrl: string = "https://api1.binance.com",
  proxy?: ProxyConfig
): Promise<ClosedTrade[]> {
  // Step 1: Discover which assets the account holds
  const assets = await fetchAccountBalances(apiKey, secretKey, baseUrl, proxy)

  // Note: don't return early if assets is empty — knownPairs will still provide symbols to check

  // Strip LD prefix from liquidity derivative tokens (e.g., LDDOGE → DOGE)
  const baseAssets = [...new Set(assets.map((a) => a.startsWith("LD") ? a.slice(2) : a))]

  // Balance-derived symbols (from current holdings)
  const balanceSymbols = baseAssets
    .filter((a) => a !== "USDT")
    .map((a) => `${a}USDT`)

  // Known USDT pairs commonly traded — covers most active pairs while staying
  // within Cloudflare Worker's 50-subrequest limit on the free plan.
  // Budget: 1(account) + ~35(myTrades) + 1(bulk prices) + 1(futures) + 5(Bybit) = ~43
  const knownPairs = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT",
    "ADAUSDT", "AVAXUSDT", "DOTUSDT", "LINKUSDT", "UNIUSDT",
    "ATOMUSDT", "FTMUSDT", "NEARUSDT", "AAVEUSDT", "SANDUSDT",
    "SHBUSDT", "PEPEUSDT", "WIFUSDT", "ENAUSDT", "NOTUSDT", "TRXUSDT",
    "QUICKUSDT", "LTCUSDT", "BCHUSDT", "ETCUSDT", "FILUSDT",
    "APTUSDT", "ARBUSDT", "OPUSDT", "SUIUSDT", "SEIUSDT", "TIAUSDT",
    "MATICUSDT", "INJUSDT", "RUNEUSDT",
  ]

  // Merge balance-derived symbols + known pairs, deduplicate
  const symbols = [...new Set([...balanceSymbols, ...knownPairs])]

  console.log(`[Binance] Fetching trades for ${symbols.length} symbols: ${symbols.join(", ")}`)

  if (symbols.length === 0) {
    return []
  }

  // Step 2: Fetch myTrades for each symbol, chunked.
  // Firing 40+ concurrent requests through the local proxy/tunnel starves
  // individual calls (and the bulk price fetch later), causing timeouts.
  // Chunking keeps the tunnel responsive while staying well under the
  // Worker free-plan subrequest ceiling.
  const recvWindow = 5000
  const limit = 1000
  const CHUNK_SIZE = 8

  const fetchSymbolTrades = async (symbol: string): Promise<BinanceMyTrade[]> => {
    const timestamp = Date.now()
    const queryString = `symbol=${symbol}&timestamp=${timestamp}&recvWindow=${recvWindow}&limit=${limit}`
    const signature = await hmacSha256(queryString, secretKey)

    let url: string
    let headers: Record<string, string>
    const tradesPath = `/api/v3/myTrades?${queryString}&signature=${signature}`

    if (proxy) {
      url = `${proxy.url}${tradesPath}`
      headers = {
        "X-Proxy-Secret": proxy.secret,
        "X-Target-Host": new URL(baseUrl).hostname,
        "X-MBX-APIKEY": apiKey,
      }
    } else {
      url = `${baseUrl}${tradesPath}`
      headers = { "X-MBX-APIKEY": apiKey }
    }

    const res = await fetchWithRetry(url, { headers })
    return (await res.json()) as BinanceMyTrade[]
  }

  // Step 3: Merge all per-symbol trade arrays (chunked for tunnel friendliness)
  const allTrades: BinanceMyTrade[] = []

  for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
    const chunk = symbols.slice(i, i + CHUNK_SIZE)
    const results = await Promise.allSettled(chunk.map(fetchSymbolTrades))

    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      if (result.status === "fulfilled") {
        if (Array.isArray(result.value)) {
          allTrades.push(...result.value)
        }
      } else {
        console.error(`[Binance] Failed to fetch trades for ${chunk[j]}:`, result.reason)
      }
    }
  }

  console.log(`[Binance] Fetched trades for ${symbols.length} symbols, ${allTrades.length} raw fills`)

  if (allTrades.length === 0) {
    console.log("[Binance] No trades found across all symbols")
    return []
  }

  console.log(`[Binance] Total raw trades: ${allTrades.length}, pairing...`)
  return pairTrades(allTrades)
}

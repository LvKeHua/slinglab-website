/**
 * Bybit API Service — Production-ready implementation
 *
 * Key fixes from audit:
 * - execFee deducted from realisedPnl
 * - Proper trade pairing (entry + exit as a closed trade)
 * - HMAC-SHA256 signing per Bybit V5 spec
 * - Fetch timeout (10s)
 * - Error code mapping with retry on rate limits
 * - No console.log of sensitive data
 */

import type { AssetBalance, ClosedTrade } from "../types"
import { pairFillsFIFO, buildClosedTrades } from "../utils/pairing"
import type { ProxyConfig } from "./binance.service"

// ─── Types ──────────────────────────────────────────────────────────────────

interface BybitExecution {
  symbol: string
  orderId: string
  execId: string
  execPrice: string
  execQty: string
  execType: string
  execSide: string
  execTime: string
  execFee: string
  leavesQty: string
  closedSize: string
  cumExecQty: string
  cumExecValue: string
  orderType: string
  side: string
  feeRate: string
  feeCurrency: string
  tradeIv: string
  markPrice: string
  indexPrice: string
  underlyingPrice: string
  blockTradeId: string
}

interface BybitResponse {
  retCode: number
  retMsg: string
  result: {
    list: BybitExecution[]
    nextPageCursor: string
  }
  time: number
}

// ─── Constants ─────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 10_000
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 1_000

// Bybit error codes that warrant a retry
const RETRYABLE_CODES = new Set([
  10006,  // Rate limit
  10016,  // Server busy
  10010,  // Request frequency too high
])

// ─── Error class ────────────────────────────────────────────────────────────

class BybitApiError extends Error {
  constructor(
    public readonly code: number,
    public readonly msg: string
  ) {
    super(`Bybit API [${code}]: ${msg}`)
    this.name = "BybitApiError"
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
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ─── Retry with exponential backoff ─────────────────────────────────────────

async function fetchWithRetry(url: string, init: RequestInit, maxRetries = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init)

      if (!res.ok) {
        let errorMsg = ""
        try {
          errorMsg = await res.text()
        } catch {
          errorMsg = `HTTP ${res.status}`
        }
        throw new Error(`Bybit HTTP ${res.status}: ${errorMsg}`)
      }

      const json: BybitResponse = await res.json()

      if (json.retCode !== 0) {
        const err = new BybitApiError(json.retCode, json.retMsg)
        if (err.retryable && attempt < maxRetries) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt)
          await new Promise((r) => setTimeout(r, delay))
          continue
        }
        throw err
      }

      return res
    } catch (err) {
      if (err instanceof BybitApiError) throw err
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
 * Pair Bybit executions into closed trades using FIFO matching.
 *
 * Buys and sells on the same symbol are paired in chronological order.
 * A buy-then-sell = Long trade; sell-then-buy = Short trade.
 */
function pairBybitTrades(executions: BybitExecution[]): ClosedTrade[] {
  // Filter only trade-type executions
  const fills = executions
    .filter((e) => e.execType === "Trade")
    .map((e) => ({
      symbol: e.symbol,
      time: Number(e.execTime),
      isBuy: e.side === "Buy",
      price: Number(e.execPrice),
      qty: Number(e.execQty),
      commission: Number(e.execFee || "0"),
    }))

  return buildClosedTrades(pairFillsFIFO(fills), "Bybit", 20000)
}

// ─── Fetch all Bybit USDT spot trading pairs ────────────────────────────────

async function fetchBybitSpotSymbols(): Promise<string[]> {
  const url = "https://api.bybit.com/v5/market/instruments-info?category=spot&limit=1000"

  const res = await fetchWithTimeout(url, {})
  const json = await res.json() as {
    retCode: number
    retMsg: string
    result: {
      list: Array<{ symbol: string; baseCoin: string; quoteCoin: string; status: string }>
    }
  }

  if (json.retCode !== 0) {
    console.error("[Bybit] Failed to fetch instruments info:", json.retMsg)
    return []
  }

  // Filter to USDT pairs that are Trading
  const usdtPairs = (json.result.list || [])
    .filter((s) => s.quoteCoin === "USDT" && s.status === "Trading")
    .map((s) => s.symbol)

  console.log(`[Bybit] Discovered ${usdtPairs.length} USDT spot trading pairs`)
  return usdtPairs
}

// ─── Main export ────────────────────────────────────────────────────────────

export async function fetchBybitTrades(
  apiKey: string,
  secretKey: string,
  baseUrl: string = "https://api.bybit.com",
  proxy?: ProxyConfig
): Promise<ClosedTrade[]> {
  const timestamp = Date.now()
  const recvWindow = 5000

  // Fetch recent spot executions — Bybit returns up to 100 per page
  // We fetch multiple pages to get comprehensive trade history
  const allExecutions: BybitExecution[] = []
  let cursor: string | undefined = undefined
  const maxPages = 5
  let page = 0

  while (page < maxPages) {
    const paramString = cursor
      ? `category=spot&limit=100&cursor=${cursor}`
      : "category=spot&limit=100"
    const signPayload = `${timestamp}${apiKey}${recvWindow}${paramString}`
    const signature = await hmacSha256(signPayload, secretKey)

    // Bybit blocks direct requests from some regions — route through the local
    // proxy (same tunnel as Binance) when configured.
    const path = `/v5/execution/list?${paramString}`
    const url = proxy ? `${proxy.url}${path}` : `${baseUrl}${path}`
    const headers: Record<string, string> = {
      "X-BAPI-API-KEY": apiKey,
      "X-BAPI-TIMESTAMP": String(timestamp),
      "X-BAPI-SIGN": signature,
      "X-BAPI-RECV-WINDOW": String(recvWindow),
    }
    if (proxy) {
      headers["X-Proxy-Secret"] = proxy.secret
      headers["X-Target-Host"] = new URL(baseUrl).hostname
    }

    const res = await fetchWithRetry(url, { headers })

    const json: BybitResponse = await res.json()

    if (json.retCode !== 0) {
      throw new BybitApiError(json.retCode, json.retMsg)
    }

    const executions = json.result.list
    if (!executions || executions.length === 0) {
      break
    }

    allExecutions.push(...executions)

    // Check if there's a next page
    cursor = json.result.nextPageCursor
    if (!cursor || cursor === "") {
      break
    }

    page++
  }

  console.log(`[Bybit] Total executions fetched: ${allExecutions.length} (${page + 1} pages)`)

  if (allExecutions.length === 0) {
    return []
  }

  return pairBybitTrades(allExecutions)
}

// ─── Fetch Bybit wallet balance ─────────────────────────────────────────────

interface BybitCoinBalance {
  coin: string
  walletBalance: string
  totalEquity: string
}

interface BybitWalletResponse {
  retCode: number
  retMsg: string
  result?: {
    list?: Array<{ coin: BybitCoinBalance[] }>
  }
}

/**
 * Fetch wallet balances (USDT-valued) for a Bybit account.
 * Tries the unified account first; falls back to a spot wallet when the
 * account isn't unified. Non-USDT coins are listed with valueUsdt 0 —
 * pricing them would cost extra subrequests against the Worker free plan.
 */
async function fetchBybitWalletBalance(
  apiKey: string,
  secretKey: string,
  accountType: "UNIFIED" | "SPOT",
  baseUrl: string,
  proxy?: ProxyConfig
): Promise<AssetBalance[]> {
  const timestamp = Date.now()
  const recvWindow = 5000
  const queryString = `accountType=${accountType}`
  const signPayload = `${timestamp}${apiKey}${recvWindow}${queryString}`
  const signature = await hmacSha256(signPayload, secretKey)

  const path = `/v5/account/wallet-balance?${queryString}`
  const url = proxy ? `${proxy.url}${path}` : `${baseUrl}${path}`
  const headers: Record<string, string> = {
    "X-BAPI-API-KEY": apiKey,
    "X-BAPI-TIMESTAMP": String(timestamp),
    "X-BAPI-SIGN": signature,
    "X-BAPI-RECV-WINDOW": String(recvWindow),
  }
  if (proxy) {
    headers["X-Proxy-Secret"] = proxy.secret
    headers["X-Target-Host"] = new URL(baseUrl).hostname
  }

  const res = await fetchWithRetry(url, { headers })

  const json: BybitWalletResponse = await res.json()
  if (json.retCode !== 0) {
    throw new BybitApiError(json.retCode, json.retMsg)
  }

  const coins = json.result?.list?.[0]?.coin ?? []
  const assets: AssetBalance[] = coins.map((c) => {
    const free = Number(c.walletBalance) || 0
    const isUsdt = c.coin === "USDT"
    return {
      symbol: c.coin,
      free: Math.round(free * 1e8) / 1e8,
      locked: 0,
      priceUsdt: isUsdt ? 1 : 0,
      valueUsdt: isUsdt ? Math.round(free * 100) / 100 : 0,
    }
  })
  assets.sort((a, b) => b.valueUsdt - a.valueUsdt)

  console.log(`[Bybit] Wallet balance (${accountType}): ${assets.length} coins, USDT ~$${assets.find((a) => a.symbol === "USDT")?.valueUsdt ?? 0}`)
  return assets
}

/**
 * Public entry point: unified wallet with spot fallback.
 * Returns [] (never throws) so a failing wallet call degrades the dashboard
 * gracefully instead of failing the whole request.
 */
export async function fetchBybitWalletBalances(
  apiKey: string,
  secretKey: string,
  baseUrl: string = "https://api.bybit.com",
  proxy?: ProxyConfig
): Promise<AssetBalance[]> {
  try {
    return await fetchBybitWalletBalance(apiKey, secretKey, "UNIFIED", baseUrl, proxy)
  } catch (err) {
    // Non-unified accounts reject UNIFIED with 110043/110002 — retry as SPOT.
    if (err instanceof BybitApiError && (err.code === 110043 || err.code === 110002)) {
      return fetchBybitWalletBalance(apiKey, secretKey, "SPOT", baseUrl, proxy)
    }
    console.error("[Bybit] Wallet balance fetch failed:", err instanceof Error ? err.message : String(err))
    return []
  }
}

/**
 * Validate Bybit credentials (throws on invalid keys).
 * Used by the settings "Test Connection" endpoint.
 */
export async function testBybitConnection(
  apiKey: string,
  secretKey: string,
  baseUrl: string = "https://api.bybit.com",
  proxy?: ProxyConfig
): Promise<void> {
  try {
    await fetchBybitWalletBalance(apiKey, secretKey, "UNIFIED", baseUrl, proxy)
  } catch (err) {
    if (err instanceof BybitApiError && (err.code === 110043 || err.code === 110002)) {
      await fetchBybitWalletBalance(apiKey, secretKey, "SPOT", baseUrl, proxy)
      return
    }
    throw err
  }
}
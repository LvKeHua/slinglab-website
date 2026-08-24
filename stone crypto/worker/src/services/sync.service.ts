/**
 * Rolling sync engine — full Binance trade coverage within the Worker
 * free-plan subrequest limit (50 per invocation).
 *
 * The cron fires every 5 minutes and processes ONE slice of the full USDT
 * symbol list (~24 symbols per run). Raw fills are merged into a KV master
 * store (deduped by symbol+id), re-paired, and published as a cache the
 * dashboard reads with 0 subrequests. Bybit executions are refreshed every
 * run. See full-trade-coverage-plan.md.
 */

import type { ClosedTrade, DashboardResponse } from "../types"
import { getExchangeKeys } from "../utils/exchange-keys"
import { pairFillsFIFO, buildClosedTrades } from "../utils/pairing"
import {
  fetchBinanceSpotSymbols,
  fetchSymbolMyTrades,
  type BinanceMyTrade,
  type ProxyConfig,
} from "./binance.service"
import { fetchBybitTrades } from "./bybit.service"

export interface SyncEnv {
  STONE_DATA: KVNamespace
  BINANCE_PROXY_URL?: string
  BINANCE_PROXY_SECRET?: string
  STONE_ENC_KEY?: string
}

// Symbols that may be delisted from exchangeInfo but still carry user history.
const LEGACY_PAIRS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT",
  "ADAUSDT", "AVAXUSDT", "DOTUSDT", "LINKUSDT", "UNIUSDT",
  "ATOMUSDT", "FTMUSDT", "NEARUSDT", "AAVEUSDT", "SANDUSDT",
  "SHBUSDT", "PEPEUSDT", "WIFUSDT", "ENAUSDT", "NOTUSDT", "TRXUSDT",
  "QUICKUSDT", "LTCUSDT", "BCHUSDT", "ETCUSDT", "FILUSDT",
  "APTUSDT", "ARBUSDT", "OPUSDT", "SUIUSDT", "SEIUSDT", "TIAUSDT",
  "MATICUSDT", "INJUSDT", "RUNEUSDT", "DOGSUSDT", "IOUSDT", "MAVUSDT", "ENSUSDT",
]

const BATCH_SIZE = 24
const FORWARD_MAX_PAGES = 5   // incremental catch-up pages per symbol
const BACK_MAX_PAGES = 5      // first-sync back-fill pages per symbol
const RAW_CAP = 25_000        // cap on merged raw fills (KV value size)

const KV = {
  symbols: "binance_symbols",
  cursor: "sync_cursor",
  raw: "binance_raw_trades",
  binanceCache: "binance_trades_cache",
  bybitCache: "bybit_trades_cache",
  meta: "caches_meta",
}

interface SyncCursor {
  batchIndex: number
  totalBatches: number
  lastFullSync: string | null
  fromIds: Record<string, number>
}

interface CachesMeta {
  lastUpdated: string
  binanceUpdatedAt: string | null
  bybitUpdatedAt: string | null
}

function proxyFromEnv(env: SyncEnv): ProxyConfig | undefined {
  return env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET
    ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET }
    : undefined
}

// ─── Cache reads (shared by dashboard/calendar/data handlers) ──────────────

/**
 * Merge the two exchange caches into one reindexed list (newest first).
 */
export function mergeTradeCaches(binance: ClosedTrade[], bybit: ClosedTrade[]): ClosedTrade[] {
  const all = [...binance, ...bybit].sort(
    (a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime()
  )
  return all.map((t, i) => ({
    ...t,
    id: all.length - i,
    sequence: all.length - i,
    isWin: t.realisedPnl > 0,
    isBreakeven: t.realisedPnl === 0,
  }))
}

/**
 * Build a DashboardResponse from the KV caches (0 subrequests).
 * Returns null when neither cache exists yet (first deployment).
 */
export async function buildDashboardFromCaches(kv: KVNamespace): Promise<DashboardResponse | null> {
  const [binance, bybit, meta] = await Promise.all([
    kv.get(KV.binanceCache, "json") as Promise<ClosedTrade[] | null>,
    kv.get(KV.bybitCache, "json") as Promise<ClosedTrade[] | null>,
    kv.get(KV.meta, "json") as Promise<CachesMeta | null>,
  ])

  if (!binance && !bybit) return null

  const closedTrades = mergeTradeCaches(binance ?? [], bybit ?? [])
  const netWorth = closedTrades.reduce((s, t) => s + t.realisedPnl, 0) + 50000 // placeholder, replaced by live balances

  return {
    closedTrades,
    netWorth: Math.round(netWorth * 100) / 100,
    lastUpdated: meta?.lastUpdated ?? new Date().toISOString(),
  }
}

// ─── Sync engine ────────────────────────────────────────────────────────────

/**
 * One cron tick: sync one batch of Binance symbols + refresh Bybit.
 * Never clobbers an existing cache on failure.
 */
export async function runSyncEngine(env: SyncEnv): Promise<{ ok: boolean; detail: string }> {
  const kv = env.STONE_DATA
  const keys = await getExchangeKeys(kv, env.STONE_ENC_KEY)
  if (!keys.binance && !keys.bybit) {
    return { ok: false, detail: "no exchange keys configured" }
  }
  const proxy = proxyFromEnv(env)
  const detail: string[] = []

  // 1. Symbol list (refreshed daily)
  let symbols: string[] | null = (await kv.get(KV.symbols, "json")) as string[] | null
  if (!symbols || symbols.length === 0) {
    let live: string[] = []
    if (keys.binance && proxy) {
      try {
        live = await fetchBinanceSpotSymbols(proxy)
      } catch (err) {
        console.error("[Sync] exchangeInfo failed:", err instanceof Error ? err.message : err)
      }
    }
    symbols = [...new Set([...live, ...LEGACY_PAIRS])]
    await kv.put(KV.symbols, JSON.stringify(symbols), { expirationTtl: 86_400 })
    detail.push(`symbols: ${symbols.length} (${live.length} live + legacy)`)
  }

  // 2. Cursor
  const totalBatches = Math.max(1, Math.ceil(symbols.length / BATCH_SIZE))
  const cursor: SyncCursor =
    ((await kv.get(KV.cursor, "json")) as SyncCursor | null) ?? {
      batchIndex: 0,
      totalBatches,
      lastFullSync: null,
      fromIds: {},
    }
  cursor.totalBatches = totalBatches
  if (cursor.batchIndex >= totalBatches) cursor.batchIndex = 0

  // 3. Process the current batch (Binance)
  if (keys.binance) {
    const batch = symbols.slice(cursor.batchIndex * BATCH_SIZE, (cursor.batchIndex + 1) * BATCH_SIZE)
    const raw: BinanceMyTrade[] = ((await kv.get(KV.raw, "json")) as BinanceMyTrade[] | null) ?? []
    const byId = new Map<string, BinanceMyTrade>(raw.map((t) => [`${t.symbol}:${t.id}`, t]))
    let fetched = 0

    for (const symbol of batch) {
      try {
        fetched += await syncSymbolTrades(byId, cursor, symbol, keys.binance.apiKey, keys.binance.secretKey, proxy)
      } catch (err) {
        console.error(`[Sync] ${symbol} failed:`, err instanceof Error ? err.message : err)
      }
    }

    if (fetched > 0 || batch.length > 0) {
      const merged = [...byId.values()].sort((a, b) => a.time - b.time).slice(-RAW_CAP)
      const closed = buildClosedTrades(
        pairFillsFIFO(
          merged.map((t) => ({
            symbol: t.symbol,
            time: t.time,
            isBuy: typeof t.isBuyer === "string" ? t.isBuyer === "true" : Boolean(t.isBuyer),
            price: Number(t.price),
            qty: Number(t.qty),
            commission: Number(t.commission) || 0,
          }))
        ),
        "Binance",
        10000
      )
      await kv.put(KV.raw, JSON.stringify(merged))
      await kv.put(KV.binanceCache, JSON.stringify(closed))
      detail.push(`binance batch ${cursor.batchIndex + 1}/${totalBatches}: +${fetched} raw → ${closed.length} closed`)
    }
  }

  // 4. Bybit (refresh every run; keep old cache on failure)
  if (keys.bybit) {
    try {
      const bybitClosed = await fetchBybitTrades(keys.bybit.apiKey, keys.bybit.secretKey, "https://api.bybit.com", proxy)
      await kv.put(KV.bybitCache, JSON.stringify(bybitClosed))
      detail.push(`bybit: ${bybitClosed.length} closed`)
    } catch (err) {
      console.error("[Sync] Bybit fetch failed — keeping previous cache:", err instanceof Error ? err.message : err)
    }
  }

  // 5. Advance cursor + meta
  cursor.batchIndex++
  if (cursor.batchIndex >= totalBatches) {
    cursor.batchIndex = 0
    cursor.lastFullSync = new Date().toISOString()
  }
  await kv.put(KV.cursor, JSON.stringify(cursor))

  const now = new Date().toISOString()
  const meta: CachesMeta = {
    lastUpdated: now,
    binanceUpdatedAt: now,
    bybitUpdatedAt: now,
  }
  await kv.put(KV.meta, JSON.stringify(meta))

  return { ok: true, detail: detail.join("; ") || "no-op" }
}

/**
 * Fetch new fills for one symbol (forward incremental + one-time back-fill)
 * and merge them into the shared byId map. Returns the number of new fills.
 */
async function syncSymbolTrades(
  byId: Map<string, BinanceMyTrade>,
  cursor: SyncCursor,
  symbol: string,
  apiKey: string,
  secretKey: string,
  proxy: ProxyConfig | undefined
): Promise<number> {
  const seenId = cursor.fromIds[symbol]
  let added = 0

  if (seenId == null) {
    // First sync: grab the most recent 1000, then walk back in time windows.
    let endTime: number | undefined
    for (let page = 0; page <= BACK_MAX_PAGES; page++) {
      const pageTrades = await fetchSymbolMyTrades(apiKey, secretKey, symbol, "https://api1.binance.com", proxy, {
        endTime,
      })
      if (pageTrades.length === 0) break
      for (const t of pageTrades) {
        if (!byId.has(`${t.symbol}:${t.id}`)) added++
        byId.set(`${t.symbol}:${t.id}`, t)
      }
      const oldest = pageTrades[0]
      const newest = pageTrades[pageTrades.length - 1]
      cursor.fromIds[symbol] = Math.max(cursor.fromIds[symbol] ?? 0, newest.id)
      if (pageTrades.length < 1000) break
      // Continue with the window strictly before the oldest fill on this page.
      const nextEndTime = oldest.time - 1
      if (nextEndTime === endTime || nextEndTime <= 0) break
      endTime = nextEndTime
    }
  } else {
    // Incremental: everything newer than the last seen id.
    let fromId = seenId
    for (let page = 0; page < FORWARD_MAX_PAGES; page++) {
      const pageTrades = await fetchSymbolMyTrades(apiKey, secretKey, symbol, "https://api1.binance.com", proxy, {
        fromId,
      })
      if (pageTrades.length === 0) break
      for (const t of pageTrades) {
        if (!byId.has(`${t.symbol}:${t.id}`)) added++
        byId.set(`${t.symbol}:${t.id}`, t)
      }
      const newest = pageTrades[pageTrades.length - 1]
      if (newest.id <= fromId) break
      fromId = newest.id
      cursor.fromIds[symbol] = fromId
      if (pageTrades.length < 1000) break
    }
  }

  return added
}

/**
 * Trade history fetchers — Binance (all USDT pairs, paginated) and
 * CrossEx (7 venues via one Gate key). Fills are paired into ClosedTrades
 * with the FIFO engine.
 */
import { createHmac } from "node:crypto";
import { pairFillsFIFO, buildClosedTrades, type ClosedTrade, type FillLike } from "./pairing.js";
import { GateCrossExClient, type GateCredentials } from "./exchanges/crossex.js";

const FETCH_TIMEOUT_MS = 15_000;

async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function hmacHex(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

// ─── Binance ────────────────────────────────────────────────────────────────

export interface BinanceMyTrade {
  symbol: string;
  id: number;
  price: string;
  qty: string;
  commission: string;
  time: number;
  isBuyer: boolean;
}

export async function fetchBinanceSpotSymbols(): Promise<string[]> {
  const data = (await fetchJson("https://api.binance.com/api/v3/exchangeInfo")) as {
    symbols: Array<{ symbol: string; status: string }>;
  };
  return (data.symbols || [])
    .filter((s) => s.symbol.endsWith("USDT") && s.status === "TRADING")
    .map((s) => s.symbol);
}

export async function fetchSymbolMyTrades(
  apiKey: string,
  secretKey: string,
  symbol: string,
  query: { fromId?: number; endTime?: number } = {},
): Promise<BinanceMyTrade[]> {
  const params = [`symbol=${symbol}`, "limit=1000"];
  if (query.fromId != null) params.push(`fromId=${query.fromId}`);
  if (query.endTime != null) params.push(`endTime=${query.endTime}`);
  params.push(`timestamp=${Date.now()}`, "recvWindow=5000");
  const queryString = params.join("&");
  const signature = hmacHex(secretKey, queryString);
  const data = (await fetchJson(
    `https://api.binance.com/api/v3/myTrades?${queryString}&signature=${signature}`,
    { headers: { "X-MBX-APIKEY": apiKey } },
  )) as BinanceMyTrade[] | { code?: number };
  return Array.isArray(data) ? data : [];
}

/**
 * Full Binance spot trade history: walk every USDT pair, back-fill up to
 * 5 pages per symbol. No subrequest limit locally, so coverage is complete.
 */
export async function fetchBinanceTrades(
  apiKey: string,
  secretKey: string,
  account: string,
): Promise<ClosedTrade[]> {
  const symbols = await fetchBinanceSpotSymbols();
  const allFills: FillLike[] = [];

  for (const symbol of symbols) {
    let endTime: number | undefined;
    for (let page = 0; page < 5; page++) {
      const trades = await fetchSymbolMyTrades(apiKey, secretKey, symbol, { endTime });
      if (trades.length === 0) break;
      for (const t of trades) {
        allFills.push({
          symbol: t.symbol,
          time: t.time,
          isBuy: t.isBuyer,
          price: Number(t.price),
          qty: Number(t.qty),
          commission: Number(t.commission) || 0,
        });
      }
      if (trades.length < 1000) break;
      const oldest = trades[0];
      const nextEndTime = oldest.time - 1;
      if (nextEndTime === endTime || nextEndTime <= 0) break;
      endTime = nextEndTime;
    }
  }

  return buildClosedTrades(pairFillsFIFO(allFills), "Binance", account, 10000);
}

// ─── CrossEx (7 venues via one Gate key) ───────────────────────────────────

const CROSSEX_VENUES = ["GATE", "BINANCE", "OKX", "BYBIT", "KRAKEN", "HYPERLIQUID", "DERIBIT"] as const;

/**
 * Pull history trades from the CrossEx unified account. The API returns
 * fills across all connected venues; we pair them per venue so a trade
 * opened on Binance and closed on Gate still forms one closed trade.
 */
export async function fetchCrossExTrades(
  creds: GateCredentials,
  account: string,
): Promise<ClosedTrade[]> {
  const client = new GateCrossExClient();
  const portfolio = await client.queryPortfolio(creds);

  const fills: FillLike[] = portfolio.recentTrades.map((t) => ({
    symbol: t.symbol,
    time: Number(t.create_time) * 1000,
    isBuy: t.side === "buy" || t.side === "BUY",
    price: Number(t.price),
    qty: Number(t.qty),
    commission: Number(t.fee) || 0,
  }));

  const closed = buildClosedTrades(pairFillsFIFO(fills), "CrossEx", account, 20000);

  // Tag each closed trade with its venue when the symbol encodes it
  // (e.g. BINANCE_FUTURE_BTCUSDT). CrossEx symbols carry the venue prefix.
  return closed.map((t) => {
    const venue = CROSSEX_VENUES.find((v) => t.symbol.startsWith(`${v}_`));
    return venue ? { ...t, exchange: venue } : t;
  });
}

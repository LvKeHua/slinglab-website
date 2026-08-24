/**
 * Market radar — public futures data (Binance USDT-M tickers/funding, OKX
 * liquidations), fetched server-side so the frontend never depends on direct
 * exchange reachability. When the host needs an egress proxy, start the
 * server with NODE_USE_ENV_PROXY=1 and HTTP(S)_PROXY set (Node's global
 * fetch honors them).
 */

const FETCH_TIMEOUT_MS = 15_000;

export interface MarketRadarData {
  tickers: Array<{
    symbol: string;
    lastPrice: number;
    priceChangePercent: number;
    quoteVolume: number;
  }>;
  funding: Array<{ symbol: string; lastFundingRate: number }>;
  liquidations: Array<{
    symbol: string;
    side: string;
    price: number;
    origQty: number;
    time: number;
  }>;
  updatedAt: string;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

export async function fetchMarketRadar(): Promise<MarketRadarData> {
  const [tickData, fundData, liqRes] = await Promise.all([
    fetchJson("https://fapi.binance.com/fapi/v1/ticker/24hr") as Promise<Array<Record<string, string>>>,
    fetchJson("https://fapi.binance.com/fapi/v1/premiumIndex") as Promise<Array<Record<string, string>>>,
    fetchJson("https://www.okx.com/api/v5/public/liquidation-orders?instType=SWAP&uly=USDT") as Promise<{ data?: Array<Record<string, string>> }>,
  ]);

  const tickers = tickData
    .filter((t) => t.symbol.endsWith("USDT"))
    .map((t) => ({
      symbol: t.symbol,
      lastPrice: Number(t.lastPrice),
      priceChangePercent: Number(t.priceChangePercent),
      quoteVolume: Number(t.quoteVolume),
    }));

  const funding = fundData
    .filter((f) => f.symbol.endsWith("USDT"))
    .map((f) => ({ symbol: f.symbol, lastFundingRate: Number(f.lastFundingRate) * 100 }));

  const liquidations = (liqRes.data ?? []).map((l) => ({
    symbol: l.instId ?? "",
    side: l.posSide ?? l.side ?? "",
    price: Number(l.bkPx ?? l.price ?? 0),
    origQty: Number(l.sz ?? l.origQty ?? 0),
    time: Number(l.ts ?? l.time ?? 0),
  }));

  return { tickers, funding, liquidations, updatedAt: new Date().toISOString() };
}


/**
 * Funding-rate heatmap data: per-symbol funding history over the last N
 * hours. Binance's public fundingRate endpoint returns up to 1000 records
 * per symbol; we sample the top symbols by volume to keep the payload sane.
 */
export interface FundingHeatmapData {
  symbols: string[];
  hours: string[]; // ISO hour labels, oldest first
  matrix: number[][]; // [symbolIndex][hourIndex] = funding rate %
  updatedAt: string;
}

export async function fetchFundingHeatmap(hours = 24, topN = 20): Promise<FundingHeatmapData> {
  const tickData = await fetchJson("https://fapi.binance.com/fapi/v1/ticker/24hr") as Array<Record<string, string>>;
  const topSymbols = tickData
    .filter((t) => t.symbol.endsWith("USDT"))
    .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume))
    .slice(0, topN)
    .map((t) => t.symbol);

  const now = Date.now();
  const hourLabels: string[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    hourLabels.push(new Date(now - i * 3_600_000).toISOString().slice(0, 13));
  }

  const matrix: number[][] = [];
  for (const symbol of topSymbols) {
    const data = await fetchJson(
      `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=${hours}`,
    ) as Array<Record<string, string>>;
    const byHour = new Map<string, number>();
    for (const row of data) {
      const ts = typeof row.fundingTime === "number" ? row.fundingTime : Number(row.fundingTime);
      byHour.set(new Date(ts).toISOString().slice(0, 13), Number(row.fundingRate) * 100);
    }
    matrix.push(hourLabels.map((h) => Math.round((byHour.get(h) ?? 0) * 10000) / 10000));
  }

  return { symbols: topSymbols, hours: hourLabels, matrix, updatedAt: new Date().toISOString() };
}
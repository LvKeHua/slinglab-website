/**
 * Multi-exchange open-positions clients + unified leverage engine.
 * Position fetchers ported from crypto-portfolio-tracker-oss (MIT);
 * normalization + leverage math are original.
 *
 * Contract: every fetcher returns Position[] with USD-normalized fields.
 * Positions are informational — balance already includes margin + uPnL.
 */
import { createHash, createHmac } from "node:crypto";
import { GateCrossExClient } from "./exchanges/crossex.js";
import type { ExchangeCreds } from "./exchanges/balances.js";

const FETCH_TIMEOUT_MS = 15_000;

// ─── Normalized model ────────────────────────────────────────────────────────

export interface Position {
  exchange: string;
  symbol: string;
  side: "Long" | "Short";
  size: number; // base asset qty (always > 0)
  entryPrice: number;
  markPrice: number;
  notionalUsd: number;
  pnl: number; // uPnL in USD
  roi: number; // pnl / initialMargin (capped when margin unknown)
  leverage: number; // per-position leverage
  margin: number; // initial margin in USD (0 when unknown)
  liquidationPrice: number | null;
  updatedAt: string;
}

export interface PositionsResult {
  positions: Position[];
  notionalTotal: number;
  marginTotal: number;
  pnlTotal: number;
  leverage: number | null; // portfolio leverage; null when margin unknown
  error?: string;
}

export interface PortfolioPositions {
  positions: Position[];
  notionalTotal: number;
  marginTotal: number;
  marginKnown: boolean;
  pnlTotal: number;
  leverage: number | null;
  byExchange: Array<{
    exchange: string;
    count: number;
    notional: number;
    margin: number;
    marginKnown: boolean;
    pnl: number;
  }>;
  bySymbol: Array<{ symbol: string; netNotional: number; netPnl: number }>;
  longNotional: number;
  shortNotional: number;
  updatedAt: string;
}

interface RawPosition {
  symbol: string;
  side: "Long" | "Short";
  size: number;
  entryPrice: number;
  markPrice: number;
  notionalUsd: number;
  pnl: number;
  liquidationPrice: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

function hmacHex(secret: string, data: string, algo: "sha256" | "sha512" = "sha256"): string {
  return createHmac(algo, secret).update(data).digest("hex");
}

function toNumber(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

/**
 * Single conversion point for the 6 fetchers' raw rows: every numeric field
 * is normalized here so API value shapes (string | number | null) collapse
 * to number.
 */
function toRaw(item: Record<string, unknown>, pick: {
  symbol: unknown;
  side?: unknown;
  size?: unknown;
  entryPrice?: unknown;
  markPrice?: unknown;
  notionalUsd?: unknown;
  pnl?: unknown;
  liquidationPrice?: unknown;
}): RawPosition {
  const size = toNumber(pick.size);
  const mark = toNumber(pick.markPrice);
  return {
    symbol: String(pick.symbol ?? ""),
    side: String(pick.side ?? "").toLowerCase() === "short" ? "Short" : "Long",
    size: Math.abs(size),
    entryPrice: toNumber(pick.entryPrice),
    markPrice: mark,
    notionalUsd: toNumber(pick.notionalUsd) || Math.abs(size) * mark,
    pnl: toNumber(pick.pnl),
    liquidationPrice: toNumber(pick.liquidationPrice) || null,
  };
}

function buildPosition(p: Partial<Position> & Pick<Position, "exchange" | "symbol">): Position {
  const notional = Math.max(toNumber(p.notionalUsd), Math.abs(toNumber(p.size)) * toNumber(p.markPrice || p.entryPrice));
  const margin = Math.max(toNumber(p.margin), 0);
  const pnl = toNumber(p.pnl);
  const leverage = notional > 0 && margin > 0 ? Math.round((notional / margin) * 100) / 100 : 0;
  return {
    exchange: p.exchange,
    symbol: p.symbol,
    side: p.side ?? "Long",
    size: Math.abs(toNumber(p.size)),
    entryPrice: toNumber(p.entryPrice),
    markPrice: toNumber(p.markPrice),
    notionalUsd: Math.round(notional * 100) / 100,
    pnl: Math.round(pnl * 100) / 100,
    roi: margin > 0 ? Math.round((pnl / margin) * 10000) / 100 : 0,
    leverage,
    margin: Math.round(margin * 100) / 100,
    liquidationPrice: p.liquidationPrice ?? null,
    updatedAt: new Date().toISOString(),
  };
}

function normalizePositions(exchange: string, raw: RawPosition[], marginBySymbol?: Map<string, number>): Position[] {
  const out: Position[] = [];
  for (const r of raw) {
    if (!r.symbol) continue;
    if (r.size <= 0 && r.notionalUsd <= 0) continue;
    out.push(buildPosition({ ...r, exchange, margin: marginBySymbol ? (marginBySymbol.get(r.symbol) ?? 0) : 0 }));
  }
  return out;
}

function signedQuery(secret: string, params: Record<string, string>): string {
  const q = new URLSearchParams(params);
  q.set("signature", hmacHex(secret, q.toString()));
  return q.toString();
}

// ─── Binance ─────────────────────────────────────────────────────────────────

export async function fetchBinancePositions(creds: ExchangeCreds): Promise<PositionsResult> {
  try {
    const apiKey = creds.apiKey ?? "";
    const secretKey = creds.secretKey ?? "";
    const ts = String(Date.now());
    const q = signedQuery(secretKey, { timestamp: ts, recvWindow: "5000" });
    const data = await fetchJson(`https://fapi.binance.com/fapi/v2/positionRisk?${q}`, {
      headers: { "X-MBX-APIKEY": apiKey },
    });
    const list = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
    const marginBySymbol = new Map<string, number>();
    const raw: RawPosition[] = [];
    for (const item of list) {
      const posAmt = toNumber(item.positionAmt);
      if (posAmt === 0) continue;
      marginBySymbol.set(String(item.symbol ?? ""), toNumber(item.isolatedWallet));
      raw.push(toRaw(item, {
        symbol: item.symbol,
        side: posAmt < 0 ? "Short" : "Long",
        size: posAmt,
        entryPrice: item.entryPrice,
        markPrice: item.markPrice,
        pnl: item.unRealizedProfit,
        liquidationPrice: item.liquidationPrice,
      }));
    }
    return summarize(normalizePositions("Binance", raw, marginBySymbol));
  } catch (err) {
    return emptyResult(err instanceof Error ? err.message : String(err));
  }
}

// ─── Bybit ───────────────────────────────────────────────────────────────────

export async function fetchBybitPositions(creds: ExchangeCreds): Promise<PositionsResult> {
  try {
    const apiKey = creds.apiKey ?? "";
    const secretKey = creds.secretKey ?? "";
    const ts = String(Date.now());
    const q = signedQuery(secretKey, { api_key: apiKey, timestamp: ts, recv_window: "10000", category: "linear", settleCoin: "USDT" });
    const data = await fetchJson(`https://api.bybit.com/v5/position/list?${q}`);
    const list = (data as { result?: { list?: Array<Record<string, unknown>> } }).result?.list ?? [];
    const marginBySymbol = new Map<string, number>();
    const raw: RawPosition[] = [];
    for (const item of list) {
      if (toNumber(item.size) === 0) continue;
      const sym = String(item.symbol ?? "");
      if (!marginBySymbol.has(sym)) marginBySymbol.set(sym, toNumber(item.positionIM));
      raw.push(toRaw(item, {
        symbol: item.symbol,
        side: item.side,
        size: item.size,
        entryPrice: item.avgPrice,
        markPrice: item.markPrice,
        pnl: item.unrealisedPnl,
        liquidationPrice: item.liqPrice,
      }));
    }
    return summarize(normalizePositions("Bybit", raw, marginBySymbol));
  } catch (err) {
    return emptyResult(err instanceof Error ? err.message : String(err));
  }
}

// ─── OKX ─────────────────────────────────────────────────────────────────────

function okxSign(secret: string, ts: string, method: string, path: string, body = ""): string {
  return hmacHex(secret, `${ts}${method}${path}${body}`, "sha256");
}

async function okxPositions(creds: ExchangeCreds, instType: string): Promise<RawPosition[]> {
  const apiKey = creds.apiKey ?? "";
  const secretKey = creds.secretKey ?? "";
  const passphrase = creds.passphrase ?? "";
  const ts = new Date().toISOString();
  const path = `/api/v5/account/positions?instType=${instType}`;
  const sign = okxSign(secretKey, ts, "GET", path);
  const data = await fetchJson(`https://www.okx.com${path}`, {
    headers: {
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": sign,
      "OK-ACCESS-TIMESTAMP": ts,
      "OK-ACCESS-PASSPHRASE": passphrase,
    },
  });
  const body = data as { code?: string; data?: Array<Record<string, unknown>> };
  if (body.code && body.code !== "0") throw new Error(`OKX API error (${body.code})`);
  const out: RawPosition[] = [];
  for (const item of body.data ?? []) {
    if (toNumber(item.pos) === 0) continue;
    out.push(toRaw(item, {
      symbol: item.instId,
      side: item.posSide,
      size: item.pos,
      entryPrice: item.avgPx,
      markPrice: item.markPx ?? item.last,
      notionalUsd: item.notionalUsd,
      pnl: item.upl,
      liquidationPrice: item.liqPx,
    }));
  }
  return out;
}

export async function fetchOkxPositions(creds: ExchangeCreds): Promise<PositionsResult> {
  try {
    const raw = [
      ...(await okxPositions(creds, "SWAP")),
      ...(await okxPositions(creds, "FUTURES")),
      ...(await okxPositions(creds, "OPTION")),
    ];
    return summarize(normalizePositions("OKX", raw));
  } catch (err) {
    return emptyResult(err instanceof Error ? err.message : String(err));
  }
}

// ─── Bitget ──────────────────────────────────────────────────────────────────

export async function fetchBitgetPositions(creds: ExchangeCreds): Promise<PositionsResult> {
  try {
    const apiKey = creds.apiKey ?? "";
    const secretKey = creds.secretKey ?? "";
    const passphrase = creds.passphrase ?? "";
    const ts = String(Date.now());
    const method = "GET";
    const path = "/api/v2/mix/position/all-position";
    const query = "productType=USDT-FUTURES&marginCoin=USDT";
    const sign = hmacHex(secretKey, `${ts}${method}${path}?${query}`);
    const data = await fetchJson(`https://api.bitget.com${path}?${query}`, {
      headers: {
        "ACCESS-KEY": apiKey,
        "ACCESS-SIGN": sign,
        "ACCESS-TIMESTAMP": ts,
        "ACCESS-PASSPHRASE": passphrase,
      },
    });
    const body = data as { code?: string; msg?: string; data?: Array<Record<string, unknown>> };
    if (body.code && body.code !== "00000") throw new Error(`Bitget API error (${body.code}): ${body.msg ?? ""}`);
    const marginBySymbol = new Map<string, number>();
    const raw: RawPosition[] = [];
    for (const item of body.data ?? []) {
      if (toNumber(item.total) === 0) continue;
      const sym = String(item.symbol ?? "");
      if (!marginBySymbol.has(sym)) marginBySymbol.set(sym, Math.abs(toNumber(item.margin)));
      raw.push(toRaw(item, {
        symbol: item.symbol,
        side: item.holdSide,
        size: item.total,
        entryPrice: item.openPriceAvg,
        markPrice: item.markPrice,
        pnl: item.unrealizedPL,
        liquidationPrice: item.liquidationPrice,
      }));
    }
    return summarize(normalizePositions("Bitget", raw, marginBySymbol));
  } catch (err) {
    return emptyResult(err instanceof Error ? err.message : String(err));
  }
}

// ─── Gate / CrossEx ──────────────────────────────────────────────────────────

export async function fetchGatePositions(creds: ExchangeCreds): Promise<PositionsResult> {
  try {
    const apiKey = creds.apiKey ?? "";
    const secretKey = creds.secretKey ?? "";
    const method = "GET";
    const path = "/api/v4/futures/usdt/positions";
    const ts = String(Math.floor(Date.now() / 1000));
    const hash = createHash("sha512").update("").digest("hex");
    const sign = hmacHex(secretKey, `${method}\n${path}\n\n${hash}\n${ts}`);
    const data = await fetchJson(`https://api.gateio.ws${path}`, {
      headers: { KEY: apiKey, Timestamp: ts, SIGN: sign },
    });
    const list = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
    const marginBySymbol = new Map<string, number>();
    const raw: RawPosition[] = [];
    for (const item of list) {
      const size = toNumber(item.size);
      if (size === 0) continue;
      const sym = String(item.contract ?? "");
      const mark = toNumber(item.mark_price);
      const margin = Math.max(toNumber(item.margin), Math.abs(size) * mark / Math.max(toNumber(item.leverage), 1));
      marginBySymbol.set(sym, margin);
      raw.push(toRaw(item, {
        symbol: item.contract,
        side: size < 0 ? "Short" : "Long",
        size,
        entryPrice: item.entry_price,
        markPrice: item.mark_price,
        pnl: item.unrealised_pnl,
        liquidationPrice: item.liq_price,
      }));
    }
    return summarize(normalizePositions("Gate", raw, marginBySymbol));
  } catch (err) {
    return emptyResult(err instanceof Error ? err.message : String(err));
  }
}

export async function fetchCrossExPositions(creds: ExchangeCreds): Promise<PositionsResult> {
  try {
    const key = { apiKey: creds.apiKey ?? "", apiSecret: creds.secretKey ?? "" };
    const positions = await new GateCrossExClient().queryPositions(key);
    const raw: RawPosition[] = positions.map((p) => toRaw(p as unknown as Record<string, unknown>, {
      symbol: p.symbol,
      side: p.position_side,
      size: p.qty,
      entryPrice: p.entry_price,
      markPrice: p.mark_price,
      pnl: p.unrealised_pnl,
      liquidationPrice: p.liquidation_price,
    }));
    return summarize(normalizePositions("CrossEx", raw));
  } catch (err) {
    return emptyResult(err instanceof Error ? err.message : String(err));
  }
}

// ─── Hyperliquid (public info API, per-address) ──────────────────────────────

export async function fetchHyperliquidPositions(creds: ExchangeCreds): Promise<PositionsResult> {
  try {
    const address = creds.walletAddress;
    if (!address) throw new Error("Hyperliquid wallet address required");
    const data = await fetchJson("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "clearinghouseState", user: address }),
    });
    const state = data as {
      assetPositions?: Array<{
        position: { coin: string; szi: string; entryPx: string | null; liquidationPx?: string | null };
        unrealizedPnl?: string;
      }>;
    };
    const raw: RawPosition[] = [];
    for (const p of state.assetPositions ?? []) {
      const size = toNumber(p.position.szi);
      if (size === 0) continue;
      const entry = toNumber(p.position.entryPx);
      const pnl = toNumber(p.unrealizedPnl);
      const mark = entry + pnl / Math.abs(size);
      raw.push({
        symbol: p.position.coin,
        side: size < 0 ? "Short" : "Long",
        size,
        entryPrice: entry,
        markPrice: mark,
        notionalUsd: Math.abs(size) * mark,
        pnl,
        liquidationPrice: toNumber(p.position.liquidationPx) || null,
      });
    }
    return summarize(normalizePositions("Hyperliquid", raw));
  } catch (err) {
    return emptyResult(err instanceof Error ? err.message : String(err));
  }
}

// ─── Aggregation / leverage engine ───────────────────────────────────────────

function emptyResult(error: string): PositionsResult {
  return { positions: [], notionalTotal: 0, marginTotal: 0, pnlTotal: 0, leverage: null, error };
}

function summarize(positions: Position[]): PositionsResult {
  const notionalTotal = Math.round(positions.reduce((s, p) => s + p.notionalUsd, 0) * 100) / 100;
  const marginTotal = Math.round(positions.reduce((s, p) => s + p.margin, 0) * 100) / 100;
  const pnlTotal = Math.round(positions.reduce((s, p) => s + p.pnl, 0) * 100) / 100;
  const marginKnown = marginTotal > 0;
  const leverage = marginKnown && marginTotal > 0 ? Math.round((notionalTotal / marginTotal) * 100) / 100 : null;
  return { positions, notionalTotal, marginTotal, pnlTotal, leverage };
}

/**
 * Merge per-account position results into a portfolio view.
 * Unified leverage = Σ|notional| / Σ|margin|. Shorts use |notional| so both
 * directions count toward exposure; margin is the collateral at risk.
 * When some exchange reports no margin data, that exchange's rows are kept
 * with margin 0 and marginKnown flags the gap — leverage stays conservative
 * (computed only when every exchange with positions reported margin).
 */
export function mergePortfolioPositions(results: Array<{ exchange: string; result: PositionsResult }>): PortfolioPositions {
  const positions = results.flatMap((r) => r.result.positions);
  const notionalTotal = Math.round(positions.reduce((s, p) => s + p.notionalUsd, 0) * 100) / 100;
  const marginTotal = Math.round(positions.reduce((s, p) => s + p.margin, 0) * 100) / 100;
  const pnlTotal = Math.round(positions.reduce((s, p) => s + p.pnl, 0) * 100) / 100;
  const withPositions = results.filter((r) => r.result.positions.length > 0);
  const marginKnown = withPositions.length > 0 && withPositions.every((r) => r.result.marginTotal > 0);
  const leverage = marginKnown && marginTotal > 0 ? Math.round((notionalTotal / marginTotal) * 100) / 100 : null;

  const byExchangeMap = new Map<string, { exchange: string; count: number; notional: number; margin: number; marginKnown: boolean; pnl: number }>();
  for (const r of results) {
    const agg = byExchangeMap.get(r.exchange) ?? { exchange: r.exchange, count: 0, notional: 0, margin: 0, marginKnown: false, pnl: 0 };
    agg.count += r.result.positions.length;
    agg.notional += r.result.notionalTotal;
    agg.margin += r.result.marginTotal;
    agg.marginKnown = agg.marginKnown || r.result.marginTotal > 0;
    agg.pnl += r.result.pnlTotal;
    byExchangeMap.set(r.exchange, agg);
  }
  const byExchange = [...byExchangeMap.values()].map((e) => ({
    ...e,
    notional: Math.round(e.notional * 100) / 100,
    margin: Math.round(e.margin * 100) / 100,
    pnl: Math.round(e.pnl * 100) / 100,
  }));

  const bySymbolMap = new Map<string, { symbol: string; netNotional: number; netPnl: number }>();
  for (const p of positions) {
    const row = bySymbolMap.get(p.symbol) ?? { symbol: p.symbol, netNotional: 0, netPnl: 0 };
    row.netNotional += p.side === "Short" ? -p.notionalUsd : p.notionalUsd;
    row.netPnl += p.pnl;
    bySymbolMap.set(p.symbol, row);
  }
  const bySymbol = [...bySymbolMap.values()]
    .map((s) => ({ ...s, netNotional: Math.round(s.netNotional * 100) / 100, netPnl: Math.round(s.netPnl * 100) / 100 }))
    .sort((a, b) => Math.abs(b.netNotional) - Math.abs(a.netNotional));

  const longNotional = Math.round(positions.filter((p) => p.side === "Long").reduce((s, p) => s + p.notionalUsd, 0) * 100) / 100;
  const shortNotional = Math.round(positions.filter((p) => p.side === "Short").reduce((s, p) => s + p.notionalUsd, 0) * 100) / 100;

  return {
    positions,
    notionalTotal,
    marginTotal,
    marginKnown,
    pnlTotal,
    leverage,
    byExchange,
    bySymbol,
    longNotional,
    shortNotional,
    updatedAt: new Date().toISOString(),
  };
}

export type PositionFetcher = (creds: ExchangeCreds) => Promise<PositionsResult>;

const FETCHERS: Record<string, PositionFetcher> = {
  binance: fetchBinancePositions,
  bybit: fetchBybitPositions,
  okx: fetchOkxPositions,
  bitget: fetchBitgetPositions,
  gate: fetchGatePositions,
  hyperliquid: fetchHyperliquidPositions,
  crossex: fetchCrossExPositions,
};

/** Derive has no public positions endpoint — positions live on-chain. */
export function getPositionFetcher(exchange: string): PositionFetcher | null {
  return FETCHERS[exchange] ?? null;
}

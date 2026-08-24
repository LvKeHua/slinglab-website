/**
 * Multi-exchange balance clients — ported from crypto-portfolio-tracker-oss
 * (MIT). Each exchange returns a normalized AssetBalance[] with USDT values.
 * Signing follows each exchange's documented HMAC scheme.
 */
import { createHmac, createHash } from "node:crypto";
import { GateCrossExClient } from "./crossex.js";

export interface AssetBalance {
  symbol: string;
  free: number;
  locked: number;
  valueUsdt: number;
  priceUsdt: number;
}

export interface ExchangeCreds {
  apiKey: string;
  secretKey: string;
  passphrase?: string;
  walletAddress?: string;
}

export interface BalanceResult {
  valid: boolean;
  assets: AssetBalance[];
  totalUsd: number;
  error?: string;
}

const FETCH_TIMEOUT_MS = 15_000;

async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function hmacHex(secret: string, data: string, algo: "sha256" | "sha512" = "sha256"): string {
  return createHmac(algo, secret).update(data).digest("hex");
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ─── Binance ────────────────────────────────────────────────────────────────

export async function fetchBinanceBalances(creds: ExchangeCreds): Promise<BalanceResult> {
  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}&recvWindow=5000`;
    const signature = hmacHex(creds.secretKey, queryString);
    const account = (await fetchJson(
      `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`,
      { headers: { "X-MBX-APIKEY": creds.apiKey } },
    )) as { balances: Array<{ asset: string; free: string; locked: string }> };

    const nonZero = account.balances.filter((b) => toNumber(b.free) > 0 || toNumber(b.locked) > 0);
    if (nonZero.length === 0) return { valid: true, assets: [], totalUsd: 0 };

    const prices = (await fetchJson("https://api.binance.com/api/v3/ticker/price")) as Array<{
      symbol: string;
      price: string;
    }>;
    const priceMap = new Map<string, number>();
    priceMap.set("USDT", 1);
    for (const p of prices) {
      if (p.symbol.endsWith("USDT")) priceMap.set(p.symbol.slice(0, -4), toNumber(p.price));
    }

    const assets: AssetBalance[] = nonZero.map((b) => {
      const free = toNumber(b.free);
      const locked = toNumber(b.locked);
      const priceAsset = b.asset.startsWith("LD") ? b.asset.slice(2) : b.asset;
      const priceUsdt = priceMap.get(priceAsset) ?? 0;
      return {
        symbol: b.asset,
        free,
        locked,
        priceUsdt,
        valueUsdt: (free + locked) * priceUsdt,
      };
    });
    assets.sort((a, b) => b.valueUsdt - a.valueUsdt);
    return {
      valid: true,
      assets,
      totalUsd: assets.reduce((s, a) => s + a.valueUsdt, 0),
    };
  } catch (err) {
    return { valid: false, assets: [], totalUsd: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Bybit ──────────────────────────────────────────────────────────────────

export async function fetchBybitBalances(creds: ExchangeCreds): Promise<BalanceResult> {
  try {
    const timestamp = Date.now().toString();
    const recvWindow = "5000";
    const queryString = `accountType=UNIFIED`;
    const payload = `${timestamp}${creds.apiKey}${recvWindow}${queryString}`;
    const signature = hmacHex(creds.secretKey, payload);
    const data = (await fetchJson(
      `https://api.bybit.com/v5/account/wallet-balance?${queryString}`,
      {
        headers: {
          "X-BAPI-API-KEY": creds.apiKey,
          "X-BAPI-TIMESTAMP": timestamp,
          "X-BAPI-RECV-WINDOW": recvWindow,
          "X-BAPI-SIGN": signature,
        },
      },
    )) as { result?: { list?: Array<{ coin: Array<{ coin: string; walletBalance: string; availableToWithdraw: string }> }> } };

    const coins = data.result?.list?.[0]?.coin ?? [];
    const assets: AssetBalance[] = coins
      .filter((c) => toNumber(c.walletBalance) > 0)
      .map((c) => ({
        symbol: c.coin,
        free: toNumber(c.availableToWithdraw),
        locked: toNumber(c.walletBalance) - toNumber(c.availableToWithdraw),
        priceUsdt: 0,
        valueUsdt: 0,
      }));

    // Price the assets via Bybit's ticker endpoint
    if (assets.length > 0) {
      const tickers = (await fetchJson("https://api.bybit.com/v5/market/tickers?category=spot")) as {
        result?: { list?: Array<{ symbol: string; lastPrice: string }> };
      };
      const priceMap = new Map<string, number>();
      priceMap.set("USDT", 1);
      for (const t of tickers.result?.list ?? []) {
        if (t.symbol.endsWith("USDT")) priceMap.set(t.symbol.slice(0, -4), toNumber(t.lastPrice));
      }
      for (const a of assets) {
        a.priceUsdt = priceMap.get(a.symbol) ?? 0;
        a.valueUsdt = (a.free + a.locked) * a.priceUsdt;
      }
      assets.sort((a, b) => b.valueUsdt - a.valueUsdt);
    }

    return { valid: true, assets, totalUsd: assets.reduce((s, a) => s + a.valueUsdt, 0) };
  } catch (err) {
    return { valid: false, assets: [], totalUsd: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── OKX ────────────────────────────────────────────────────────────────────

export async function fetchOkxBalances(creds: ExchangeCreds): Promise<BalanceResult> {
  try {
    const timestamp = new Date().toISOString();
    const method = "GET";
    const requestPath = "/api/v5/account/balance";
    const prehash = `${timestamp}${method}${requestPath}`;
    const signature = hmacHex(creds.secretKey, prehash, "sha256");
    const data = (await fetchJson(`https://www.okx.com${requestPath}`, {
      headers: {
        "OK-ACCESS-KEY": creds.apiKey,
        "OK-ACCESS-SIGN": signature,
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": creds.passphrase ?? "",
      },
    })) as { data?: Array<{ details?: Array<{ ccy: string; availBal: string; frozenBal: string; eqUsd: string }> }> };

    const details = data.data?.[0]?.details ?? [];
    const assets: AssetBalance[] = details
      .filter((d) => toNumber(d.eqUsd) > 0)
      .map((d) => ({
        symbol: d.ccy,
        free: toNumber(d.availBal),
        locked: toNumber(d.frozenBal),
        priceUsdt: toNumber(d.eqUsd) / Math.max(toNumber(d.availBal) + toNumber(d.frozenBal), 1e-12),
        valueUsdt: toNumber(d.eqUsd),
      }));
    assets.sort((a, b) => b.valueUsdt - a.valueUsdt);
    return { valid: true, assets, totalUsd: assets.reduce((s, a) => s + a.valueUsdt, 0) };
  } catch (err) {
    return { valid: false, assets: [], totalUsd: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Bitget ─────────────────────────────────────────────────────────────────

export async function fetchBitgetBalances(creds: ExchangeCreds): Promise<BalanceResult> {
  try {
    const timestamp = Date.now().toString();
    const method = "GET";
    const requestPath = "/api/v2/spot/account/assets";
    const prehash = `${timestamp}${method}${requestPath}`;
    const signature = hmacHex(creds.secretKey, prehash, "sha256");
    const data = (await fetchJson(`https://api.bitget.com${requestPath}`, {
      headers: {
        "ACCESS-KEY": creds.apiKey,
        "ACCESS-SIGN": signature,
        "ACCESS-TIMESTAMP": timestamp,
        "ACCESS-PASSPHRASE": creds.passphrase ?? "",
        "Content-Type": "application/json",
      },
    })) as { data?: Array<{ coin: string; available: string; frozen: string; usdtValue: string }> };

    const rows = data.data ?? [];
    const assets: AssetBalance[] = rows
      .filter((r) => toNumber(r.usdtValue) > 0)
      .map((r) => ({
        symbol: r.coin,
        free: toNumber(r.available),
        locked: toNumber(r.frozen),
        priceUsdt: toNumber(r.usdtValue) / Math.max(toNumber(r.available) + toNumber(r.frozen), 1e-12),
        valueUsdt: toNumber(r.usdtValue),
      }));
    assets.sort((a, b) => b.valueUsdt - a.valueUsdt);
    return { valid: true, assets, totalUsd: assets.reduce((s, a) => s + a.valueUsdt, 0) };
  } catch (err) {
    return { valid: false, assets: [], totalUsd: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Gate (spot + unified) ───────────────────────────────────────────────────

export async function fetchGateBalances(creds: ExchangeCreds): Promise<BalanceResult> {
  try {
    const timestamp = Date.now().toString();
    const method = "GET";
    const requestPath = "/api/v4/spot/accounts";
    const bodyHash = createHash("sha512").update("").digest("hex");
    const signatureString = [method, requestPath, "", bodyHash, timestamp].join("\n");
    const signature = hmacHex(creds.secretKey, signatureString, "sha512");
    const headers = {
      KEY: creds.apiKey,
      Timestamp: timestamp,
      SIGN: signature,
      Accept: "application/json",
    };

    const spot = (await fetchJson(`https://api.gateio.ws${requestPath}`, { headers })) as Array<{
      currency: string;
      available: string;
      locked: string;
    }>;

    // Unified account (spot + futures + margin) when available
    let unified: Array<{ currency: string; available: string; locked: string }> = [];
    try {
      const unifiedPath = "/api/v4/unified/accounts";
      const unifiedHash = createHash("sha512").update("").digest("hex");
      const unifiedSig = hmacHex(creds.secretKey, [method, unifiedPath, "", unifiedHash, timestamp].join("\n"), "sha512");
      unified = (await fetchJson(`https://api.gateio.ws${unifiedPath}`, {
        headers: { ...headers, SIGN: unifiedSig },
      })) as Array<{ currency: string; available: string; locked: string }>;
    } catch {
      // unified account not enabled — spot only
    }

    const merged = new Map<string, { free: number; locked: number }>();
    for (const row of [...spot, ...unified]) {
      const cur = merged.get(row.currency) ?? { free: 0, locked: 0 };
      cur.free += toNumber(row.available);
      cur.locked += toNumber(row.locked);
      merged.set(row.currency, cur);
    }

    const assets: AssetBalance[] = [];
    for (const [symbol, { free, locked }] of merged) {
      if (free + locked <= 0) continue;
      assets.push({ symbol, free, locked, priceUsdt: 0, valueUsdt: 0 });
    }

    if (assets.length > 0) {
      const tickers = (await fetchJson("https://api.gateio.ws/api/v4/spot/tickers")) as Array<{
        currency_pair: string;
        last: string;
      }>;
      const priceMap = new Map<string, number>();
      priceMap.set("USDT", 1);
      for (const t of tickers) {
        if (t.currency_pair.endsWith("_USDT")) priceMap.set(t.currency_pair.slice(0, -5), toNumber(t.last));
      }
      for (const a of assets) {
        a.priceUsdt = priceMap.get(a.symbol) ?? 0;
        a.valueUsdt = (a.free + a.locked) * a.priceUsdt;
      }
      assets.sort((a, b) => b.valueUsdt - a.valueUsdt);
    }

    return { valid: true, assets, totalUsd: assets.reduce((s, a) => s + a.valueUsdt, 0) };
  } catch (err) {
    return { valid: false, assets: [], totalUsd: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Hyperliquid (public info API — no key required) ────────────────────────

export async function fetchHyperliquidBalances(creds: ExchangeCreds): Promise<BalanceResult> {
  try {
    const address = creds.walletAddress;
    if (!address) return { valid: false, assets: [], totalUsd: 0, error: "wallet address required" };
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "clearinghouseState", user: address }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const state = (await res.json()) as {
      marginSummary?: { accountValue: string };
      assetPositions?: Array<{ position: { coin: string; szi: string; entryPx: string; positionValue: string; unrealizedPnl: string } }>;
    };

    const assets: AssetBalance[] = [];
    const accountValue = toNumber(state.marginSummary?.accountValue);
    if (accountValue > 0) {
      assets.push({ symbol: "USDC", free: accountValue, locked: 0, priceUsdt: 1, valueUsdt: accountValue });
    }
    for (const p of state.assetPositions ?? []) {
      const pos = p.position;
      const qty = toNumber(pos.szi);
      if (qty === 0) continue;
      const value = toNumber(pos.positionValue);
      assets.push({
        symbol: pos.coin,
        free: 0,
        locked: Math.abs(qty),
        priceUsdt: value / Math.abs(qty),
        valueUsdt: value + toNumber(pos.unrealizedPnl),
      });
    }
    return { valid: true, assets, totalUsd: assets.reduce((s, a) => s + a.valueUsdt, 0) };
  } catch (err) {
    return { valid: false, assets: [], totalUsd: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── CrossEx (one Gate key covers 7 venues) ────────────────────────────────

export async function fetchCrossExBalances(creds: ExchangeCreds): Promise<BalanceResult> {
  try {
    const client = new GateCrossExClient();
    const account = await client.queryAccount({ apiKey: creds.apiKey, apiSecret: creds.secretKey });
    const assets: AssetBalance[] = account.assets
      .filter((a) => toNumber(a.equity) > 0)
      .map((a) => ({
        symbol: a.coin,
        free: toNumber(a.available),
        locked: toNumber(a.locked),
        priceUsdt: toNumber(a.equity) / Math.max(toNumber(a.available) + toNumber(a.locked), 1e-12),
        valueUsdt: toNumber(a.equity),
      }));
    assets.sort((a, b) => b.valueUsdt - a.valueUsdt);
    return { valid: true, assets, totalUsd: assets.reduce((s, a) => s + a.valueUsdt, 0) };
  } catch (err) {
    return { valid: false, assets: [], totalUsd: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────

export type ExchangeKind =
  | "binance"
  | "bybit"
  | "okx"
  | "bitget"
  | "gate"
  | "hyperliquid"
  | "derive"
  | "extended";

export async function fetchExchangeBalances(
  exchange: ExchangeKind,
  creds: ExchangeCreds,
): Promise<BalanceResult> {
  switch (exchange) {
    case "binance":
      return fetchBinanceBalances(creds);
    case "bybit":
      return fetchBybitBalances(creds);
    case "okx":
      return fetchOkxBalances(creds);
    case "bitget":
      return fetchBitgetBalances(creds);
    case "gate":
      return fetchGateBalances(creds);
    case "hyperliquid":
      return fetchHyperliquidBalances(creds);
    case "derive":
    case "extended":
      // Derive requires wallet signing (eth_account); extended is a manual
      // entry source. Both fall back to the CrossEx path or manual entries.
      return { valid: false, assets: [], totalUsd: 0, error: `${exchange} requires manual or CrossEx sync` };
  }
}

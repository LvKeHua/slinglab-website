var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/utils/pairing.ts
function pairFillsFIFO(fills) {
  const sorted = [...fills].sort((a, b) => a.time - b.time);
  const bySymbol = /* @__PURE__ */ new Map();
  for (const f of sorted) {
    let arr = bySymbol.get(f.symbol);
    if (!arr) bySymbol.set(f.symbol, arr = []);
    arr.push(f);
  }
  const results = [];
  for (const [symbol, symFills] of bySymbol) {
    const longs = [];
    const shorts = [];
    let longHead = 0;
    let shortHead = 0;
    for (const f of symFills) {
      const qty = f.qty;
      if (qty <= 0) continue;
      const opening = f.isBuy ? longs : shorts;
      const closing = f.isBuy ? shorts : longs;
      let closingHead = f.isBuy ? shortHead : longHead;
      let remaining = qty;
      while (remaining > 0 && closingHead < closing.length) {
        const lot = closing[closingHead];
        const closeQty = Math.min(lot.qty, remaining);
        const entryCommShare = lot.lotQty > 0 ? lot.entryComm * (closeQty / lot.lotQty) : 0;
        const exitCommShare = qty > 0 ? f.commission * (closeQty / qty) : 0;
        results.push({
          symbol,
          dir: lot.dir,
          size: closeQty,
          entry: lot.price,
          exit: f.price,
          entryTime: lot.time,
          exitTime: f.time,
          commission: entryCommShare + exitCommShare
        });
        lot.qty -= closeQty;
        remaining -= closeQty;
        if (lot.qty <= 0) closingHead++;
      }
      if (f.isBuy) shortHead = closingHead;
      else longHead = closingHead;
      if (remaining > 0) {
        opening.push({
          dir: f.isBuy ? "Long" : "Short",
          qty: remaining,
          lotQty: remaining,
          price: f.price,
          time: f.time,
          entryComm: qty > 0 ? f.commission * (remaining / qty) : 0
        });
      }
    }
  }
  return results;
}
__name(pairFillsFIFO, "pairFillsFIFO");
function formatHoldTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1e3));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor(totalSec % 3600 / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
__name(formatHoldTime, "formatHoldTime");
function buildClosedTrades(paired, exchange, seqStart) {
  let seq = seqStart;
  const round2 = /* @__PURE__ */ __name((n) => Math.round(n * 100) / 100, "round2");
  return paired.map((p) => {
    const rawPnl = p.dir === "Long" ? (p.exit - p.entry) * p.size : (p.entry - p.exit) * p.size;
    const realisedPnl = rawPnl - p.commission;
    return {
      id: seq--,
      symbol: p.symbol,
      dir: p.dir,
      size: p.size,
      entry: p.entry,
      exit: p.exit,
      holdTime: formatHoldTime(p.exitTime - p.entryTime),
      realisedPnl: round2(realisedPnl),
      rMultiple: round2(realisedPnl / (Math.abs(realisedPnl) + 1)),
      exchange,
      account: "Main Account",
      entryTime: new Date(p.entryTime).toISOString(),
      exitTime: new Date(p.exitTime).toISOString(),
      sequence: seq + 1,
      isWin: realisedPnl > 0,
      isBreakeven: realisedPnl === 0
    };
  }).sort((a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime());
}
__name(buildClosedTrades, "buildClosedTrades");

// src/services/binance.service.ts
var FETCH_TIMEOUT_MS = 1e4;
var MAX_RETRIES = 3;
var RETRY_BASE_DELAY_MS = 1e3;
var RETRYABLE_CODES = /* @__PURE__ */ new Set([
  -1001,
  // DISCONNECTED
  -1003,
  // TOO_MANY_REQUESTS (rate limit)
  -1015,
  // TOO_MANY_ORDERS
  -1016
  // SERVICE_SHUTTING_DOWN
]);
var BinanceApiError = class extends Error {
  constructor(code, httpStatus, msg) {
    super(`Binance API [${code}]: ${msg}`);
    this.code = code;
    this.httpStatus = httpStatus;
    this.name = "BinanceApiError";
  }
  code;
  httpStatus;
  static {
    __name(this, "BinanceApiError");
  }
  get retryable() {
    return RETRYABLE_CODES.has(this.code);
  }
};
async function hmacSha256(data, key) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha256, "hmacSha256");
async function fetchWithTimeout(url, init, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}
__name(fetchWithTimeout, "fetchWithTimeout");
async function fetchWithRetry(url, init, maxRetries = MAX_RETRIES, timeoutMs = FETCH_TIMEOUT_MS) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs);
      if (!res.ok) {
        let errorCode = 0;
        let errorMsg = "";
        try {
          const body = await res.json();
          if (Array.isArray(body) && body.length > 0) {
            errorCode = body[0].code;
            errorMsg = body[0].msg;
          } else if (!Array.isArray(body) && "code" in body) {
            errorCode = body.code;
            errorMsg = body.msg;
          }
        } catch {
          errorMsg = await res.text().catch(() => `HTTP ${res.status}`);
        }
        const err = new BinanceApiError(errorCode, res.status, errorMsg);
        if (err.retryable && attempt < maxRetries) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
      return res;
    } catch (err) {
      if (err instanceof BinanceApiError) throw err;
      if (err.name === "AbortError" && attempt < maxRetries) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error("Max retries exceeded");
}
__name(fetchWithRetry, "fetchWithRetry");
function pairTrades(trades) {
  const paired = pairFillsFIFO(
    trades.map((t) => ({
      symbol: t.symbol,
      time: t.time,
      // Normalize isBuyer: Binance API returns boolean, but JSON serialization
      // may turn it into a string or it could be missing entirely.
      isBuy: typeof t.isBuyer === "string" ? t.isBuyer === "true" : Boolean(t.isBuyer),
      price: Number(t.price),
      qty: Number(t.qty),
      commission: Number(t.commission) || 0
    }))
  );
  return buildClosedTrades(paired, "Binance", 1e4);
}
__name(pairTrades, "pairTrades");
async function fetchAccountBalances(apiKey, secretKey, baseUrl, proxy) {
  try {
    const timestamp = Date.now();
    const recvWindow = 5e3;
    const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
    const signature = await hmacSha256(queryString, secretKey);
    let url;
    let headers;
    const accountPath = `/api/v3/account?${queryString}&signature=${signature}`;
    if (proxy) {
      url = `${proxy.url}${accountPath}`;
      headers = {
        "X-Proxy-Secret": proxy.secret,
        "X-Target-Host": new URL(baseUrl).hostname,
        "X-MBX-APIKEY": apiKey
      };
    } else {
      url = `${baseUrl}${accountPath}`;
      headers = { "X-MBX-APIKEY": apiKey };
    }
    const res = await fetchWithRetry(url, { headers });
    const account = await res.json();
    if (!account || !Array.isArray(account.balances)) {
      console.error("[Binance] Unexpected account response shape:", JSON.stringify(account).substring(0, 200));
      return [];
    }
    const assets = account.balances.filter((b) => Number(b.free) > 0 || Number(b.locked) > 0).map((b) => b.asset);
    console.log(`[Binance] Account has ${assets.length} assets with non-zero balances: ${assets.join(", ")}`);
    return assets;
  } catch (err) {
    console.error("[Binance] Failed to fetch account balances:", err);
    return [];
  }
}
__name(fetchAccountBalances, "fetchAccountBalances");
async function fetchAccountBalancesDetailed(apiKey, secretKey, baseUrl = "https://api1.binance.com", proxy) {
  const timestamp = Date.now();
  const recvWindow = 5e3;
  const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
  const signature = await hmacSha256(queryString, secretKey);
  let url;
  let headers;
  const accountPath = `/api/v3/account?${queryString}&signature=${signature}`;
  if (proxy) {
    url = `${proxy.url}${accountPath}`;
    headers = {
      "X-Proxy-Secret": proxy.secret,
      "X-Target-Host": new URL(baseUrl).hostname,
      "X-MBX-APIKEY": apiKey
    };
  } else {
    url = `${baseUrl}${accountPath}`;
    headers = { "X-MBX-APIKEY": apiKey };
  }
  const res = await fetchWithRetry(url, { headers });
  const account = await res.json();
  if (!account || !Array.isArray(account.balances)) {
    console.error("[Binance] Unexpected account response shape for detailed balances");
    return [];
  }
  const nonZeroBalances = account.balances.filter(
    (b) => Number(b.free) > 0 || Number(b.locked) > 0
  );
  if (nonZeroBalances.length === 0) {
    return [];
  }
  const priceMap = /* @__PURE__ */ new Map();
  priceMap.set("USDT", 1);
  try {
    const bulkPricePath = "/api/v3/ticker/price";
    let bulkPriceUrl;
    let bulkPriceHeaders = {};
    if (proxy) {
      bulkPriceUrl = `${proxy.url}${bulkPricePath}`;
      bulkPriceHeaders = {
        "X-Proxy-Secret": proxy.secret,
        "X-Target-Host": new URL(baseUrl).hostname
      };
    } else {
      bulkPriceUrl = `${baseUrl}${bulkPricePath}`;
    }
    const bulkRes = await fetchWithRetry(bulkPriceUrl, { headers: bulkPriceHeaders }, MAX_RETRIES, 25e3);
    if (bulkRes.ok) {
      const allPrices = await bulkRes.json();
      for (const p of allPrices) {
        if (p.symbol.endsWith("USDT")) {
          const baseAsset = p.symbol.slice(0, -4);
          priceMap.set(baseAsset, Number(p.price) || 0);
        }
      }
    } else {
      console.error("[Binance] Bulk price fetch failed, prices will be 0");
    }
  } catch (err) {
    console.error("[Binance] Bulk price fetch error:", err instanceof Error ? err.message : String(err));
  }
  const assets = nonZeroBalances.map((b) => {
    const free = Number(b.free);
    const locked = Number(b.locked);
    const priceAsset = b.asset.startsWith("LD") ? b.asset.slice(2) : b.asset;
    const priceUsdt = priceMap.get(priceAsset) ?? 0;
    const valueUsdt = (free + locked) * priceUsdt;
    return {
      symbol: b.asset,
      free: Math.round(free * 1e8) / 1e8,
      locked: Math.round(locked * 1e8) / 1e8,
      priceUsdt: Math.round(priceUsdt * 1e8) / 1e8,
      valueUsdt: Math.round(valueUsdt * 100) / 100
    };
  });
  assets.sort((a, b) => b.valueUsdt - a.valueUsdt);
  console.log(`[Binance] Detailed balances: ${assets.length} assets, total ~$${assets.reduce((s, a) => s + a.valueUsdt, 0).toFixed(2)}`);
  return assets;
}
__name(fetchAccountBalancesDetailed, "fetchAccountBalancesDetailed");
async function fetchBinanceFuturesPositions(apiKey, secretKey, baseUrl = "https://fapi.binance.com", proxy) {
  const timestamp = Date.now();
  const recvWindow = 5e3;
  const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
  const signature = await hmacSha256(queryString, secretKey);
  const positionPath = `/fapi/v2/positionRisk?${queryString}&signature=${signature}`;
  let url;
  let headers;
  if (proxy) {
    url = `${proxy.url}${positionPath}`;
    headers = {
      "X-Proxy-Secret": proxy.secret,
      "X-Target-Host": "fapi.binance.com",
      "X-MBX-APIKEY": apiKey
    };
  } else {
    url = `${baseUrl}${positionPath}`;
    headers = { "X-MBX-APIKEY": apiKey };
  }
  const res = await fetchWithRetry(url, { headers });
  const positions = await res.json();
  const openPositions = positions.filter((p) => Number(p.positionAmt) !== 0).map((p) => ({
    symbol: p.symbol,
    side: Number(p.positionAmt) > 0 ? "Long" : "Short",
    size: Math.abs(Number(p.positionAmt)),
    entryPrice: Number(p.entryPrice),
    markPrice: Number(p.markPrice),
    unrealizedPnl: Number(p.unRealizedProfit),
    leverage: Number(p.leverage),
    liquidationPrice: Number(p.liquidationPrice),
    exchange: "Binance"
  }));
  console.log(`[Binance] Futures positions: ${openPositions.length} open`);
  return openPositions;
}
__name(fetchBinanceFuturesPositions, "fetchBinanceFuturesPositions");
async function fetchBinanceFuturesBalance(apiKey, secretKey, baseUrl = "https://fapi.binance.com", proxy) {
  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}&recvWindow=5000`;
    const signature = await hmacSha256(queryString, secretKey);
    const balancePath = `/fapi/v2/balance?${queryString}&signature=${signature}`;
    let url;
    let headers;
    if (proxy) {
      url = `${proxy.url}${balancePath}`;
      headers = {
        "X-Proxy-Secret": proxy.secret,
        "X-Target-Host": "fapi.binance.com",
        "X-MBX-APIKEY": apiKey
      };
    } else {
      url = `${baseUrl}${balancePath}`;
      headers = { "X-MBX-APIKEY": apiKey };
    }
    const res = await fetchWithRetry(url, { headers });
    const balances = await res.json();
    const usdt = balances.find((b) => b.asset === "USDT");
    return usdt ? Number(usdt.balance) + Number(usdt.unrealizedProfit) : 0;
  } catch (err) {
    console.error("[Binance] Futures balance fetch failed:", err instanceof Error ? err.message : err);
    return 0;
  }
}
__name(fetchBinanceFuturesBalance, "fetchBinanceFuturesBalance");
async function fetchBinanceSpotSymbols(proxy) {
  const exchangeInfoPath = "/api/v3/exchangeInfo";
  let url;
  let headers = {};
  if (proxy) {
    url = `${proxy.url}${exchangeInfoPath}`;
    headers = {
      "X-Proxy-Secret": proxy.secret,
      "X-Target-Host": "api1.binance.com"
    };
  } else {
    url = `https://api1.binance.com${exchangeInfoPath}`;
  }
  const res = await fetchWithRetry(url, { headers });
  const data = await res.json();
  const usdtPairs = (data.symbols || []).filter((s) => s.symbol.endsWith("USDT") && s.status === "TRADING").map((s) => s.symbol);
  console.log(`[Binance] Discovered ${usdtPairs.length} USDT spot trading pairs`);
  return usdtPairs;
}
__name(fetchBinanceSpotSymbols, "fetchBinanceSpotSymbols");
async function fetchSymbolMyTrades(apiKey, secretKey, symbol, baseUrl = "https://api1.binance.com", proxy, query = {}) {
  const params = [`symbol=${symbol}`, `limit=1000`];
  if (query.fromId != null) params.push(`fromId=${query.fromId}`);
  if (query.startTime != null) params.push(`startTime=${query.startTime}`);
  if (query.endTime != null) params.push(`endTime=${query.endTime}`);
  params.push(`timestamp=${Date.now()}`, `recvWindow=5000`);
  const queryString = params.join("&");
  const signature = await hmacSha256(queryString, secretKey);
  let url;
  let headers;
  const tradesPath = `/api/v3/myTrades?${queryString}&signature=${signature}`;
  if (proxy) {
    url = `${proxy.url}${tradesPath}`;
    headers = {
      "X-Proxy-Secret": proxy.secret,
      "X-Target-Host": new URL(baseUrl).hostname,
      "X-MBX-APIKEY": apiKey
    };
  } else {
    url = `${baseUrl}${tradesPath}`;
    headers = { "X-MBX-APIKEY": apiKey };
  }
  const res = await fetchWithRetry(url, { headers });
  const trades = await res.json();
  return Array.isArray(trades) ? trades : [];
}
__name(fetchSymbolMyTrades, "fetchSymbolMyTrades");
async function fetchBinanceTrades(apiKey, secretKey, baseUrl = "https://api1.binance.com", proxy) {
  const assets = await fetchAccountBalances(apiKey, secretKey, baseUrl, proxy);
  const baseAssets = [...new Set(assets.map((a) => a.startsWith("LD") ? a.slice(2) : a))];
  const balanceSymbols = baseAssets.filter((a) => a !== "USDT").map((a) => `${a}USDT`);
  const knownPairs = [
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT",
    "SOLUSDT",
    "XRPUSDT",
    "DOGEUSDT",
    "ADAUSDT",
    "AVAXUSDT",
    "DOTUSDT",
    "LINKUSDT",
    "UNIUSDT",
    "ATOMUSDT",
    "FTMUSDT",
    "NEARUSDT",
    "AAVEUSDT",
    "SANDUSDT",
    "SHBUSDT",
    "PEPEUSDT",
    "WIFUSDT",
    "ENAUSDT",
    "NOTUSDT",
    "TRXUSDT",
    "QUICKUSDT",
    "LTCUSDT",
    "BCHUSDT",
    "ETCUSDT",
    "FILUSDT",
    "APTUSDT",
    "ARBUSDT",
    "OPUSDT",
    "SUIUSDT",
    "SEIUSDT",
    "TIAUSDT",
    "MATICUSDT",
    "INJUSDT",
    "RUNEUSDT"
  ];
  const symbols = [.../* @__PURE__ */ new Set([...balanceSymbols, ...knownPairs])];
  console.log(`[Binance] Fetching trades for ${symbols.length} symbols: ${symbols.join(", ")}`);
  if (symbols.length === 0) {
    return [];
  }
  const recvWindow = 5e3;
  const limit = 1e3;
  const CHUNK_SIZE = 8;
  const fetchSymbolTrades = /* @__PURE__ */ __name(async (symbol) => {
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&timestamp=${timestamp}&recvWindow=${recvWindow}&limit=${limit}`;
    const signature = await hmacSha256(queryString, secretKey);
    let url;
    let headers;
    const tradesPath = `/api/v3/myTrades?${queryString}&signature=${signature}`;
    if (proxy) {
      url = `${proxy.url}${tradesPath}`;
      headers = {
        "X-Proxy-Secret": proxy.secret,
        "X-Target-Host": new URL(baseUrl).hostname,
        "X-MBX-APIKEY": apiKey
      };
    } else {
      url = `${baseUrl}${tradesPath}`;
      headers = { "X-MBX-APIKEY": apiKey };
    }
    const res = await fetchWithRetry(url, { headers });
    return await res.json();
  }, "fetchSymbolTrades");
  const allTrades = [];
  for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
    const chunk = symbols.slice(i, i + CHUNK_SIZE);
    const results = await Promise.allSettled(chunk.map(fetchSymbolTrades));
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled") {
        if (Array.isArray(result.value)) {
          allTrades.push(...result.value);
        }
      } else {
        console.error(`[Binance] Failed to fetch trades for ${chunk[j]}:`, result.reason);
      }
    }
  }
  console.log(`[Binance] Fetched trades for ${symbols.length} symbols, ${allTrades.length} raw fills`);
  if (allTrades.length === 0) {
    console.log("[Binance] No trades found across all symbols");
    return [];
  }
  console.log(`[Binance] Total raw trades: ${allTrades.length}, pairing...`);
  return pairTrades(allTrades);
}
__name(fetchBinanceTrades, "fetchBinanceTrades");

// src/services/bybit.service.ts
var FETCH_TIMEOUT_MS2 = 1e4;
var MAX_RETRIES2 = 3;
var RETRY_BASE_DELAY_MS2 = 1e3;
var RETRYABLE_CODES2 = /* @__PURE__ */ new Set([
  10006,
  // Rate limit
  10016,
  // Server busy
  10010
  // Request frequency too high
]);
var BybitApiError = class extends Error {
  constructor(code, msg) {
    super(`Bybit API [${code}]: ${msg}`);
    this.code = code;
    this.msg = msg;
    this.name = "BybitApiError";
  }
  code;
  msg;
  static {
    __name(this, "BybitApiError");
  }
  get retryable() {
    return RETRYABLE_CODES2.has(this.code);
  }
};
async function hmacSha2562(data, key) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha2562, "hmacSha256");
async function fetchWithTimeout2(url, init, timeoutMs = FETCH_TIMEOUT_MS2) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
__name(fetchWithTimeout2, "fetchWithTimeout");
async function fetchWithRetry2(url, init, maxRetries = MAX_RETRIES2) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout2(url, init);
      if (!res.ok) {
        let errorMsg = "";
        try {
          errorMsg = await res.text();
        } catch {
          errorMsg = `HTTP ${res.status}`;
        }
        throw new Error(`Bybit HTTP ${res.status}: ${errorMsg}`);
      }
      const json = await res.json();
      if (json.retCode !== 0) {
        const err = new BybitApiError(json.retCode, json.retMsg);
        if (err.retryable && attempt < maxRetries) {
          const delay = RETRY_BASE_DELAY_MS2 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
      return res;
    } catch (err) {
      if (err instanceof BybitApiError) throw err;
      if (err.name === "AbortError" && attempt < maxRetries) {
        const delay = RETRY_BASE_DELAY_MS2 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error("Max retries exceeded");
}
__name(fetchWithRetry2, "fetchWithRetry");
function pairBybitTrades(executions) {
  const fills = executions.filter((e) => e.execType === "Trade").map((e) => ({
    symbol: e.symbol,
    time: Number(e.execTime),
    isBuy: e.side === "Buy",
    price: Number(e.execPrice),
    qty: Number(e.execQty),
    commission: Number(e.execFee || "0")
  }));
  return buildClosedTrades(pairFillsFIFO(fills), "Bybit", 2e4);
}
__name(pairBybitTrades, "pairBybitTrades");
async function fetchBybitTrades(apiKey, secretKey, baseUrl = "https://api.bybit.com", proxy) {
  const timestamp = Date.now();
  const recvWindow = 5e3;
  const allExecutions = [];
  let cursor = void 0;
  const maxPages = 5;
  let page = 0;
  while (page < maxPages) {
    const paramString = cursor ? `category=spot&limit=100&cursor=${cursor}` : "category=spot&limit=100";
    const signPayload = `${timestamp}${apiKey}${recvWindow}${paramString}`;
    const signature = await hmacSha2562(signPayload, secretKey);
    const path = `/v5/execution/list?${paramString}`;
    const url = proxy ? `${proxy.url}${path}` : `${baseUrl}${path}`;
    const headers = {
      "X-BAPI-API-KEY": apiKey,
      "X-BAPI-TIMESTAMP": String(timestamp),
      "X-BAPI-SIGN": signature,
      "X-BAPI-RECV-WINDOW": String(recvWindow)
    };
    if (proxy) {
      headers["X-Proxy-Secret"] = proxy.secret;
      headers["X-Target-Host"] = new URL(baseUrl).hostname;
    }
    const res = await fetchWithRetry2(url, { headers });
    const json = await res.json();
    if (json.retCode !== 0) {
      throw new BybitApiError(json.retCode, json.retMsg);
    }
    const executions = json.result.list;
    if (!executions || executions.length === 0) {
      break;
    }
    allExecutions.push(...executions);
    cursor = json.result.nextPageCursor;
    if (!cursor || cursor === "") {
      break;
    }
    page++;
  }
  console.log(`[Bybit] Total executions fetched: ${allExecutions.length} (${page + 1} pages)`);
  if (allExecutions.length === 0) {
    return [];
  }
  return pairBybitTrades(allExecutions);
}
__name(fetchBybitTrades, "fetchBybitTrades");
async function fetchBybitWalletBalance(apiKey, secretKey, accountType, baseUrl, proxy) {
  const timestamp = Date.now();
  const recvWindow = 5e3;
  const queryString = `accountType=${accountType}`;
  const signPayload = `${timestamp}${apiKey}${recvWindow}${queryString}`;
  const signature = await hmacSha2562(signPayload, secretKey);
  const path = `/v5/account/wallet-balance?${queryString}`;
  const url = proxy ? `${proxy.url}${path}` : `${baseUrl}${path}`;
  const headers = {
    "X-BAPI-API-KEY": apiKey,
    "X-BAPI-TIMESTAMP": String(timestamp),
    "X-BAPI-SIGN": signature,
    "X-BAPI-RECV-WINDOW": String(recvWindow)
  };
  if (proxy) {
    headers["X-Proxy-Secret"] = proxy.secret;
    headers["X-Target-Host"] = new URL(baseUrl).hostname;
  }
  const res = await fetchWithRetry2(url, { headers });
  const json = await res.json();
  if (json.retCode !== 0) {
    throw new BybitApiError(json.retCode, json.retMsg);
  }
  const coins = json.result?.list?.[0]?.coin ?? [];
  const assets = coins.map((c) => {
    const free = Number(c.walletBalance) || 0;
    const isUsdt = c.coin === "USDT";
    return {
      symbol: c.coin,
      free: Math.round(free * 1e8) / 1e8,
      locked: 0,
      priceUsdt: isUsdt ? 1 : 0,
      valueUsdt: isUsdt ? Math.round(free * 100) / 100 : 0
    };
  });
  assets.sort((a, b) => b.valueUsdt - a.valueUsdt);
  console.log(`[Bybit] Wallet balance (${accountType}): ${assets.length} coins, USDT ~$${assets.find((a) => a.symbol === "USDT")?.valueUsdt ?? 0}`);
  return assets;
}
__name(fetchBybitWalletBalance, "fetchBybitWalletBalance");
async function fetchBybitWalletBalances(apiKey, secretKey, baseUrl = "https://api.bybit.com", proxy) {
  try {
    return await fetchBybitWalletBalance(apiKey, secretKey, "UNIFIED", baseUrl, proxy);
  } catch (err) {
    if (err instanceof BybitApiError && (err.code === 110043 || err.code === 110002)) {
      return fetchBybitWalletBalance(apiKey, secretKey, "SPOT", baseUrl, proxy);
    }
    console.error("[Bybit] Wallet balance fetch failed:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
__name(fetchBybitWalletBalances, "fetchBybitWalletBalances");
async function testBybitConnection(apiKey, secretKey, baseUrl = "https://api.bybit.com", proxy) {
  try {
    await fetchBybitWalletBalance(apiKey, secretKey, "UNIFIED", baseUrl, proxy);
  } catch (err) {
    if (err instanceof BybitApiError && (err.code === 110043 || err.code === 110002)) {
      await fetchBybitWalletBalance(apiKey, secretKey, "SPOT", baseUrl, proxy);
      return;
    }
    throw err;
  }
}
__name(testBybitConnection, "testBybitConnection");

// src/utils/aggregator.ts
async function aggregateTrades(exchanges) {
  const allTrades = [];
  const results = await Promise.allSettled(
    exchanges.map(async (cfg) => {
      try {
        switch (cfg.exchange) {
          case "Binance":
            return await fetchBinanceTrades(cfg.apiKey, cfg.secretKey, cfg.baseUrl, cfg.proxy);
          case "Bybit":
            return await fetchBybitTrades(cfg.apiKey, cfg.secretKey, cfg.baseUrl, cfg.proxy);
          default:
            throw new Error(`Unknown exchange: ${cfg.exchange}`);
        }
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        wrapped.exchange = cfg.exchange;
        throw wrapped;
      }
    })
  );
  for (const result of results) {
    if (result.status === "fulfilled") {
      allTrades.push(...result.value);
    } else {
      const reason = result.reason;
      const exchange = reason?.exchange ?? "unknown";
      const code = reason?.code;
      const httpStatus = reason?.httpStatus;
      const msg = reason?.msg;
      if (code !== void 0) {
        const parts = [`[${exchange}] API error code=${code}`];
        if (httpStatus !== void 0) parts.push(`httpStatus=${httpStatus}`);
        if (msg) parts.push(`msg="${msg}"`);
        console.error(`Failed to fetch from exchange:`, parts.join(", "));
      } else {
        console.error(`[${exchange}] Failed to fetch from exchange:`, reason);
      }
    }
  }
  allTrades.sort((a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime());
  const reindexed = allTrades.map((t, i) => ({
    ...t,
    id: allTrades.length - i,
    sequence: allTrades.length - i,
    isWin: t.realisedPnl > 0,
    isBreakeven: t.realisedPnl === 0
  }));
  const netWorth = reindexed.reduce((sum, t) => sum + t.realisedPnl, 0) + 5e4;
  return {
    closedTrades: reindexed,
    netWorth: Math.round(netWorth * 100) / 100,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(aggregateTrades, "aggregateTrades");
function filterTrades(trades, filters) {
  let result = trades;
  if (filters.exchange && filters.exchange !== "All Accounts") {
    result = result.filter((t) => t.exchange === filters.exchange);
  }
  if (filters.symbol && filters.symbol !== "All Symbols") {
    result = result.filter((t) => t.symbol === filters.symbol);
  }
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom).getTime();
    result = result.filter((t) => new Date(t.exitTime).getTime() >= from);
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo).getTime();
    result = result.filter((t) => new Date(t.exitTime).getTime() <= to);
  }
  if (filters.limit && filters.limit < result.length) {
    result = result.slice(0, filters.limit);
  }
  return result;
}
__name(filterTrades, "filterTrades");

// src/utils/mock-data.ts
function generateMockDashboard() {
  const now = Date.now();
  const day = 864e5;
  const tradeConfigs = [
    { symbol: "BTCUSDT", dir: "Long", size: 0.15, pnl: 420, r: 2.8, hold: "6h 30m" },
    { symbol: "ETHUSDT", dir: "Short", size: 2, pnl: 210, r: 2.2, hold: "4h 15m" },
    { symbol: "SOLUSDT", dir: "Long", size: 15, pnl: 165, r: 1.9, hold: "3h 45m" },
    { symbol: "AVAXUSDT", dir: "Short", size: 60, pnl: 95, r: 1.4, hold: "2h 30m" },
    { symbol: "DOGEUSDT", dir: "Long", size: 8e3, pnl: 52, r: 1.1, hold: "1h 20m" },
    { symbol: "LINKUSDT", dir: "Long", size: 80, pnl: 145, r: 1.7, hold: "5h 00m" },
    { symbol: "BTCUSDT", dir: "Short", size: 0.08, pnl: 85, r: 0.9, hold: "3h 10m" },
    { symbol: "ETHUSDT", dir: "Long", size: 1.5, pnl: -75, r: -1.1, hold: "2h 45m" },
    { symbol: "SOLUSDT", dir: "Short", size: 10, pnl: -42, r: -0.6, hold: "1h 50m" },
    { symbol: "AVAXUSDT", dir: "Long", size: 40, pnl: 112, r: 1.6, hold: "4h 20m" },
    { symbol: "LINKUSDT", dir: "Short", size: 50, pnl: -55, r: -0.8, hold: "3h 30m" },
    { symbol: "DOGEUSDT", dir: "Short", size: 12e3, pnl: 88, r: 1.3, hold: "2h 10m" },
    { symbol: "MATICUSDT", dir: "Long", size: 500, pnl: 38, r: 0.7, hold: "1h 40m" },
    { symbol: "DOTUSDT", dir: "Short", size: 30, pnl: 72, r: 1.2, hold: "3h 00m" },
    { symbol: "ATOMUSDT", dir: "Long", size: 20, pnl: -28, r: -0.4, hold: "2h 20m" },
    { symbol: "ARBUSDT", dir: "Short", size: 200, pnl: 45, r: 0.8, hold: "1h 10m" }
  ];
  const exchanges = ["Binance", "Bybit"];
  const accounts = ["Main Account", "Alt Account"];
  const closedTrades = tradeConfigs.map((t, i) => {
    const dayOffset = (tradeConfigs.length - 1 - i) * 1.8;
    const tradeDate = new Date(now - dayOffset * day);
    const dateStr = tradeDate.toISOString();
    const exitPnl = t.pnl;
    const entryPrice = t.dir === "Long" ? 1e4 + i * 500 : 12e3 - i * 300;
    const exitPrice = t.dir === "Long" ? entryPrice + t.pnl / t.size : entryPrice - t.pnl / t.size;
    return {
      id: tradeConfigs.length - i,
      symbol: t.symbol,
      dir: t.dir,
      size: t.size,
      entry: Math.round(entryPrice * 100) / 100,
      exit: Math.round(exitPrice * 100) / 100,
      holdTime: t.hold,
      realisedPnl: exitPnl,
      rMultiple: t.r,
      exchange: exchanges[i % 2],
      account: accounts[i % 2],
      entryTime: new Date(tradeDate.getTime() - 36e5).toISOString(),
      exitTime: dateStr,
      sequence: tradeConfigs.length - i,
      isWin: exitPnl > 0,
      isBreakeven: exitPnl === 0
    };
  });
  const netWorth = closedTrades.reduce((sum, t) => sum + t.realisedPnl, 0) + 5e4;
  return {
    closedTrades,
    netWorth: Math.round(netWorth * 100) / 100,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
    accounts: [
      {
        exchange: "Binance",
        configured: true,
        valid: true,
        assets: generateMockAssets()
      },
      {
        exchange: "Bybit",
        configured: true,
        valid: true,
        assets: []
      }
    ]
  };
}
__name(generateMockDashboard, "generateMockDashboard");
function generateMockAssets() {
  return [
    { symbol: "BTC", free: 0.15, locked: 0, priceUsdt: 64120, valueUsdt: 9618 },
    { symbol: "ETH", free: 2.5, locked: 0, priceUsdt: 3210, valueUsdt: 8025 },
    { symbol: "USDT", free: 12500, locked: 0, priceUsdt: 1, valueUsdt: 12500 },
    { symbol: "SOL", free: 8, locked: 0, priceUsdt: 138.2, valueUsdt: 1105.6 },
    { symbol: "BNB", free: 3.2, locked: 0, priceUsdt: 580, valueUsdt: 1856 },
    { symbol: "DOGE", free: 5e3, locked: 0, priceUsdt: 0.1245, valueUsdt: 622.5 },
    { symbol: "LINK", free: 80, locked: 0, priceUsdt: 14.2, valueUsdt: 1136 },
    { symbol: "AVAX", free: 40, locked: 0, priceUsdt: 28.5, valueUsdt: 1140 }
  ];
}
__name(generateMockAssets, "generateMockAssets");

// src/utils/exchange-keys.ts
var LEGACY_KEY = "stone-deploy-2024";
function xorDecode(enc, key) {
  const str = atob(enc);
  let r = "";
  for (let i = 0; i < str.length; i++)
    r += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  return r;
}
__name(xorDecode, "xorDecode");
async function getExchangeKeys(kv, encKey) {
  const raw = await kv.get("settings_keys", "text");
  if (!raw) return { binance: null, bybit: null };
  try {
    const s = JSON.parse(raw);
    const result = { binance: null, bybit: null };
    const isPrintable = /* @__PURE__ */ __name((v) => /^[\x20-\x7E]*$/.test(v), "isPrintable");
    const decode = /* @__PURE__ */ __name((enc) => {
      if (encKey) {
        const v = xorDecode(enc, encKey);
        if (isPrintable(v)) return v;
      }
      const legacy = xorDecode(enc, LEGACY_KEY);
      return isPrintable(legacy) ? legacy : null;
    }, "decode");
    if (s.binance && typeof s.binance === "object") {
      const b = s.binance;
      const apiKey = decode(b.apiKey);
      const secretKey = decode(b.secretKey);
      if (apiKey && secretKey) {
        result.binance = { apiKey, secretKey };
      }
    }
    if (s.bybit && typeof s.bybit === "object") {
      const b = s.bybit;
      const apiKey = decode(b.apiKey);
      const secretKey = decode(b.secretKey);
      if (apiKey && secretKey) {
        result.bybit = { apiKey, secretKey };
      }
    }
    return result;
  } catch {
    return { binance: null, bybit: null };
  }
}
__name(getExchangeKeys, "getExchangeKeys");

// src/services/sync.service.ts
var LEGACY_PAIRS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "ADAUSDT",
  "AVAXUSDT",
  "DOTUSDT",
  "LINKUSDT",
  "UNIUSDT",
  "ATOMUSDT",
  "FTMUSDT",
  "NEARUSDT",
  "AAVEUSDT",
  "SANDUSDT",
  "SHBUSDT",
  "PEPEUSDT",
  "WIFUSDT",
  "ENAUSDT",
  "NOTUSDT",
  "TRXUSDT",
  "QUICKUSDT",
  "LTCUSDT",
  "BCHUSDT",
  "ETCUSDT",
  "FILUSDT",
  "APTUSDT",
  "ARBUSDT",
  "OPUSDT",
  "SUIUSDT",
  "SEIUSDT",
  "TIAUSDT",
  "MATICUSDT",
  "INJUSDT",
  "RUNEUSDT",
  "DOGSUSDT",
  "IOUSDT",
  "MAVUSDT",
  "ENSUSDT"
];
var BATCH_SIZE = 24;
var FORWARD_MAX_PAGES = 5;
var BACK_MAX_PAGES = 5;
var RAW_CAP = 25e3;
var KV = {
  symbols: "binance_symbols",
  cursor: "sync_cursor",
  raw: "binance_raw_trades",
  binanceCache: "binance_trades_cache",
  bybitCache: "bybit_trades_cache",
  meta: "caches_meta"
};
function proxyFromEnv(env) {
  return env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET } : void 0;
}
__name(proxyFromEnv, "proxyFromEnv");
function mergeTradeCaches(binance, bybit) {
  const all = [...binance, ...bybit].sort(
    (a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime()
  );
  return all.map((t, i) => ({
    ...t,
    id: all.length - i,
    sequence: all.length - i,
    isWin: t.realisedPnl > 0,
    isBreakeven: t.realisedPnl === 0
  }));
}
__name(mergeTradeCaches, "mergeTradeCaches");
async function buildDashboardFromCaches(kv) {
  const [binance, bybit, meta] = await Promise.all([
    kv.get(KV.binanceCache, "json"),
    kv.get(KV.bybitCache, "json"),
    kv.get(KV.meta, "json")
  ]);
  if (!binance && !bybit) return null;
  const closedTrades = mergeTradeCaches(binance ?? [], bybit ?? []);
  const netWorth = closedTrades.reduce((s, t) => s + t.realisedPnl, 0) + 5e4;
  return {
    closedTrades,
    netWorth: Math.round(netWorth * 100) / 100,
    lastUpdated: meta?.lastUpdated ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildDashboardFromCaches, "buildDashboardFromCaches");
async function runSyncEngine(env) {
  const kv = env.STONE_DATA;
  const keys = await getExchangeKeys(kv, env.STONE_ENC_KEY);
  if (!keys.binance && !keys.bybit) {
    return { ok: false, detail: "no exchange keys configured" };
  }
  const proxy = proxyFromEnv(env);
  const detail = [];
  let symbols = await kv.get(KV.symbols, "json");
  if (!symbols || symbols.length === 0) {
    let live = [];
    if (keys.binance && proxy) {
      try {
        live = await fetchBinanceSpotSymbols(proxy);
      } catch (err) {
        console.error("[Sync] exchangeInfo failed:", err instanceof Error ? err.message : err);
      }
    }
    symbols = [.../* @__PURE__ */ new Set([...live, ...LEGACY_PAIRS])];
    await kv.put(KV.symbols, JSON.stringify(symbols), { expirationTtl: 86400 });
    detail.push(`symbols: ${symbols.length} (${live.length} live + legacy)`);
  }
  const totalBatches = Math.max(1, Math.ceil(symbols.length / BATCH_SIZE));
  const cursor = await kv.get(KV.cursor, "json") ?? {
    batchIndex: 0,
    totalBatches,
    lastFullSync: null,
    fromIds: {}
  };
  cursor.totalBatches = totalBatches;
  if (cursor.batchIndex >= totalBatches) cursor.batchIndex = 0;
  if (keys.binance) {
    const batch = symbols.slice(cursor.batchIndex * BATCH_SIZE, (cursor.batchIndex + 1) * BATCH_SIZE);
    const raw = await kv.get(KV.raw, "json") ?? [];
    const byId = new Map(raw.map((t) => [`${t.symbol}:${t.id}`, t]));
    let fetched = 0;
    for (const symbol of batch) {
      try {
        fetched += await syncSymbolTrades(byId, cursor, symbol, keys.binance.apiKey, keys.binance.secretKey, proxy);
      } catch (err) {
        console.error(`[Sync] ${symbol} failed:`, err instanceof Error ? err.message : err);
      }
    }
    if (fetched > 0 || batch.length > 0) {
      const merged = [...byId.values()].sort((a, b) => a.time - b.time).slice(-RAW_CAP);
      const closed = buildClosedTrades(
        pairFillsFIFO(
          merged.map((t) => ({
            symbol: t.symbol,
            time: t.time,
            isBuy: typeof t.isBuyer === "string" ? t.isBuyer === "true" : Boolean(t.isBuyer),
            price: Number(t.price),
            qty: Number(t.qty),
            commission: Number(t.commission) || 0
          }))
        ),
        "Binance",
        1e4
      );
      await kv.put(KV.raw, JSON.stringify(merged));
      await kv.put(KV.binanceCache, JSON.stringify(closed));
      detail.push(`binance batch ${cursor.batchIndex + 1}/${totalBatches}: +${fetched} raw \u2192 ${closed.length} closed`);
    }
  }
  if (keys.bybit) {
    try {
      const bybitClosed = await fetchBybitTrades(keys.bybit.apiKey, keys.bybit.secretKey, "https://api.bybit.com", proxy);
      await kv.put(KV.bybitCache, JSON.stringify(bybitClosed));
      detail.push(`bybit: ${bybitClosed.length} closed`);
    } catch (err) {
      console.error("[Sync] Bybit fetch failed \u2014 keeping previous cache:", err instanceof Error ? err.message : err);
    }
  }
  cursor.batchIndex++;
  if (cursor.batchIndex >= totalBatches) {
    cursor.batchIndex = 0;
    cursor.lastFullSync = (/* @__PURE__ */ new Date()).toISOString();
  }
  await kv.put(KV.cursor, JSON.stringify(cursor));
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const meta = {
    lastUpdated: now,
    binanceUpdatedAt: now,
    bybitUpdatedAt: now
  };
  await kv.put(KV.meta, JSON.stringify(meta));
  return { ok: true, detail: detail.join("; ") || "no-op" };
}
__name(runSyncEngine, "runSyncEngine");
async function syncSymbolTrades(byId, cursor, symbol, apiKey, secretKey, proxy) {
  const seenId = cursor.fromIds[symbol];
  let added = 0;
  if (seenId == null) {
    let endTime;
    for (let page = 0; page <= BACK_MAX_PAGES; page++) {
      const pageTrades = await fetchSymbolMyTrades(apiKey, secretKey, symbol, "https://api1.binance.com", proxy, {
        endTime
      });
      if (pageTrades.length === 0) break;
      for (const t of pageTrades) {
        if (!byId.has(`${t.symbol}:${t.id}`)) added++;
        byId.set(`${t.symbol}:${t.id}`, t);
      }
      const oldest = pageTrades[0];
      const newest = pageTrades[pageTrades.length - 1];
      cursor.fromIds[symbol] = Math.max(cursor.fromIds[symbol] ?? 0, newest.id);
      if (pageTrades.length < 1e3) break;
      const nextEndTime = oldest.time - 1;
      if (nextEndTime === endTime || nextEndTime <= 0) break;
      endTime = nextEndTime;
    }
  } else {
    let fromId = seenId;
    for (let page = 0; page < FORWARD_MAX_PAGES; page++) {
      const pageTrades = await fetchSymbolMyTrades(apiKey, secretKey, symbol, "https://api1.binance.com", proxy, {
        fromId
      });
      if (pageTrades.length === 0) break;
      for (const t of pageTrades) {
        if (!byId.has(`${t.symbol}:${t.id}`)) added++;
        byId.set(`${t.symbol}:${t.id}`, t);
      }
      const newest = pageTrades[pageTrades.length - 1];
      if (newest.id <= fromId) break;
      fromId = newest.id;
      cursor.fromIds[symbol] = fromId;
      if (pageTrades.length < 1e3) break;
    }
  }
  return added;
}
__name(syncSymbolTrades, "syncSymbolTrades");

// src/handlers/dashboard.handler.ts
function buildExchangeConfigs(env, keys) {
  const proxy = env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET } : void 0;
  const exchanges = [];
  if (keys.binance) {
    exchanges.push({
      exchange: "Binance",
      apiKey: keys.binance.apiKey,
      secretKey: keys.binance.secretKey,
      proxy
    });
  }
  if (keys.bybit) {
    exchanges.push({
      exchange: "Bybit",
      apiKey: keys.bybit.apiKey,
      secretKey: keys.bybit.secretKey
    });
  }
  return exchanges;
}
__name(buildExchangeConfigs, "buildExchangeConfigs");
var ALLOWED_ORIGINS = [
  "https://app.slinglab.xyz",
  "http://localhost:3000",
  "http://localhost:3456"
];
function getDashboardCors(request) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "https://app.slinglab.xyz";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
}
__name(getDashboardCors, "getDashboardCors");
async function handleDashboardRequest(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  const corsHeaders = getDashboardCors(request);
  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    if (method === "GET" && url.pathname.endsWith("/api/v1/dashboard")) {
      return await getDashboard(env, corsHeaders);
    }
    if (method === "GET" && url.pathname.endsWith("/api/v1/data")) {
      return await getAllData(env, corsHeaders);
    }
    if (method === "GET" && url.pathname.endsWith("/api/v1/dashboard/filtered")) {
      return await getFilteredDashboard(url, env, corsHeaders);
    }
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: corsHeaders
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
__name(handleDashboardRequest, "handleDashboardRequest");
async function resolveKeys(env) {
  const keys = await getExchangeKeys(env.STONE_DATA, env.STONE_ENC_KEY);
  if ((!keys.binance || keys.binance.apiKey.length < 32) && env.BINANCE_API_KEY && env.BINANCE_SECRET_KEY) {
    keys.binance = { apiKey: env.BINANCE_API_KEY, secretKey: env.BINANCE_SECRET_KEY };
  }
  return keys;
}
__name(resolveKeys, "resolveKeys");
async function loadDashboardData(env, keys) {
  const cached = await env.STONE_DATA.get("dashboard_data", "json");
  if (cached) return cached;
  const fromCaches = await buildDashboardFromCaches(env.STONE_DATA);
  if (fromCaches) return fromCaches;
  if (keys.binance || keys.bybit) {
    return aggregateTrades(buildExchangeConfigs(env, keys));
  }
  return generateMockDashboard();
}
__name(loadDashboardData, "loadDashboardData");
async function getDashboard(env, corsHeaders) {
  const keys = await resolveKeys(env);
  let data;
  const accounts = [];
  let openPositions = [];
  let netAssetValue = 0;
  if (keys.binance || keys.bybit) {
    data = await buildDashboardFromCaches(env.STONE_DATA) ?? await aggregateTrades(buildExchangeConfigs(env, keys));
    if (keys.binance) {
      try {
        const proxy = env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET } : void 0;
        const binanceAssets = await fetchAccountBalancesDetailed(
          keys.binance.apiKey,
          keys.binance.secretKey,
          void 0,
          proxy
        );
        accounts.push({
          exchange: "Binance",
          configured: true,
          valid: true,
          assets: binanceAssets
        });
        netAssetValue += binanceAssets.reduce((s, a) => s + a.valueUsdt, 0);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Dashboard] Binance balance fetch failed:", msg);
        accounts.push({
          exchange: "Binance",
          configured: true,
          valid: false,
          assets: [],
          error: msg
        });
      }
    }
    if (keys.bybit) {
      const proxy = env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET } : void 0;
      const bybitAssets = await fetchBybitWalletBalances(keys.bybit.apiKey, keys.bybit.secretKey, void 0, proxy);
      accounts.push({
        exchange: "Bybit",
        configured: true,
        valid: true,
        assets: bybitAssets
      });
      netAssetValue += bybitAssets.reduce((s, a) => s + a.valueUsdt, 0);
    }
    if (keys.binance) {
      try {
        const proxy = env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET } : void 0;
        openPositions = await fetchBinanceFuturesPositions(
          keys.binance.apiKey,
          keys.binance.secretKey,
          void 0,
          proxy
        );
        netAssetValue += await fetchBinanceFuturesBalance(
          keys.binance.apiKey,
          keys.binance.secretKey,
          void 0,
          proxy
        );
      } catch (err) {
        console.error("[Dashboard] Binance futures positions fetch failed:", err instanceof Error ? err.message : String(err));
      }
    }
    data.accounts = accounts;
    data.openPositions = openPositions;
    if (netAssetValue > 0) {
      data.netWorth = Math.round(netAssetValue * 100) / 100;
    }
  } else {
    data = generateMockDashboard();
  }
  try {
    await env.STONE_DATA.put("dashboard_data", JSON.stringify(data), {
      expirationTtl: 60
    });
  } catch (_err) {
    console.error("KV put failed:", _err instanceof Error ? _err.message : _err);
  }
  return new Response(JSON.stringify(data), { headers: corsHeaders });
}
__name(getDashboard, "getDashboard");
async function getFilteredDashboard(url, env, corsHeaders) {
  const exchange = url.searchParams.get("exchange") || void 0;
  const symbol = url.searchParams.get("symbol") || void 0;
  const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")) : void 0;
  const dateFrom = url.searchParams.get("dateFrom") || void 0;
  const dateTo = url.searchParams.get("dateTo") || void 0;
  const data = await loadDashboardData(env, await resolveKeys(env));
  const filtered = filterTrades(data.closedTrades, {
    exchange: exchange === "All Accounts" ? void 0 : exchange,
    symbol: symbol === "All Symbols" ? void 0 : symbol,
    limit,
    dateFrom,
    dateTo
  });
  return new Response(
    JSON.stringify({
      closedTrades: filtered,
      total: filtered.length,
      netWorth: data.netWorth,
      lastUpdated: data.lastUpdated
    }),
    { headers: corsHeaders }
  );
}
__name(getFilteredDashboard, "getFilteredDashboard");
async function getAllData(env, corsHeaders) {
  const keys = await resolveKeys(env);
  const dashData = await loadDashboardData(env, keys);
  let closedTrades = dashData.closedTrades;
  let assets;
  if (dashData.accounts) {
    const binanceAccount = dashData.accounts.find((a) => a.exchange === "Binance");
    if (binanceAccount?.valid && binanceAccount.assets.length > 0) {
      assets = binanceAccount.assets;
    }
  }
  if (!assets && keys.binance) {
    try {
      const proxy = env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET } : void 0;
      assets = await fetchAccountBalancesDetailed(
        keys.binance.apiKey,
        keys.binance.secretKey,
        void 0,
        proxy
      );
    } catch (err) {
      console.error("[getAllData] Binance balance fetch failed:", err instanceof Error ? err.message : err);
    }
  }
  if (!assets) {
    assets = generateMockAssets();
  }
  const wins = closedTrades.filter((t) => t.realisedPnl > 0);
  const losses = closedTrades.filter((t) => t.realisedPnl < 0);
  const totalPnl = closedTrades.reduce((s, t) => s + t.realisedPnl, 0);
  const pnlByDay = /* @__PURE__ */ new Map();
  for (const t of closedTrades) {
    const day = t.exitTime.slice(0, 10);
    pnlByDay.set(day, (pnlByDay.get(day) ?? 0) + t.realisedPnl);
  }
  const sortedDays = [...pnlByDay.keys()].sort();
  const dailyPnl = sortedDays.map((day) => ({ date: day, pnl: Math.round(pnlByDay.get(day) * 100) / 100 }));
  let cumulative = 0;
  const equityCurve = sortedDays.map((day) => {
    cumulative += pnlByDay.get(day) ?? 0;
    return { date: day, value: Math.round((dashData.netWorth - (totalPnl - cumulative)) * 100) / 100 };
  });
  const parseHoldSeconds = /* @__PURE__ */ __name((h) => {
    let s = 0;
    const m = h.match(/(\d+)h/);
    const mi = h.match(/(\d+)m/);
    const se = h.match(/(\d+)s/);
    if (m) s += parseInt(m[1], 10) * 3600;
    if (mi) s += parseInt(mi[1], 10) * 60;
    if (se) s += parseInt(se[1], 10);
    return s;
  }, "parseHoldSeconds");
  const totalHoldSec = closedTrades.reduce((s, t) => s + parseHoldSeconds(t.holdTime), 0);
  const avgHoldSec = closedTrades.length > 0 ? Math.round(totalHoldSec / closedTrades.length) : 0;
  const avgTradeDuration = avgHoldSec > 0 ? `${Math.floor(avgHoldSec / 3600)}h ${Math.floor(avgHoldSec % 3600 / 60)}m` : "0h 0m";
  const openPositions = dashData.openPositions ?? [];
  const data = {
    summary: {
      netPnl: Math.round(totalPnl * 100) / 100,
      grossPnl: Math.round(wins.reduce((s, t) => s + t.realisedPnl, 0) * 100) / 100,
      grossLoss: Math.round(losses.reduce((s, t) => s + t.realisedPnl, 0) * 100) / 100,
      winRate: closedTrades.length > 0 ? wins.length / closedTrades.length * 100 : 0,
      profitFactor: losses.reduce((s, t) => s + Math.abs(t.realisedPnl), 0) > 0 ? wins.reduce((s, t) => s + t.realisedPnl, 0) / losses.reduce((s, t) => s + Math.abs(t.realisedPnl), 0) : 0,
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
      sharpeRatio: 0
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
      roi: p.entryPrice > 0 ? p.unrealizedPnl / (p.size * p.entryPrice) * 100 : 0,
      leverage: p.leverage,
      liquidation: p.liquidationPrice,
      unrealizedPnl: p.unrealizedPnl,
      exchange: p.exchange
    })),
    trades: closedTrades.map((t) => ({
      id: String(t.id),
      time: t.exitTime,
      pair: t.symbol,
      side: t.dir,
      price: t.exit,
      qty: t.size,
      pnl: t.realisedPnl,
      roi: t.size > 0 ? t.realisedPnl / (t.entry * t.size) * 100 : 0,
      strategy: "",
      tags: [],
      duration: t.holdTime,
      exchange: t.exchange,
      fees: 0,
      notes: ""
    })),
    sides: [
      { side: "Long", trades: closedTrades.filter((t) => t.dir === "Long").length, pnl: Math.round(closedTrades.filter((t) => t.dir === "Long").reduce((s, t) => s + t.realisedPnl, 0) * 100) / 100, winRate: 0, avgRoi: 0, volume: 0 },
      { side: "Short", trades: closedTrades.filter((t) => t.dir === "Short").length, pnl: Math.round(closedTrades.filter((t) => t.dir === "Short").reduce((s, t) => s + t.realisedPnl, 0) * 100) / 100, winRate: 0, avgRoi: 0, volume: 0 }
    ],
    tags: [],
    durations: [],
    sizes: [],
    calendar: [],
    journal: [],
    closedTrades,
    assets
  };
  return new Response(JSON.stringify(data), { headers: corsHeaders });
}
__name(getAllData, "getAllData");

// src/handlers/calendar.handler.ts
async function getDashboardData(env) {
  const cached = await env.STONE_DATA.get("dashboard_data", "json");
  if (cached) return cached;
  const fromCaches = await buildDashboardFromCaches(env.STONE_DATA);
  if (fromCaches) return fromCaches;
  const keys = await getExchangeKeys(env.STONE_DATA, env.STONE_ENC_KEY);
  if (keys.binance || keys.bybit) {
    const exchanges = [];
    if (keys.binance) {
      exchanges.push({
        exchange: "Binance",
        apiKey: keys.binance.apiKey,
        secretKey: keys.binance.secretKey,
        proxy: env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET } : void 0
      });
    }
    if (keys.bybit) {
      exchanges.push({ exchange: "Bybit", apiKey: keys.bybit.apiKey, secretKey: keys.bybit.secretKey });
    }
    return aggregateTrades(exchanges);
  }
  return generateMockDashboard();
}
__name(getDashboardData, "getDashboardData");
function aggregateCalendarDays(trades) {
  const map = /* @__PURE__ */ new Map();
  for (const t of trades) {
    const dateKey = t.exitTime.slice(0, 10);
    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey).push(t);
  }
  const days = [];
  for (const [date, dayTrades] of map) {
    const totalPnl = dayTrades.reduce((s, t) => s + t.realisedPnl, 0);
    const winCount = dayTrades.filter((t) => t.realisedPnl > 0).length;
    const lossCount = dayTrades.filter((t) => t.realisedPnl < 0).length;
    days.push({
      date,
      totalPnl: Math.round(totalPnl * 100) / 100,
      tradeCount: dayTrades.length,
      winCount,
      lossCount
    });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
}
__name(aggregateCalendarDays, "aggregateCalendarDays");
async function handleCalendarRequest(request, env) {
  const url = new URL(request.url);
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://app.slinglab.xyz",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    if (url.pathname.endsWith("/api/v1/calendar")) {
      const data = await getDashboardData(env);
      let trades = data.closedTrades;
      const exchange = url.searchParams.get("exchange");
      const symbol = url.searchParams.get("symbol");
      const dateFrom = url.searchParams.get("dateFrom");
      const dateTo = url.searchParams.get("dateTo");
      if (exchange && exchange !== "All Accounts") {
        trades = trades.filter((t) => t.exchange === exchange);
      }
      if (symbol && symbol !== "All Symbols") {
        trades = trades.filter((t) => t.symbol === symbol);
      }
      if (dateFrom) {
        const from = new Date(dateFrom).getTime();
        trades = trades.filter((t) => new Date(t.exitTime).getTime() >= from);
      }
      if (dateTo) {
        const to = new Date(dateTo).getTime();
        trades = trades.filter((t) => new Date(t.exitTime).getTime() <= to);
      }
      const calendar = aggregateCalendarDays(trades);
      return new Response(JSON.stringify({ calendar, lastUpdated: data.lastUpdated }), { headers: corsHeaders });
    }
    if (url.pathname.endsWith("/api/v1/trades/by-date")) {
      const date = url.searchParams.get("date");
      if (!date) {
        return new Response(JSON.stringify({ error: "Missing date parameter. Usage: /api/v1/trades/by-date?date=2026-07-23" }), {
          status: 400,
          headers: corsHeaders
        });
      }
      const data = await getDashboardData(env);
      const dayTrades = data.closedTrades.filter((t) => t.exitTime.startsWith(date));
      const totalPnl = dayTrades.reduce((s, t) => s + t.realisedPnl, 0);
      const winCount = dayTrades.filter((t) => t.realisedPnl > 0).length;
      const lossCount = dayTrades.filter((t) => t.realisedPnl < 0).length;
      const response = {
        date,
        trades: dayTrades.sort((a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime()),
        totalPnl: Math.round(totalPnl * 100) / 100,
        tradeCount: dayTrades.length,
        winCount,
        lossCount
      };
      return new Response(JSON.stringify(response), { headers: corsHeaders });
    }
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: corsHeaders
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
__name(handleCalendarRequest, "handleCalendarRequest");

// src/index.ts
var EXT_MAP = {
  ".html": "text/html;charset=utf-8",
  ".js": "application/javascript;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".json": "application/json;charset=utf-8",
  ".txt": "text/plain;charset=utf-8"
};
function getContentType(path) {
  for (const [ext, mime] of Object.entries(EXT_MAP)) {
    if (path.endsWith(ext)) return mime;
  }
  return "application/octet-stream";
}
__name(getContentType, "getContentType");
var PAGE_ROUTES = {
  "/": "/index.html",
  "/settings": "/settings.html",
  "/analytics": "/analytics.html",
  "/trades": "/trades.html",
  "/positions": "/positions.html",
  "/journal": "/journal.html",
  "/performance": "/performance.html",
  "/reporting": "/reporting.html",
  "/_not-found": "/_not-found.html",
  "/404": "/404.html"
};
function routePath(path) {
  if (path.startsWith("/api/")) return path;
  if (path.includes(".")) return path;
  return PAGE_ROUTES[path] || "/index.html";
}
__name(routePath, "routePath");
function normalizePath(p) {
  if (p === "/stone" || p === "/stone/") return "/";
  if (p.startsWith("/stone/")) return p.slice(6);
  return p;
}
__name(normalizePath, "normalizePath");
function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = ["https://app.slinglab.xyz", "http://localhost:3000", "http://localhost:3456"];
  const allowOrigin = allowed.includes(origin) ? origin : "https://app.slinglab.xyz";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders, "getCorsHeaders");
function jsonResp(data, status = 200, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      "Cache-Control": "no-cache,no-store,must-revalidate",
      ...corsHeaders
    }
  });
}
__name(jsonResp, "jsonResp");
async function serveStatic(path, kv) {
  const kvKey = routePath(path);
  const buf = await kv.get(kvKey, "arrayBuffer");
  if (buf) {
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": getContentType(kvKey),
        "Cache-Control": "no-cache,no-store,must-revalidate"
      }
    });
  }
  if (!path.startsWith("/api/")) {
    const index = await kv.get("/index.html", "arrayBuffer");
    if (index) {
      return new Response(index, {
        status: 200,
        headers: { "Content-Type": "text/html;charset=utf-8" }
      });
    }
  }
  return null;
}
__name(serveStatic, "serveStatic");
var ALLOWED_ORIGINS2 = [
  "https://app.slinglab.xyz",
  "http://localhost:3000",
  "http://localhost:3456"
];
function isAllowedOrigin(request) {
  const origin = request.headers.get("Origin");
  return !origin || ALLOWED_ORIGINS2.includes(origin);
}
__name(isAllowedOrigin, "isAllowedOrigin");
function xorEncode(str, key) {
  let r = "";
  for (let i = 0; i < str.length; i++)
    r += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  return btoa(r);
}
__name(xorEncode, "xorEncode");
function xorDecode2(enc, key) {
  const str = atob(enc);
  let r = "";
  for (let i = 0; i < str.length; i++)
    r += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  return r;
}
__name(xorDecode2, "xorDecode");
async function getSettings(kv) {
  const val = await kv.get("settings_keys", "text");
  return val ? JSON.parse(val) : {};
}
__name(getSettings, "getSettings");
async function putSettings(kv, s) {
  await kv.put("settings_keys", JSON.stringify(s));
}
__name(putSettings, "putSettings");
var AUTH_COOKIE = "stone_auth";
var AUTH_TTL_MS = 7 * 24 * 3600 * 1e3;
async function hmacSha2563(data, key) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha2563, "hmacSha256");
function readCookie(request, name) {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}
__name(readCookie, "readCookie");
function timingSafeEqualStr(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
__name(timingSafeEqualStr, "timingSafeEqualStr");
async function checkAuth(request, env) {
  const password = await getAuthPassword(env.STONE_DATA, env);
  if (!password) return true;
  const token = readCookie(request, AUTH_COOKIE);
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0 || dot === token.length - 1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSha2563(payload, password);
  if (!timingSafeEqualStr(sig, expected)) return false;
  try {
    const data = JSON.parse(atob(payload));
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}
__name(checkAuth, "checkAuth");
function authCookie(payloadSig, maxAgeSec) {
  return `${AUTH_COOKIE}=${payloadSig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`;
}
__name(authCookie, "authCookie");
var MAX_FAILED_ATTEMPTS = 3;
var RESET_TTL_MS = 30 * 60 * 1e3;
var RESEND_MIN_INTERVAL_MS = 60 * 1e3;
async function getSiteAuth(kv, env) {
  const raw = await kv.get("site_auth", "json");
  if (raw?.password) {
    try {
      if (env.STONE_ENC_KEY) {
        return {
          password: xorDecode2(raw.password, env.STONE_ENC_KEY),
          failedAttempts: raw.failedAttempts ?? 0,
          locked: raw.locked ?? false,
          lastResetSentAt: raw.lastResetSentAt ?? 0
        };
      }
    } catch {
    }
  }
  if (env.SITE_PASSWORD) {
    return { password: env.SITE_PASSWORD, failedAttempts: 0, locked: false, lastResetSentAt: 0 };
  }
  return null;
}
__name(getSiteAuth, "getSiteAuth");
async function saveSiteAuth(kv, env, auth) {
  if (!env.STONE_ENC_KEY) return;
  await kv.put(
    "site_auth",
    JSON.stringify({
      password: xorEncode(auth.password, env.STONE_ENC_KEY),
      failedAttempts: auth.failedAttempts,
      locked: auth.locked,
      lastResetSentAt: auth.lastResetSentAt
    })
  );
}
__name(saveSiteAuth, "saveSiteAuth");
async function getAuthPassword(kv, env) {
  const auth = await getSiteAuth(kv, env);
  return auth?.password ?? null;
}
__name(getAuthPassword, "getAuthPassword");
async function sha256Hex(data) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(randomToken, "randomToken");
async function sendResetEmail(env, resetLink) {
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM || !env.RECOVERY_EMAIL) {
    throw new Error("\u90AE\u4EF6\u670D\u52A1\u672A\u914D\u7F6E (\u9700\u8981 EMAIL_API_KEY / EMAIL_FROM / RECOVERY_EMAIL)");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [env.RECOVERY_EMAIL],
      subject: "Stone \xB7 \u5BC6\u7801\u91CD\u7F6E",
      html: `<p>\u4F60\u8BF7\u6C42\u4E86 Stone \u5BC6\u7801\u91CD\u7F6E\u3002</p><p>\u70B9\u51FB\u4E0B\u9762\u7684\u94FE\u63A5\u8BBE\u7F6E\u65B0\u5BC6\u7801\uFF0830 \u5206\u949F\u5185\u6709\u6548\uFF09\uFF1A</p><p><a href="${resetLink}">${resetLink}</a></p><p>\u5982\u679C\u4E0D\u662F\u4F60\u672C\u4EBA\u64CD\u4F5C\uFF0C\u8BF7\u5FFD\u7565\u6B64\u90AE\u4EF6\u3002</p>`
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`\u90AE\u4EF6\u53D1\u9001\u5931\u8D25 (${res.status}): ${body.slice(0, 200)}`);
  }
}
__name(sendResetEmail, "sendResetEmail");
var AUTH_STYLE = `<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: radial-gradient(1200px 600px at 50% -10%, #1b2440 0%, #0a0a0f 60%);
    font-family: system-ui, -apple-system, sans-serif; color: #e5e5e5; }
  .card { width: 340px; padding: 32px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03); backdrop-filter: blur(8px); }
  .logo { width: 40px; height: 40px; border-radius: 10px; background: #6366f1; color: #fff;
    display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; margin-bottom: 16px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { font-size: 13px; color: #9ca3af; margin: 0 0 20px; }
  input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.3); color: #fff; font-size: 14px; outline: none; }
  input:focus { border-color: #6366f1; }
  button { width: 100%; margin-top: 12px; padding: 10px; border: 0; border-radius: 8px;
    background: #6366f1; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
  button:hover { background: #5459dd; }
  button:disabled { opacity: 0.6; cursor: default; }
  .msg { color: #f87171; font-size: 12px; margin-top: 10px; min-height: 16px; text-align: center; }
  .msg.ok { color: #34d399; }
  .link { text-align: center; font-size: 13px; margin-top: 14px; }
  .link a { color: #818cf8; text-decoration: none; }
  .link a:hover { text-decoration: underline; }
</style>`;
var LOGIN_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Stone \xB7 \u767B\u5F55</title>
${AUTH_STYLE}
</head>
<body>
  <form class="card" id="f">
    <div class="logo">S</div>
    <h1>Stone \xB7 Trading Journal</h1>
    <p>\u8BF7\u8F93\u5165\u8BBF\u95EE\u5BC6\u7801</p>
    <input type="password" id="p" placeholder="Password" autocomplete="current-password" autofocus/>
    <button type="submit" id="btn">\u767B\u5F55</button>
    <p class="msg" id="msg"></p>
    <div class="link"><a href="/stone/recover">\u5FD8\u8BB0\u5BC6\u7801\uFF1F</a></div>
  </form>
  <script>
    const f = document.getElementById('f'), p = document.getElementById('p'), m = document.getElementById('msg'), btn = document.getElementById('btn');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      m.textContent = ''; btn.disabled = true;
      try {
        const r = await fetch('/stone/api/v1/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: p.value }),
        });
        if (r.ok) { location.href = '/stone/'; return; }
        const j = await r.json().catch(() => ({}));
        if (j.locked) {
          m.textContent = '\u8FDE\u7EED\u5931\u8D25\u6B21\u6570\u8FC7\u591A\uFF0C\u8D26\u53F7\u5DF2\u9501\u5B9A\u3002\u8BF7\u901A\u8FC7\u90AE\u7BB1\u91CD\u7F6E\u5BC6\u7801\u3002';
          p.disabled = true; btn.disabled = true;
        } else {
          m.textContent = (j.remaining != null ? '\u5BC6\u7801\u9519\u8BEF\uFF0C\u8FD8\u53EF\u5C1D\u8BD5 ' + j.remaining + ' \u6B21' : '\u5BC6\u7801\u9519\u8BEF');
          p.select();
        }
      } catch { m.textContent = '\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u91CD\u8BD5'; }
      btn.disabled = false;
    });
  <\/script>
</body>
</html>`;
var RECOVER_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Stone \xB7 \u627E\u56DE\u5BC6\u7801</title>
${AUTH_STYLE}
</head>
<body>
  <form class="card" id="f">
    <div class="logo">S</div>
    <h1>\u627E\u56DE\u5BC6\u7801</h1>
    <p>\u8F93\u5165\u4F60\u7684\u90AE\u7BB1\uFF0C\u91CD\u7F6E\u94FE\u63A5\u5C06\u53D1\u9001\u5230\u8BE5\u90AE\u7BB1</p>
    <input type="email" id="e" placeholder="you@example.com" autocomplete="email" autofocus/>
    <button type="submit" id="btn">\u53D1\u9001\u91CD\u7F6E\u94FE\u63A5</button>
    <p class="msg" id="msg"></p>
    <div class="link"><a href="/stone/">\u8FD4\u56DE\u767B\u5F55</a></div>
  </form>
  <script>
    const f = document.getElementById('f'), e = document.getElementById('e'), m = document.getElementById('msg'), btn = document.getElementById('btn');
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      m.textContent = ''; btn.disabled = true;
      try {
        const r = await fetch('/stone/api/v1/recover', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: e.value }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok) { m.className = 'msg ok'; m.textContent = j.message || '\u5982\u679C\u90AE\u7BB1\u5339\u914D\uFF0C\u91CD\u7F6E\u94FE\u63A5\u5DF2\u53D1\u9001'; }
        else { m.className = 'msg'; m.textContent = j.error || '\u8BF7\u6C42\u5931\u8D25'; }
      } catch { m.className = 'msg'; m.textContent = '\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u91CD\u8BD5'; }
      btn.disabled = false;
    });
  <\/script>
</body>
</html>`;
var RESET_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Stone \xB7 \u8BBE\u7F6E\u65B0\u5BC6\u7801</title>
${AUTH_STYLE}
</head>
<body>
  <form class="card" id="f">
    <div class="logo">S</div>
    <h1>\u8BBE\u7F6E\u65B0\u5BC6\u7801</h1>
    <p>\u65B0\u5BC6\u7801\u81F3\u5C11 6 \u4F4D</p>
    <input type="password" id="p1" placeholder="\u65B0\u5BC6\u7801" autocomplete="new-password" autofocus/>
    <input type="password" id="p2" placeholder="\u786E\u8BA4\u65B0\u5BC6\u7801" autocomplete="new-password" style="margin-top:10px"/>
    <button type="submit" id="btn">\u786E\u8BA4\u91CD\u7F6E</button>
    <p class="msg" id="msg"></p>
    <div class="link"><a href="/stone/">\u8FD4\u56DE\u767B\u5F55</a></div>
  </form>
  <script>
    const f = document.getElementById('f'), p1 = document.getElementById('p1'), p2 = document.getElementById('p2'), m = document.getElementById('msg'), btn = document.getElementById('btn');
    const token = new URLSearchParams(location.search).get('token') || '';
    if (!token) { m.textContent = '\u91CD\u7F6E\u94FE\u63A5\u65E0\u6548'; p1.disabled = p2.disabled = true; }
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      m.textContent = '';
      if (p1.value !== p2.value) { m.textContent = '\u4E24\u6B21\u8F93\u5165\u7684\u5BC6\u7801\u4E0D\u4E00\u81F4'; return; }
      if (p1.value.length < 6) { m.textContent = '\u65B0\u5BC6\u7801\u81F3\u5C11 6 \u4F4D'; return; }
      btn.disabled = true;
      try {
        const r = await fetch('/stone/api/v1/reset-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password: p1.value }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok) { m.className = 'msg ok'; m.textContent = '\u5BC6\u7801\u5DF2\u91CD\u7F6E\uFF0C\u6B63\u5728\u8DF3\u8F6C\u767B\u5F55\u2026'; setTimeout(() => { location.href = '/stone/'; }, 1200); }
        else { m.className = 'msg'; m.textContent = j.error || '\u91CD\u7F6E\u5931\u8D25\uFF0C\u94FE\u63A5\u53EF\u80FD\u5DF2\u8FC7\u671F'; }
      } catch { m.className = 'msg'; m.textContent = '\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u91CD\u8BD5'; }
      btn.disabled = false;
    });
  <\/script>
</body>
</html>`;
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const method = request.method;
    const corsHeaders = getCorsHeaders(request);
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    const authOk = await checkAuth(request, env);
    const isAuthExempt = path === "/api/v1/login" || path === "/api/v1/logout" || path === "/api/v1/recover" || path === "/api/v1/reset-password" || path === "/api/upload";
    if (!authOk && !isAuthExempt) {
      if (path.startsWith("/api/")) {
        return jsonResp({ error: "Unauthorized" }, 401, corsHeaders);
      }
      const page = path === "/reset" ? RESET_PAGE : path === "/recover" ? RECOVER_PAGE : LOGIN_PAGE;
      return new Response(page, {
        status: 200,
        headers: {
          "Content-Type": "text/html;charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }
    try {
      if (path === "/api/v1/login" && method === "POST") {
        const auth = await getSiteAuth(env.STONE_DATA, env);
        if (!auth) {
          return jsonResp({ ok: false, error: "Auth not configured" }, 500, corsHeaders);
        }
        const body = await request.json().catch(() => null);
        const provided = body?.password ?? "";
        if (auth.locked) {
          return jsonResp({ ok: false, error: "\u8D26\u53F7\u5DF2\u9501\u5B9A\uFF0C\u8BF7\u901A\u8FC7\u90AE\u7BB1\u91CD\u7F6E\u5BC6\u7801", locked: true }, 423, corsHeaders);
        }
        if (!timingSafeEqualStr(provided, auth.password)) {
          auth.failedAttempts++;
          if (auth.failedAttempts >= MAX_FAILED_ATTEMPTS) {
            auth.locked = true;
            await saveSiteAuth(env.STONE_DATA, env, auth);
            return jsonResp({ ok: false, error: "\u8FDE\u7EED\u5931\u8D25\u6B21\u6570\u8FC7\u591A\uFF0C\u8D26\u53F7\u5DF2\u9501\u5B9A\uFF0C\u8BF7\u901A\u8FC7\u90AE\u7BB1\u91CD\u7F6E\u5BC6\u7801", locked: true }, 423, corsHeaders);
          }
          await saveSiteAuth(env.STONE_DATA, env, auth);
          return jsonResp(
            { ok: false, error: "\u5BC6\u7801\u9519\u8BEF", remaining: MAX_FAILED_ATTEMPTS - auth.failedAttempts },
            401,
            corsHeaders
          );
        }
        if (auth.failedAttempts > 0 || auth.locked) {
          auth.failedAttempts = 0;
          auth.locked = false;
          await saveSiteAuth(env.STONE_DATA, env, auth);
        }
        const payload = btoa(JSON.stringify({ exp: Date.now() + AUTH_TTL_MS }));
        const sig = await hmacSha2563(payload, auth.password);
        const maxAge = Math.floor(AUTH_TTL_MS / 1e3);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Set-Cookie": authCookie(`${payload}.${sig}`, maxAge) }
        });
      }
      if (path === "/api/v1/logout" && method === "POST") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Set-Cookie": authCookie("", 0) }
        });
      }
      if (path === "/api/v1/recover" && method === "POST") {
        const body = await request.json().catch(() => null);
        const target = (env.RECOVERY_EMAIL ?? "").trim().toLowerCase();
        const generic = { ok: true, message: "\u5982\u679C\u90AE\u7BB1\u5339\u914D\uFF0C\u91CD\u7F6E\u94FE\u63A5\u5DF2\u53D1\u9001" };
        if ((body?.email ?? "").trim().toLowerCase() !== target) {
          return jsonResp(generic, 200, corsHeaders);
        }
        const auth = await getSiteAuth(env.STONE_DATA, env);
        const now = Date.now();
        if (auth && auth.lastResetSentAt && now - auth.lastResetSentAt < RESEND_MIN_INTERVAL_MS) {
          return jsonResp(generic, 200, corsHeaders);
        }
        const token = randomToken();
        const hash = await sha256Hex(token);
        await env.STONE_DATA.put("reset_token", JSON.stringify({ hash, exp: now + RESET_TTL_MS }));
        try {
          await sendResetEmail(env, `https://app.slinglab.xyz/stone/reset?token=${token}`);
        } catch (err) {
          await env.STONE_DATA.delete("reset_token");
          const msg = err instanceof Error ? err.message : String(err);
          return jsonResp({ ok: false, error: msg }, 500, corsHeaders);
        }
        if (auth) {
          auth.lastResetSentAt = now;
          await saveSiteAuth(env.STONE_DATA, env, auth);
        }
        return jsonResp(generic, 200, corsHeaders);
      }
      if (path === "/api/v1/reset-password" && method === "POST") {
        const body = await request.json().catch(() => null);
        const token = body?.token ?? "";
        const password = body?.password ?? "";
        if (password.length < 6) {
          return jsonResp({ ok: false, error: "\u65B0\u5BC6\u7801\u81F3\u5C11 6 \u4F4D" }, 400, corsHeaders);
        }
        const stored = await env.STONE_DATA.get("reset_token", "json");
        const hash = await sha256Hex(token);
        if (!stored?.hash || stored.hash !== hash || !stored.exp || stored.exp < Date.now()) {
          return jsonResp({ ok: false, error: "\u91CD\u7F6E\u94FE\u63A5\u65E0\u6548\u6216\u5DF2\u8FC7\u671F" }, 400, corsHeaders);
        }
        const auth = await getSiteAuth(env.STONE_DATA, env);
        if (!auth) {
          return jsonResp({ ok: false, error: "Auth not configured" }, 500, corsHeaders);
        }
        auth.password = password;
        auth.failedAttempts = 0;
        auth.locked = false;
        auth.lastResetSentAt = 0;
        await saveSiteAuth(env.STONE_DATA, env, auth);
        await env.STONE_DATA.delete("reset_token");
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Set-Cookie": authCookie("", 0) }
        });
      }
      if (path.startsWith("/api/v1/dashboard") || path === "/api/v1/data") {
        return handleDashboardRequest(request, env);
      }
      if (path.startsWith("/api/v1/calendar") || path.startsWith("/api/v1/trades/by-date")) {
        return handleCalendarRequest(request, env);
      }
      if (path === "/api/v1/settings/keys" && method === "POST") {
        if (!isAllowedOrigin(request))
          return jsonResp({ error: "Forbidden origin" }, 403, corsHeaders);
        const encKey = env.STONE_ENC_KEY;
        if (!encKey)
          return jsonResp({ success: false, error: "STONE_ENC_KEY secret not configured" }, 500, corsHeaders);
        const body = await request.json();
        if (body.exchange !== "binance" && body.exchange !== "bybit")
          return jsonResp({ success: false, error: "Invalid exchange" }, 400, corsHeaders);
        const s = await getSettings(env.STONE_DATA);
        s[body.exchange] = {
          apiKey: xorEncode(body.apiKey, encKey),
          secretKey: xorEncode(body.secretKey, encKey)
        };
        await putSettings(env.STONE_DATA, s);
        return jsonResp({ success: true }, 200, corsHeaders);
      }
      if (path === "/api/v1/settings/keys" && method === "DELETE") {
        if (!isAllowedOrigin(request))
          return jsonResp({ error: "Forbidden origin" }, 403, corsHeaders);
        const body = await request.json();
        const s = await getSettings(env.STONE_DATA);
        delete s[body.exchange];
        await putSettings(env.STONE_DATA, s);
        return jsonResp({ success: true }, 200, corsHeaders);
      }
      if (path === "/api/v1/settings/status" && method === "GET") {
        const s = await getSettings(env.STONE_DATA);
        return jsonResp({
          binance: s.binance ? { configured: true, valid: true } : { configured: false, valid: false },
          bybit: s.bybit ? { configured: true, valid: true } : { configured: false, valid: false }
        }, 200, corsHeaders);
      }
      if (path === "/api/v1/settings/test" && method === "POST") {
        const body = await request.json();
        const keys = await getExchangeKeys(env.STONE_DATA, env.STONE_ENC_KEY);
        if (body.exchange === "binance") {
          if (!keys?.binance) {
            return jsonResp({ success: false, valid: false, error: "No Binance keys configured" }, 400, corsHeaders);
          }
          const proxy = env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET } : void 0;
          try {
            await fetchAccountBalancesDetailed(keys.binance.apiKey, keys.binance.secretKey, void 0, proxy);
            return jsonResp({ success: true, valid: true }, 200, corsHeaders);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return jsonResp({ success: false, valid: false, error: msg }, 200, corsHeaders);
          }
        }
        if (body.exchange === "bybit") {
          if (!keys?.bybit) {
            return jsonResp({ success: false, valid: false, error: "No Bybit keys configured" }, 400, corsHeaders);
          }
          try {
            const proxy = env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET } : void 0;
            await testBybitConnection(keys.bybit.apiKey, keys.bybit.secretKey, "https://api.bybit.com", proxy);
            return jsonResp({ success: true, valid: true }, 200, corsHeaders);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return jsonResp({ success: false, valid: false, error: msg }, 200, corsHeaders);
          }
        }
        return jsonResp({ error: "Unknown exchange" }, 400, corsHeaders);
      }
      if (path === "/api/v1/sync" && method === "POST") {
        const sync = await runSyncEngine(env);
        const req = new Request("https://internal/api/v1/dashboard");
        await handleDashboardRequest(req, env);
        return jsonResp({ ok: sync.ok, detail: sync.detail }, 200, corsHeaders);
      }
      if (path === "/api/status") {
        return jsonResp({
          project: "Stone",
          status: "ok",
          version: "2.0",
          features: ["dashboard", "sync", "trades", "settings"]
        }, 200, corsHeaders);
      }
      if (path === "/api/upload" && method === "POST") {
        const body = await request.json();
        if (!env.DEPLOY_KEY || body.key !== env.DEPLOY_KEY)
          return jsonResp({ error: "unauthorized" }, 403, corsHeaders);
        const binaryStr = atob(body.data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++)
          bytes[i] = binaryStr.charCodeAt(i);
        await env.STONE_DATA.put(body.path, bytes, {
          metadata: { contentType: body.contentType || getContentType(body.path) }
        });
        return jsonResp({ ok: true, path: body.path }, 200, corsHeaders);
      }
      const staticRes = await serveStatic(path, env.STONE_DATA);
      if (staticRes) return staticRes;
      return jsonResp({ error: "Not found" }, 404, corsHeaders);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      return jsonResp({ error: message }, 500, corsHeaders);
    }
  },
  async scheduled(_event, env) {
    try {
      await runSyncEngine(env);
    } catch (err) {
      console.error("[Cron] sync engine failed:", err instanceof Error ? err.message : String(err));
    }
    const request = new Request("https://internal/api/v1/dashboard");
    await handleDashboardRequest(request, env);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map

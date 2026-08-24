"""
Generate cloudflare_execute JavaScript code for deploying the screener Worker.
"""
import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Read frontend HTML
html_path = os.path.join(BASE_DIR, "frontend", "index.html")
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# Escape for JS template literal (backtick)
escaped_html = html.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

# Worker JS code (reads HTML from KV, no embedding needed)
worker_js = r"""// Auto-generated: 筹码筛选 Worker
// KV key
const KV_HTML_KEY = 'dashboard_html';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
  });
}

function html(content, status = 200) {
  return new Response(content, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
  });
}

function normalizePath(p) {
  for (const pre of ['/screener', '']) {
    if (p === pre || p === pre + '/') return '/';
    if (p.startsWith(pre + '/')) return p.slice(pre.length);
  }
  return p;
}

async function refreshData(env) {
  try {
    const [bybitRows, cmcMap] = await Promise.all([
      fetchBybitData(),
      fetchCmcData(env.CMC_API_KEY),
    ]);
    const merged = [];
    for (const row of bybitRows) {
      const ba = (row.base_asset || '').toUpperCase();
      const cmc = cmcMap[ba] || cmcMap[row.symbol] || null;
      const mcap = cmc ? cmc.market_cap : null;
      const cr = cmc ? cmc.circulating_ratio : null;
      merged.push({
        symbol: row.symbol, name: cmc ? cmc.name : ba, base_asset: row.base_asset,
        price: row.price, market_cap: mcap,
        circulating_supply: cmc ? cmc.circulating_supply : null,
        total_supply: cmc ? cmc.total_supply : null,
        max_supply: cmc ? cmc.max_supply : null,
        circulating_ratio: cr, cmc_rank: cmc ? cmc.cmc_rank : null,
        volume_24h_usdt: row.volume_24h_usdt,
        percent_change_7d: cmc ? cmc.percent_change_7d : null,
        change_24h_pct: row.change_24h_pct,
        amplitude_24h_pct: row.amplitude_24h_pct,
        star_rating: assignStars(mcap, cr),
        unlock_risk: unlockLabel(cr),
        momentum_alert: (cmc && cmc.percent_change_7d != null && cmc.percent_change_7d > 0 && row.amplitude_24h_pct > 10) || false,
      });
    }
    const filtered = merged.filter(r => r.market_cap != null && r.market_cap >= 15000000);
    await env.MARKET_DATA.put('data', JSON.stringify(filtered));
    await env.MARKET_DATA.put('last_updated', new Date().toISOString());
    await env.MARKET_DATA.put('count', String(filtered.length));
    return { ok: true, count: filtered.length };
  } catch (err) {
    console.error('refreshData error:', err);
    return { ok: false, error: err.message };
  }
}

async function fetchBybitData() {
  const [instrRes, tickRes] = await Promise.all([
    fetch('https://api.bybit.com/v5/market/instruments-info?category=linear'),
    fetch('https://api.bybit.com/v5/market/tickers?category=linear'),
  ]);
  if (!instrRes.ok) throw new Error('Bybit instruments: ' + instrRes.status);
  if (!tickRes.ok) throw new Error('Bybit tickers: ' + tickRes.status);
  const instrData = await instrRes.json();
  const symbols = new Set(
    instrData.result.list
      .filter(s => s.status === 'Trading' && s.quoteCoin === 'USDT' && s.contractType === 'LinearPerpetual')
      .map(s => s.symbol)
  );
  const tickData = await tickRes.json();
  const tickerMap = new Map();
  for (const t of tickData.result.list) tickerMap.set(t.symbol, t);
  const rows = [];
  for (const sym of symbols) {
    const t = tickerMap.get(sym);
    if (!t) continue;
    const price = parseFloat(t.lastPrice);
    const high = parseFloat(t.highPrice24h);
    const low = parseFloat(t.lowPrice24h);
    const pcnt = parseFloat(t.price24hPcnt || '0') * 100;
    if (isNaN(price) || price <= 0) continue;
    rows.push({
      symbol: sym, base_asset: sym.replace('USDT', ''), price,
      change_24h_pct: Math.round(pcnt * 100) / 100,
      amplitude_24h_pct: Math.round(((high - low) / price) * 100 * 100) / 100,
      volume_24h_usdt: parseFloat(t.turnover24h || '0'),
    });
  }
  return rows;
}

async function fetchCmcData(apiKey) {
  if (!apiKey) return fetchCoinGeckoFallback();
  const res = await fetch(
    'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=1000&convert=USD',
    { headers: { 'X-CMC_PRO_API_KEY': apiKey, 'Accept': 'application/json' } }
  );
  if (!res.ok) throw new Error('CMC: ' + res.status);
  const data = await res.json();
  const map = {};
  for (const coin of data.data) {
    const sym = coin.symbol;
    const q = coin.quote.USD;
    const totalSup = coin.total_supply;
    const circSup = coin.circulating_supply;
    const maxSup = coin.max_supply;
    let cr = null;
    if (totalSup && totalSup > 0 && circSup != null) cr = circSup / totalSup;
    else if (maxSup && maxSup > 0 && circSup != null) cr = circSup / maxSup;
    map[sym.toUpperCase()] = {
      symbol: sym, market_cap: q.market_cap || null,
      circulating_supply: circSup, total_supply: totalSup, max_supply: maxSup,
      circulating_ratio: cr != null ? Math.round(cr * 10000) / 10000 : null,
      cmc_rank: coin.cmc_rank || null, name: coin.name || sym,
      percent_change_7d: q.percent_change_7d || null,
    };
  }
  return map;
}

async function fetchCoinGeckoFallback() {
  const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=7d';
  const res = await fetch(url, { headers: { 'User-Agent': 'CryptoScreener/2.0' } });
  if (!res.ok) throw new Error('CoinGecko: ' + res.status);
  const coins = await res.json();
  const map = {};
  for (const c of coins) {
    const sym = (c.symbol || '').toUpperCase();
    const totalSup = c.total_supply;
    const circSup = c.circulating_supply;
    let cr = null;
    if (totalSup && totalSup > 0 && circSup != null) cr = circSup / totalSup;
    map[sym] = {
      symbol: sym, market_cap: c.market_cap || null,
      circulating_supply: circSup, total_supply: totalSup,
      max_supply: c.max_supply || null,
      circulating_ratio: cr != null ? Math.round(cr * 10000) / 10000 : null,
      cmc_rank: c.market_cap_rank || null, name: c.name || sym,
      percent_change_7d: c.price_change_percentage_7d_in_currency || null,
    };
  }
  return map;
}

function assignStars(mcap, cr) {
  if (mcap == null || cr == null || mcap < 15000000) return 0;
  if (mcap <= 100000000 && cr < 0.3) return 5;
  if (mcap <= 500000000 && cr < 0.3) return 5;
  if (mcap <= 100000000 && cr < 0.5) return 4;
  if (mcap <= 500000000 && cr < 0.5) return 3;
  if (mcap <= 2000000000 && cr < 0.5) return 3;
  if (mcap > 2000000000) return cr >= 0.5 ? 1 : 2;
  if (cr >= 0.8) return 1;
  return 2;
}

function unlockLabel(cr) {
  if (cr == null) return '\u26a0\ufe0f \u672a\u77e5';
  if (cr < 0.3) return '\ud83d\udd34 \u9ad8\u901a\u80c0\u98ce\u9669';
  if (cr < 0.5) return '\ud83d\udfe1 \u89e3\u9501\u98ce\u9669';
  return '\ud83d\udfe2 \u4f4e\u98ce\u9669';
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
      });
    }

    try {
      if (path === '/api/data') {
        const raw = await env.MARKET_DATA.get('data');
        const updated = await env.MARKET_DATA.get('last_updated');
        if (!raw) return json({ ok: false, error: '\u6570\u636e\u5c1a\u672a\u52a0\u8f7d', data: [], updated: null });
        return json({ ok: true, updated, data: JSON.parse(raw), count: JSON.parse(raw).length });
      }

      if (path === '/api/refresh' && request.method === 'POST') {
        return json(await refreshData(env));
      }

      if (path === '/api/status') {
        const raw = await env.MARKET_DATA.get('data');
        const updated = await env.MARKET_DATA.get('last_updated');
        const count = await env.MARKET_DATA.get('count');
        return json({ project: '\u7b79\u7801\u7b5b\u9009 \u00b7 \u4ee3\u5e01\u7b5b\u9009\u5668', ok: !!raw, coins: parseInt(count || '0'), updated });
      }

      // Serve frontend from KV
      const kvHtml = await env.MARKET_DATA.get(KV_HTML_KEY);
      if (kvHtml) return html(kvHtml);
      return new Response('Dashboard not loaded yet', { status: 503 });
    } catch (error) {
      console.error('Worker error:', error);
      return json({ error: '\u670d\u52a1\u5668\u5185\u90e8\u9519\u8bef', message: error.message }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshData(env));
  },
};"""

# Generate the full cloudflare_execute script
# Step 1: Upload HTML to KV
# Step 2: Deploy Worker via multipart

script = f'''async () => {{
  const ACCOUNT_ID = "{__import__('os').environ.get('ACCOUNT_ID', '1ab09277ed038add4925d28a343c9dc5')}";
  const KV_ID = "6d56b8307fd04814892f9c2b15723c02";
  const WORKER_NAME = "tokenomics-screener";
  const ZONE_ID = "3b21d2fc8d5e020709d21d74f95753c2";

  // ── Step 1: Upload HTML to KV ──
  console.log("Step 1: Uploading HTML to KV...");
  const html = `{escaped_html}`;

  const kvResult = await cloudflare.request({{
    method: "PUT",
    path: `/accounts/${{ACCOUNT_ID}}/storage/kv/namespaces/${{KV_ID}}/values/dashboard_html`,
    body: html,
    contentType: "text/html; charset=utf-8",
  }});
  console.log("KV upload:", JSON.stringify(kvResult));

  // ── Step 2: Build worker script ──
  console.log("Step 2: Building worker script...");
  const workerJS = {json.dumps(worker_js)};

  // ── Step 3: Deploy Worker via multipart ──
  console.log("Step 3: Deploying Worker...");
  const metadata = {{
    main_module: "_worker.mjs",
    compatibility_date: "2026-07-01",
    compatibility_flags: ["nodejs_compat"],
    bindings: [
      {{ type: "kv_namespace", name: "MARKET_DATA", namespace_id: KV_ID }},
      {{ type: "secret", name: "CMC_API_KEY" }},
    ],
  }};

  const boundary = "----WorkerDeploy" + Date.now();
  const encoder = new TextEncoder();
  const parts = [];

  parts.push(encoder.encode(
    "--" + boundary + "\\r\\n" +
    'Content-Disposition: form-data; name="metadata"\\r\\n' +
    "Content-Type: application/json\\r\\n\\r\\n" +
    JSON.stringify(metadata) + "\\r\\n"
  ));
  parts.push(encoder.encode(
    "--" + boundary + "\\r\\n" +
    'Content-Disposition: form-data; name="_worker.mjs"\\r\\n' +
    "Content-Type: application/javascript+module\\r\\n\\r\\n"
  ));
  parts.push(encoder.encode(workerJS));
  parts.push(encoder.encode("\\r\\n--" + boundary + "--\\r\\n"));

  const totalLength = parts.reduce((s, p) => s + p.byteLength, 0);
  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const p of parts) {{
    body.set(p, offset);
    offset += p.byteLength;
  }}

  const workerResult = await cloudflare.request({{
    method: "PUT",
    path: `/accounts/${{ACCOUNT_ID}}/workers/scripts/${{WORKER_NAME}}`,
    body: body,
    contentType: "multipart/form-data; boundary=" + boundary,
    rawBody: true,
  }});
  console.log("Worker deploy:", JSON.stringify(workerResult));

  // ── Step 4: Set up route ──
  console.log("Step 4: Setting up route...");
  const routesResult = await cloudflare.request({{
    method: "GET",
    path: `/zones/${{ZONE_ID}}/workers/routes`,
  }});

  const hasRoute = (routesResult.result || []).some(r => r.pattern && r.pattern.includes("screener"));
  if (!hasRoute) {{
    const routeResult = await cloudflare.request({{
      method: "POST",
      path: `/zones/${{ZONE_ID}}/workers/routes`,
      body: {{ pattern: "app.slinglab.xyz/screener/*", script: WORKER_NAME }},
    }});
    console.log("Route created:", JSON.stringify(routeResult));
  }} else {{
    console.log("Route already exists");
  }}

  return {{
    kv_upload: kvResult.success,
    worker_deploy: workerResult.success,
    status: "complete",
  }};
}}'''

# Write the script to a file
out_path = os.path.join(BASE_DIR, "__cf_deploy.txt")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(script)

print(f"Generated cloudflare_execute script: {len(script)} chars")
print(f"Saved to: {out_path}")
print()
print("Copy the content of __cf_deploy.txt into the cloudflare_execute tool's code parameter.")
print("=" * 60)
# Print first/last few lines
lines = script.split("\n")
print(f"First 5 lines:\n" + "\n".join(lines[:5]))
print(f"\n... ({len(lines)} total lines) ...\n")
print(f"Last 5 lines:\n" + "\n".join(lines[-5:]))

"""
Deploy 筹码筛选 Worker to Cloudflare.
Reads frontend HTML, builds worker JS, deploys via CF API.
"""
import json
import os
import re
import urllib.request
import urllib.error

ACCOUNT_ID = "1ab09277ed038add4925d28a343c9dc5"
API_TOKEN = "cfut_G7qVdtoYCESmyWr8enA90KWGfAC3YLMgax2uhv8Hfb2bf262"
KV_ID = "6d56b8307fd04814892f9c2b15723c02"
WORKER_NAME = "tokenomics-screener"
ZONE_ID = "3b21d2fc8d5e020709d21d74f95753c2"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def cf_api(method, path, body=None, content_type="application/json"):
    """Make a Cloudflare API call."""
    url = f"https://api.cloudflare.com/client/v4{path}"
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "User-Agent": "CryptoScreener-Deploy/1.0",
    }
    if body is not None:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"  [ERROR] {method} {path}: {e.code} {e.reason}")
        print(f"  Body: {err_body[:300]}")
        raise


def build_worker_js(html):
    """Build worker JS with frontend HTML embedded as a KV-read fallback strategy."""
    # Read the worker template
    worker_template = """// Auto-generated: 筹码筛选 Worker
const FRONTEND_HTML = \u0060{{ESCAPED_HTML}}\u0060;

// KV key for dashboard_html
const KV_HTML_KEY = 'dashboard_html';

// ─── Helpers ──────────────────────────────────────────
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

// ─── Data Pipeline ────────────────────────────────────
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
  if (cr == null) return '\\u26a0\\ufe0f \\u672a\\u77e5';
  if (cr < 0.3) return '\\ud83d\\udd34 \\u9ad8\\u901a\\u80c0\\u98ce\\u9669';
  if (cr < 0.5) return '\\ud83d\\udfe1 \\u89e3\\u9501\\u98ce\\u9669';
  return '\\ud83d\\udfe2 \\u4f4e\\u98ce\\u9669';
}

// ─── Main Handler ─────────────────────────────────────
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
        if (!raw) return json({ ok: false, error: '\\u6570\\u636e\\u5c1a\\u672a\\u52a0\\u8f7d', data: [], updated: null });
        return json({ ok: true, updated, data: JSON.parse(raw), count: JSON.parse(raw).length });
      }

      if (path === '/api/refresh' && request.method === 'POST') {
        return json(await refreshData(env));
      }

      if (path === '/api/status') {
        const raw = await env.MARKET_DATA.get('data');
        const updated = await env.MARKET_DATA.get('last_updated');
        const count = await env.MARKET_DATA.get('count');
        return json({ project: '\\u7b79\\u7801\\u7b5b\\u9009 \\u00b7 \\u4ee3\\u5e01\\u7b5b\\u9009\\u5668', ok: !!raw, coins: parseInt(count || '0'), updated });
      }

      // Serve frontend: try KV first, fall back to embedded HTML
      try {
        const kvHtml = await env.MARKET_DATA.get(KV_HTML_KEY);
        if (kvHtml) return html(kvHtml);
      } catch {}
      return html(FRONTEND_HTML);
    } catch (error) {
      console.error('Worker error:', error);
      return json({ error: '\\u670d\\u52a1\\u5668\\u5185\\u90e8\\u9519\\u8bef', message: error.message }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshData(env));
  },
};"""

    # Escape HTML for template literal embedding
    escaped_html = html.replace("\\", "\\\\")
    escaped_html = escaped_html.replace("`", "\\`")
    escaped_html = escaped_html.replace("${", "\\${")

    worker_js = worker_template.replace("{{ESCAPED_HTML}}", escaped_html)
    return worker_js


def upload_to_kv(html_content):
    """Upload frontend HTML to KV."""
    print("[1/4] Uploading frontend HTML to KV...")
    path = f"/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{KV_ID}/values/dashboard_html"
    result = cf_api("PUT", path, body=html_content.encode("utf-8"),
                     content_type="text/html; charset=utf-8")
    if result.get("success"):
        print(f"  ✓ dashboard_html uploaded ({len(html_content)} bytes)")
    return result


def deploy_worker(worker_js):
    """Deploy Worker via multipart upload."""
    print("[2/4] Deploying Worker to Cloudflare...")

    metadata = {
        "main_module": "_worker.mjs",
        "compatibility_date": "2026-07-01",
        "compatibility_flags": ["nodejs_compat"],
        "bindings": [
            {"type": "kv_namespace", "name": "MARKET_DATA", "namespace_id": KV_ID},
            {"type": "secret", "name": "CMC_API_KEY"},
        ],
    }

    boundary = f"----WorkerDeploy{hash(worker_js) & 0xFFFFFFFF}"
    lines = []
    lines.append(f"--{boundary}")
    lines.append('Content-Disposition: form-data; name="metadata"')
    lines.append("Content-Type: application/json")
    lines.append("")
    lines.append(json.dumps(metadata))
    lines.append(f"--{boundary}")
    lines.append('Content-Disposition: form-data; name="_worker.mjs"')
    lines.append("Content-Type: application/javascript+module")
    lines.append("")
    lines.append(worker_js)
    lines.append(f"--{boundary}--")
    lines.append("")

    body = "\r\n".join(lines)
    content_type = f"multipart/form-data; boundary={boundary}"

    path = f"/accounts/{ACCOUNT_ID}/workers/scripts/{WORKER_NAME}"
    result = cf_api("PUT", path, body=body.encode("utf-8"), content_type=content_type)
    if result.get("success"):
        print(f"  ✓ Worker '{WORKER_NAME}' deployed")
    return result


def setup_route():
    """Create or verify route on app.slinglab.xyz."""
    print("[3/4] Setting up route...")

    # Check existing routes
    routes_path = f"/zones/{ZONE_ID}/workers/routes"
    result = cf_api("GET", routes_path)
    if result.get("success"):
        routes = result.get("result", [])
        for r in routes:
            if "screener" in r.get("pattern", ""):
                print(f"  ✓ Route already exists: {r['pattern']} → {r.get('script')}")
                return result

    # Create new route
    route_body = json.dumps({
        "pattern": "app.slinglab.xyz/screener/*",
        "script": WORKER_NAME,
    }).encode()
    result = cf_api("POST", routes_path, body=route_body)
    if result.get("success"):
        print(f"  ✓ Route created: app.slinglab.xyz/screener/* → {WORKER_NAME}")
    return result


def main():
    print("=" * 50)
    print("  筹码筛选 · Cloudflare Worker Deploy")
    print("=" * 50)

    # Step 0: Read frontend HTML & build worker
    html_path = os.path.join(BASE_DIR, "frontend", "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    print(f"[0] Frontend HTML: {len(html_content)} bytes")

    worker_js = build_worker_js(html_content)
    print(f"[0] Worker JS built: {len(worker_js)} bytes")

    # Step 1: Upload HTML to KV
    upload_to_kv(html_content)

    # Step 2: Deploy worker
    deploy_worker(worker_js)

    # Step 3: Set up route
    setup_route()

    # Step 4: Trigger refresh
    print("[4/4] Triggering initial data refresh...")
    refresh_path = f"/accounts/{ACCOUNT_ID}/workers/scripts/{WORKER_NAME}/subdomain"
    try:
        worker_url = f"https://{WORKER_NAME}.cmm-trading-journal.workers.dev/api/refresh"
        req = urllib.request.Request(
            worker_url,
            data=b"",
            headers={
                "Authorization": f"Bearer {API_TOKEN}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
            print(f"  Refresh response: {result}")
    except Exception as e:
        print(f"  Note: Refresh trigger: {e}")

    print("\n" + "=" * 50)
    print("  ✅ Deployment Complete!")
    print("=" * 50)
    print(f"  URL: https://app.slinglab.xyz/screener/")
    print(f"  Dev: https://{WORKER_NAME}.cmm-trading-journal.workers.dev")
    print("=" * 50)


if __name__ == "__main__":
    main()

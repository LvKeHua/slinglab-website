/**
 * 筹码筛选 · Build + Deploy to Cloudflare Workers
 * Usage: node build-deploy.js
 * 
 * Deploys the Worker with embedded frontend HTML + KV binding.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ───
const CF_API = 'https://api.cloudflare.com/client/v4';
const ACCOUNT_ID = '1ab09277ed038add4925d28a343c9dc5';
const API_TOKEN = 'd7ca80c814708d4015dd782b3e327789:wx1sLSdRcMdddK5d:9uuLTQtM07QjVpuGlXe66nmCOLxnVxtP';
const KV_NAMESPACE_ID = '6d56b8307fd04814892f9c2b15723c02'; // TOKENOMICS_MARKET_DATA
const WORKER_NAME = 'tokenomics-screener';

// ─── Worker Script Template ───
function buildWorkerScript(html) {
  // Escape for template literal embedding
  const escaped = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

  return `
// ════════════════════════════════════════════════════════════
// 筹码筛选 · 代币筛选器 — Auto-generated Worker
// ════════════════════════════════════════════════════════════

const FRONTEND_HTML = \`${escaped}\`;

// ─── Data Pipeline ──────────────────────────────────────

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
        symbol: row.symbol,
        name: cmc ? cmc.name : ba,
        base_asset: row.base_asset,
        price: row.price,
        market_cap: mcap,
        circulating_supply: cmc ? cmc.circulating_supply : null,
        total_supply: cmc ? cmc.total_supply : null,
        max_supply: cmc ? cmc.max_supply : null,
        circulating_ratio: cr,
        cmc_rank: cmc ? cmc.cmc_rank : null,
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
      symbol: sym,
      base_asset: sym.replace('USDT', ''),
      price,
      change_24h_pct: Math.round(pcnt * 100) / 100,
      amplitude_24h_pct: Math.round(((high - low) / price) * 100 * 100) / 100,
      volume_24h_usdt: parseFloat(t.turnover24h || '0'),
    });
  }
  return rows;
}

async function fetchCmcData(apiKey) {
  if (!apiKey) {
    console.log('CMC_API_KEY not available, fallback to CoinGecko');
    return fetchCoinGeckoFallback();
  }
  const res = await fetch(
    'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=1000&convert=USD',
    { headers: { 'X-CMC_PRO_API_KEY': apiKey, Accept: 'application/json' } }
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
      symbol: sym,
      market_cap: q.market_cap || null,
      circulating_supply: circSup,
      total_supply: totalSup,
      max_supply: maxSup,
      circulating_ratio: cr != null ? Math.round(cr * 10000) / 10000 : null,
      cmc_rank: coin.cmc_rank || null,
      name: coin.name || sym,
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
      symbol: sym,
      market_cap: c.market_cap || null,
      circulating_supply: circSup,
      total_supply: totalSup,
      max_supply: c.max_supply || null,
      circulating_ratio: cr != null ? Math.round(cr * 10000) / 10000 : null,
      cmc_rank: c.market_cap_rank || null,
      name: c.name || sym,
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
  if (cr == null) return '⚠️ 未知';
  if (cr < 0.3) return '🔴 高通胀风险';
  if (cr < 0.5) return '🟡 解锁风险';
  return '🟢 低风险';
}

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

function normalizePath(pathname) {
  for (const p of ['/screener', '']) {
    if (pathname === p || pathname === p + '/') return '/';
    if (pathname.startsWith(p + '/')) return pathname.slice(p.length);
  }
  return pathname;
}

// ─── Request Handler ────────────────────────────────────

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
        if (!raw) return json({ ok: false, error: '数据尚未加载', data: [], updated: null });
        return json({ ok: true, updated, data: JSON.parse(raw), count: JSON.parse(raw).length });
      }

      if (path === '/api/refresh' && request.method === 'POST') {
        const result = await refreshData(env);
        return json(result);
      }

      if (path === '/api/status') {
        const raw = await env.MARKET_DATA.get('data');
        const updated = await env.MARKET_DATA.get('last_updated');
        const count = await env.MARKET_DATA.get('count');
        return json({ project: '筹码筛选 · 代币筛选器', ok: !!raw, coins: parseInt(count || '0'), updated });
      }

      return html(FRONTEND_HTML);
    } catch (error) {
      console.error('Worker error:', error);
      return json({ error: '服务器内部错误', message: error.message }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    console.log('Scheduled refresh triggered');
    ctx.waitUntil(refreshData(env));
  },
};
`.trim();
}

// ─── CF API Helper ──────────────────────────────────────

async function cf(method, path, body, contentType) {
  const opts = { method, headers: { 'Authorization': `Bearer ${API_TOKEN}` } };
  if (body) {
    opts.headers['Content-Type'] = contentType || 'application/json';
    opts.body = body;
  }
  const res = await fetch(`${CF_API}${path}`, opts);
  const json_res = await res.json();
  if (!json_res.success) {
    throw new Error(`API error [${method} ${path}]: ${JSON.stringify(json_res.errors)}`);
  }
  return json_res.result;
}

// ─── Deploy Worker ──────────────────────────────────────

async function deploy() {
  console.log('=== 筹码筛选 · Build & Deploy ===\n');

  // Step 1: Build worker script
  console.log('[1/4] Building worker script...');
  const htmlPath = resolve(__dirname, 'frontend', 'index.html');
  const frontendHTML = readFileSync(htmlPath, 'utf-8');
  console.log(`  Frontend HTML: ${(frontendHTML.length / 1024).toFixed(1)}KB`);

  const workerJS = buildWorkerScript(frontendHTML);
  const workerPath = resolve(__dirname, 'cf-worker', '_worker.mjs');
  mkdirSync(resolve(__dirname, 'cf-worker'), { recursive: true });
  writeFileSync(workerPath, workerJS, 'utf-8');
  console.log(`  Worker script: ${(workerJS.length / 1024).toFixed(1)}KB`);

  // Step 2: Upload frontend HTML to KV as backup
  console.log('\n[2/4] Uploading frontend HTML to KV...');
  await cf(
    'PUT',
    `/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/dashboard_html`,
    frontendHTML,
    'text/html; charset=utf-8'
  );
  console.log('  ✓ dashboard_html uploaded to KV');

  // Step 3: Deploy Worker via multipart upload
  console.log('\n[3/4] Deploying Worker to Cloudflare...');
  const metadata = {
    main_module: '_worker.mjs',
    compatibility_date: '2026-07-01',
    compatibility_flags: ['nodejs_compat'],
    bindings: [
      {
        type: 'kv_namespace',
        name: 'MARKET_DATA',
        namespace_id: KV_NAMESPACE_ID,
      },
      {
        type: 'secret',
        name: 'CMC_API_KEY',
      },
    ],
  };

  const boundary = `----WorkerDeploy${Date.now()}`;
  const encoder = new TextEncoder();
  const scriptBytes = readFileSync(workerPath);

  // Build multipart body
  const parts = [];
  parts.push(encoder.encode(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="metadata"\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n`
  ));
  parts.push(encoder.encode(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="_worker.mjs"\r\n` +
    `Content-Type: application/javascript+module\r\n\r\n`
  ));
  parts.push(scriptBytes);
  parts.push(encoder.encode(`\r\n--${boundary}--\r\n`));

  const totalLen = parts.reduce((s, p) => s + p.byteLength, 0);
  const body = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    body.set(p, offset);
    offset += p.byteLength;
  }

  const workerResult = await cf(
    'PUT',
    `/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}`,
    body,
    `multipart/form-data; boundary=${boundary}`
  );
  console.log(`  ✓ Worker "${WORKER_NAME}" deployed (${workerResult.id || 'ok'})`);

  // Step 4: Create route on app.slinglab.xyz
  console.log('\n[4/4] Setting up route...');
  const zoneId = '3b21d2fc8d5e020709d21d74f95753c2';

  // Check existing routes
  const existingRoutes = await cf('GET', `/zones/${zoneId}/workers/routes`);
  const screenerRoute = existingRoutes.find(r => r.pattern && r.pattern.includes('screener'));

  if (screenerRoute) {
    console.log(`  Route already exists: ${screenerRoute.pattern} → ${screenerRoute.script}`);
  } else {
    const newRoute = await cf('POST', `/zones/${zoneId}/workers/routes`, {
      pattern: 'app.slinglab.xyz/screener/*',
      script: WORKER_NAME,
    });
    console.log(`  ✓ Route created: app.slinglab.xyz/screener/* → ${WORKER_NAME}`);
  }

  // Step 5: Trigger immediate data refresh
  console.log('\n[REFRESH] Triggering initial data fetch...');
  try {
    // Trigger via workers.dev URL
    const refreshUrl = `https://${WORKER_NAME}.cmm-trading-journal.workers.dev/api/refresh`;
    const refreshRes = await fetch(refreshUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${API_TOKEN}` } });
    const refreshJson = await refreshRes.json();
    console.log(`  Response: ${JSON.stringify(refreshJson)}`);
  } catch (e) {
    console.log(`  Note: Auto-refresh may need KV data seeding first. Try visiting the URL.`);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  ✅ Deployment Complete!');
  console.log('═══════════════════════════════════════');
  console.log('  Main URL:  https://app.slinglab.xyz/screener/');
  console.log('  Dev URL:   https://tokenomics-screener.cmm-trading-journal.workers.dev');
  console.log('\n  (Route may take 30s to propagate)');
}

deploy().catch(err => {
  console.error('\n❌ Deployment failed:', err);
  process.exit(1);
});

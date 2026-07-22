// 筹码筛选 Worker (Service Worker) v5 — 双源交叉验证 (8-page CG)
// API 密钥通过 Cloudflare Secrets 注入环境变量, 无硬编码值
// 部署前需设置: wrangler secret put CMC_API_KEY
//                  wrangler secret put COINGECKO_API_KEY
//                  wrangler secret put UPLOAD_AUTH_KEY

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

function matchMarketKey(baseAsset, symbol, map) {
  const ua = (baseAsset || '').toUpperCase();
  if (map[ua]) return map[ua];
  if (map[symbol]) return map[symbol];
  const cleaned = ua.replace(/^\d{4,}x?/, '');
  if (cleaned && cleaned !== ua && map[cleaned]) return map[cleaned];
  return null;
}

function crossValidateRatio(cmcRatio, cgRatio) {
  if (cmcRatio == null || cgRatio == null) return null;
  const max = Math.max(cmcRatio, cgRatio);
  const min = Math.min(cmcRatio, cgRatio);
  if (max === 0) return null;
  const diff = (max - min) / max;
  if (diff > 0.3) {
    return { conflicted: true, cmc_ratio: Math.round(cmcRatio * 10000) / 10000, cg_ratio: Math.round(cgRatio * 10000) / 10000, discrepancy: Math.round(diff * 100) };
  }
  return null;
}

async function refreshData() {
  const [bybitResult, cmcResult, cgResult] = await Promise.allSettled([
    fetchBybitData(),
    fetchCmcData(),
    fetchCoinGeckoData(),
  ]);
  if (bybitResult.status === 'rejected') console.error('Bybit failed:', bybitResult.reason);
  if (cmcResult.status === 'rejected') console.error('CMC failed:', cmcResult.reason);
  if (cgResult.status === 'rejected') console.error('CoinGecko failed:', cgResult.reason);
  const bybitRows = bybitResult.status === 'fulfilled' ? bybitResult.value : null;
  const cmcMap = cmcResult.status === 'fulfilled' ? cmcResult.value : null;
  const cgMap = cgResult.status === 'fulfilled' ? cgResult.value : null;
  function applyValidation(coin, cgKeyOrSymbol) {
    if (!cgMap) return coin;
    const cg = cgMap[cgKeyOrSymbol] || matchMarketKey(coin.base_asset, coin.symbol, cgMap);
    if (!cg) return coin;
    const conflict = crossValidateRatio(coin.circulating_ratio, cg.circulating_ratio);
    if (conflict) {
      coin.data_conflict = true;
      coin.discrepancy_pct = conflict.discrepancy;
      coin.cmc_ratio = conflict.cmc_ratio;
      coin.cg_ratio = conflict.cg_ratio;
      if (coin.market_cap != null && cg.market_cap != null && conflict.cg_ratio < conflict.cmc_ratio * 0.5 && cg.market_cap < coin.market_cap * 0.5) {
        coin.stale_cg_data = true;
      }
      coin.unlock_risk = unlockLabel((coin.circulating_ratio + cg.circulating_ratio) / 2);
    }
    return coin;
  }
  if (bybitRows && bybitRows.length > 0 && cmcMap) {
    const merged = [];
    for (const row of bybitRows) {
      const ba = (row.base_asset || '').toUpperCase();
      const cmc = matchMarketKey(ba, row.symbol, cmcMap);
      const mcap = cmc ? cmc.market_cap : null;
      const cr = cmc ? cmc.circulating_ratio : null;
      let coin = { symbol: row.symbol, name: cmc ? cmc.name : ba, base_asset: row.base_asset, price: row.price, market_cap: mcap, circulating_supply: cmc ? cmc.circulating_supply : null, total_supply: cmc ? cmc.total_supply : null, max_supply: cmc ? cmc.max_supply : null, circulating_ratio: cr, cmc_rank: cmc ? cmc.cmc_rank : null, volume_24h_usdt: row.volume_24h_usdt, percent_change_7d: cmc ? cmc.percent_change_7d : null, change_24h_pct: row.change_24h_pct, amplitude_24h_pct: row.amplitude_24h_pct, star_rating: assignStars(mcap, cr, false), unlock_risk: unlockLabel(cr), momentum_alert: (cmc && cmc.percent_change_7d != null && cmc.percent_change_7d > 0 && row.amplitude_24h_pct > 10) || false };
      coin = applyValidation(coin, ba);
      coin.star_rating = assignStars(coin.market_cap, coin.circulating_ratio, coin.data_conflict, coin.stale_cg_data);
      merged.push(coin);
    }
    const filtered = merged.filter(r => r.market_cap != null && r.market_cap >= 15000000);
    if (filtered.length > 0) {
      await MARKET_DATA.put('data', JSON.stringify(filtered));
      await MARKET_DATA.put('last_updated', new Date().toISOString());
      await MARKET_DATA.put('count', String(filtered.length));
      return;
    }
  }
  if (cmcMap) {
    const coins = [];
    for (const [sym, c] of Object.entries(cmcMap)) {
      if (c.market_cap == null || c.market_cap < 15000000) continue;
      let coin = { symbol: c.symbol || '', name: c.name || (c.symbol || '').toUpperCase(), base_asset: (c.symbol || '').toUpperCase(), price: null, market_cap: c.market_cap, circulating_supply: c.circulating_supply, total_supply: c.total_supply, max_supply: c.max_supply, circulating_ratio: c.circulating_ratio, cmc_rank: c.cmc_rank, volume_24h_usdt: null, percent_change_7d: c.percent_change_7d, change_24h_pct: null, amplitude_24h_pct: null, star_rating: assignStars(c.market_cap, c.circulating_ratio, false), unlock_risk: unlockLabel(c.circulating_ratio), momentum_alert: false };
      coin = applyValidation(coin, sym);
      coin.star_rating = assignStars(coin.market_cap, coin.circulating_ratio, coin.data_conflict, coin.stale_cg_data);
      coins.push(coin);
    }
    if (coins.length > 0) {
      await MARKET_DATA.put('data', JSON.stringify(coins));
      await MARKET_DATA.put('last_updated', new Date().toISOString());
      await MARKET_DATA.put('count', String(coins.length));
      return;
    }
  }
  if (bybitRows && bybitRows.length > 0) {
    const coins = bybitRows.map(row => ({ symbol: row.symbol, name: (row.base_asset || '').toUpperCase(), base_asset: row.base_asset, price: row.price, market_cap: null, circulating_supply: null, total_supply: null, max_supply: null, circulating_ratio: null, cmc_rank: null, volume_24h_usdt: row.volume_24h_usdt, percent_change_7d: null, change_24h_pct: row.change_24h_pct, amplitude_24h_pct: row.amplitude_24h_pct, star_rating: 0, unlock_risk: unlockLabel(null), momentum_alert: false }));
    await MARKET_DATA.put('data', JSON.stringify(coins));
    await MARKET_DATA.put('last_updated', new Date().toISOString());
    await MARKET_DATA.put('count', String(coins.length));
  }
}

async function fetchBybitData() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const [instrRes, tickRes] = await Promise.all([
      fetch('https://api.bybit.com/v5/market/instruments-info?category=linear', { signal: controller.signal }),
      fetch('https://api.bybit.com/v5/market/tickers?category=linear', { signal: controller.signal }),
    ]);
    if (!instrRes.ok) throw new Error('Bybit instr: ' + instrRes.status);
    if (!tickRes.ok) throw new Error('Bybit tick: ' + tickRes.status);
    const instrData = await instrRes.json();
    const symbols = new Set(instrData.result.list.filter(s => s.status === 'Trading' && s.quoteCoin === 'USDT' && s.contractType === 'LinearPerpetual').map(s => s.symbol));
    const tickData = await tickRes.json();
    const tickerMap = new Map();
    for (const t of tickData.result.list) tickerMap.set(t.symbol, t);
    const rows = [];
    for (const sym of symbols) {
      const t = tickerMap.get(sym); if (!t) continue;
      const price = parseFloat(t.lastPrice);
      const high = parseFloat(t.highPrice24h);
      const low = parseFloat(t.lowPrice24h);
      const pcnt = parseFloat(t.price24hPcnt || '0') * 100;
      if (isNaN(price) || price <= 0) continue;
      rows.push({ symbol: sym, base_asset: sym.replace('USDT', ''), price, change_24h_pct: Math.round(pcnt * 100) / 100, amplitude_24h_pct: Math.round(((high - low) / price) * 100 * 100) / 100, volume_24h_usdt: parseFloat(t.turnover24h || '0') });
    }
    return rows;
  } finally { clearTimeout(timeout); }
}

async function fetchCmcData() {
  // CMC_API_KEY 从 Cloudflare Secrets 注入
  if (typeof CMC_API_KEY !== 'undefined' && CMC_API_KEY) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=1000&convert=USD', { headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY, 'Accept': 'application/json' }, signal: controller.signal });
        if (res.ok) { const data = await res.json(); return parseCmcResponse(data); }
        try { const errBody = await res.json(); console.error('CMC API error:', res.status, errBody); } catch(e) {}
      } finally { clearTimeout(timeout); }
    } catch (e) { console.error('CMC fetch error:', e); }
  }
  return null;
}

function parseCmcResponse(data) {
  const map = {};
  for (const coin of data.data) {
    const sym = coin.symbol;
    const q = coin.quote.USD;
    const circSup = coin.circulating_supply;
    const totalSup = coin.total_supply;
    const maxSup = coin.max_supply;
    let cr = null;
    if (totalSup && totalSup > 0 && circSup != null) cr = circSup / totalSup;
    else if (maxSup && maxSup > 0 && circSup != null) cr = circSup / maxSup;
    map[sym.toUpperCase()] = { symbol: sym, market_cap: q.market_cap || null, circulating_supply: circSup, total_supply: totalSup, max_supply: maxSup, circulating_ratio: cr != null ? Math.round(cr * 10000) / 10000 : null, cmc_rank: coin.cmc_rank || null, name: coin.name || sym, percent_change_7d: q.percent_change_7d != null ? Math.round(q.percent_change_7d * 100) / 100 : null };
  }
  return map;
}

async function fetchCoinGeckoData() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const headers = { 'User-Agent': 'CryptoScreener/5.0' };
    // COINGECKO_API_KEY 从 Cloudflare Secrets 注入
    if (typeof COINGECKO_API_KEY !== 'undefined' && COINGECKO_API_KEY) {
      headers['x-cg-demo-api-key'] = COINGECKO_API_KEY;
    }
    const pages = [1, 2, 3, 4, 5, 6, 7, 8];
    const results = await Promise.allSettled(
      pages.map(page =>
        fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=false&price_change_percentage=7d`,
          { headers, signal: controller.signal }
        ).then(res => {
          if (!res.ok) throw new Error(`CG page ${page} status ${res.status}`);
          return res.json();
        })
      )
    );
    const map = {};
    for (const result of results) {
      if (result.status !== 'fulfilled' || !Array.isArray(result.value)) continue;
      for (const c of result.value) {
        const sym = (c.symbol || '').toUpperCase();
        if (map[sym]) continue;
        const circSup = c.circulating_supply;
        const totalSup = c.total_supply;
        let cr = null;
        if (totalSup && totalSup > 0 && circSup != null) cr = circSup / totalSup;
        map[sym] = { symbol: sym, market_cap: c.market_cap || null, circulating_supply: circSup, total_supply: totalSup, max_supply: c.max_supply || null, circulating_ratio: cr != null ? Math.round(cr * 10000) / 10000 : null, cmc_rank: c.market_cap_rank || null, name: c.name || sym, percent_change_7d: c.price_change_percentage_7d_in_currency != null ? Math.round(c.price_change_percentage_7d_in_currency * 100) / 100 : null };
      }
    }
    const pageCount = results.filter(r => r.status === 'fulfilled').length;
    console.log(`CoinGecko: ${Object.keys(map).length} unique coins from ${pageCount}/${pages.length} pages`);
    return Object.keys(map).length > 0 ? map : null;
  } catch (e) {
    console.error('CoinGecko fetch error:', e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function assignStars(mcap, cr, conflicted, staleCg) {
  if (mcap == null || cr == null || mcap < 15000000) return 0;
  const raw = crunchStars(mcap, cr);
  if (conflicted) {
    return staleCg ? Math.max(1, raw - 1) : raw;
  }
  return raw;
}

function crunchStars(mcap, cr) {
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

async function handleApiData() { const raw = await MARKET_DATA.get('data'); const updated = await MARKET_DATA.get('last_updated'); if (!raw) return json({ ok: false, error: '数据尚未加载', data: [], updated: null }); const parsed = JSON.parse(raw); return json({ ok: true, updated, data: parsed, count: parsed.length }); }
async function handleDashboard() { const kvHtml = await MARKET_DATA.get(KV_HTML_KEY); if (kvHtml) return html(kvHtml); return new Response('Dashboard not loaded yet', { status: 503 }); }
async function handleRefresh() { const mem = await MARKET_DATA.get('data'); console.log('Refresh started, current coins:', mem ? JSON.parse(mem).length : 0); await refreshData(); const updated = await MARKET_DATA.get('last_updated'); const count = await MARKET_DATA.get('count'); console.log('Refresh completed:', count, 'coins at', updated); return json({ ok: true, updated, coins: parseInt(count || '0') }); }
async function handleUpload(request) {
  // UPLOAD_AUTH_KEY 从 Cloudflare Secrets 注入, 回退仅用于本地开发
  const expectedKey = typeof UPLOAD_AUTH_KEY !== 'undefined' ? UPLOAD_AUTH_KEY : null;
  const auth = request.headers.get('X-Auth-Key');
  if (!expectedKey || auth !== expectedKey) { return json({ ok: false, error: 'Unauthorized' }, 401); }
  try { const body = await request.json(); if (!Array.isArray(body)) { return json({ ok: false, error: 'Body must be a JSON array of coins' }, 400); } await MARKET_DATA.put('data', JSON.stringify(body)); const now = new Date().toISOString(); await MARKET_DATA.put('last_updated', now); await MARKET_DATA.put('count', String(body.length)); return json({ ok: true, coins: body.length, updated: now }); } catch (e) { return json({ ok: false, error: e.message }, 400); } }
async function handleStatus() { const raw = await MARKET_DATA.get('data'); const updated = await MARKET_DATA.get('last_updated'); const count = await MARKET_DATA.get('count'); return json({ project: '筹码筛选 · 代币筛选器', ok: !!raw, coins: parseInt(count || '0'), updated }); }

addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const path = normalizePath(url.pathname);
  if (event.request.method === 'OPTIONS') { event.respondWith(new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Key' } })); return; }
  if (path === '/api/data') event.respondWith(handleApiData());
  else if (path === '/api/refresh' && event.request.method === 'POST') event.respondWith(handleRefresh());
  else if (path === '/api/upload' && event.request.method === 'POST') event.respondWith(handleUpload(event.request));
  else if (path === '/api/status') event.respondWith(handleStatus());
  else event.respondWith(handleDashboard());
});

addEventListener('scheduled', event => { event.waitUntil(refreshData()); });

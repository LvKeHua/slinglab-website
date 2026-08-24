// ════════════════════════════════════════════════════════════
// 筹码筛选 · 代币筛选器 — Auto-generated Worker
// ════════════════════════════════════════════════════════════

const FRONTEND_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>筹码真空 · 代币筛选器</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f4f6fa;color:#1a2332;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:16px}
.app-header{background:linear-gradient(135deg,#fff 0,#f0f4fe 100%);border:1px solid #e2e8f0;border-radius:16px;padding:20px 28px;margin-bottom:16px}
.app-header h1{font-size:1.4rem;color:#111}
.app-header p{font-size:.85rem;color:#6b7280;margin-top:4px}
.layout{display:flex;gap:16px}
.sidebar{width:280px;flex-shrink:0}
.main{flex:1;min-width:0}
.filter-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:12px}
.filter-card .label{font-size:.7rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.filter-card input[type=range]{width:100%;margin:6px 0}
.filter-card .range-labels{display:flex;justify-content:space-between;font-size:.75rem;color:#6b7280}
.filter-card .input-row{display:flex;gap:8px;align-items:center;margin-bottom:6px}
.filter-card .input-row .filter-input{flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.8rem;width:0;min-width:0;text-align:center;background:#fff}
.filter-card .input-row .filter-input:focus{border-color:#2563eb;outline:none;box-shadow:0 0 0 2px rgba(37,99,235,.2)}
.filter-card .input-row .range-sep{color:#9ca3af;font-size:.85rem;flex-shrink:0}
.preset-row{display:flex;gap:8px;margin-bottom:12px}
.preset-btn{flex:1;padding:8px 12px;border:none;border-radius:8px;font-weight:600;font-size:.8rem;cursor:pointer;color:#fff;transition:.15s}
.preset-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.1)}
.preset-a{background:linear-gradient(135deg,#dc2626,#b91c1c)}
.preset-b{background:linear-gradient(135deg,#e67e22,#d97706)}
.kpi-row{display:flex;gap:12px;margin-bottom:12px}
.kpi-card{flex:1;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;text-align:center}
.kpi-card .kpi-label{font-size:.7rem;color:#6b7280;font-weight:500}
.kpi-card .kpi-value{font-size:1.3rem;font-weight:700;color:#111;margin-top:2px}
.table-wrap{background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:12px}
.table-wrap .table-title{padding:12px 14px;font-weight:600;font-size:.9rem;border-bottom:1px solid #e2e8f0}
.table-scroll{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:.78rem;white-space:nowrap}
th{background:#f8fafc;color:#374151;font-weight:600;font-size:.7rem;text-transform:uppercase;letter-spacing:.3px;padding:8px 10px;border-bottom:2px solid #e2e8f0;cursor:pointer;user-select:none}
th:hover{background:#eef2f7}
td{padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#1f2937}
tr.momentum{background:#d1fae5!important}
tr.momentum td{color:#065f46;font-weight:500}
tr.star5{background:#fefce8!important}
tr.star5 td{color:#92400e}
.empty-msg{text-align:center;padding:32px;color:#9ca3af}
.btn{background:#2563eb;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:.8rem;cursor:pointer}
.btn:hover{background:#1d4ed8}
.refresh-btn{width:100%;padding:8px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-weight:600;font-size:.8rem;cursor:pointer;margin-top:8px}
.refresh-btn:hover{background:#1d4ed8}
.status-bar{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:#f0f4fe;border-radius:8px;font-size:.75rem;color:#1e40af;margin-bottom:12px}
.calc-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:12px}
.calc-card h3{font-size:.9rem;margin-bottom:8px}
.calc-row{display:flex;gap:12px;margin:8px 0}
.calc-row input{flex:1;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:.85rem}
.calc-result{background:#f0f4fe;border-radius:8px;padding:10px 14px;font-weight:600;color:#1e40af;font-size:.85rem;margin:8px 0}
.footer{text-align:center;color:#9ca3af;font-size:.7rem;padding:12px 0}
@media(max-width:768px){.layout{flex-direction:column}.sidebar{width:100%}}
</style>
</head>
<body>
<div id="root">加载中...</div>
<script>
// ── Auto-detect base path for sub-path deployment ─────────
const BASE = (window.location.pathname || '/').replace(/\\/+$/, '');

let fullData = [];
let filtered = [];
let sortCol = 'star_rating';
let sortAsc = false;
let presetActive = '';
let lastUpdated = '';

let mcapMin = 15000000, mcapMax = 500000000000;
let crMin = 0, crMax = 100;
let minAmp = 0, minR7 = -100;

async function load() {
  try {
    const r = await fetch(BASE + '/api/data');
    const d = await r.json();
    if (d.error && !d.data) throw new Error(d.error);
    fullData = d.data || [];
    lastUpdated = d.updated;
    filtered = [...fullData];
    applyFilters();
    render();
  } catch(e) {
    document.getElementById('root').innerHTML =
      '<div class="empty-msg">加载失败: ' + e.message +
      '<br><br><button class="btn" onclick="load()">重试</button></div>';
  }
}

function setPreset(p) {
  presetActive = p;
  if (p === 'A') { mcapMin = 15000000; mcapMax = 100000000; crMin = 0; crMax = 30; minAmp = 0; minR7 = -100; }
  else if (p === 'B') { mcapMin = 15000000; mcapMax = 50000000; crMin = 98; crMax = 100; minAmp = 0; minR7 = -100; }
  syncSliders();
  applyFilters();
}

function syncSliders() {
  const s = id => document.getElementById(id);
  s('mcap-min').value = mcapMin / 1000000;
  s('mcap-max').value = mcapMax / 1000000;
  s('cr-min').value = crMin; s('cr-max').value = crMax;
  s('amp').value = minAmp; s('r7').value = minR7;
  s('mcap-min-i').value = Math.round(mcapMin / 1000000);
  s('mcap-max-i').value = Math.round(mcapMax / 1000000);
  s('cr-min-i').value = crMin; s('cr-max-i').value = crMax;
  s('amp-i').value = minAmp; s('r7-i').value = minR7;
}

function applyFilters() {
  const crMinDec = crMin / 100;
  const crMaxDec = crMax / 100;
  filtered = fullData.filter(r => {
    if (r.market_cap == null || r.market_cap < mcapMin || r.market_cap > mcapMax) return false;
    const cr = r.circulating_ratio != null ? r.circulating_ratio : 1;
    if (cr < crMinDec || cr > crMaxDec) return false;
    if ((r.amplitude_24h_pct ?? 0) < minAmp) return false;
    if ((r.percent_change_7d ?? -999) < minR7) return false;
    return true;
  });
  if (presetActive === 'A') {
    filtered.sort((a, b) => (a.circulating_ratio ?? 1) - (b.circulating_ratio ?? 1));
  } else if (presetActive === 'B') {
    filtered.sort((a, b) => (b.percent_change_7d ?? -999) - (a.percent_change_7d ?? -999));
  } else {
    filtered.sort((a, b) => {
      const av = a[sortCol] ?? 0, bv = b[sortCol] ?? 0;
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }
  render();
}

function apply() {
  const s = id => document.getElementById(id);
  mcapMin = +s('mcap-min').value * 1000000;
  mcapMax = +s('mcap-max').value * 1000000;
  crMin = +s('cr-min').value; crMax = +s('cr-max').value;
  minAmp = +s('amp').value; minR7 = +s('r7').value;
  syncInputs();
  applyFilters();
}

function syncInputs() {
  const s = id => document.getElementById(id);
  const mi = s('mcap-min-i'), ma = s('mcap-max-i');
  if (mi) mi.value = Math.round(mcapMin / 1000000);
  if (ma) ma.value = Math.round(mcapMax / 1000000);
  const ci = s('cr-min-i'), ca = s('cr-max-i');
  if (ci) ci.value = crMin; if (ca) ca.value = crMax;
  const ai = s('amp-i'); if (ai) ai.value = minAmp;
  const ri = s('r7-i'); if (ri) ri.value = minR7;
}

function onInputChange(group) {
  const s = id => document.getElementById(id);
  if (group === 'mcap') {
    let min = +s('mcap-min-i').value || 15;
    let max = +s('mcap-max-i').value || 500000;
    if (min > max) { let t = min; min = max; max = t; }
    if (min < 1) min = 1;
    mcapMin = min * 1000000; mcapMax = max * 1000000;
  } else if (group === 'cr') {
    let min = +s('cr-min-i').value || 0;
    let max = +s('cr-max-i').value || 100;
    if (min > max) { let t = min; min = max; max = t; }
    if (min < 0) min = 0; if (max > 100) max = 100;
    crMin = min; crMax = max;
  } else if (group === 'amp') {
    minAmp = Math.min(Math.max(+s('amp-i').value || 0, 0), 100);
  } else if (group === 'r7') {
    minR7 = Math.max(+s('r7-i').value || -100, -100);
    if (minR7 > 500) minR7 = 500;
  }
  syncSliders();
  applyFilters();
}

function sortBy(col) {
  if (sortCol === col) sortAsc = !sortAsc;
  else { sortCol = col; sortAsc = false; }
  presetActive = '';
  applyFilters();
}

function render() {
  const root = document.getElementById('root');
  const pos7d = filtered.filter(r => (r.percent_change_7d ?? -999) > 0).length;
  const posPct = filtered.length > 0 ? (pos7d / filtered.length * 100).toFixed(1) : '0.0';
  const avgS = filtered.length > 0 ? (filtered.reduce((s, r) => s + r.star_rating, 0) / filtered.length).toFixed(2) : '0.00';
  const alertN = filtered.filter(r => r.momentum_alert).length;

  const updatedStr = lastUpdated ? new Date(lastUpdated).toLocaleTimeString('zh-CN') : '--';

  let rows = '';
  for (const r of filtered) {
    const cls = r.momentum_alert ? 'class="momentum"' : (r.star_rating >= 5 ? 'class="star5"' : '');
    rows += '<tr ' + cls + '>'
      + '<td>' + esc(r.symbol) + '</td>'
      + '<td>' + esc(r.name || r.base_asset) + '</td>'
      + '<td>' + fmtPrice(r.price) + '</td>'
      + '<td>' + fmtLarge(r.market_cap) + '</td>'
      + '<td>' + fmtRatio(r.circulating_ratio) + '</td>'
      + '<td>' + fmtPct(r.percent_change_7d) + '</td>'
      + '<td>' + fmtPct(r.change_24h_pct) + '</td>'
      + '<td>' + fmtPct(r.amplitude_24h_pct) + '</td>'
      + '<td>' + fmtLarge(r.volume_24h_usdt) + '</td>'
      + '<td>' + fmtStars(r.star_rating) + '</td>'
      + '<td>' + esc(r.unlock_risk) + '</td>'
      + '</tr>';
  }

  root.innerHTML =
\`<div class="app-header">
  <h1>筹码真空 · 代币筛选器</h1>
  <p>小资金百倍潜力挖掘 — 低流通/全流通小市值 — 数据源: CoinGecko</p>
</div>
<div class="status-bar">
  <span>全部可交易 \${fullData.length} · 筛选命中 \${filtered.length}</span>
  <span>最后更新 \${updatedStr}</span>
</div>
<div class="layout">
<div class="sidebar">
  <div class="preset-row">
    <button class="preset-btn preset-a" onclick="setPreset('A')">Preset A · 窒息流</button>
    <button class="preset-btn preset-b" onclick="setPreset('B')">Preset B · 全流通</button>
  </div>
  <button class="btn" style="width:100%;margin-bottom:12px;background:#6b7280" onclick="clearPreset()">清除筛选</button>
  <div class="filter-card">
    <div class="label">市值范围 (百万$)</div>
    <div class="input-row">
      <input type="number" id="mcap-min-i" class="filter-input" value="15" min="1" max="500000" step="1" onchange="onInputChange('mcap')">
      <span class="range-sep">~</span>
      <input type="number" id="mcap-max-i" class="filter-input" value="500000" min="1" max="500000" step="1" onchange="onInputChange('mcap')">
    </div>
    <input type="range" id="mcap-min" min="1" max="5000" value="15" oninput="apply()">
    <input type="range" id="mcap-max" min="1" max="500000" value="500000" oninput="apply()">
  </div>
  <div class="filter-card">
    <div class="label">流通率范围 (%)</div>
    <div class="input-row">
      <input type="number" id="cr-min-i" class="filter-input" value="0" min="0" max="100" step="1" onchange="onInputChange('cr')">
      <span class="range-sep">~</span>
      <input type="number" id="cr-max-i" class="filter-input" value="100" min="0" max="100" step="1" onchange="onInputChange('cr')">
    </div>
    <input type="range" id="cr-min" min="0" max="100" value="0" oninput="apply()">
    <input type="range" id="cr-max" min="0" max="100" value="100" oninput="apply()">
  </div>
  <div class="filter-card">
    <div class="label">动量过滤</div>
    <div style="font-size:.75rem;margin-bottom:4px">最低 24h 振幅 (%)</div>
    <div class="input-row" style="margin-bottom:2px">
      <input type="number" id="amp-i" class="filter-input" value="0" min="0" max="100" step="1" onchange="onInputChange('amp')">
    </div>
    <input type="range" id="amp" min="0" max="100" value="0" oninput="apply()">
    <div style="font-size:.75rem;margin:6px 0 4px">最低 7日涨跌 (%)</div>
    <div class="input-row" style="margin-bottom:2px">
      <input type="number" id="r7-i" class="filter-input" value="-100" min="-100" max="500" step="1" onchange="onInputChange('r7')">
    </div>
    <input type="range" id="r7" min="-100" max="500" value="-100" oninput="apply()">
  </div>
  <button class="refresh-btn" onclick="refresh()">刷新数据</button>
  <div style="font-size:.65rem;color:#9ca3af;text-align:center;margin-top:6px">数据每5分钟自动更新</div>
</div>
<div class="main">
  <div class="kpi-row">
    <div class="kpi-card"><div class="kpi-label">全部可交易</div><div class="kpi-value">\${fullData.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">筛选命中</div><div class="kpi-value">\${filtered.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">7日正收益</div><div class="kpi-value">\${posPct}%</div></div>
    <div class="kpi-card"><div class="kpi-label">平均潜力</div><div class="kpi-value">\${avgS}</div></div>
    <div class="kpi-card"><div class="kpi-label">主力信号</div><div class="kpi-value">\${alertN}</div></div>
  </div>
  <div class="table-wrap">
    <div class="table-title">筛选结果 <span style="font-weight:400;font-size:.75rem;color:#6b7280;margin-left:8px">点击表头排序 · 绿色行=主力介入</span></div>
    <div class="table-scroll">
    <table>
    <thead><tr>
      <th onclick="sortBy('symbol')">交易对</th>
      <th onclick="sortBy('name')">名称</th>
      <th onclick="sortBy('price')">价格</th>
      <th onclick="sortBy('market_cap')">流通市值</th>
      <th onclick="sortBy('circulating_ratio')">流通率</th>
      <th onclick="sortBy('percent_change_7d')">7日涨跌</th>
      <th onclick="sortBy('change_24h_pct')">24h涨跌</th>
      <th onclick="sortBy('amplitude_24h_pct')">24h振幅</th>
      <th onclick="sortBy('volume_24h_usdt')">24h交易量</th>
      <th onclick="sortBy('star_rating')">潜力</th>
      <th>解锁风险</th>
    </tr></thead>
    <tbody>\${rows || '<tr><td colspan="11" class="empty-msg">无匹配结果</td></tr>'}</tbody>
    </table>
    </div>
  </div>
  <div class="calc-card">
    <h3>资金分配式计算器</h3>
    <p style="font-size:.75rem;color:#6b7280;margin-bottom:8px">将本金等额分配至评分最高的 N 个标的</p>
    <div class="calc-row">
      <input type="number" id="capital" value="1000" min="10" oninput="calcFun()">
      <input type="number" id="npos" value="5" min="1" oninput="calcFun()">
    </div>
    <div id="calc-result"></div>
  </div>
</div>
</div>
<div class="footer">
  ⚠️ 本工具仅供研究参考，不构成任何投资建议。<br>
  最后更新 \${updatedStr}
</div>\`;
  calcFun();
  syncSliders();
}

function clearPreset() {
  presetActive = '';
  mcapMin = 15000000; mcapMax = 500000000000;
  crMin = 0; crMax = 100; minAmp = 0; minR7 = -100;
  syncSliders();
  applyFilters();
}

async function refresh() {
  try {
    await fetch(BASE + '/api/refresh', { method: 'POST' });
  } catch {}
  load();
}

function calcFun() {
  const el = document.getElementById('calc-result');
  if (!el) return;
  const capital = +document.getElementById('capital').value || 1000;
  const npos = +document.getElementById('npos').value || 5;
  const top = [...filtered].sort((a, b) => {
    if (b.star_rating !== a.star_rating) return b.star_rating - a.star_rating;
    return (a.circulating_ratio ?? 1) - (b.circulating_ratio ?? 1);
  }).slice(0, npos);
  if (top.length === 0) { el.innerHTML = ''; return; }
  const alloc = capital / top.length;
  let html = '<div class="calc-result">均仓分配: $' + capital.toLocaleString() + ' → ' + top.length + ' 个标的 → 每个 $' + alloc.toFixed(2) + '</div>';
  html += '<table><thead><tr><th>标的</th><th>价格</th><th>分配</th><th>数量</th><th>潜力</th></tr></thead><tbody>';
  for (const r of top) {
    const qty = r.price > 0 ? alloc / r.price : 0;
    html += '<tr><td>' + esc(r.symbol) + '</td><td>' + fmtPrice(r.price) + '</td><td>$' + alloc.toFixed(2) + '</td><td>' + qty.toFixed(6) + '</td><td>' + fmtStars(r.star_rating) + '</td></tr>';
  }
  html += '</tbody></table>';
  el.innerHTML = html;
}

// ── Helpers ───────────────────────────────────────────────
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmtPrice(v) { if (v == null) return 'N/A'; if (v < 0.001) return '$' + v.toFixed(8); if (v < 1) return '$' + v.toFixed(4); return '$' + v.toFixed(2); }
function fmtLarge(v) { if (v == null) return 'N/A'; return '$' + Number(v).toLocaleString('en-US', {maximumFractionDigits: 0}); }
function fmtPct(v) { if (v == null) return 'N/A'; return (v >= 0 ? '+' : '') + Number(v).toFixed(2) + '%'; }
function fmtRatio(v) { if (v == null) return 'N/A'; return (v * 100).toFixed(1) + '%'; }
function fmtStars(v) { return ['☆','★☆☆☆☆','★★☆☆☆','★★★☆☆','★★★★☆','★★★★★'][Math.min(v, 5)] || '☆'; }

// ── Start ─────────────────────────────────────────────────
load();
</script>
</body>
</html>
`;

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
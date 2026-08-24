// ═══════════════════════════════════════════════════════════
// 妖币扫描器 视图（基于 @derrrrrrrq 方法论：换手高 / 涨幅大 / OI低）
// 核心指标：额/OI比 = 24h成交额 / OI价值（挤压空间）
// ═══════════════════════════════════════════════════════════

// ── 他推文中提过的 25 个币 ──
var DEMON_MENTIONED = ['SIREN','RAVE','STO','LAB','TRADOOR','BSB','ESPORTS','BANK','IDOL','UB','BILL','RIVER','PTB','ACE','SAHARA','VELVET','ALLO','BLUAI','AGT','NOM','PIPPIN','WLFI','RESOLV','USR','INX'];

// ── 状态 ──
var curTab = 'chip';
var demonData = [], demonUpdated = null, demonLoaded = false;
var dPreset = 'default', dQuery = '', dSort = 'ratio', dAsc = false;
var dVolMin = 0, dOiMax = 100000, dRatioMin = 0, dChgMin = -100, dChgMax = 100;

// ── 挂接：现有 rD() 在妖币 Tab 下改为渲染妖币视图 ──
var __chipRD = rD;
rD = function () {
  if (curTab === 'demon') { renderDemon(); return; }
  __chipRD();
};

function switchTab(t) {
  curTab = t;
  var tb = document.getElementById('tabbar');
  if (tb) {
    tb.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
    var btn = t === 'demon' ? tb.querySelector('.tab-demon') : tb.querySelector('.tab-chip');
    if (btn) btn.classList.add('active');
  }
  if (t === 'demon') {
    if (!demonLoaded) demonLoad(); else renderDemon();
  } else {
    __chipRD();
  }
}

function demonLoad() {
  var root = document.getElementById('root');
  root.innerHTML = '<div class="empty-msg">正在加载妖币数据 (币安合约额/OI)...</div>';
  fetch(BASE + '/api/demon').then(function (r) { return r.json(); }).then(function (d) {
    demonData = d.data || [];
    demonUpdated = d.updated || null;
    demonLoaded = true;
    renderDemon();
  }).catch(function (err) {
    root.innerHTML = '<div class="empty-msg">妖币数据加载失败: ' + e(err.message) + '<br><br><button class="btn" onclick="demonLoad()">重试</button></div>';
  });
}

// ── 排序列映射 ──
function demonSortKey() {
  return { ratio: 'volume_oi_ratio', vol: 'volume_24h_usdt', oi: 'oi_value', chg: 'change_24h_pct', count: 'trade_count' }[dSort] || 'volume_oi_ratio';
}

// ── 过滤 + 排序 ──
function demonFiltered() {
  var q = (dQuery || '').toUpperCase().trim();
  var list = demonData.filter(function (r) {
    var vol = r.volume_24h_usdt || 0, oi = r.oi_value || 0, ratio = r.volume_oi_ratio || 0, chg = r.change_24h_pct || 0;
    if (dVolMin > 0 && vol < dVolMin * 1e6) return false;
    if (dOiMax < 100000 && oi > dOiMax * 1e6) return false;
    if (dRatioMin > 0 && ratio < dRatioMin) return false;
    if (chg < dChgMin || chg > dChgMax) return false;
    if (dPreset === 'tag' && DEMON_MENTIONED.indexOf(r.base_asset) < 0) return false;
    if (q && (r.symbol || '').indexOf(q) < 0 && (r.base_asset || '').indexOf(q) < 0) return false;
    return true;
  });
  var key = demonSortKey();
  list.sort(function (a, b) {
    var av = a[key] || 0, bv = b[key] || 0;
    return dAsc ? av - bv : bv - av;
  });
  return list;
}

function demonSetPreset(p) {
  dPreset = p;
  dVolMin = 0; dOiMax = 100000; dRatioMin = 0; dChgMin = -100; dChgMax = 100; dQuery = ''; dSort = 'ratio'; dAsc = false;
  if (p === 'squeeze') { dRatioMin = 8; dVolMin = 1; }
  else if (p === 'small') { dOiMax = 30; dSort = 'oi'; dAsc = true; }
  else if (p === 'pump') { dChgMin = 5; }
  else if (p === 'dump') { dChgMax = -5; }
  else if (p === 'tag') { dSort = 'vol'; }
  else if (p === 'all') { dSort = 'vol'; dVolMin = 0; dOiMax = 100000; dRatioMin = 0; dChgMin = -100; dChgMax = 100; }
  demonSyncInputs();
  renderDemon();
}

function demonSyncInputs() {
  var g = function (id) { return document.getElementById(id); };
  var set = function (id, v) { var el = g(id); if (el) el.value = v; };
  set('d-vol-min', dVolMin); set('d-oi-max', dOiMax); set('d-ratio-min', dRatioMin);
  set('d-chg-min', dChgMin); set('d-chg-max', dChgMax);
  set('d-vol-min-i', dVolMin); set('d-oi-max-i', dOiMax); set('d-ratio-min-i', dRatioMin);
  set('d-chg-min-i', dChgMin); set('d-chg-max-i', dChgMax);
  set('d-query', dQuery); set('d-sort', dSort);
  if (g('d-preset-' + dPreset)) {
    var all = document.querySelectorAll('.demon-preset');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
    g('d-preset-' + dPreset).classList.add('active');
  }
}

function demonApply() {
  var g = function (id) { return document.getElementById(id); };
  dVolMin = +g('d-vol-min').value || 0;
  dOiMax = +g('d-oi-max').value || 0;
  dRatioMin = +g('d-ratio-min').value || 0;
  var a = +g('d-chg-min').value, b = +g('d-chg-max').value;
  if (a > b) { var t = a; a = b; b = t; }
  dChgMin = a; dChgMax = b;
  dSort = g('d-sort').value; dQuery = g('d-query').value;
  dPreset = '';
  var all = document.querySelectorAll('.demon-preset');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
  demonSyncInputs();
  renderDemon();
}

function demonSortBy(k) {
  if (dSort === k) dAsc = !dAsc; else { dSort = k; dAsc = false; }
  demonSyncInputs();
  renderDemon();
}

// ── 信号标签 ──
function demonTags(r) {
  var t = [];
  var ratio = r.volume_oi_ratio || 0, oi = r.oi_value || 0, chg = r.change_24h_pct || 0;
  if (ratio > 8) t.push('<span class="sig-badge sig-squeeze">🔥挤压空间</span>');
  if (chg > 5) t.push('<span class="sig-badge sig-pump">🚀拉升</span>');
  if (chg < -5) t.push('<span class="sig-badge sig-dump">📉杀多</span>');
  if (DEMON_MENTIONED.indexOf(r.base_asset) >= 0) t.push('<span class="sig-badge sig-tag">📌他提过</span>');
  if (oi > 0 && oi < 10e6) t.push('<span class="sig-badge sig-lowoi">低OI</span>');
  if (oi > 100e6) t.push('<span class="sig-badge sig-higoi">⚠高OI</span>');
  return t.join('');
}

// ── 图表：额/OI比 Top20 ──
function demonChartRatio(list) {
  var top = list.slice().sort(function (a, b) { return (b.volume_oi_ratio || 0) - (a.volume_oi_ratio || 0); }).slice(0, 20);
  var max = 1; top.forEach(function (r) { if ((r.volume_oi_ratio || 0) > max) max = r.volume_oi_ratio || 0; });
  var h = '';
  top.forEach(function (r) {
    var v = r.volume_oi_ratio || 0;
    h += '<div class="hbar-row"><span class="hbar-label">' + e(r.base_asset) + '</span><div class="hbar-track"><div class="hbar-fill" style="width:' + (v / max * 100) + '%"></div></div><span class="hbar-val">' + v.toFixed(1) + 'x</span></div>';
  });
  return h;
}

// ── 图表：涨幅分布直方图 ──
function demonChartGain(list) {
  var b = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  list.forEach(function (r) {
    var c = r.change_24h_pct || 0;
    if (c < -40 || c > 40) return;
    var idx = Math.floor((c + 40) / 8);
    if (idx < 0) idx = 0; if (idx > 9) idx = 9;
    b[idx]++;
  });
  var max = 1; b.forEach(function (v) { if (v > max) max = v; });
  var h = '<div class="hist-wrap">';
  for (var i = 0; i < 10; i++) {
    var lo = -40 + i * 8;
    h += '<div class="hist-bar"><div class="hist-fill' + (lo + 4 < 0 ? ' neg' : '') + '" style="height:' + (b[i] / max * 100) + '%"></div><div class="hist-label">' + (lo >= 0 ? '+' : '') + lo + '%</div></div>';
  }
  h += '</div>';
  return h;
}

// ── 图表：OI值分布直方图 ──
function demonChartOi(list) {
  var labels = ['<5M', '5-10M', '10-30M', '30-100M', '>100M'];
  var b = [0, 0, 0, 0, 0];
  list.forEach(function (r) {
    var o = r.oi_value || 0;
    if (o < 5e6) b[0]++; else if (o < 10e6) b[1]++; else if (o < 30e6) b[2]++; else if (o < 100e6) b[3]++; else b[4]++;
  });
  var max = 1; b.forEach(function (v) { if (v > max) max = v; });
  var h = '<div class="hist-wrap">';
  for (var i = 0; i < 5; i++) {
    h += '<div class="hist-bar"><div class="hist-fill" style="height:' + (b[i] / max * 100) + '%"></div><div class="hist-label">' + labels[i] + '</div></div>';
  }
  h += '</div>';
  return h;
}

// ── 图表：OI值 vs 24h额 气泡图（对数坐标，点大小=额/OI比） ──
function demonChartScatter(list) {
  var top = list.slice().sort(function (a, b) { return (b.volume_oi_ratio || 0) - (a.volume_oi_ratio || 0); }).slice(0, 60);
  var xMin = Math.log10(1e5), xMax = Math.log10(5e9);
  var yMin = Math.log10(1e4), yMax = Math.log10(1e11);
  var h = '<div class="scatter-wrap">';
  top.forEach(function (r) {
    var oi = Math.max(r.oi_value || 0, 1e5), vol = Math.max(r.volume_24h_usdt || 0, 1e4);
    var x = (Math.log10(oi) - xMin) / (xMax - xMin) * 100;
    var y = 100 - (Math.log10(vol) - yMin) / (yMax - yMin) * 100;
    var ratio = r.volume_oi_ratio || 0;
    var size = Math.min(14, 3 + ratio / 2.5);
    var color = ratio > 8 ? '#ef4444' : ratio > 3 ? '#f59e0b' : '#3b82f6';
    h += '<div class="scatter-dot" style="left:' + x + '%;top:' + y + '%;width:' + size + 'px;height:' + size + 'px;background:' + color + '" title="' + e(r.base_asset) + ' | OI ' + fL(r.oi_value) + ' | 24h额 ' + fL(r.volume_24h_usdt) + ' | 额/OI ' + ratio.toFixed(1) + 'x"></div>';
  });
  h += '<div class="scatter-axis scatter-x">OI值 (对数) →</div><div class="scatter-axis scatter-y">↑ 24h额 (对数)</div></div>';
  return h;
}

// ── 主渲染 ──
function renderDemon() {
  var root = document.getElementById('root');
  var list = demonFiltered();
  var up = 0; list.forEach(function (r) { if ((r.change_24h_pct || 0) > 0) up++; });
  var totalVol = 0; list.forEach(function (r) { totalVol += r.volume_24h_usdt || 0; });
  var activeMention = 0; demonData.forEach(function (r) {
    if (DEMON_MENTIONED.indexOf(r.base_asset) >= 0 && (r.volume_24h_usdt || 0) >= 1e6) activeMention++;
  });
  var squeezeN = 0; demonData.forEach(function (r) { if ((r.volume_oi_ratio || 0) > 10) squeezeN++; });
  var upPct = list.length > 0 ? (up / list.length * 100).toFixed(1) : '--';
  var us = demonUpdated ? new Date(demonUpdated).toLocaleString('zh-CN') : '--';

  var rows = '';
  list.forEach(function (r) {
    var ratio = r.volume_oi_ratio || 0;
    var cls = ratio > 8 ? 'class="squeeze-row"' : '';
    rows += '<tr ' + cls + '>'
      + '<td><b>' + e(r.base_asset) + '</b></td>'
      + '<td>' + fP(r.price) + '</td>'
      + '<td>' + fL(r.volume_24h_usdt) + '</td>'
      + '<td>' + fC(r.change_24h_pct) + '</td>'
      + '<td>' + fC(r.amplitude_24h_pct) + '</td>'
      + '<td>' + fL(r.oi_value) + '</td>'
      + '<td><b>' + ratio.toFixed(1) + 'x</b></td>'
      + '<td>' + ((r.trade_count || 0) >= 1000 ? Math.round((r.trade_count || 0) / 1000) + 'k' : (r.trade_count || 0)) + '</td>'
      + '<td>' + demonTags(r) + '</td>'
      + '</tr>';
  });

  var H = '';
  H += '<div class="app-header"><h1>👺 妖币扫描器</h1><p>基于 @derrrrrrrq 方法论 — 换手高 · 涨幅大 · OI低 — 数据源: 币安合约 (额/OI比 = 挤压空间)</p></div>';
  H += '<div class="status-bar ok"><span>扫描 ' + demonData.length + ' 个合约 · 筛选命中 ' + list.length + '</span><span>更新 ' + us + '</span></div>';
  H += '<div class="layout"><div class="sidebar">';
  H += '<div class="demon-preset-row">';
  var presets = [['default', '🎯默认'], ['squeeze', '🔥挤压空间'], ['small', '💎小币候选'], ['pump', '🚀拉升'], ['dump', '📉杀多'], ['tag', '📌他提过'], ['all', '📋全部']];
  for (var i = 0; i < presets.length; i++) {
    H += '<button class="demon-preset' + (dPreset === presets[i][0] ? ' active' : '') + '" id="d-preset-' + presets[i][0] + '" onclick="demonSetPreset(\'' + presets[i][0] + '\')">' + presets[i][1] + '</button>';
  }
  H += '</div>';
  H += '<div class="demon-filter-card"><div class="label">24h成交额 (百万$)</div><div class="input-row"><input type="number" id="d-vol-min-i" class="filter-input" value="0" min="0" step="1" onchange="demonApply()"><span class="range-sep">≥</span></div><input type="range" id="d-vol-min" min="0" max="500" value="0" oninput="demonApply()"></div>';
  H += '<div class="demon-filter-card"><div class="label">OI值上限 (百万$)</div><div class="input-row"><input type="number" id="d-oi-max-i" class="filter-input" value="100000" min="0" step="1" onchange="demonApply()"><span class="range-sep">≤</span></div><input type="range" id="d-oi-max" min="0" max="500" value="100000" oninput="demonApply()"></div>';
  H += '<div class="demon-filter-card"><div class="label">额/OI比下限 (x)</div><div class="input-row"><input type="number" id="d-ratio-min-i" class="filter-input" value="0" min="0" step="1" onchange="demonApply()"><span class="range-sep">≥</span></div><input type="range" id="d-ratio-min" min="0" max="50" value="0" oninput="demonApply()"></div>';
  H += '<div class="demon-filter-card"><div class="label">24h涨幅范围 (%)</div><div class="input-row"><input type="number" id="d-chg-min-i" class="filter-input" value="-100" min="-100" max="500" step="1" onchange="demonApply()"><span class="range-sep">~</span><input type="number" id="d-chg-max-i" class="filter-input" value="100" min="-100" max="500" step="1" onchange="demonApply()"></div><div class="input-row"><input type="range" id="d-chg-min" min="-100" max="100" value="-100" oninput="demonApply()"><input type="range" id="d-chg-max" min="-100" max="100" value="100" oninput="demonApply()"></div></div>';
  H += '<div class="demon-filter-card"><div class="label">搜索币种</div><input type="text" id="d-query" class="filter-input" style="width:100%" placeholder="如: BANK" oninput="demonApply()"></div>';
  H += '<div class="demon-filter-card"><div class="label">排序方式</div><div class="demon-sort-row"><select id="d-sort" onchange="demonApply()">'
    + '<option value="ratio">额/OI比</option><option value="vol">24h成交额</option><option value="oi">OI值</option><option value="chg">24h涨幅</option><option value="count">成交笔数</option></select></div></div>';
  H += '<button class="refresh-btn" onclick="demonReload()">刷新数据</button>';
  H += '<div style="font-size:.6rem;color:var(--text-muted);text-align:center;margin-top:8px">本地中继推送 · 每5分钟</div>';
  H += '</div><div class="main">';
  H += '<div class="kpi-row">';
  H += '<div class="kpi-card"><div class="kpi-label">扫描合约</div><div class="kpi-value">' + demonData.length + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">筛选命中</div><div class="kpi-value">' + list.length + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">上涨占比</div><div class="kpi-value">' + upPct + '%</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">他关注活跃</div><div class="kpi-value">' + activeMention + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">额/OI&gt;10x</div><div class="kpi-value">' + squeezeN + '</div></div>';
  H += '</div>';
  H += '<div class="table-wrap"><div class="table-title">妖币扫描结果 <span style="font-weight:400;font-size:.7rem;color:var(--text-muted);margin-left:8px">点击表头排序 · 红行=挤压空间(额/OI&gt;8x) · 24h额合计 $' + fL(totalVol) + '</span></div><div class="table-scroll"><table><thead><tr>';
  H += '<th onclick="demonSortBy(\'ratio\')">交易对</th><th>价格</th><th onclick="demonSortBy(\'vol\')">24h额</th><th onclick="demonSortBy(\'chg\')">24h涨幅</th><th>振幅</th><th onclick="demonSortBy(\'oi\')">OI值</th><th onclick="demonSortBy(\'ratio\')">额/OI比</th><th onclick="demonSortBy(\'count\')">成交笔数</th><th>信号</th>';
  H += '</tr></thead><tbody>' + (rows || '<tr><td colspan="9" class="empty-msg">无匹配结果</td></tr>') + '</tbody></table></div></div>';
  H += '<div class="demon-chart-wrap"><h4>🔥 额/OI比 Top20（换手高但OI未跟上 → 庄家蓄水）</h4>' + demonChartRatio(list) + '</div>';
  H += '<div class="demon-chart-wrap"><h4>📊 24h涨幅分布</h4>' + demonChartGain(list) + '</div>';
  H += '<div class="demon-chart-wrap"><h4>📊 OI值分布</h4>' + demonChartOi(list) + '</div>';
  H += '<div class="demon-chart-wrap"><h4>🫧 OI值 vs 24h额（对数坐标，点大小=额/OI比）</h4>' + demonChartScatter(list) + '</div>';
  H += '<div class="demon-note">核心条件: 额/OI比 &gt; 10x（换手高但OI没跟上）· 辅助: 24h额 &gt; $2M（流动性够）· 涨幅 &gt; 5%（盘面激活）· OI &lt; $30M（小币挤压空间大）<br>排除: 大币(BTC/ETH/SOL) · OI &gt; $100M（庄家已完成布局）· 所有人注意力的币 · 派发后期的币</div>';
  H += '<div class="footer">⚠️ 仅供研究参考，不构成投资建议<br>最后更新 ' + us + '</div>';
  H += '</div></div>';
  root.innerHTML = H;
  demonSyncInputs();
}

function demonReload() {
  demonLoaded = false;
  demonLoad();
}

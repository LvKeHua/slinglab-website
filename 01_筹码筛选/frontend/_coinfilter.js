// ═══════════════════════════════════════════════════════════
// 🪙 小币筛选器 视图（基于 @derrrrrrrq 方法论：小币OI区间 + 换手 + 盘口深度）
// 数据: GET /api/coinfilter（币安合约 资费率/盘口深度/上线日期）
//       降级: GET /api/demon（妖币中继数据，无资费/深度/上线日期则显示 N/A）
// ═══════════════════════════════════════════════════════════

// ── 他推文中提过的 25 个币（DEMON_MENTIONED 的兜底副本）──
var CF_MENTIONED = (typeof DEMON_MENTIONED !== 'undefined' && DEMON_MENTIONED) ? DEMON_MENTIONED
  : ['SIREN','RAVE','STO','LAB','TRADOOR','BSB','ESPORTS','BANK','IDOL','UB','BILL','RIVER','PTB','ACE','SAHARA','VELVET','ALLO','BLUAI','AGT','NOM','PIPPIN','WLFI','RESOLV','USR','INX'];

// ── 状态 ──
if (typeof curTab === 'undefined') var curTab = 'chip';
var coinfilterData = [], coinfilterUpdated = null, coinfilterLoaded = false, coinfilterSource = 'coinfilter';
var cPreset = 'default', cQuery = '', cSort = 'ratio', cAsc = false, cTag = '';
var cRatioMin = 0, cRatioMax = 999, cOiMin = 0, cOiMax = 9999;
var cChgMin = -100, cChgMax = 100, cVolMin = 0, cVolMax = 99999;
var cFundMin = -1, cFundMax = 1, cDepthMin = 0, cDepthMax = 999999;

// ── 挂接 Tab 切换（兼容已存在的 switchTab / rD 覆盖链）──
var __cfSwitchTab = (typeof switchTab === 'function') ? switchTab : null;
switchTab = function (t) {
  if (t === 'coinfilter') {
    curTab = t;
    var tb = document.getElementById('tabbar');
    if (tb) {
      tb.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      var btn = tb.querySelector('.tab-coinfilter');
      if (btn) btn.classList.add('active');
    }
    if (!coinfilterLoaded) coinfilterLoad(); else renderCoinfilter();
    return;
  }
  if (__cfSwitchTab) { __cfSwitchTab(t); return; }
  if (t === 'demon' && typeof renderDemon === 'function') { renderDemon(); return; }
  if (typeof rD === 'function') rD();
};

var __cfRD = (typeof rD === 'function') ? rD : null;
rD = function () {
  if (curTab === 'coinfilter') { renderCoinfilter(); return; }
  if (__cfRD) __cfRD();
};

// ── 数据加载（/api/coinfilter → 降级 /api/demon）──
function coinfilterLoad() {
  var root = document.getElementById('root');
  root.innerHTML = '<div class="empty-msg">🪙 正在加载小币筛选数据（币安合约 资费率/盘口深度/上线日期）...</div>';
  fetch(BASE + '/api/coinfilter').then(function (r) { return r.json(); }).then(function (d) {
    var coins = d.coins || d.data || [];
    if (d.error && !coins.length) throw new Error(d.error);
    if (!coins.length) throw new Error('coinfilter 暂无数据');
    coinfilterData = coins.map(cfEnrich);
    coinfilterUpdated = d.updated || null;
    coinfilterLoaded = true;
    coinfilterSource = 'coinfilter';
    renderCoinfilter();
  }).catch(function (err) {
    // 降级: 妖币中继数据（无资费/深度/上线日期字段）
    fetch(BASE + '/api/demon').then(function (r) { return r.json(); }).then(function (d) {
      var coins = d.data || [];
      if (!coins.length) throw new Error('demon 也无数据');
      coinfilterData = coins.map(cfEnrich);
      coinfilterUpdated = d.updated || null;
      coinfilterLoaded = true;
      coinfilterSource = 'demon';
      renderCoinfilter();
    }).catch(function (err2) {
      root.innerHTML = '<div class="empty-msg">小币筛选数据加载失败: ' + e(err2.message) + '<br><br><button class="btn" onclick="coinfilterLoad()">重试</button></div>';
    });
  });
}

function cfReload() {
  coinfilterLoaded = false;
  coinfilterLoad();
}

// ── 数据补充: OI阶段 / 上市天数 / 信号标签（全部客户端计算）──
function cfEnrich(r) {
  var oi = r.oi_value || 0;
  var stage = 'accumulation', label = '⏳ 蓄水期';
  if (oi < 2e6) { stage = 'accumulation'; label = '⏳ 蓄水期'; }
  else if (oi < 8e6) { stage = 'early_pump'; label = '💎 小币候选'; }
  else if (oi < 30e6) { stage = 'pump'; label = '🚀 拉升期'; }
  else if (oi < 80e6) { stage = 'mid'; label = '⚡ 中期'; }
  else { stage = 'late_distribution'; label = '⛔ 大后期'; }
  r.base_asset = r.base_asset || r.symbol || '';
  r.oi_stage = stage;
  r.oi_stage_label = label;
  if (r.days_since_listing == null && r.listing_date) {
    var ld = new Date(r.listing_date);
    if (!isNaN(ld.getTime())) r.days_since_listing = Math.max(0, Math.floor((Date.now() - ld.getTime()) / 86400000));
  }
  r.tags = cfTags(r);
  return r;
}

// ── 信号标签（自动）──
var CF_TAG_DEFS = [
  ['squeeze', '🔥挤压'],
  ['small_cap', '💎小币'],
  ['early_pump', '🚀拉升'],
  ['thin_book', '⚠️薄盘口'],
  ['distribution', '⛔大后期'],
  ['kill_longs', '📉杀多'],
  ['mentioned', '📌他提过'],
  ['new_listing', '🆕新上'],
  ['funding_anomaly', '💰资费异']
];

function cfTags(r) {
  var t = {};
  var ratio = r.volume_oi_ratio || 0, oi = r.oi_value || 0, chg = r.change_24h_pct || 0;
  var depth = r.orderbook_depth_usdt, fund = r.funding_rate_pct, days = r.days_since_listing;
  var base = r.base_asset || r.symbol || '';
  t.squeeze = ratio >= 10 && oi > 5e6;
  t.small_cap = oi >= 2e6 && oi < 8e6;
  t.early_pump = oi >= 8e6 && oi < 30e6 && chg > 0;
  t.thin_book = depth != null && depth < 200000;
  t.distribution = oi > 80e6 && ratio < 3 && chg < -10;
  t.kill_longs = chg < -5;
  t.mentioned = CF_MENTIONED.indexOf(base) >= 0;
  t.new_listing = days != null && days <= 30;
  t.funding_anomaly = fund != null && (fund > 0.05 || fund < -0.05);
  return t;
}

function cfTagHtml(r) {
  var h = '';
  for (var i = 0; i < CF_TAG_DEFS.length; i++) {
    var k = CF_TAG_DEFS[i][0];
    if (r.tags && r.tags[k]) h += '<span class="cf-tag cf-tag-' + k + '">' + CF_TAG_DEFS[i][1] + '</span>';
  }
  return h;
}

// ── 5步检查清单（点击循环 ✓ → ✕ → 空白，localStorage 持久化）──
var CF_CHECK_STEPS = [
  ['📡 扫盘', '换手高(额/OI≥10x)·涨幅大(>5%)·OI低(<30M)'],
  ['🧹 筛选', 'OI 2M-8M 小币候选 / 8M-30M 拉升早期'],
  ['🔍 确认', '盘口不薄·无派发迹象·量价配合'],
  ['🎯 入场', '回调不破位·放量突破确认'],
  ['🛡️ 风控', '止损明确·仓位合理·资费正常']
];

function cfGetChecklist(sym) {
  try {
    var d = JSON.parse(localStorage.getItem('cf_checklist_v1') || '{}');
    return d[sym] || [0, 0, 0, 0, 0];
  } catch (e) { return [0, 0, 0, 0, 0]; }
}

function cfCycleCheck(sym, idx) {
  var d = {};
  try { d = JSON.parse(localStorage.getItem('cf_checklist_v1') || '{}'); } catch (e) {}
  var arr = d[sym] || [0, 0, 0, 0, 0];
  arr[idx] = (arr[idx] + 1) % 3;
  d[sym] = arr;
  try { localStorage.setItem('cf_checklist_v1', JSON.stringify(d)); } catch (e) {}
  var mark = document.getElementById('cfm-' + sym + '-' + idx);
  if (mark) {
    var st = arr[idx];
    mark.className = 'cf-check-mark cf-check-' + (st === 1 ? 'ok' : st === 2 ? 'no' : 'blank');
    mark.textContent = st === 1 ? '✓' : st === 2 ? '✕' : '·';
  }
}

function cfChecklistHtml(sym) {
  var cl = cfGetChecklist(sym);
  var h = '<div class="cf-checklist"><div class="cf-checklist-head"><span>📋 5步检查清单</span><span class="cf-checklist-hint">点击切换 ✓ / ✕ / 空白 · 自动保存</span></div><div class="cf-checklist-steps">';
  for (var i = 0; i < CF_CHECK_STEPS.length; i++) {
    var st = cl[i] || 0;
    h += '<div class="cf-check-step" onclick="cfCycleCheck(\'' + sym + '\',' + i + ')">'
      + '<span id="cfm-' + sym + '-' + i + '" class="cf-check-mark cf-check-' + (st === 1 ? 'ok' : st === 2 ? 'no' : 'blank') + '">' + (st === 1 ? '✓' : st === 2 ? '✕' : '·') + '</span>'
      + '<span class="cf-check-name">' + CF_CHECK_STEPS[i][0] + '</span>'
      + '<span class="cf-check-desc">' + CF_CHECK_STEPS[i][1] + '</span>'
      + '</div>';
  }
  h += '</div></div>';
  return h;
}

// ── 展开行: 切换显示 ──
function cfToggleRow(tr) {
  var detail = tr.nextElementSibling;
  if (!detail || !detail.classList.contains('cf-detail-row')) return;
  var show = detail.style.display === 'none';
  detail.style.display = show ? 'table-row' : 'none';
  var arrow = tr.querySelector('.cf-expand-arrow');
  if (arrow) arrow.textContent = show ? '▾' : '▸';
}

// ── 排序列映射 ──
function cfSortKeyVal(r, k) {
  if (k === 'oi') return r.oi_value || 0;
  if (k === 'chg') return r.change_24h_pct || 0;
  if (k === 'vol') return r.volume_24h_usdt || 0;
  if (k === 'depth') return r.orderbook_depth_usdt || 0;
  if (k === 'lsr') return r.long_short_ratio || 0;
  if (k === 'liq') return r.liq_24h_usdt || 0;
  if (k === 'oit') return r.oi_24h_change_pct || 0;
  if (k === 'sym') return r.base_asset || r.symbol || '';
  return r.volume_oi_ratio || 0;
}

// ── 过滤 + 排序 ──
function cfFiltered() {
  var q = (cQuery || '').toUpperCase().trim();
  var list = coinfilterData.filter(function (r) {
    var ratio = r.volume_oi_ratio || 0, oi = r.oi_value || 0, chg = r.change_24h_pct || 0, vol = r.volume_24h_usdt || 0;
    var fund = r.funding_rate_pct, depth = r.orderbook_depth_usdt;
    if (ratio < cRatioMin || ratio > cRatioMax) return false;
    if (oi < cOiMin * 1e6 || oi > cOiMax * 1e6) return false;
    if (chg < cChgMin || chg > cChgMax) return false;
    if (vol < cVolMin * 1e6 || vol > cVolMax * 1e6) return false;
    if (fund != null && (fund < cFundMin || fund > cFundMax)) return false;
    if (depth != null && (depth < cDepthMin * 1000 || depth > cDepthMax * 1000)) return false;
    if (cTag && !(r.tags && r.tags[cTag])) return false;
    if (q && (r.symbol || '').indexOf(q) < 0 && (r.base_asset || '').indexOf(q) < 0) return false;
    return true;
  });
  list.sort(function (a, b) {
    var k = cSort;
    if (k === 'depth') return cfSortKeyVal(a, k) - cfSortKeyVal(b, k); // 深度恒为升序
    var av = cfSortKeyVal(a, k), bv = cfSortKeyVal(b, k);
    if (typeof av === 'string') return cAsc ? (av < bv ? -1 : av > bv ? 1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0);
    return cAsc ? av - bv : bv - av;
  });
  return list;
}

// ── 8 个预设 ──
var CF_PRESETS = [
  ['default', '🎯默认'],
  ['small', '💎小币2-8M'],
  ['pump', '🚀拉升早期8-30M'],
  ['thin', '⚠️薄盘口'],
  ['kill', '📉杀多'],
  ['late', '⛔大后期'],
  ['tag', '📌他提过'],
  ['all', '📋全部']
];

function cfSetPreset(p) {
  cPreset = p; cTag = '';
  cRatioMin = 0; cRatioMax = 999; cOiMin = 0; cOiMax = 9999;
  cChgMin = -100; cChgMax = 100; cVolMin = 0; cVolMax = 99999;
  cFundMin = -1; cFundMax = 1; cDepthMin = 0; cDepthMax = 999999;
  cQuery = ''; cSort = 'ratio'; cAsc = false;
  if (p === 'default') { cVolMin = 0.3; }
  else if (p === 'small') { cOiMin = 2; cOiMax = 8; cSort = 'oi'; cAsc = true; }
  else if (p === 'pump') { cOiMin = 8; cOiMax = 30; cChgMin = 0; }
  else if (p === 'thin') { cDepthMax = 200; cSort = 'depth'; }
  else if (p === 'kill') { cChgMax = -5; }
  else if (p === 'late') { cOiMin = 80; cRatioMax = 3; cChgMax = -10; }
  else if (p === 'tag') { cTag = 'mentioned'; cSort = 'vol'; }
  else if (p === 'all') { cVolMin = 0; cSort = 'vol'; }
  cfSyncInputs();
  renderCoinfilter();
}

// ── 同步控件 ──
function cfSyncInputs() {
  var g = function (id) { return document.getElementById(id); };
  var set = function (id, v) { var el = g(id); if (el) el.value = v; };
  set('c-ratio-min', cRatioMin); set('c-ratio-max', cRatioMax);
  set('c-ratio-min-i', cRatioMin); set('c-ratio-max-i', cRatioMax);
  set('c-oi-min', cOiMin); set('c-oi-max', cOiMax);
  set('c-oi-min-i', cOiMin); set('c-oi-max-i', cOiMax);
  set('c-chg-min', cChgMin); set('c-chg-max', cChgMax);
  set('c-chg-min-i', cChgMin); set('c-chg-max-i', cChgMax);
  set('c-vol-min', cVolMin); set('c-vol-max', cVolMax);
  set('c-vol-min-i', cVolMin); set('c-vol-max-i', cVolMax);
  set('c-fund-min', cFundMin); set('c-fund-max', cFundMax);
  set('c-fund-min-i', cFundMin); set('c-fund-max-i', cFundMax);
  set('c-depth-min', cDepthMin); set('c-depth-max', cDepthMax);
  set('c-depth-min-i', cDepthMin); set('c-depth-max-i', cDepthMax);
  set('c-query', cQuery); set('c-sort', cSort);
  var all = document.querySelectorAll('.cf-preset');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
  var act = g('c-preset-' + cPreset);
  if (act) act.classList.add('active');
}

// ── 手动筛选应用 ──
function cfApply() {
  var g = function (id) { return document.getElementById(id); };
  function num(id, def) { var v = parseFloat(g(id).value); return isNaN(v) ? def : v; }
  function pair(minId, maxId, dMin, dMax) {
    var a = num(minId, dMin), b = num(maxId, dMax);
    if (a > b) { var t = a; a = b; b = t; }
    return [a, b];
  }
  var pr = pair('c-ratio-min-i', 'c-ratio-max-i', 0, 999); cRatioMin = pr[0]; cRatioMax = pr[1];
  var po = pair('c-oi-min-i', 'c-oi-max-i', 0, 9999); cOiMin = po[0]; cOiMax = po[1];
  var pc = pair('c-chg-min-i', 'c-chg-max-i', -100, 100); cChgMin = pc[0]; cChgMax = pc[1];
  var pv = pair('c-vol-min-i', 'c-vol-max-i', 0, 99999); cVolMin = pv[0]; cVolMax = pv[1];
  var pf = pair('c-fund-min-i', 'c-fund-max-i', -1, 1); cFundMin = pf[0]; cFundMax = pf[1];
  var pd = pair('c-depth-min-i', 'c-depth-max-i', 0, 999999); cDepthMin = pd[0]; cDepthMax = pd[1];
  cQuery = g('c-query').value;
  cSort = g('c-sort').value;
  if (cSort === 'depth') cAsc = false;
  cPreset = ''; cTag = '';
  cfSyncInputs();
  renderCoinfilter();
}

function cfSortBy(k) {
  if (k === 'depth') { cSort = k; cAsc = false; }
  else if (cSort === k) cAsc = !cAsc;
  else { cSort = k; cAsc = false; }
  var sel = document.getElementById('c-sort');
  if (sel) sel.value = cSort;
  var all = document.querySelectorAll('.cf-preset');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
  cPreset = '';
  renderCoinfilter();
}

// ── 工具函数 ──
function cfDepth(v) {
  if (v == null) return 'N/A';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return String(Math.round(v));
}

// ── 图表 1: 额/OI比 Top20 ──
function cfChartRatio(list) {
  var top = list.slice().sort(function (a, b) { return (b.volume_oi_ratio || 0) - (a.volume_oi_ratio || 0); }).slice(0, 20);
  var max = 1; top.forEach(function (r) { if ((r.volume_oi_ratio || 0) > max) max = r.volume_oi_ratio || 0; });
  var h = '';
  top.forEach(function (r) {
    var v = r.volume_oi_ratio || 0;
    h += '<div class="cf-hbar-row"><span class="cf-hbar-label">' + e(r.base_asset) + '</span><div class="cf-hbar-track"><div class="cf-hbar-fill" style="width:' + (v / max * 100) + '%"></div></div><span class="cf-hbar-val">' + v.toFixed(1) + 'x</span></div>';
  });
  return h;
}

// ── 图表 2: OI区间分布直方图（按阶段着色）──
function cfChartOi(list) {
  var labels = ['<2M', '2-8M', '8-30M', '30-80M', '>80M'];
  var colors = ['#64748b', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  var b = [0, 0, 0, 0, 0];
  list.forEach(function (r) {
    var o = r.oi_value || 0;
    if (o < 2e6) b[0]++; else if (o < 8e6) b[1]++; else if (o < 30e6) b[2]++; else if (o < 80e6) b[3]++; else b[4]++;
  });
  var max = 1; b.forEach(function (v) { if (v > max) max = v; });
  var h = '<div class="cf-hist-wrap">';
  for (var i = 0; i < 5; i++) {
    h += '<div class="cf-hist-bar"><div class="cf-hist-fill" style="height:' + (b[i] / max * 100) + '%;background:' + colors[i] + '"></div><div class="cf-hist-label">' + labels[i] + '</div></div>';
  }
  h += '</div>';
  return h;
}

// ── 图表 3: OI值 vs 24h额 气泡图（对数坐标，点大小=额/OI比，颜色=OI阶段）──
function cfChartScatter(list) {
  // 自适应对数范围: 从实际数据算 min/max，避免点全挤在左下角
  var pts = [];
  list.forEach(function (r) {
    var oi = r.oi_value, vol = r.volume_24h_usdt;
    if (oi == null || oi <= 0 || vol == null || vol <= 0) return;
    pts.push(r);
  });
  if (pts.length < 2) return '<div class="cf-scatter-wrap" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:.7rem">暂无足够数据</div>';
  var oiVals = pts.map(function (r) { return r.oi_value; });
  var volVals = pts.map(function (r) { return r.volume_24h_usdt; });
  function niceLogLo(arr) { var mn = Math.min.apply(null, arr); if (mn <= 0) mn = 1e4; return Math.pow(10, Math.floor(Math.log10(mn))); }
  function niceLogHi(arr) { var mx = Math.max.apply(null, arr); return Math.pow(10, Math.ceil(Math.log10(mx))); }
  var xLo = niceLogLo(oiVals), xHi = niceLogHi(oiVals);
  var yLo = niceLogLo(volVals), yHi = niceLogHi(volVals);
  if (xHi / xLo < 4) xHi = xLo * 10; if (yHi / yLo < 4) yHi = yLo * 10;
  var xMin = Math.log10(xLo), xMax = Math.log10(xHi);
  var yMin = Math.log10(yLo), yMax = Math.log10(yHi);
  var stageColor = { accumulation: '#64748b', early_pump: '#3b82f6', pump: '#10b981', mid: '#f59e0b', late_distribution: '#ef4444' };
  var stageLabel = { accumulation: '⏳蓄水', early_pump: '💎小币', pump: '🚀拉升', mid: '⚡中期', late_distribution: '⛔大后期' };
  // 刻度: 每轴 5 个对数刻度
  function ticks(lo, hi) {
    var out = [];
    for (var v = lo; v <= hi * 1.001; v *= 10) out.push(v);
    if (out.length < 3) { out = []; for (var i = 0; i < 5; i++) out.push(lo * Math.pow(Math.pow(hi / lo, 1 / 4), i)); }
    return out;
  }
  var xTicks = ticks(xLo, xHi), yTicks = ticks(yLo, yHi);
  var h = '<div class="cf-scatter-wrap">';
  // 绘图区域（内边距留给刻度标签和轴标题）
  h += '<div class="cf-scatter-plot">';
  // 网格线 + 刻度标签（相对于 plot 区域）
  xTicks.forEach(function (tv) {
    var pct = (Math.log10(tv) - xMin) / (xMax - xMin) * 100;
    if (pct < 0 || pct > 100) return;
    h += '<div class="cf-scatter-grid cf-scatter-grid-v" style="left:' + pct + '%"></div>';
    h += '<div class="cf-scatter-tick cf-scatter-tick-x" style="left:' + pct + '%">' + fL(tv) + '</div>';
  });
  yTicks.forEach(function (tv) {
    var pct = 100 - (Math.log10(tv) - yMin) / (yMax - yMin) * 100;
    if (pct < 0 || pct > 100) return;
    h += '<div class="cf-scatter-grid cf-scatter-grid-h" style="top:' + pct + '%"></div>';
    h += '<div class="cf-scatter-tick cf-scatter-tick-y" style="top:' + pct + '%">' + fL(tv) + '</div>';
  });
  // 气泡点（顶部 40% 的点 tooltip 向下，其余向上）
  var top = pts.slice().sort(function (a, b) { return (b.volume_oi_ratio || 0) - (a.volume_oi_ratio || 0); }).slice(0, 80);
  top.forEach(function (r) {
    var oi = Math.max(r.oi_value, xLo), vol = Math.max(r.volume_24h_usdt, yLo);
    var x = (Math.log10(oi) - xMin) / (xMax - xMin) * 100;
    var y = 100 - (Math.log10(vol) - yMin) / (yMax - yMin) * 100;
    x = Math.max(1, Math.min(99, x)); y = Math.max(1, Math.min(99, y));
    var ratio = r.volume_oi_ratio || 0;
    var size = Math.min(24, 5 + ratio / 1.8);
    var color = stageColor[r.oi_stage] || '#64748b';
    var tipDir = y < 35 ? 'below' : 'above';
    var tip = e(r.base_asset) + ' | OI ' + fL(r.oi_value) + ' | 24h额 ' + fL(r.volume_24h_usdt) + ' | 额/OI ' + ratio.toFixed(1) + 'x | ' + (r.oi_stage_label || '');
    h += '<div class="cf-scatter-dot" data-sym="' + e(r.symbol) + '" style="left:' + x + '%;top:' + y + '%;width:' + size + 'px;height:' + size + 'px;background:' + color + '"><span class="cf-scatter-tip ' + tipDir + '">' + tip + '</span></div>';
  });
  h += '</div>'; // close cf-scatter-plot
  // 轴标题（在外层 wrap，不受 plot overflow 裁剪）
  h += '<div class="cf-scatter-axis cf-scatter-x">OI值 (对数) →</div><div class="cf-scatter-axis cf-scatter-y">↑ 24h额 (对数)</div>';
  // 图例（在外层 wrap）
  h += '<div class="cf-scatter-legend">';
  ['accumulation', 'early_pump', 'pump', 'mid', 'late_distribution'].forEach(function (k) {
    h += '<span class="cf-scatter-legend-item"><i style="background:' + stageColor[k] + '"></i>' + stageLabel[k] + '</span>';
  });
  h += '</div></div>';
  return h;
}

// ── 图表 4: 资费率分布直方图（-0.2% ~ +0.2%，负红正绿）──
function cfChartFunding(list) {
  var nb = 10, step = 0.04;
  var b = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  list.forEach(function (r) {
    var f = r.funding_rate_pct;
    if (f == null) return;
    if (f < -0.2 || f > 0.2) return;
    var idx = Math.floor((f + 0.2) / step);
    if (idx < 0) idx = 0; if (idx > nb - 1) idx = nb - 1;
    b[idx]++;
  });
  var max = 1; b.forEach(function (v) { if (v > max) max = v; });
  var h = '<div class="cf-hist-wrap">';
  for (var i = 0; i < nb; i++) {
    var lo = -0.2 + i * step, mid = lo + step / 2;
    var cls = mid < 0 ? ' neg' : (mid > 0 ? ' pos' : '');
    h += '<div class="cf-hist-bar"><div class="cf-hist-fill' + cls + '" style="height:' + (b[i] / max * 100) + '%"></div><div class="cf-hist-label">' + (lo >= 0 ? '+' : '') + lo.toFixed(2) + '</div></div>';
  }
  h += '</div>';
  return h;
}

// ── 信号计数统计条 ──
function cfStatsBar(list) {
  var keys = ['squeeze', 'small_cap', 'early_pump', 'thin_book', 'distribution', 'kill_longs', 'mentioned', 'new_listing', 'funding_anomaly'];
  var counts = {};
  keys.forEach(function (k) { counts[k] = 0; });
  list.forEach(function (r) {
    var t = r.tags || {};
    keys.forEach(function (k) { if (t[k]) counts[k]++; });
  });
  var names = { squeeze: '🔥挤压', small_cap: '💎小币', early_pump: '🚀拉升', thin_book: '⚠️薄盘口', distribution: '⛔大后期', kill_longs: '📉杀多', mentioned: '📌他提过', new_listing: '🆕新上', funding_anomaly: '💰资费异' };
  var h = '<div class="cf-stats">';
  keys.forEach(function (k) {
    h += '<span class="cf-stat-chip cf-chip-' + k + '">' + names[k] + ' <b>' + counts[k] + '</b></span>';
  });
  h += '</div>';
  return h;
}

// ── 展开详情: 元信息 ──
function cfDetailMetaHtml(r) {
  var amp = r.amplitude_pct != null ? r.amplitude_pct : r.amplitude_24h_pct;
  var tc = r.trade_count;
  var h = '<div class="cf-detail-meta">';
  h += '<div class="cf-meta-item"><span class="cf-meta-label">上线日期</span><span>' + e(r.listing_date || 'N/A') + '</span></div>';
  h += '<div class="cf-meta-item"><span class="cf-meta-label">上市天数</span><span>' + (r.days_since_listing != null ? r.days_since_listing + ' 天' : 'N/A') + '</span></div>';
  h += '<div class="cf-meta-item"><span class="cf-meta-label">24h振幅</span><span>' + (amp != null ? amp.toFixed(1) + '%' : 'N/A') + '</span></div>';
  h += '<div class="cf-meta-item"><span class="cf-meta-label">成交笔数</span><span>' + (tc != null ? (tc >= 1000 ? Math.round(tc / 1000) + 'k' : tc) : 'N/A') + '</span></div>';
  h += '<div class="cf-meta-item"><span class="cf-meta-label">OI阶段</span><span>' + e(r.oi_stage_label) + '</span></div>';
  if (r.long_short_ratio != null) h += '<div class="cf-meta-item"><span class="cf-meta-label">多空比</span><span>' + r.long_short_ratio.toFixed(2) + (r.long_pct != null ? ' (多头' + r.long_pct.toFixed(0) + '% / 空头' + r.short_pct.toFixed(0) + '%)' : '') + '</span></div>';
  if (r.liq_24h_usdt != null) h += '<div class="cf-meta-item"><span class="cf-meta-label">24h清算</span><span>' + cfDepth(r.liq_24h_usdt) + ' (多' + cfDepth(r.liq_long_24h_usdt || 0) + ' / 空' + cfDepth(r.liq_short_24h_usdt || 0) + ')</span></div>';
  if (r.oi_24h_change_pct != null) h += '<div class="cf-meta-item"><span class="cf-meta-label">OI 24h趋势</span><span>' + (r.oi_24h_change_pct > 0 ? '+' : '') + r.oi_24h_change_pct.toFixed(1) + '%</span></div>';
  if (r.predicted_funding_rate_pct != null) h += '<div class="cf-meta-item"><span class="cf-meta-label">预测资费</span><span>' + r.predicted_funding_rate_pct.toFixed(4) + '%</span></div>';
  h += '</div>';
  return h;
}

// ── 主渲染 ──
function renderCoinfilter(container) {
  var root = container || document.getElementById('root');
  if (!root) return;
  if (!coinfilterLoaded) {
    root.innerHTML = '<div class="empty-msg">🪙 数据加载中...（币安合约 资费率/盘口深度/上线日期 抓取中，每5分钟更新）<br><br><button class="btn" onclick="coinfilterLoad()">重试</button></div>';
    return;
  }
  var list = cfFiltered();
  var up = 0; list.forEach(function (r) { if ((r.change_24h_pct || 0) > 0) up++; });
  var totalVol = 0; list.forEach(function (r) { totalVol += r.volume_24h_usdt || 0; });
  var fundN = 0, newN = 0;
  list.forEach(function (r) {
    if (r.tags.funding_anomaly) fundN++;
    if (r.tags.new_listing) newN++;
  });
  var upPct = list.length > 0 ? (up / list.length * 100).toFixed(1) : '--';
  var us = coinfilterUpdated ? new Date(coinfilterUpdated).toLocaleString('zh-CN') : '--';
  var src = coinfilterSource === 'demon' ? '妖币中继(降级, 无资费/深度/上线日期)' : '币安合约(资费率/盘口/上线日期)';

  var rows = '';
  list.forEach(function (r) {
    var fund = r.funding_rate_pct != null
      ? '<span class="cf-fund' + (r.funding_rate_pct > 0 ? ' cf-fund-pos' : r.funding_rate_pct < 0 ? ' cf-fund-neg' : '') + '">' + (r.funding_rate_pct > 0 ? '+' : '') + r.funding_rate_pct.toFixed(3) + '%</span>'
      : 'N/A';
    var depth = r.orderbook_depth_usdt != null ? cfDepth(r.orderbook_depth_usdt) : 'N/A';
    // Coinalyze 补充列：多空比 / 清算 / OI趋势
    var lsr = r.long_short_ratio != null
      ? '<span class="cf-lsr' + (r.long_short_ratio > 2 ? ' cf-lsr-high' : r.long_short_ratio < 0.5 ? ' cf-lsr-low' : '') + '">' + r.long_short_ratio.toFixed(2) + ' (' + (r.long_pct != null ? r.long_pct.toFixed(0) : '?') + '/' + (r.short_pct != null ? r.short_pct.toFixed(0) : '?') + ')</span>'
      : 'N/A';
    var liq = r.liq_24h_usdt != null && r.liq_24h_usdt > 0
      ? '<span class="cf-liq">' + cfDepth(r.liq_24h_usdt) + '</span>'
      : 'N/A';
    var oiT = r.oi_24h_change_pct != null
      ? '<span class="cf-oit cf-oit-' + (r.oi_24h_change_pct > 0 ? 'up' : r.oi_24h_change_pct < 0 ? 'down' : '') + '">' + (r.oi_24h_change_pct > 0 ? '+' : '') + r.oi_24h_change_pct.toFixed(1) + '%</span>'
      : 'N/A';
    var cls = r.tags.squeeze ? ' class="cf-squeeze-row cf-row-click"' : ' class="cf-row-click"';
    rows += '<tr' + cls + ' onclick="cfToggleRow(this)">'
      + '<td class="cf-expand-arrow">▸</td>'
      + '<td><b>' + e(r.base_asset) + '</b></td>'
      + '<td>' + fP(r.price) + '</td>'
      + '<td>' + fL(r.volume_24h_usdt) + '</td>'
      + '<td>' + fC(r.change_24h_pct) + '</td>'
      + '<td>' + fL(r.oi_value) + '</td>'
      + '<td><b>' + (r.volume_oi_ratio || 0).toFixed(1) + 'x</b></td>'
      + '<td>' + fund + '</td>'
      + '<td>' + depth + '</td>'
      + '<td>' + lsr + '</td>'
      + '<td>' + liq + '</td>'
      + '<td>' + oiT + '</td>'
      + '<td><span class="cf-stage cf-stage-' + e(r.oi_stage) + '">' + e(r.oi_stage_label) + '</span></td>'
      + '<td>' + cfTagHtml(r) + '</td>'
      + '</tr>'
      + '<tr class="cf-detail-row" style="display:none"><td colspan="14">'
      + cfChecklistHtml(r.base_asset)
      + cfDetailMetaHtml(r)
      + '</td></tr>';
  });

  var H = '';
  H += '<div class="app-header"><h1>🪙 小币筛选器</h1><p>基于 @derrrrrrrq 方法论 — 小币OI区间 · 换手 · 盘口深度 — 数据源: 币安合约 (每5分钟中继)</p></div>';
  H += '<div class="status-bar ok"><span>扫描 ' + coinfilterData.length + ' 个合约 · 筛选命中 ' + list.length + '</span><span>数据源: ' + src + ' · 更新 ' + us + '</span></div>';
  H += '<div class="layout"><div class="sidebar">';
  H += '<div class="cf-preset-row">';
  for (var i = 0; i < CF_PRESETS.length; i++) {
    H += '<button class="cf-preset' + (cPreset === CF_PRESETS[i][0] ? ' active' : '') + '" id="c-preset-' + CF_PRESETS[i][0] + '" onclick="cfSetPreset(\'' + CF_PRESETS[i][0] + '\')">' + CF_PRESETS[i][1] + '</button>';
  }
  H += '</div>';
  H += '<div class="cf-filter-card"><div class="label">额/OI比 (x)</div><div class="input-row"><input type="number" id="c-ratio-min-i" class="filter-input" value="0" min="0" step="1" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-ratio-max-i" class="filter-input" value="999" min="0" step="1" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-ratio-min" min="0" max="200" value="0" oninput="cfApply()"><input type="range" id="c-ratio-max" min="0" max="200" value="200" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">OI区间 (百万$)</div><div class="input-row"><input type="number" id="c-oi-min-i" class="filter-input" value="0" min="0" step="1" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-oi-max-i" class="filter-input" value="9999" min="0" step="1" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-oi-min" min="0" max="500" value="0" oninput="cfApply()"><input type="range" id="c-oi-max" min="0" max="500" value="500" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">24h涨幅 (%)</div><div class="input-row"><input type="number" id="c-chg-min-i" class="filter-input" value="-100" min="-100" max="500" step="1" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-chg-max-i" class="filter-input" value="100" min="-100" max="500" step="1" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-chg-min" min="-100" max="100" value="-100" oninput="cfApply()"><input type="range" id="c-chg-max" min="-100" max="100" value="100" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">24h成交额 (百万$)</div><div class="input-row"><input type="number" id="c-vol-min-i" class="filter-input" value="0" min="0" step="1" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-vol-max-i" class="filter-input" value="99999" min="0" step="1" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-vol-min" min="0" max="2000" value="0" oninput="cfApply()"><input type="range" id="c-vol-max" min="0" max="2000" value="2000" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">资费率 (%)</div><div class="input-row"><input type="number" id="c-fund-min-i" class="filter-input" value="-1" min="-5" max="5" step="0.01" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-fund-max-i" class="filter-input" value="1" min="-5" max="5" step="0.01" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-fund-min" min="-1" max="1" step="0.01" value="-1" oninput="cfApply()"><input type="range" id="c-fund-max" min="-1" max="1" step="0.01" value="1" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">盘口深度 (K$)</div><div class="input-row"><input type="number" id="c-depth-min-i" class="filter-input" value="0" min="0" step="1" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-depth-max-i" class="filter-input" value="999999" min="0" step="1" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-depth-min" min="0" max="2000" value="0" oninput="cfApply()"><input type="range" id="c-depth-max" min="0" max="2000" value="2000" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">搜索币种</div><input type="text" id="c-query" class="filter-input" style="width:100%" placeholder="如: BANK" oninput="cfApply()"></div>';
  H += '<div class="cf-filter-card"><div class="label">排序方式</div><div class="cf-sort-row"><select id="c-sort" onchange="cfApply()">'
    + '<option value="ratio">额/OI比 ↓</option><option value="oi">OI值 ↓</option><option value="chg">24h涨幅 ↓</option><option value="depth">盘口深度 ↑</option><option value="lsr">多空比 ↓</option><option value="liq">清算 ↓</option><option value="oit">OI趋势 ↓</option></select></div></div>';
  H += '<button class="refresh-btn" onclick="cfReload()">刷新数据</button>';
  H += '<div style="font-size:.6rem;color:var(--text-muted);text-align:center;margin-top:8px">本地中继推送 · 每5分钟</div>';
  H += '</div><div class="main">';
  H += '<div class="kpi-row">';
  H += '<div class="kpi-card"><div class="kpi-label">扫描合约</div><div class="kpi-value">' + coinfilterData.length + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">筛选命中</div><div class="kpi-value">' + list.length + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">上涨占比</div><div class="kpi-value">' + upPct + '%</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">💰资费异</div><div class="kpi-value">' + fundN + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">🆕新上</div><div class="kpi-value">' + newN + '</div></div>';
  H += '</div>';
  H += cfStatsBar(list);
  H += '<div class="table-wrap"><div class="table-title">🪙 小币筛选结果 <span style="font-weight:400;font-size:.7rem;color:var(--text-muted);margin-left:8px">点击表头排序 · 点击行展开检查清单 · 24h额合计 $' + fL(totalVol) + '</span></div><div class="table-scroll"><table><thead><tr>';
  H += '<th></th><th onclick="cfSortBy(\'sym\')">交易对</th><th>价格</th><th onclick="cfSortBy(\'vol\')">24h额</th><th onclick="cfSortBy(\'chg\')">24h涨幅</th><th onclick="cfSortBy(\'oi\')">OI值</th><th onclick="cfSortBy(\'ratio\')">额/OI比</th><th>资费率</th><th onclick="cfSortBy(\'depth\')">盘口深度</th><th>多空比</th><th>24h清算</th><th>OI 24h</th><th>阶段</th><th>信号</th>';
  H += '</tr></thead><tbody>' + (rows || '<tr><td colspan="14" class="empty-msg">无匹配结果</td></tr>') + '</tbody></table></div></div>';
  H += '<div class="cf-chart-wrap"><h4>🔥 额/OI比 Top20（换手高但OI没跟上 → 挤压空间）</h4>' + cfChartRatio(list) + '</div>';
  H += '<div class="cf-chart-wrap"><h4>📊 OI区间分布（灰=蓄水 · 蓝=小币候选 · 绿=拉升期 · 橙=中期 · 红=大后期）</h4>' + cfChartOi(list) + '</div>';
  H += '<div class="cf-chart-wrap"><h4>🫧 OI值 vs 24h额（对数坐标 · 点大小=额/OI比 · 颜色=OI阶段）</h4>' + cfChartScatter(list) + '</div>';
  H += '<div class="cf-chart-wrap"><h4>💰 资费率分布（% · 负=做多付费 / 正=做空付费）</h4>' + cfChartFunding(list) + '</div>';
  H += '<div class="cf-note">信号规则: 🔥挤压 额/OI≥10x 且 OI&gt;5M · 💎小币 OI 2M-8M · 🚀拉升早期 OI 8M-30M 且 24h&gt;0% · ⚠️薄盘口 深度&lt;200K · ⛔大后期 OI&gt;80M 且 额/OI&lt;3x 且 跌幅&gt;10% · 📉杀多 24h&lt;-5% · 📌他提过 25个币 · 🆕新上 ≤30天 · 💰资费异常 资费率&gt;+0.05% 或 &lt;-0.05%<br>OI阶段: ⏳蓄水&lt;2M · 💎小币候选 2M-8M · 🚀拉升期 8M-30M · ⚡中期 30M-80M · ⛔大后期&gt;80M · 资费/盘口/上线日期 由本地中继每5分钟抓取（未就绪时自动降级妖币数据）</div>';
  H += '<div class="footer">⚠️ 仅供研究参考，不构成投资建议<br>最后更新 ' + us + '</div>';
  H += '</div></div>';
  root.innerHTML = H;
  cfSyncInputs();
}

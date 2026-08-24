// ═══════════════════════════════════════════════════════════
// 🧭 前导筛选器 视图（基于 2026-08-06 数据验证结论）
// 验证结论：
//   ① 额/OI>5 事件日追高 = 负 EV（三个月 4592 事件，fwd5 -1.7%）→ 只当回避信号
//   ② 蓄水信号（OI 30天分位低 + 60天回撤大）edge 是条件性的：
//      环境向上 +0.8%/胜率56%，环境向下 -5.3%/胜率31% → 环境开关是第一优先
// 数据: GET /api/forward（relay 推送：吸筹结构因子/BTC环境）
// ═══════════════════════════════════════════════════════════

if (typeof curTab === 'undefined') var curTab = 'chip';
var forwardData = [], forwardUpdated = null, forwardEnv = null, forwardLoaded = false;
var fwdAutoTimer = null;

// ── 自动刷新：每 5 分钟重新拉取数据并重渲染（VPS cron 每 15 分钟更新数据）──
function fwdStartAutoRefresh() {
  if (fwdAutoTimer) return;
  fwdAutoTimer = setInterval(function () {
    if (curTab !== 'forward') return; // 不在前导 tab 时跳过
    fetch(BASE + '/api/forward').then(function (r) { return r.json(); }).then(function (d) {
      var coins = d.data || [];
      if (!coins.length) return;
      forwardData = coins;
      forwardUpdated = d.updated || forwardUpdated;
      if (curTab === 'forward') renderForward();
    }).catch(function () { /* 静默失败，下次再试 */ });
  }, 300000); // 5 分钟
}
var fSort = 'forward_score', fAsc = false, fTag = '', fMinScore = 0;

// ── 挂接 Tab 切换（与 _coinfilter.js 同模式，链式调用）──
var __fwdSwitchTab = (typeof switchTab === 'function') ? switchTab : null;
switchTab = function (t) {
  if (t === 'forward') {
    curTab = t;
    var tb = document.getElementById('tabbar');
    if (tb) {
      tb.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      var btn = tb.querySelector('.tab-forward');
      if (btn) btn.classList.add('active');
    }
    if (!forwardLoaded) forwardLoad(); else renderForward();
    return;
  }
  if (__fwdSwitchTab) { __fwdSwitchTab(t); return; }
  if (t === 'demon' && typeof renderDemon === 'function') { renderDemon(); return; }
  if (typeof rD === 'function') rD();
};

var __fwdRD = (typeof rD === 'function') ? rD : null;
rD = function () {
  if (curTab === 'forward') { renderForward(); return; }
  if (__fwdRD) __fwdRD();
};

// ── 数据加载 ──
function forwardLoad() {
  var root = document.getElementById('root');
  root.innerHTML = '<div class="empty-msg">🧭 正在加载前导筛选数据（吸筹结构/BTC环境）...</div>';
  fetch(BASE + '/api/forward').then(function (r) { return r.json(); }).then(function (d) {
    var coins = d.data || [];
    if (d.error && !coins.length) throw new Error(d.error);
    if (!coins.length) throw new Error('forward 暂无数据（relay 可能未配置 /api/relay-forward）');
    forwardData = coins;
    forwardUpdated = d.updated || null;
    forwardEnv = d.env || null;
    forwardLoaded = true;
    fwdStartAutoRefresh();
    renderForward();
  }).catch(function (err) {
    root.innerHTML = '<div class="empty-msg">🧭 前导数据加载失败: ' + e(err.message) + '<br><br><button class="btn" onclick="forwardLoad()">重试</button></div>';
  });
}

function fwdReload() { forwardLoaded = false; forwardLoad(); }


// ── 筛选/排序 ──
function fwdFiltered() {
  var rows = forwardData.slice();
  if (fTag === 'acc') rows = rows.filter(function (r) { return r.signal === 'acc_candidate'; });
  else if (fTag === 'avoid') rows = rows.filter(function (r) { return r.volume_oi_ratio >= 5; });
  else if (fTag === 'watch') rows = rows.filter(function (r) { return r.signal === 'watch'; });
  rows = rows.filter(function (r) { return (r.forward_score || 0) >= fMinScore; });
  rows.sort(function (a, b) {
    var va = a[fSort] || 0, vb = b[fSort] || 0;
    return fAsc ? va - vb : vb - va;
  });
  return rows;
}

function fwdSetPreset(tag) {
  fTag = tag;
  fMinScore = (tag === 'acc') ? 3 : 0;
  renderForward();
}

function fwdSortBy(k) {
  if (fSort === k) fAsc = !fAsc; else { fSort = k; fAsc = false; }
  renderForward();
}

function fwdTagHtml(r) {
  var tags = [];
  if (r.signal === 'acc_candidate') tags.push('<span class="tag tag-acc">🧭蓄水候选</span>');
  else if (r.signal === 'avoid_event') tags.push('<span class="tag tag-danger">⛔事件回避</span>');
  else if (r.signal === 'watch') tags.push('<span class="tag tag-watch">👁观察</span>');
  else tags.push('<span class="tag tag-noise">·</span>');
  if (r.drawdown_60d != null && r.drawdown_60d >= 0.40) tags.push('<span class="tag tag-low">深底</span>');
  if (r.range_20d != null && r.range_20d < 0.30) tags.push('<span class="tag tag-low">横盘</span>');
  if (r.vol_shrink_20d != null && r.vol_shrink_20d < 0.20) tags.push('<span class="tag tag-low">缩量</span>');
  if (r.breakout_consolidation) tags.push('<span class="tag tag-new">大阳线后盘整</span>');
  if (r.spring_test) tags.push('<span class="tag tag-new">Spring测试</span>');
  if (r.funding_rate_pct != null && r.funding_rate_pct > 0.05) tags.push('<span class="tag tag-fund">💰正费率</span>');
  if (r.funding_rate_pct != null && r.funding_rate_pct < -0.05 && r.change_24h_pct > 0) tags.push('<span class="tag tag-danger">⛔负费率拉盘</span>');
  if (r.ret_10d != null && r.ret_10d >= -0.05 && r.ret_10d <= 0.15) tags.push('<span class="tag tag-watch">缓涨</span>');
  if (r.vol_compress_5d != null && r.vol_compress_5d < 0.05) tags.push('<span class="tag tag-low">缩波</span>');
  if (r.days_since_listing != null && r.days_since_listing <= 180) tags.push('<span class="tag tag-new">新上</span>');
  return tags.join(' ');
}

// ── 观察池标记（localStorage）──
function fwdWatchKey() { return 'fwd_watchlist'; }
function fwdGetWatch() {
  try { return JSON.parse(localStorage.getItem(fwdWatchKey()) || '{}'); } catch (e) { return {}; }
}
function fwdToggleWatch(sym) {
  var w = fwdGetWatch();
  if (w[sym]) delete w[sym]; else w[sym] = Date.now();
  try { localStorage.setItem(fwdWatchKey(), JSON.stringify(w)); } catch (e) {}
  renderForward();
}

// ── BTC 方向提示（仅展示，不参与评分/筛选）──
function fwdEnvHint() {
  var env = forwardEnv;
  if (!env || env.up == null) {
    return '<div class="fwd-hint fwd-hint-na">BTC 方向：未知（仅供参考，不影响筛选）</div>';
  }
  if (env.up === true) {
    return '<div class="fwd-hint fwd-hint-bull">BTC 方向：向上（BTC ' + fP(env.close) + ' &gt; SMA20 ' + fP(env.sma20) + '）— 仅供参考，不参与筛选</div>';
  }
  return '<div class="fwd-hint fwd-hint-bear">BTC 方向：向下（BTC ' + fP(env.close) + ' &lt; SMA20 ' + fP(env.sma20) + '）— 仅供参考，不参与筛选</div>';
}

// ── 主渲染 ──
function renderForward() {
  var root = document.getElementById('root');
  var rows = fwdFiltered();
  var watch = fwdGetWatch();
  var accN = forwardData.filter(function (r) { return r.signal === 'acc_candidate'; }).length;
  var avoidN = forwardData.filter(function (r) { return r.volume_oi_ratio >= 5; }).length;
  var watchN = Object.keys(watch).length;

  var H = '<div class="fwd-wrap">';
  H += fwdEnvHint();
  H += '<div class="fwd-bar">';
  H += '<button class="btn' + (fTag === '' ? ' btn-active' : '') + '" onclick="fwdSetPreset(\'\')">🎯 全部 (' + rows.length + ')</button>';
  H += '<button class="btn' + (fTag === 'acc' ? ' btn-active' : '') + '" onclick="fwdSetPreset(\'acc\')">🧭 蓄水候选 (' + accN + ')</button>';
  H += '<button class="btn' + (fTag === 'avoid' ? ' btn-active' : '') + '" onclick="fwdSetPreset(\'avoid\')">⛔ 回避名单 (' + avoidN + ')</button>';
  H += '<button class="btn' + (fTag === 'watch' ? ' btn-active' : '') + '" onclick="fwdSetPreset(\'watch\')">👁 观察池 (' + watchN + ')</button>';
  H += '<span class="dim" style="margin-left:auto">更新: ' + (forwardUpdated ? new Date(forwardUpdated).toLocaleString() : '—') + '</span>';
  H += '</div>';
  H += '<div class="fwd-stats">🧭候选 ' + accN + ' · ⛔回避 ' + avoidN + ' · 👁已标记 ' + watchN + '</div>';

  if (rows.length === 0) {
    H += '<div class="empty-msg">没有符合条件的币。</div>';
  } else {
    H += '<div class="table-wrap"><table class="tbl fwd-tbl"><thead><tr>';
    H += '<th></th><th class="sortable" onclick="fwdSortBy(\'symbol\')">币种</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\'price\')">价格</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\'change_24h_pct\')">24h%</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\'oi_value\')">OI($M)</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\'volume_oi_ratio\')">额/OI</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\'drawdown_60d\')">回撤60d</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\'range_20d\')">横盘20d</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\'vol_shrink_20d\')">缩量</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\'near_low_20d\')">距低点</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\'funding_rate_pct\')">资费%</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\'days_since_listing\')">上线</th>';
    H += '<th class="sortable" onclick="fwdSortBy(\'forward_score\')">评分</th>';
    H += '<th>信号</th><th></th>';
    H += '</tr></thead><tbody>';
    rows.slice(0, 200).forEach(function (r) {
      var isAvoid = r.volume_oi_ratio >= 5;
      var rowCls = isAvoid ? 'fwd-avoid' : (r.signal === 'acc_candidate' ? 'fwd-acc' : '');
      var marked = !!watch[r.symbol];
      H += '<tr class="' + rowCls + '">';
      H += '<td>' + (marked ? '✅' : '') + '</td>';
      H += '<td class="mono">' + r.symbol.replace('USDT', '') + '</td>';
      H += '<td class="mono">' + fP(r.price) + '</td>';
      H += '<td class="' + (r.change_24h_pct >= 0 ? 'up' : 'down') + '">' + fC(r.change_24h_pct) + '</td>';
      H += '<td class="mono">' + (r.oi_value != null ? (r.oi_value / 1e6).toFixed(1) : '—') + '</td>';
      H += '<td class="mono">' + (r.volume_oi_ratio != null ? r.volume_oi_ratio.toFixed(1) + 'x' : '—') + '</td>';
      H += '<td class="mono">' + (r.drawdown_60d != null ? (r.drawdown_60d * 100).toFixed(0) + '%' : '—') + '</td>';
      H += '<td class="mono">' + (r.range_20d != null ? (r.range_20d * 100).toFixed(0) + '%' : '—') + '</td>';
      H += '<td class="mono">' + (r.vol_shrink_20d != null ? (r.vol_shrink_20d * 100).toFixed(0) + '%' : '—') + '</td>';
      H += '<td class="mono">' + (r.near_low_20d != null ? r.near_low_20d.toFixed(2) : '—') + '</td>';
      H += '<td class="mono">' + (r.funding_rate_pct != null ? r.funding_rate_pct.toFixed(3) + '%' : '—') + '</td>';
      H += '<td class="mono">' + (r.days_since_listing != null ? r.days_since_listing + 'd' : '—') + '</td>';
      H += '<td class="mono score">' + (r.forward_score != null ? r.forward_score : '—') + '</td>';
      H += '<td>' + fwdTagHtml(r) + '</td>';
      H += '<td><button class="btn btn-sm" onclick="fwdToggleWatch(\'' + r.symbol + '\')">' + (marked ? '取消' : '标记') + '</button></td>';
      H += '</tr>';
    });
    H += '</tbody></table></div>';
  }
  H += '<div class="fwd-foot dim">规则来源：@derrrrrrrq 推文校准（2026-08-07）— ①额/OI≥5 是回避信号不是入场信号（验证 fwd5 -1.7%）；②吸筹结构=深底+横盘+缩量+无新低（dn10 3.3% vs 全市场 9.7%）；③推文维度：起势前有大阳线后盘整、吸筹期价格缓涨、有Spring测试更可信、OI 2M-8M 是甜蜜区；④dotyyds1234维度：正资金费高=套利者聚集有肉吃，负费率+拉盘=控盘做空排除；⑤玩新不玩旧：派发后期的旧币自动排除；⑥纯小币筛选器（无 BTC 环境开关）。仅供研究参考，不构成投资建议。</div>';
  H += '</div>';
  root.innerHTML = H;
}

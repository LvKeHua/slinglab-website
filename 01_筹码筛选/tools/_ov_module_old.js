// ═══════════════════════════════════════════════════════════
var ovData = null, ovLoaded = false, ovTopN = 20, ovMinVol = 0, ovDay = null, ovDays = 14, ovLeadData = [];

function ovLoad() {
  var root = document.getElementById('root');
  root.innerHTML = '<div class="empty-msg">🎯 正在加载涨幅榜重合数据...</div>';
  fetch(BASE + '/api/overlap-stats?days=' + ovDays + '&topn=' + ovTopN + '&minvol=' + ovMinVol)
    .then(function (r) { return r.json(); }).then(function (d) {
      if (d.error && !d.history) throw new Error(d.error);
      ovData = d.history || {};
      ovLeadData = d.lead_events || [];
      // 给 lead 事件补 forward_score（从候选池记录取）
      var scoreMap = {};
      Object.keys(ovData).forEach(function (ds) {
        (ovData[ds].candidates || []).forEach(function (c) {
          if (c.forward_score != null) scoreMap[c.base_asset] = c.forward_score;
        });
      });
      ovLeadData.forEach(function (e) { e.forward_score = scoreMap[e.base_asset] != null ? scoreMap[e.base_asset] : null; });
      ovLoaded = true;
      renderOverlap();
    }).catch(function (err) {
      root.innerHTML = '<div class="empty-msg">🎯 重合数据加载失败: ' + e(err.message) + '<br><br><button class="btn" onclick="ovReload()">重试</button></div>';
    });
}
function ovReload() { ovLoaded = false; ovLoad(); }
function ovSetTopN(n) { ovTopN = n; ovLoad(); }
function ovSetMinVol() { ovMinVol = parseFloat(document.getElementById('ov-minvol').value) || 0; ovLoad(); }

// ── 主渲染 ──
function renderOverlap() {
  var root = document.getElementById('root');
  if (!ovData) { root.innerHTML = '<div class="empty-msg">暂无数据</div>'; return; }
  var days = Object.keys(ovData).sort().reverse();
  if (!days.length) { root.innerHTML = '<div class="empty-msg">暂无历史记录（归档自 2026-08-11 起每日自动累积）</div>'; return; }
  var lead = ovLeadData || [];

  var H = '<div class="fwd-wrap">';
  H += '<div class="fwd-bar">';
  H += '<span class="dim">🎯 筛选器候选池 vs Binance 永续涨幅榜重合度（北京日界）</span>';
  H += '<span class="dim" style="margin-left:auto">Top N:</span>';
  H += '<button class="btn' + (ovTopN === 10 ? ' btn-active' : '') + '" onclick="ovSetTopN(10)">10</button>';
  H += '<button class="btn' + (ovTopN === 20 ? ' btn-active' : '') + '" onclick="ovSetTopN(20)">20</button>';
  H += '<button class="btn' + (ovTopN === 50 ? ' btn-active' : '') + '" onclick="ovSetTopN(50)">50</button>';
  H += '<span class="dim">成交额≥</span>';
  H += '<input id="ov-minvol" type="number" placeholder="M USDT" style="width:70px;padding:4px 6px;background:var(--surface-alt);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px" value="' + (ovMinVol ? ovMinVol / 1e6 : '') + '" onkeydown="if(event.key===\'Enter\')ovSetMinVol()">';
  H += '<button class="btn btn-sm" onclick="ovSetMinVol()">✓</button>';
  H += '<button class="btn" onclick="ovReload()">刷新</button>';
  H += '</div>';

  // ── 汇总卡 ──
  var sumOverlap = 0, sumTotal = 0, hitMap = {}, dayCount = 0;
  days.forEach(function (d) {
    var h = ovData[d];
    if (h && h.pct != null) { sumOverlap += h.overlap_count; sumTotal += h.total_gainers; dayCount++; }
    (h.overlap || []).forEach(function (o) { hitMap[o.base_asset] = (hitMap[o.base_asset] || 0) + 1; });
  });
  var avgPct = dayCount > 0 ? Math.round(sumOverlap / sumTotal * 1000) / 10 : 0;
  var topHits = Object.keys(hitMap).sort(function (a, b) { return hitMap[b] - hitMap[a]; }).slice(0, 8);
  // 预兆统计
  var leadCount = lead.length;
  var leadUnion = {};
  lead.forEach(function (e) { if (!leadUnion[e.base_asset]) leadUnion[e.base_asset] = 0; leadUnion[e.base_asset]++; });
  var leadTop = Object.keys(leadUnion).sort(function (a, b) { return leadUnion[b] - leadUnion[a]; }).slice(0, 8);
  var avgLead = lead.length ? Math.round(lead.reduce(function (s, e) { return s + e.lead_days; }, 0) / lead.length) : 0;
  H += '<div class="fwd-stats">📊 同日重合率 ' + avgPct + '%（' + sumOverlap + '/' + sumTotal + '） · 🏆 预兆命中 ' + leadCount + ' 次 / ' + Object.keys(leadUnion).length + ' 币 · 平均领先 ' + avgLead + ' 天 · 高频：' + (leadTop.map(function (s) { return s + '×' + leadUnion[s]; }).join(' ') || '—') + '</div>';

  // ── 🏆 预兆命中（重点：之前筛出的币后来上涨幅榜）──
  H += '<div class="fwd-bar" style="margin-top:10px"><span class="dim" style="font-weight:700;color:var(--accent-green,#4ade80)">🏆 预兆命中：候选池先入选 → 之后某天上涨幅榜（提前埋伏成功的案例）</span></div>';
  H += '<div class="table-wrap"><table class="tbl fwd-tbl"><thead><tr>';
  H += '<th>币种</th><th>首次入选</th><th>上榜日</th><th>领先天数</th><th>上榜日涨幅</th><th>榜单排名</th><th>评分</th><th>操作</th></tr></thead><tbody>';
  if (!lead.length) {
    H += '<tr><td colspan="8" class="dim">暂无预兆命中（候选池先入选、之后才上涨幅榜的币）</td></tr>';
  } else {
    lead.slice().sort(function (a, b) { return b.change_24h_pct - a.change_24h_pct; }).forEach(function (e) {
      H += '<tr><td class="mono" style="color:#4ade80;font-weight:700">' + e.base_asset + '</td><td class="mono">' + e.first_seen + '</td><td class="mono">' + e.gain_day + '</td><td class="mono">' + e.lead_days + '天</td><td class="up">+' + e.change_24h_pct + '%</td><td class="mono">#' + e.rank + '</td><td class="mono">' + (e.forward_score != null ? e.forward_score : '—') + '</td><td><button class="btn btn-sm" onclick="ovJump(\'' + e.base_asset + '\')">查看</button></td></tr>';
    });
  }
  H += '</tbody></table></div>';

  // ── 每日重合明细 ──
  H += '<div class="fwd-bar" style="margin-top:10px"><span class="dim" style="font-weight:700">📅 每日同日重合明细</span></div>';
  H += '<div class="table-wrap"><table class="tbl fwd-tbl"><thead><tr>';
  H += '<th>日期</th><th>候选数</th><th>涨幅榜Top' + ovTopN + '</th><th>重合</th><th>重合率</th><th>命中币（涨幅榜排名）</th><th>数据源</th></tr></thead><tbody>';
  days.forEach(function (d) {
    var h = ovData[d];
    if (!h) return;
    var hit = (h.overlap || []).slice().sort(function (a, b) { return a.rank - b.rank; });
    var hitHtml = hit.length ? hit.map(function (o) {
      var leadMark = (o.first_seen && o.first_seen < d) ? ' 🏆' : '';
      return '<span style="display:inline-block;padding:1px 6px;margin:1px 2px;background:var(--surface-alt,#152238);border:1px solid #2a5;border-radius:4px;font-size:11px;color:#4ade80" onclick="ovJump(\'' + o.base_asset + '\')" title="点击查看">' + o.base_asset + ' #' + o.rank + ' <span class="dim">+' + o.change_24h_pct + '%</span>' + leadMark + '</span>';
    }).join('') : '<span class="dim">无</span>';
    var srcTag = '';
    if (h.candidate_seed) srcTag += '<span class="dim">候选seed</span>';
    if (h.gainer_seed) srcTag += (srcTag ? '·' : '') + '<span class="dim">榜seed</span>';
    if (!srcTag) srcTag = '<span style="color:#4ade80">实时</span>';
    var pctCls = h.pct == null ? 'dim' : (h.pct >= 20 ? 'up' : (h.pct > 0 ? '' : 'down'));
    H += '<tr><td class="mono">' + d + '</td><td class="mono">' + h.total_candidates + '</td><td class="mono">' + h.total_gainers + '</td><td class="mono">' + h.overlap_count + '</td><td class="' + pctCls + '">' + (h.pct != null ? h.pct + '%' : '—') + '</td><td>' + hitHtml + '</td><td>' + srcTag + '</td></tr>';
  });
  H += '</tbody></table></div>';
  H += '<div class="dim" style="margin-top:8px">🏆 = 该币更早就在候选池（预兆命中）。点击币可跳到前导筛选查看当前状态。涨幅榜 = Binance 永续 24h 涨幅（每日归档快照）。</div>';
  H += '</div>';
  root.innerHTML = H;
}
function ovJump(sym) {
  try { switchTab('forward'); } catch (e) {}
  setTimeout(function () {
    if (typeof fwdHistJump === 'function') fwdHistJump(sym);
  }, 300);
}

var __ovSwitchTab = (typeof switchTab === 'function') ? switchTab : null;
switchTab = function (t) {
  if (t === 'overlap') {
    curTab = t;
    var tb = document.getElementById('tabbar');
    if (tb) {
      tb.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      var btn = tb.querySelector('.tab-overlap');
      if (btn) btn.classList.add('active');
    }
    if (!ovLoaded) ovLoad(); else renderOverlap();
    return;
  }
  if (__ovSwitchTab) { __ovSwitchTab(t); return; }
  if (t === 'demon' && typeof renderDemon === 'function') { renderDemon(); return; }
  if (typeof rD === 'function') rD();
};
var __ovRD = (typeof rD === 'function') ? rD : null;
rD = function () {
  if (curTab === 'overlap') { renderOverlap(); return; }
  if (__ovRD) __ovRD();
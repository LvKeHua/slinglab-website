// ═══════════════════════════════════════════════════════════
// 📅 日榜回看 Pro（第 6 tab）— 玻璃拟态 + 骨架屏 + 缓存
// 数据: GET /api/day-gainers?date=YYYY-MM-DD&topn=N
// 体验: 已加载日期本地缓存 → 切换秒开；骨架屏加载；行动画；涨幅条
// ═══════════════════════════════════════════════════════════
var dgData = null, dgLoaded = false, dgDays = 14, dgTopN = 30, dgActive = null;
var dgCache = {};   // date -> {detail, ts}
var dgFetching = null;

// ── 骨架屏（加载中）──
function dgSkeleton() {
  var sk = function (w) {
    return '<div style="height:14px;border-radius:6px;background:linear-gradient(90deg,rgba(255,255,255,0.04),rgba(255,255,255,0.10),rgba(255,255,255,0.04));background-size:200% 100%;animation:dgShimmer 1.4s infinite;width:' + w + '"></div>';
  };
  var H = '<div class="fwd-wrap">';
  H += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">';
  for (var i = 0; i < 8; i++) H += '<div style="width:92px;height:28px;border-radius:8px;background:rgba(255,255,255,0.05)"></div>';
  H += '</div>';
  H += '<div style="display:flex;gap:8px;margin:10px 0">' + sk('38%') + sk('25%') + sk('20%') + '</div>';
  H += '<div style="border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:14px;background:rgba(255,255,255,0.02)">';
  for (var r = 0; r < 8; r++) H += '<div style="display:flex;gap:10px;margin:10px 0">' + sk('6%') + sk('12%') + sk('10%') + sk('14%') + sk('18%') + sk('12%') + sk('8%') + sk('8%') + '</div>';
  H += '</div></div>';
  return '<style>@keyframes dgShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}</style>' + H;
}

function dgLoad() {
  var root = document.getElementById('root');
  root.innerHTML = dgSkeleton();
  fetch(BASE + '/api/overlap-stats?days=' + dgDays + '&topn=20&minvol=0')
    .then(function (r) { return r.json(); }).then(function (d) {
      if (d.error && !d.history) throw new Error(d.error);
      var hist = d.history || {};
      var dates = Object.keys(hist).filter(function (ds) { return hist[ds].total_gainers > 0; }).sort().reverse();
      dgData = { dates: dates };
      dgLoaded = true;
      if (dates.length) dgOpen(dates[0], true);
      else renderDayList();
    }).catch(function () {
      root.innerHTML = '<div class="empty-msg">📅 日榜数据加载失败<br><br><button class="btn" onclick="dgLoad()">重试</button></div>';
    });
}
function dgOpen(date, instant) {
  if (dgActive === date && dgCache[date] && !instant) { renderDayList(); return; }
  dgActive = date;
  renderDayList();
  if (dgCache[date]) { dgData.detail = dgCache[date]; renderDayList(); return; }
  if (dgFetching) return;
  dgFetching = date;
  var seq = date;
  fetch(BASE + '/api/day-gainers?date=' + date + '&topn=' + dgTopN)
    .then(function (r) { return r.json(); }).then(function (d) {
      if (seq !== dgFetching) return;
      if (d.error) throw new Error(d.error);
      dgCache[date] = d;
      if (dgActive === date) { dgData.detail = d; renderDayList(); }
    }).catch(function () {
      if (seq !== dgFetching) return;
      if (dgActive === date) { dgData.detail = null; renderDayList(); }
    }).finally(function () { dgFetching = null; });
}
function dgSetTopN(n) {
  dgTopN = n; dgCache = {};
  if (dgActive) dgOpen(dgActive);
}

// ── 工具：bar-in-cell 涨幅条 ──
function dgBar(chg, maxChg) {
  var w = Math.max(4, Math.round(Math.abs(chg) / maxChg * 100));
  var color = chg >= 0 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#ef4444,#f87171)';
  return '<div style="display:flex;align-items:center;gap:6px"><div style="width:70px;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;flex-shrink:0"><div style="height:100%;width:' + w + '%;background:' + color + ';border-radius:3px"></div></div><span style="font-weight:700;font-size:12.5px;color:' + (chg >= 0 ? '#34d399' : '#f87171') + '">' + (chg >= 0 ? '+' : '') + chg + '%</span></div>';
}

function renderDayList() {
  var root = document.getElementById('root');
  if (!dgData) { root.innerHTML = '<div class="empty-msg">暂无数据</div>'; return; }
  var dates = dgData.dates || [];
  var detail = dgData.detail || null;
  var loading = dgActive && !detail;

  var H = '<div class="fwd-wrap">';

  // ── 顶部工具条 ──
  H += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">';
  H += '<span style="font-size:15px;font-weight:800;background:linear-gradient(90deg,#60a5fa,#34d399);-webkit-background-clip:text;background-clip:text;color:transparent">📅 日榜回看</span>';
  H += '<span class="dim" style="font-size:12px">点日期看当天涨幅榜，🏆 = 你的筛选器筛出过</span>';
  H += '<span style="margin-left:auto;display:flex;gap:4px;align-items:center">';
  H += '<span class="dim" style="font-size:12px">榜长</span>';
  [20, 30, 50].forEach(function (n) {
    H += '<button class="btn btn-sm' + (dgTopN === n ? ' btn-active' : '') + '" style="padding:4px 10px;border-radius:8px" onclick="dgSetTopN(' + n + ')">' + n + '</button>';
  });
  H += '<button class="btn btn-sm" style="padding:4px 10px;border-radius:8px" onclick="dgLoad()">⟳ 刷新</button>';
  H += '</span></div>';

  // ── 日期胶囊行 ──
  H += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">';
  dates.forEach(function (ds) {
    var active = ds === dgActive;
    H += '<button class="btn btn-sm' + (active ? ' btn-active' : '') + '" style="padding:6px 14px;border-radius:999px;font-size:12.5px;letter-spacing:.3px;' + (active ? 'background:linear-gradient(135deg,rgba(59,130,246,0.25),rgba(16,185,129,0.15));border-color:rgba(96,165,250,0.6);color:#93c5fd;box-shadow:0 0 14px rgba(59,130,246,0.15)' : '') + '" onclick="dgOpen(\'' + ds + '\')">' + ds + '</button>';
  });
  H += '</div>';

  // ── 详情 ──
  if (dgActive && detail && detail.date === dgActive) {
    var gs = detail.gainers || [];
    var hitN = gs.filter(function (g) { return g.ever_candidate; }).length;
    var maxChg = 1;
    gs.forEach(function (g) { if (Math.abs(g.change_24h_pct) > maxChg) maxChg = Math.abs(g.change_24h_pct); });

    // 统计条
    H += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">';
    H += '<div style="flex:1;min-width:130px;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:10px 14px;background:linear-gradient(160deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015));backdrop-filter:blur(6px)">';
    H += '<div class="dim" style="font-size:10.5px;letter-spacing:.5px">榜单日期</div>';
    H += '<div style="font-size:16px;font-weight:800;color:#e2e8f0">' + detail.date + '</div></div>';
    H += '<div style="flex:1;min-width:130px;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:10px 14px;background:linear-gradient(160deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))">';
    H += '<div class="dim" style="font-size:10.5px;letter-spacing:.5px">榜单长度</div>';
    H += '<div style="font-size:16px;font-weight:800;color:#e2e8f0">Top ' + gs.length + '</div></div>';
    H += '<div style="flex:1;min-width:130px;border:1px solid rgba(96,165,250,0.25);border-radius:14px;padding:10px 14px;background:linear-gradient(160deg,rgba(59,130,246,0.12),rgba(16,185,129,0.06))">';
    H += '<div class="dim" style="font-size:10.5px;letter-spacing:.5px">🏆 筛选器命中</div>';
    H += '<div style="font-size:16px;font-weight:800;color:#4ade80">' + hitN + ' / ' + gs.length + '</div></div>';
    H += '</div>';

    // 表
    H += '<div style="border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:hidden;background:rgba(255,255,255,0.015)">';
    H += '<table class="tbl fwd-tbl" style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="background:rgba(255,255,255,0.03)">';
    ['#', '币种', '24H 涨幅', '成交额', '筛选器状态', '首次入选', '领先', '评分', ''].forEach(function (h) {
      H += '<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;letter-spacing:.5px;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06)">' + h + '</th>';
    });
    H += '</tr></thead><tbody>';
    gs.forEach(function (g, idx) {
      var isHit = g.ever_candidate;
      var lateHit = isHit && g.first_seen && g.first_seen > dgActive;
      var rowBg = g.is_candidate ? 'rgba(16,185,129,0.08)' : (isHit ? 'rgba(251,191,36,0.06)' : 'transparent');
      var statHtml;
      if (g.is_candidate) statHtml = '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:700;background:rgba(16,185,129,0.15);color:#34d399">🏆 当天候选</span>';
      else if (lateHit) statHtml = '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:600;background:rgba(239,68,68,0.12);color:#f87171">上榜后才入选</span>';
      else if (isHit) statHtml = '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:700;background:rgba(251,191,36,0.12);color:#fbbf24">🏆 之前筛出过</span>';
      else statHtml = '<span class="dim">—</span>';
      var vol = g.volume_24h_usdt != null ? (g.volume_24h_usdt >= 1e9 ? (g.volume_24h_usdt / 1e9).toFixed(1) + 'B' : (g.volume_24h_usdt / 1e6).toFixed(1) + 'M') : '—';
      var leadHtml = g.ever_candidate ? (lateHit ? '<span class="dim">—</span>' : (g.lead_days > 0 ? '<span style="font-weight:700;color:#fbbf24">+' + g.lead_days + 'd</span>' : '<span style="color:#94a3b8">同天</span>')) : '<span class="dim">—</span>';
      H += '<tr style="background:' + rowBg + ';animation:dgFadeIn .35s ease ' + Math.min(idx * 25, 400) + 'ms both;border-bottom:1px solid rgba(255,255,255,0.04);transition:background .15s" onmouseover="this.style.background=\'rgba(255,255,255,0.05)\'" onmouseout="this.style.background=\'' + rowBg + '\'">';
      H += '<td style="padding:9px 12px;color:#64748b;font-size:11px">' + g.rank + '</td>';
      H += '<td style="padding:9px 12px;font-weight:800;color:#e2e8f0">' + g.base_asset + '</td>';
      H += '<td style="padding:9px 12px">' + dgBar(g.change_24h_pct, maxChg) + '</td>';
      H += '<td style="padding:9px 12px;color:#94a3b8;font-size:11.5px">' + vol + '</td>';
      H += '<td style="padding:9px 12px">' + statHtml + '</td>';
      H += '<td style="padding:9px 12px;color:#94a3b8;font-size:11.5px">' + (g.first_seen ? g.first_seen : '—') + '</td>';
      H += '<td style="padding:9px 12px">' + leadHtml + '</td>';
      H += '<td style="padding:9px 12px;color:#94a3b8;font-size:11.5px">' + (g.forward_score != null ? g.forward_score : '—') + '</td>';
      H += '<td style="padding:9px 12px"><button class="btn btn-sm" style="padding:3px 10px;border-radius:8px;font-size:11px" onclick="evJump(\'' + g.base_asset + '\')">查看</button></td>';
      H += '</tr>';
    });
    H += '</tbody></table></div>';
    H += '<div class="dim" style="font-size:11px;margin-top:10px">🏆 当天候选 = 该币当天在筛选器候选池；之前筛出过 = 往前30天内入选过（领先天数=首次入选→上榜间隔）；上榜后才入选 = 涨完才被筛出（追涨，非埋伏）。点击币可跳前导筛选。</div>';
  } else if (dgActive && loading) {
    H += dgSkeleton();
  } else {
    H += '<div class="empty-msg">点击上方日期查看当天涨幅榜</div>';
  }
  H += '<style>@keyframes dgFadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}</style>';
  H += '</div>';
  root.innerHTML = H;
}
function evJump(sym) {
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
    if (!dgLoaded) dgLoad(); else renderDayList();
    return;
  }
  if (__ovSwitchTab) { __ovSwitchTab(t); return; }
  if (t === 'demon' && typeof renderDemon === 'function') { renderDemon(); return; }
  if (typeof rD === 'function') rD();
};
var __ovRD = (typeof rD === 'function') ? rD : null;
rD = function () {
  if (curTab === 'overlap') { renderDayList(); return; }
  if (__ovRD) __ovRD();
};
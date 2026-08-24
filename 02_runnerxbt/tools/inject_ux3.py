"""
inject_ux3.py — 三层信息架构:
1. 停用 K 线 markers (圆点/箭头)
2. 密度区重写为 DOM 三色堆叠分段柱 (红/黄/蓝), 高度=总量, 与主图缩放同步
3. 密度柱 hover → 摘要卡 (当日全部消息, 信号优先) + 侧边栏滚动高亮 + 主图跳转
4. 侧边栏: 同日消息按 红>黄>蓝 排序, 数量徽章 [红x 黄y 蓝z], 黄/蓝折叠
"""
import re
import sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(__file__).parent
html_path = ROOT / 'deploy_v2' / 'index.html'
html = html_path.read_text('utf-8')
html = html.replace('\r\n', '\n')
orig_len = len(html)

# ═══ 1. CSS ═══
ux3_css = """
/* ── 密度图: DOM 三色堆叠柱 ── */
.density-area{position:relative;height:64px;border-top:1px solid var(--border);background:var(--bg-base);overflow:hidden;cursor:pointer}
.density-bars{position:absolute;top:6px;bottom:6px;left:0;right:0;display:flex;align-items:flex-end;gap:1px;padding:0 2px}
.dbar{flex:1;min-width:1px;height:100%;display:flex;flex-direction:column;justify-content:flex-end;position:relative;border-radius:1px;transition:opacity .1s}
.dbar .seg{width:100%}
.dbar .seg.seg-red{background:#e04040}
.dbar .seg.seg-yellow{background:#ffb000}
.dbar .seg.seg-blue{background:#4d9fff;opacity:.65}
.dbar:hover{outline:1px solid #fff3;outline-offset:-1px;z-index:2}
.dbar.dim{opacity:.28}
/* 日期刻度 */
.density-labels{position:absolute;left:0;right:0;bottom:0;height:14px;display:flex;justify-content:space-between;padding:0 6px;font-size:8px;color:var(--text-muted);font-family:'JetBrains Mono',monospace;pointer-events:none}
/* ── 摘要卡 ── */
.summary-card{
  position:absolute;z-index:200;background:var(--bg-elevated);border:1px solid var(--border);
  border-radius:6px;box-shadow:0 8px 30px rgba(0,0,0,.6);font-family:'JetBrains Mono',monospace;
  min-width:280px;max-width:420px;max-height:320px;overflow-y:auto;display:none;font-size:11px;
}
.summary-card .sc-head{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border);font-weight:600;color:var(--accent-amber);position:sticky;top:0;background:var(--bg-elevated)}
.summary-card .sc-head .sc-count{color:var(--text-muted);font-size:9px;font-weight:400}
.summary-card .sc-item{display:flex;gap:8px;padding:6px 12px;cursor:pointer;border-left:2px solid transparent;transition:background .08s}
.summary-card .sc-item:hover{background:var(--bg-hover)}
.summary-card .sc-item.red{border-left-color:var(--level-red)}
.summary-card .sc-item.yellow{border-left-color:var(--level-yellow)}
.summary-card .sc-item.blue{border-left-color:var(--level-blue)}
.summary-card .sc-item .sc-dot{width:7px;height:7px;border-radius:50%;margin-top:4px;flex-shrink:0}
.summary-card .sc-item.red .sc-dot{background:var(--level-red)}
.summary-card .sc-item.yellow .sc-dot{background:var(--level-yellow)}
.summary-card .sc-item.blue .sc-dot{background:var(--level-blue)}
.summary-card .sc-item .sc-body{flex:1;min-width:0}
.summary-card .sc-item .sc-text{color:var(--text-primary);line-height:1.45;word-break:break-word;white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.summary-card .sc-item .sc-time{color:var(--text-muted);font-size:8px;margin-top:2px}
.summary-card .sc-empty{padding:12px;color:var(--text-muted);text-align:center}
/* ── 侧边栏折叠 ── */
.msg-tl-date .lv-badge{font-size:8px;color:var(--text-muted);margin-left:6px;font-weight:400}
.msg-tl-date .lv-badge b{font-weight:500}
.collapse-body{display:none}
.collapse-toggle{display:none;font-size:9px;color:var(--text-muted);padding:2px 12px 4px 28px;cursor:pointer;user-select:none}
.collapse-toggle:hover{color:var(--accent-amber)}
.msg-tl-date.has-collapse{cursor:pointer}
"""

# Insert before the UX CSS block from inject_ux2 (or before </style>)
style_idx = html.rfind('</style>')
html = html[:style_idx] + ux3_css + html[style_idx:]
print("✓ 三色堆叠密度 CSS 注入")

# ═══ 2. HTML: 替换 density-container 内部 ═══
old_density_html = """          <div class="density-container" style="position:relative;">
            <div id="densityChart"></div>
            <div class="density-tooltip" id="densityTooltip"></div>
          </div>"""
new_density_html = """          <div class="density-area" id="densityArea">
            <div class="density-bars" id="densityBars"></div>
            <div class="density-labels" id="densityLabels"></div>
            <div class="summary-card" id="summaryCard"></div>
          </div>"""
assert old_density_html in html, "density container HTML not found"
html = html.replace(old_density_html, new_density_html)
print("✓ 密度容器 HTML 替换")

# ═══ 3. 停用 updateMarkers (K线圆点/箭头) ═══
old_markers_sig = "function updateMarkers(candleData) {\n  S.candleSeries.setMarkers([]);"
new_markers_sig = "function updateMarkers(candleData) {\n  // v3: K线标记已停用 — 信息密度由底部堆叠柱 + 摘要卡承载\n  S.candleSeries.setMarkers([]);\n  S._candleData = candleData; // save for click hit-test\n  return;"
assert old_markers_sig in html, "updateMarkers signature not found"
html = html.replace(old_markers_sig, new_markers_sig, 1)
print("✓ K线 markers 停用 (return 提前退出)")

# ═══ 4. 重写 updateDensity → DOM 三色堆叠柱 ═══
old_update_density = """function updateDensity() {
  if (!S.densitySeries || !S.densityChart) return;
  const data = getOHLCV();
  if (!data || !data.length) return;

  // Count posts per candle by level weight: red=3, yellow=2, blue=1
  const weightMap = {};
  for (const m of S.messages) {
    if (!m.date || !(m.text||'').trim()) continue;
    if (!S.filterLevels[m.level || 'blue']) continue;
    if (S.timeframe === '4h') {
      // For 4H, count by day (density at day level)
      weightMap[m.date] = (weightMap[m.date] || 0) + ({red:3, yellow:2, blue:1}[m.level||'blue']);
    } else {
      weightMap[m.date] = (weightMap[m.date] || 0) + ({red:3, yellow:2, blue:1}[m.level||'blue']);
    }
  }

  const densityData = [];
  let maxW = 0;
  data.forEach(d => {
    const dateKey = tsToDateKey(d.t / 1000);
    const w = weightMap[dateKey] || 0;
    densityData.push({ time: d.t / 1000, value: w });
    if (w > maxW) maxW = w;
  });

  const tLow = Math.max(2, maxW * 0.15);
  const tHigh = Math.max(6, maxW * 0.5);
  densityData.forEach(d => {
    if (d.value > tHigh) d.color = '#e0404088';
    else if (d.value > tLow) d.color = '#ffb00088';
    else d.color = '#4d9fff44';
  });

  S.densitySeries.setData(densityData);
}"""

new_update_density = """function updateDensity() {
  const area = document.getElementById('densityBars');
  if (!area) return;
  const data = getOHLCV();
  if (!data || !data.length) return;

  // Count posts per candle by level (actual counts, not weighted)
  const cntMap = {};
  for (const m of S.messages) {
    if (!m.date || !(m.text||'').trim()) continue;
    if (!S.filterLevels[m.level || 'blue']) continue;
    const key = m.date;
    const g = cntMap[key] || (cntMap[key] = {r:0, y:0, b:0});
    if (m.level === 'red') g.r++;
    else if (m.level === 'yellow') g.y++;
    else g.b++;
  }

  // Visible range from main chart → render only visible bars
  let vFrom = null, vTo = null;
  try {
    const vr = S.chart.timeScale().getVisibleRange();
    if (vr) { vFrom = vr.from; vTo = vr.to; }
  } catch(e) {}

  // Build bars for candles in visible range
  let maxTotal = 0;
  const bars = [];
  data.forEach(d => {
    const t = d.t / 1000;
    if (vFrom !== null && (t < vFrom - 86400 || t > vTo + 86400)) return;
    const dateKey = tsToDateKey(t);
    const c = cntMap[dateKey] || {r:0, y:0, b:0};
    const total = c.r + c.y + c.b;
    bars.push({ t, dateKey, r: c.r, y: c.y, b: c.b, total });
    if (total > maxTotal) maxTotal = total;
  });

  if (!bars.length) { area.innerHTML = ''; return; }
  if (maxTotal < 1) maxTotal = 1;

  let h = '';
  for (const bar of bars) {
    const pct = (bar.total / maxTotal) * 100;
    const rh = bar.total ? Math.round(bar.r / bar.total * pct) : 0;
    const yh = bar.total ? Math.round(bar.y / bar.total * pct) : 0;
    const bh = Math.max(1, pct - rh - yh);
    h += `<div class="dbar" data-date="${bar.dateKey}" data-t="${bar.t}" title="${bar.dateKey} · ${bar.total}">` +
         (bar.r ? `<div class="seg seg-red" style="height:${rh}%"></div>` : '') +
         (bar.y ? `<div class="seg seg-yellow" style="height:${yh}%"></div>` : '') +
         (bar.b ? `<div class="seg seg-blue" style="height:${bh}%"></div>` : '') +
         `</div>`;
  }
  area.innerHTML = h;

  // Date labels (first, middle, last visible)
  const labelsEl = document.getElementById('densityLabels');
  if (labelsEl && bars.length) {
    const f = bars[0].dateKey, mid = bars[Math.floor(bars.length/2)].dateKey, l = bars[bars.length-1].dateKey;
    labelsEl.innerHTML = `<span>${f}</span><span>${mid}</span><span>${l}</span>`;
  }

  // Store current bars for hover lookup
  S._densityBars = bars;
  S._maxDensity = maxTotal;
}"""

assert old_update_density in html, "updateDensity not found"
html = html.replace(old_update_density, new_update_density)
print("✓ updateDensity 重写为三色堆叠柱")

# ═══ 5. initDensityChart → DOM 初始化 (替换 lightweight-charts 密度图) ═══
# 找到 initDensityChart 函数的起始与结束, 替换为空实现 + 事件绑定
old_init_density_start = "function initDensityChart() {"
init_start = html.index(old_init_density_start)
# find matching end - the function ends at the ResizeObserver block closing
# Locate "const dro = new ResizeObserver" and the following "});\n}" or similar
dro_idx = html.index("const dro = new ResizeObserver", init_start)
# The function's closing braces: find after dro block
tail_idx = html.index("\n}\n", dro_idx)
old_init_density_full = html[init_start:tail_idx + 3]

new_init_density = """function initDensityChart() {
  // v3: DOM 分段柱密度图 (替代 lightweight-charts histogram)
  const area = document.getElementById('densityArea');
  if (!area) return;

  // 同步主图缩放 → 重绘密度柱
  if (S.chart) {
    S.chart.timeScale().subscribeVisibleTimeRangeChange(() => {
      if (S._densityChartReady) updateDensity();
    });
  }
  S._densityChartReady = true;
  updateDensity();

  // Hover 摘要卡 + 主图跳转
  area.addEventListener('mouseover', function(e) {
    const bar = e.target.closest('.dbar');
    if (!bar || !S.messages) return;
    const dateKey = bar.dataset.date;
    // Dim other bars
    document.querySelectorAll('.dbar').forEach(b => b.classList.toggle('dim', b !== bar));
    // Main chart jump to this date
    const t = parseFloat(bar.dataset.t);
    try {
      S.chart.timeScale().setVisibleRange({ from: t - 86400 * 8, to: t + 86400 * 4 });
    } catch(err) {}
    // Sidebar scroll to date
    scrollSidebarToDate(dateKey);
    // Summary card
    showSummaryCard(dateKey, bar);
  });

  area.addEventListener('mouseleave', function() {
    document.querySelectorAll('.dbar').forEach(b => b.classList.remove('dim'));
    const sc = document.getElementById('summaryCard');
    if (sc) sc.style.display = 'none';
  });

  // Click bar → select first red post (or open summary)
  area.addEventListener('click', function(e) {
    const bar = e.target.closest('.dbar');
    if (!bar) return;
    const dateKey = bar.dataset.date;
    const posts = S.messages.filter(m =>
      m.date === dateKey && (m.text||'').trim() && S.filterLevels[m.level || 'blue']
    ).sort((a,b) => lvlOrder(b) - lvlOrder(a));
    if (posts.length) {
      scrollSidebarToDate(dateKey);
      selectMsg(posts[0].id);
    }
  });
}"""

html = html.replace(old_init_density_full, new_init_density)
print("✓ initDensityChart 替换为 DOM 版")

# ═══ 6. 摘要卡函数 + lvlOrder 工具 ═══
# 插入到 loadAll(); 前
summary_js = """
// ═══ v3: 级别排序工具 + 摘要卡 ═══
function lvlOrder(m) {
  const o = { red: 3, yellow: 2, blue: 1 };
  return o[m.level || 'blue'] || 1;
}
function showSummaryCard(dateKey, anchorBar) {
  const sc = document.getElementById('summaryCard');
  if (!sc) return;
  const posts = S.messages.filter(m =>
    m.date === dateKey && (m.text||'').trim() && S.filterLevels[m.level || 'blue']
  ).sort((a,b) => lvlOrder(b) - lvlOrder(a));
  const area = document.getElementById('densityArea');
  const ar = area.getBoundingClientRect();
  const barR = anchorBar.getBoundingClientRect();

  if (!posts.length) {
    sc.innerHTML = '<div class="sc-empty">∅ 无消息</div>';
  } else {
    const r = posts.filter(p=>p.level==='red').length;
    const y = posts.filter(p=>p.level==='yellow').length;
    const b = posts.filter(p=>p.level==='blue').length;
    let items = '';
    posts.slice(0, 12).forEach(p => {
      const lvl = p.level || 'blue';
      const text = escHtml((p.text||'').replace(/\\n/g, ' ').slice(0, 160));
      const hasImg = p.media_path ? ' 📷' : '';
      items += `<div class="sc-item ${lvl}" onclick="event.stopPropagation();selectMsg(${p.id})">
        <span class="sc-dot"></span>
        <div class="sc-body">
          <div class="sc-text">${text}${hasImg}</div>
          <div class="sc-time">${p.timestamp || ''}</div>
        </div>
      </div>`;
    });
    if (posts.length > 12) items += `<div class="sc-item" style="color:var(--text-muted);font-size:9px">… 另有 ${posts.length-12} 条 · 点击侧边栏查看全部</div>`;
    sc.innerHTML = `<div class="sc-head">${dateKey} <span class="sc-count">${posts.length} 条 · <span style="color:var(--level-red)">${r}信号</span> <span style="color:var(--level-yellow)">${y}分析</span> <span style="color:var(--level-blue)">${b}闲聊</span></span></div>${items}`;
  }

  // 定位: 优先显示在柱上方
  sc.style.display = 'block';
  const scW = sc.offsetWidth || 320;
  const scH = sc.offsetHeight || 200;
  const densityRect = area.getBoundingClientRect();
  let left = barR.left - scW / 2 + barR.width / 2 - densityRect.left;
  left = Math.max(4, Math.min(left, densityRect.width - scW - 4));
  const above = barR.top - densityRect.top - scH - 4;
  const top = above >= 4 ? above : Math.min(densityRect.height - scH - 2, barR.bottom - densityRect.top + 4);
  sc.style.left = left + 'px';
  sc.style.top = top + 'px';
}
"""

load_idx = html.rfind('loadAll();')
html = html[:load_idx] + summary_js + '\n' + html[load_idx:]
print("✓ 摘要卡 + 级别排序工具注入")

# ═══ 7. renderTimeline: 级别排序 + 徽章 + 折叠 ═══
old_render_fn_start = "function renderTimeline(msgs) {"
rt_start = html.index(old_render_fn_start)
rt_end = html.index("function escHtml", rt_start)
old_render_fn = html[rt_start:rt_end]

new_render_fn = """function renderTimeline(msgs) {
  const container = document.getElementById('msgList');
  const search = S.searchTerm.toLowerCase().trim();
  let html = '', visCount = 0;

  // Group by date, then sort levels red > yellow > blue within each day
  const byDate = {};
  for (const m of msgs) {
    const text = (m.text || '').trim();
    if (!text) continue;
    if (search && !text.toLowerCase().includes(search)) continue;
    if (!S.filterLevels[m.level || 'blue']) continue;
    const date = m.date || '';
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(m);
    visCount++;
  }

  const dates = Object.keys(byDate).sort().reverse(); // newest first
  for (const date of dates) {
    const day = byDate[date].sort((a,b) => lvlOrder(b) - lvlOrder(a));
    const r = day.filter(x => x.level === 'red').length;
    const y = day.filter(x => x.level === 'yellow').length;
    const b = day.filter(x => x.level === 'blue').length;
    const total = day.length;
    // Badge with level counts
    html += `<div class="msg-tl-date" id="tl-date-${date}">${date}<span class="msg-tl-count">${total}</span>` +
      `<span class="lv-badge">${r?`<b style="color:var(--level-red)">${r}</b>`:''}${y?` <b style="color:var(--level-yellow)">${y}</b>`:''}${b?` <b style="color:var(--level-blue)">${b}</b>`:''}</span></div>`;

    // 默认展开: 红色消息 (信号) + 折叠其余
    const redMsgs = day.filter(x => x.level === 'red');
    const otherMsgs = day.filter(x => x.level !== 'red');
    for (const m of redMsgs) {
      html += msgItemHtml(m);
    }
    if (otherMsgs.length) {
      html += `<div class="collapse-toggle" onclick="var b=this.nextElementSibling;b.style.display=b.style.display==='block'?'none':'block'">▸ ${otherMsgs.length} 条 ${y?'分析':''}${y&&b?' · ':''}${b?'闲聊':''}…</div>`;
      html += `<div class="collapse-body" style="display:none">`;
      for (const m of otherMsgs) html += msgItemHtml(m);
      html += `</div>`;
    }
  }
  container.innerHTML = visCount ? html : '<div class="empty-state">∅ No messages found</div>';
  document.getElementById('tlCount').textContent = visCount;
}

function msgItemHtml(m) {
  const text = (m.text || '').trim();
  const preview = text.replace(/\\n/g, ' ');
  const hasMedia = (m.images && m.images.length) || (m.links && m.links.length) || !!m.media_path;
  const level = m.level || 'blue';
  const thumb = m.media_path
    ? `<img class="msg-thumb" src="${m.media_path}" loading="lazy" onclick="event.stopPropagation();selectMsg(${m.id})" title="查看图片">`
    : '';
  const lvlTxt = level === 'red' ? '🔴' : level === 'yellow' ? '🟡' : '';
  return `<div class="msg-item" data-id="${m.id}" onclick="selectMsg(${m.id})">
    <div class="ts">${lvlTxt} ${m.timestamp || ''}</div>
    <div class="preview">${escHtml(preview)}${hasMedia ? '<span class="media-indicator">📎</span>' : ''}</div>
    ${thumb}
  </div>`;
}
"""

html = html.replace(old_render_fn, new_render_fn)
print("✓ renderTimeline 重写 (排序+徽章+折叠)")

html_path.write_text(html, 'utf-8')
print(f"✓ Saved: {len(html)/1024:.0f}KB (was {orig_len/1024:.0f}KB)")

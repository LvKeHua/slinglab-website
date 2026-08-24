"""
UX 优化注入 v2:
1. 时间线: 有 media_path 的消息直接显示缩略图 (hover 放大)
2. K线: hover 显示完整 OHLC + 涨跌幅 + 帖子计数
3. K线: 十字光标日期/价格标签增强
4. 键盘: ← → 平移 K 线, ↑ ↓ 缩放, F 全览
5. 顶部: 当前 hover 的 OHLC 信息条 (替代贴图上的小tooltip)
"""
import sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(__file__).parent
html_path = ROOT / 'deploy_v2' / 'index.html'
html = html_path.read_text('utf-8')
html = html.replace('\r\n', '\n')
orig_len = len(html)

# ═══ 0. 修复主图平移锁定: 移除 fixLeftEdge/fixRightEdge (否则键盘/拖拽无法平移缩放) ═══
old_fixedge = """      rightOffset: 8,
      barSpacing: 3,
      fixLeftEdge: true,
      fixRightEdge: true,"""
new_fixedge = """      rightOffset: 8,
      barSpacing: 3,"""
if old_fixedge in html:
    html = html.replace(old_fixedge, new_fixedge, 1)
    print("✓ 主图 fixLeftEdge/fixRightEdge 已移除 (平移缩放可用)")
else:
    print("  (fixLeftEdge 已不存在，跳过)")

# ═══ 1. 时间线缩略图 ═══
old_render = """    const preview = text.replace(/\\n/g, ' ');
    const hasMedia = (m.images && m.images.length) || (m.links && m.links.length) || !!m.media_path;
    const level = m.level || 'blue';
    html += `<div class="msg-item" data-id="${m.id}" onclick="selectMsg(${m.id})">
      <div class="ts"><span class="pdot ${level}" style="display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:4px;vertical-align:middle;"></span>${m.timestamp || ''}</div>
      <div class="preview">${escHtml(preview)}${hasMedia ? '<span class="media-indicator">📎</span>' : ''}</div>
    </div>`;"""

new_render = """    const preview = text.replace(/\\n/g, ' ');
    const hasMedia = (m.images && m.images.length) || (m.links && m.links.length) || !!m.media_path;
    const level = m.level || 'blue';
    const thumb = m.media_path
      ? `<img class="msg-thumb" src="${m.media_path}" loading="lazy" onclick="event.stopPropagation();selectMsg(${m.id})" title="查看图片">`
      : '';
    html += `<div class="msg-item" data-id="${m.id}" onclick="selectMsg(${m.id})">
      <div class="ts"><span class="pdot ${level}" style="display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:4px;vertical-align:middle;"></span>${m.timestamp || ''}</div>
      <div class="preview">${escHtml(preview)}${hasMedia ? '<span class="media-indicator">📎</span>' : ''}</div>
      ${thumb}
    </div>`;"""

assert old_render in html, "renderTimeline block not found"
html = html.replace(old_render, new_render)
print("✓ 时间线缩略图注入")

# ═══ 2. CSS: 缩略图 + OHLC 信息条 ═══
ux_css = """
/* ── 时间线缩略图 ── */
.msg-item .msg-thumb{
  display:block;width:100%;max-height:140px;object-fit:cover;
  border-radius:4px;margin-top:5px;border:1px solid var(--border);
  background:#0a0f0c;cursor:zoom-in;transition:transform .2s;
}
.msg-item .msg-thumb:hover{transform:scale(1.02);border-color:var(--accent-amber)}
/* ── K线顶部 OHLC 信息条 ── */
.ohlc-bar{
  height:22px;min-height:22px;display:flex;align-items:center;gap:14px;
  padding:0 12px;background:var(--bg-surface);border-bottom:1px solid var(--border);
  font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);
  white-space:nowrap;overflow:hidden;user-select:none;
}
.ohlc-bar .ob-date{color:var(--accent-amber);font-weight:500}
.ohlc-bar .ob-item{display:inline-flex;align-items:center;gap:3px}
.ohlc-bar .ob-item b{font-weight:500}
.ohlc-bar .ob-o b{color:var(--accent-blue)}
.ohlc-bar .ob-h b{color:var(--accent-green)}
.ohlc-bar .ob-l b{color:var(--accent-red)}
.ohlc-bar .ob-c b{color:var(--text-primary)}
.ohlc-bar .ob-chg.pos b{color:var(--accent-green)}
.ohlc-bar .ob-chg.neg b{color:var(--accent-red)}
.ohlc-bar .ob-vol b{color:var(--accent-amber)}
.ohlc-bar .ob-hint{margin-left:auto;color:#334155;font-size:9px}
"""
html = html.replace('</style>', ux_css + '</style>', 1)
print("✓ UX CSS 注入")

# ═══ 3. 注入 OHLC 信息条 HTML (在 chart-header 之后, chart 容器之前) ═══
old_chart_area = """      <!-- Chart + Detail Panel -->
      <div class="chart-area">"""
new_chart_area = """      <!-- OHLC Info Bar (hover 更新) -->
      <div class="ohlc-bar" id="ohlcBar">
        <span class="ob-date" id="obDate">HOVER K-LINE</span>
        <span class="ob-item ob-o">O <b id="obO">—</b></span>
        <span class="ob-item ob-h">H <b id="obH">—</b></span>
        <span class="ob-item ob-l">L <b id="obL">—</b></span>
        <span class="ob-item ob-c">C <b id="obC">—</b></span>
        <span class="ob-item ob-chg" id="obChgW">Δ <b id="obChg">—</b></span>
        <span class="ob-item ob-vol">VOL <b id="obVol">—</b></span>
        <span class="ob-hint">←→ 平移 · ↑↓ 缩放 · F 全览</span>
      </div>

      <!-- Chart + Detail Panel -->
      <div class="chart-area">"""
assert old_chart_area in html, "chart-area not found"
html = html.replace(old_chart_area, new_chart_area)
print("✓ OHLC 信息条 HTML 注入")

# ═══ 4. 替换 crosshair tooltip 逻辑: 更新 OHLC 信息条 ═══
old_cross = """  // ── CROSSHAIR MOVE → show hover tooltip ──
  S.chart.subscribeCrosshairMove(param => {
    const tooltip = document.getElementById('chartTooltip');
    if (!tooltip) return;

    if (!param.time || !param.point) {
      if (S._lastTooltipTime !== null) {
        tooltip.style.display = 'none';
        S._lastTooltipTime = null;
      }
      return;
    }

    const time = typeof param.time === 'number' ? param.time : (param.time.timestamp || param.time);
    if (time === S._lastTooltipTime) return;
    S._lastTooltipTime = time;

    const dateKey = tsToDateKey(time);
    const posts = S.messages.filter(m => {
      if (m.date !== dateKey || !(m.text||'').trim()) return false;
      return S.filterLevels[m.level || 'blue'];
    });

    if (!posts.length) {
      tooltip.style.display = 'none';
      return;
    }

    const r = posts.filter(p => p.level === 'red').length;
    const y = posts.filter(p => p.level === 'yellow').length;
    const b = posts.filter(p => p.level === 'blue').length;
    tooltip.innerHTML = `${dateKey} · <span style="color:var(--level-red)">${r}</span> <span style="color:var(--level-yellow)">${y}</span> <span style="color:var(--level-blue)">${b}</span>`;
    tooltip.style.left = param.point.x + 'px';
    tooltip.style.top = Math.max(0, param.point.y - 26) + 'px';
    tooltip.style.display = 'block';
  });"""

new_cross = """  // ── CROSSHAIR MOVE → update OHLC bar + post tooltip ──
  function fmtVol(v){ if(v==null) return '—'; if(v>=1e9) return (v/1e9).toFixed(2)+'B'; if(v>=1e6) return (v/1e6).toFixed(2)+'M'; if(v>=1e3) return (v/1e3).toFixed(1)+'K'; return v.toFixed(0); }
  S.chart.subscribeCrosshairMove(param => {
    const tooltip = document.getElementById('chartTooltip');
    const obDate = document.getElementById('obDate');
    if (!tooltip || !obDate) return;

    if (!param.time || !param.point || !param.seriesData) {
      if (S._lastTooltipTime !== null) {
        tooltip.style.display = 'none';
        S._lastTooltipTime = null;
        document.getElementById('obDate').textContent = 'HOVER K-LINE';
        ['obO','obH','obL','obC','obChg','obVol'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = '—'; });
        const chgW = document.getElementById('obChgW'); if (chgW) chgW.className = 'ob-item ob-chg';
      }
      return;
    }

    const time = typeof param.time === 'number' ? param.time : (param.time.timestamp || param.time);
    if (time === S._lastTooltipTime) return;
    S._lastTooltipTime = time;

    // ── Update OHLC bar from candle data ──
    const candle = param.seriesData.get ? param.seriesData.get(S.candleSeries) : null;
    if (candle) {
      const dateKey = tsToDateKey(time);
      obDate.textContent = S.timeframe === '4h'
        ? dateKey + ' ' + new Date(time*1000).toISOString().slice(11,16) + ' UTC'
        : dateKey;
      document.getElementById('obO').textContent = candle.open.toLocaleString(undefined,{maximumFractionDigits:2});
      document.getElementById('obH').textContent = candle.high.toLocaleString(undefined,{maximumFractionDigits:2});
      document.getElementById('obL').textContent = candle.low.toLocaleString(undefined,{maximumFractionDigits:2});
      document.getElementById('obC').textContent = candle.close.toLocaleString(undefined,{maximumFractionDigits:2});
      const chg = candle.close > 0 ? ((candle.close - candle.open) / candle.open) * 100 : 0;
      const chgEl = document.getElementById('obChg');
      const chgW = document.getElementById('obChgW');
      chgEl.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
      chgW.className = 'ob-item ob-chg ' + (chg >= 0 ? 'pos' : 'neg');
      const volEl = document.getElementById('obVol');
      if (volEl) volEl.textContent = fmtVol(candle.volume || candle._volume || 0);
    }

    // ── Post count tooltip ──
    const dateKey2 = tsToDateKey(time);
    const posts = S.messages.filter(m => {
      if (m.date !== dateKey2 || !(m.text||'').trim()) return false;
      return S.filterLevels[m.level || 'blue'];
    });

    if (!posts.length) {
      tooltip.style.display = 'none';
      return;
    }

    const r = posts.filter(p => p.level === 'red').length;
    const y = posts.filter(p => p.level === 'yellow').length;
    const b = posts.filter(p => p.level === 'blue').length;
    tooltip.innerHTML = `${dateKey2} · <span style="color:var(--level-red)">${r}</span> <span style="color:var(--level-yellow)">${y}</span> <span style="color:var(--level-blue)">${b}</span>`;
    tooltip.style.left = param.point.x + 'px';
    tooltip.style.top = Math.max(0, param.point.y - 26) + 'px';
    tooltip.style.display = 'block';
  });"""

assert old_cross in html, "crosshair handler not found"
html = html.replace(old_cross, new_cross)
print("✓ OHLC 信息条逻辑注入")

# ═══ 5. 键盘导航 ═══
keyboard_js = """
// ═══ KEYBOARD NAVIGATION ═══
document.addEventListener('keydown', e => {
  if (!S.chart || !S.candleSeries) return;
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const k = e.key.toLowerCase();
  const range = S.chart.timeScale().getVisibleRange();
  if (!range) return;
  const span = range.to - range.from;
  const barSpacing = S.chart.timeScale().options().barSpacing || 4;
  if (k === 'arrowleft') {
    e.preventDefault();
    const shift = span * 0.15;
    S.chart.timeScale().setVisibleRange({ from: range.from - shift, to: range.to - shift });
  } else if (k === 'arrowright') {
    e.preventDefault();
    const shift = span * 0.15;
    S.chart.timeScale().setVisibleRange({ from: range.from + shift, to: range.to + shift });
  } else if (k === 'arrowup') {
    e.preventDefault();
    S.chart.applyOptions({ timeScale: { barSpacing: Math.min(60, barSpacing * 1.35) } });
  } else if (k === 'arrowdown') {
    e.preventDefault();
    S.chart.applyOptions({ timeScale: { barSpacing: Math.max(1.5, barSpacing / 1.35) } });
  } else if (k === 'f') {
    e.preventDefault();
    S.chart.timeScale().fitContent();
  } else if (k === 'escape') {
    closeChartPopup();
    document.getElementById('detailPanel').classList.remove('open');
  }
});
"""
html = html.replace('loadAll();', keyboard_js + '\nloadAll();')
print("✓ 键盘导航注入")

# ═══ 6. 双击 K线 → 打开详情 (替代单击弹窗) ═══
dblclick_js = """
// ═══ DOUBLE CLICK → jump to detail ═══
S.chart.subscribeClick(param => {
  let time = null;
  if (param.time) {
    time = typeof param.time === 'number' ? param.time : (param.time._original || param.time.timestamp || param.time);
  } else if (param.point) {
    time = S.chart.timeScale().coordinateToTime(param.point.x);
  }
  if (!time) return;
  const dateKey = tsToDateKey(time);
  const posts = S.messages.filter(m =>
    m.date === dateKey && (m.text||'').trim() && S.filterLevels[m.level || 'blue']
  );
  if (!posts.length) return;
  scrollSidebarToDate(dateKey);
  S._chartClickPending = true;
  if (posts.length === 1) {
    selectMsg(posts[0].id);
  } else {
    showChartPopup(posts, param.point.x, param.point.y, dateKey);
  }
});
"""

# 检查现有 click handler 是否已存在 (之前注入过 pending 版本)
if 'S._chartClickPending = true;' in html:
    print("  (现有 click handler 已存在，跳过双击注入)")
else:
    html = html.replace('loadAll();', dblclick_js + '\nloadAll();')
    print("✓ K线点击弹窗注入")

html_path.write_text(html, 'utf-8')
print(f"✓ Saved: {len(html)/1024:.0f}KB (was {orig_len/1024:.0f}KB)")

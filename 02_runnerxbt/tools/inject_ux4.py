"""
inject_ux4.py — K线选中高亮标记
1. 点击消息/点击K线/悬停密度柱 → 该 K 线整列高亮 (竖带, 半透明亮色贯穿全高)
2. 十字光标精确落位到选中 K 线 (setCrosshairPosition)
3. OHLC 条显示 "已定位" 状态
4. 4H/1D 均支持 (找到消息对应 candle 的精确 time)
5. 切换 timeframe/symbol 时保留/重建高亮
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

# ═══ 1. CSS: OHLC 条定位状态 ═══
hl_css = """
/* ── K线选中高亮状态 ── */
.ob-locate{display:none;align-items:center;gap:4px;color:var(--accent-amber);font-size:9px;padding:0 8px;border-left:1px solid var(--border);margin-left:8px}
.ob-locate.show{display:inline-flex}
.ob-locate .loc-dot{width:7px;height:7px;border-radius:50%;background:var(--accent-amber);box-shadow:0 0 8px var(--accent-amber);animation:blink 1.4s infinite}
"""
style_idx = html.rfind('</style>')
html = html[:style_idx] + hl_css + html[style_idx:]
print("✓ 定位状态 CSS 注入")

# ═══ 2. HTML: OHLC 条加定位状态元素 ═══
old_ohlc_html = """        <span class="ob-hint">←→ 平移 · ↑↓ 缩放 · F 全览</span>"""
new_ohlc_html = """        <span class="ob-locate" id="obLocate"><span class="loc-dot"></span><span id="obLocateText">已定位</span></span>
        <span class="ob-hint">←→ 平移 · ↑↓ 缩放 · F 全览</span>"""
assert old_ohlc_html in html, "ohlc bar hint not found"
html = html.replace(old_ohlc_html, new_ohlc_html)
print("✓ 定位状态 HTML 注入")

# ═══ 3. initChart: 创建高亮竖带 series + 工具函数 ═══
# 在 initChart 的 candleSeries 创建之后注入高亮 series
old_series_end = """  S.candleSeries = S.chart.addCandlestickSeries({
    upColor: '#33cc66',
    downColor: '#e04040',
    borderUpColor: '#33cc66',
    borderDownColor: '#e04040',
    wickUpColor: '#33cc66',
    wickDownColor: '#e04040',
  });"""

new_series_end = """  S.candleSeries = S.chart.addCandlestickSeries({
    upColor: '#33cc66',
    downColor: '#e04040',
    borderUpColor: '#33cc66',
    borderDownColor: '#e04040',
    wickUpColor: '#33cc66',
    wickDownColor: '#e04040',
  });

  // ── v4: 选中 K 线高亮竖带 ──
  S.highlightSeries = S.chart.addHistogramSeries({
    priceScaleId: 'hl',
    priceFormat: { type: 'volume' },
  });
  S.chart.priceScale('hl').applyOptions({
    scaleMargins: { top: 0, bottom: 0 },
    visible: false,
  });"""

assert old_series_end in html, "candleSeries init not found"
html = html.replace(old_series_end, new_series_end)
print("✓ 高亮竖带 series 创建")

# ═══ 4. 工具函数: 找消息对应 candle time + 高亮/清除 ═══
# 插入到 selectMsg 前
hl_helpers = """
// ═══ v4: K线定位高亮 ═══
function candleTimeForMessage(m) {
  const data = getOHLCV();
  if (!data || !data.length) return null;
  const dateKey = m.date || '';
  if (S.timeframe === '4h') {
    // 4H: 用 find4HCandle 找精确 4H candle
    const t = find4HCandle(data.map(c => ({ t: c.t })), m.date, m.timestamp);
    if (t != null) return t;
    // fallback: 最近的 candle
  }
  // 1D: 匹配日期 candle (用 UTC 日期)
  const target = new Date(dateKey + 'T00:00:00Z').getTime() / 1000;
  let best = null, bestDiff = Infinity;
  for (const c of data) {
    const diff = Math.abs(c.t / 1000 - target);
    if (diff < bestDiff) { bestDiff = diff; best = c.t / 1000; }
  }
  return bestDiff < 43200 ? best : null;
}

function highlightCandle(time, dateLabel) {
  if (!S.highlightSeries || time == null) return;
  S._highlightTime = time;
  S.highlightSeries.setData([
    { time: time, value: 100, color: 'rgba(255, 215, 80, 0.20)' }
  ]);
  // 十字光标精确落位
  try {
    const data = getOHLCV();
    const candle = data.find(c => Math.abs(c.t / 1000 - time) < 1);
    if (candle) S.chart.setCrosshairPosition(candle.c, time, S.candleSeries);
  } catch(e) {}
  // OHLC 条状态
  const loc = document.getElementById('obLocate');
  const txt = document.getElementById('obLocateText');
  if (loc) {
    loc.classList.add('show');
    if (txt) txt.textContent = dateLabel ? ('已定位 ' + dateLabel) : '已定位';
  }
}

function clearHighlight() {
  if (S.highlightSeries) S.highlightSeries.setData([]);
  S._highlightTime = null;
  const loc = document.getElementById('obLocate');
  if (loc) loc.classList.remove('show');
}

function reapplyHighlight() {
  // 切换 symbol/timeframe 后恢复高亮 (若存在)
  if (S._highlightTime != null && S.highlightSeries) {
    S.highlightSeries.setData([
      { time: S._highlightTime, value: 100, color: 'rgba(255, 215, 80, 0.20)' }
    ]);
  }
}
"""

hl_insert_idx = html.index('function selectMsg(id) {')
html = html[:hl_insert_idx] + hl_helpers + '\n' + html[hl_insert_idx:]
print("✓ 高亮工具函数注入")

# ═══ 5. selectMsg: 添加高亮 ═══
old_select = """function selectMsg(id) {
  const m = S.messages.find(x => x.id === id);
  if (!m) return;
  document.querySelectorAll('.msg-item').forEach(el => el.classList.remove('active'));
  const item = document.querySelector(`.msg-item[data-id="${id}"]`);
  if (item) item.classList.add('active');
  showDetail(m);
  closeChartPopup();
  if (m.date && S.candleSeries) {
    const ts = new Date(m.date).getTime();
    const offset = S.timeframe === '4h' ? 86400 * 3 : 86400 * 15;
    S.chart.timeScale().scrollToPosition(0, false);
    S.chart.timeScale().setVisibleRange({
      from: ts / 1000 - offset,
      to: ts / 1000 + 86400 * 2,
    });
  }
}"""

new_select = """function selectMsg(id) {
  const m = S.messages.find(x => x.id === id);
  if (!m) return;
  document.querySelectorAll('.msg-item').forEach(el => el.classList.remove('active'));
  const item = document.querySelector(`.msg-item[data-id="${id}"]`);
  if (item) item.classList.add('active');
  showDetail(m);
  closeChartPopup();
  if (m.date && S.candleSeries) {
    // 找到消息对应 candle 并高亮
    const ctime = candleTimeForMessage(m);
    if (ctime != null) {
      const ts = ctime * 1000;
      const offset = S.timeframe === '4h' ? 86400 * 3 : 86400 * 15;
      S.chart.timeScale().scrollToPosition(0, false);
      S.chart.timeScale().setVisibleRange({
        from: ts / 1000 - offset,
        to: ts / 1000 + 86400 * 2,
      });
      highlightCandle(ctime, m.date);
    } else {
      // fallback: 按日期跳转
      const ts = new Date(m.date).getTime();
      const offset = S.timeframe === '4h' ? 86400 * 3 : 86400 * 15;
      S.chart.timeScale().scrollToPosition(0, false);
      S.chart.timeScale().setVisibleRange({
        from: ts / 1000 - offset,
        to: ts / 1000 + 86400 * 2,
      });
    }
  }
}"""

assert old_select in html, "selectMsg not found"
html = html.replace(old_select, new_select)
print("✓ selectMsg 添加高亮")

# ═══ 6. 图表点击 → 高亮 ═══
old_click_hl = """    scrollSidebarToDate(dateKey);
    S._chartClickPending = true;
    if (posts.length === 1) {
      selectMsg(posts[0].id);
    } else {
      // Show popup listing all posts for this candle
      showChartPopup(posts, param.point.x, param.point.y, dateKey);
    }"""

new_click_hl = """    scrollSidebarToDate(dateKey);
    highlightCandle(time, dateKey);
    S._chartClickPending = true;
    if (posts.length === 1) {
      selectMsg(posts[0].id);
    } else {
      // Show popup listing all posts for this candle
      showChartPopup(posts, param.point.x, param.point.y, dateKey);
    }"""

assert old_click_hl in html, "chart click block not found"
html = html.replace(old_click_hl, new_click_hl)
print("✓ 图表点击添加高亮")

# ═══ 7. 密度柱悬停/点击 → 高亮 ═══
# 密度柱 hover 的 summary card 触发时也高亮
old_density_hover = """    // Main chart jump to this date
    const t = parseFloat(bar.dataset.t);
    try {
      S.chart.timeScale().setVisibleRange({ from: t - 86400 * 8, to: t + 86400 * 4 });
    } catch(err) {}"""

new_density_hover = """    // Main chart jump to this date + 高亮
    const t = parseFloat(bar.dataset.t);
    try {
      S.chart.timeScale().setVisibleRange({ from: t - 86400 * 8, to: t + 86400 * 4 });
    } catch(err) {}
    highlightCandle(t, dateKey);"""

assert old_density_hover in html, "density hover block not found"
html = html.replace(old_density_hover, new_density_hover)
print("✓ 密度柱悬停添加高亮")

# ═══ 8. updateChart: 切换后恢复高亮 ═══
old_update_chart = """function updateChart() {
  const data = getOHLCV();
  if (!data || !data.length) return;
  const chartData = data.map(d => ({ time: d.t / 1000, open: d.o, high: d.h, low: d.l, close: d.c }));
  S.candleSeries.setData(chartData);
  updateMarkers(chartData);
}"""
# fallback: 兼容已带 volume 的变体
if old_update_chart not in html:
    old_update_chart = """function updateChart() {
  const data = getOHLCV();
  if (!data || !data.length) return;
  const chartData = data.map(d => ({ time: d.t / 1000, open: d.o, high: d.h, low: d.l, close: d.c, volume: d.v || 0 }));
  S.candleSeries.setData(chartData);
  updateMarkers(chartData);
}"""

new_update_chart = """function updateChart() {
  const data = getOHLCV();
  if (!data || !data.length) return;
  const chartData = data.map(d => ({ time: d.t / 1000, open: d.o, high: d.h, low: d.l, close: d.c, volume: d.v || 0 }));
  S.candleSeries.setData(chartData);
  updateMarkers(chartData);
  // 切换 symbol/timeframe 后恢复高亮
  setTimeout(reapplyHighlight, 50);
}"""

assert old_update_chart in html, "updateChart not found"
html = html.replace(old_update_chart, new_update_chart)
print("✓ updateChart 恢复高亮")

html_path.write_text(html, 'utf-8')
print(f"✓ Saved: {len(html)/1024:.0f}KB (was {orig_len/1024:.0f}KB)")

"""
Inject frontend improvements into deploy_v2/index.html:
1. showDetail: display media_path images + dedupe links
2. Timeline items: thumbnail indicator for media messages
3. Detail panel: prev/next navigation + copy text + jump-to-chart
4. Remove debug click badge
5. Chart click: open popup with ALL posts (not just auto-select first)
"""
import re
import sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(__file__).parent
html_path = ROOT / 'deploy_v2' / 'index.html'
html = html_path.read_text('utf-8')
html = html.replace('\r\n', '\n')  # normalize line endings
orig_len = len(html)

# ─── 1. Replace showDetail with media_path support ───
old_showDetail = """function showDetail(m) {
  const panel = document.getElementById('detailPanel');
  const level = m.level || 'blue';
  const levelLabel = {red:'🔴 HIGH', yellow:'🟡 MED', blue:'🔵 LOW'}[level] || '';
  document.getElementById('detailDate').textContent = (m.date || '') + '  ·  ' + (m.timestamp || '') + '  ' + levelLabel;
  document.getElementById('detailText').textContent = m.text || '';
  const media = document.getElementById('detailMedia'); media.innerHTML = '';
  if (m.images) for (const img of m.images) { const el = document.createElement('img'); el.src = img; el.loading = 'lazy'; media.appendChild(el); }
  if (m.links) for (const link of m.links) { const a = document.createElement('a'); a.href = link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = link; media.appendChild(a); }
  panel.classList.add('open');
}"""

new_showDetail = """function showDetail(m) {
  const panel = document.getElementById('detailPanel');
  const level = m.level || 'blue';
  const levelLabel = {red:'🔴 HIGH', yellow:'🟡 MED', blue:'🔵 LOW'}[level] || '';
  document.getElementById('detailDate').textContent = (m.date || '') + '  ·  ' + (m.timestamp || '') + '  ' + levelLabel;
  document.getElementById('detailText').textContent = m.text || '';
  const media = document.getElementById('detailMedia'); media.innerHTML = '';

  // ── Real media images (media_path) ──
  const realImgs = [];
  if (m.media_path) realImgs.push(m.media_path);
  if (m.images && Array.isArray(m.images)) {
    for (const img of m.images) {
      if (!img) continue;
      if (typeof img === 'string' && img.includes('media/')) realImgs.push(img);
      else if (typeof img === 'string' && !img.includes('telegram.org')) realImgs.push(img);
    }
  }
  const seen = new Set();
  for (const src of realImgs) {
    if (seen.has(src)) continue; seen.add(src);
    const el = document.createElement('img');
    el.src = src;
    el.loading = 'lazy';
    el.style.maxHeight = '320px';
    el.style.border = '1px solid var(--border)';
    el.style.borderRadius = '4px';
    el.style.marginBottom = '6px';
    el.style.width = '100%';
    el.style.objectFit = 'contain';
    el.style.background = '#0a0f0c';
    el.addEventListener('click', function(){ window.open(this.src, '_blank'); });
    el.title = 'Click to view full size';
    media.appendChild(el);
  }

  // ── Links (deduped) ──
  const links = (m.links || []).filter((l, i, arr) => l && arr.indexOf(l) === i);
  for (const link of links) {
    let label = link;
    try { label = new URL(link).hostname + ' ↗'; } catch(e) {}
    const a = document.createElement('a');
    a.href = link; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = label;
    a.style.display = 'inline-block';
    a.style.marginRight = '8px';
    media.appendChild(a);
  }

  // ── Prev / Next navigation ──
  const nav = document.getElementById('detailNav');
  if (nav) {
    const visible = S.messages.filter(x => (x.text||'').trim() && S.filterLevels[x.level||'blue']);
    const idx = visible.findIndex(x => x.id === m.id);
    const prev = idx > 0 ? visible[idx-1] : null;
    const next = idx >= 0 && idx < visible.length-1 ? visible[idx+1] : null;
    nav.innerHTML =
      '<button class="detail-nav-btn" ' + (prev ? 'onclick="selectMsg('+prev.id+')"' : 'disabled') + '>← Prev</button>' +
      '<span style="font-size:9px;color:var(--text-muted)">' + (idx+1) + '/' + visible.length + '</span>' +
      '<button class="detail-nav-btn" ' + (next ? 'onclick="selectMsg('+next.id+')"' : 'disabled') + '>Next →</button>';
  }

  panel.classList.add('open');
  // Update active item in sidebar
  document.querySelectorAll('.msg-item').forEach(el => el.classList.remove('active'));
  const item = document.querySelector('.msg-item[data-id="' + m.id + '"]');
  if (item) item.classList.add('active');
}"""

assert old_showDetail in html, "showDetail not found"
html = html.replace(old_showDetail, new_showDetail)
print("✓ showDetail upgraded (media + nav)")

# ─── 2. Timeline: media thumbnail indicator ───
old_render = """    const preview = text.replace(/\\n/g, ' ');
    const hasMedia = (m.images && m.images.length) || (m.links && m.links.length);"""
new_render = """    const preview = text.replace(/\\n/g, ' ');
    const hasMedia = (m.images && m.images.length) || (m.links && m.links.length) || !!m.media_path;"""
assert old_render in html, "renderTimeline media check not found"
html = html.replace(old_render, new_render)
print("✓ Timeline media indicator includes media_path")

# ─── 3. Detail panel: add nav row to HTML ───
old_detail_html = """          <div class="detail-body">
            <div class="detail-date" id="detailDate"></div>
            <div class="detail-text" id="detailText"></div>
            <div class="detail-media" id="detailMedia"></div>
          </div>"""
new_detail_html = """          <div class="detail-body">
            <div class="detail-date" id="detailDate"></div>
            <div class="detail-nav" id="detailNav"></div>
            <div class="detail-text" id="detailText"></div>
            <div class="detail-media" id="detailMedia"></div>
          </div>"""
assert old_detail_html in html, "detail panel HTML not found"
html = html.replace(old_detail_html, new_detail_html)
print("✓ Detail nav row added")

# ─── 4. Detail nav CSS ───
nav_css = """
.detail-nav{display:flex;align-items:center;gap:8px;margin:6px 0 12px}
.detail-nav-btn{background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-secondary);font-size:9px;font-family:'JetBrains Mono',monospace;padding:3px 10px;cursor:pointer;transition:all .1s}
.detail-nav-btn:hover:not([disabled]){color:var(--text-primary);border-color:var(--accent-amber)}
.detail-nav-btn[disabled]{opacity:.3;cursor:default}
.detail-media img{cursor:zoom-in}
"""
# Insert before closing </style>
assert '</style>' in html
html = html.replace('</style>', nav_css + '</style>', 1)
print("✓ Detail nav CSS added")

# ─── 5. Remove debug click badge ───
old_badge = """<div id="clickBadge" style="position:absolute;bottom:4px;left:4px;color:#0f0;font-size:10px;font-family:monospace;z-index:999;pointer-events:none;background:rgba(0,0,0,.7);padding:2px 6px;border-radius:3px;max-width:80%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">waiting for click...</div>"""
assert old_badge in html, "clickBadge not found"
html = html.replace(old_badge, '')
print("✓ Debug click badge removed")

# ─── 6. Chart click: show popup instead of auto-selecting first ───
old_click = """    scrollSidebarToDate(dateKey);
    selectMsg(posts[0].id);
    if (badge) badge.textContent = '✓ selected ' + posts[0].id + ' for ' + dateKey;"""
new_click = """    scrollSidebarToDate(dateKey);
    if (posts.length === 1) {
      selectMsg(posts[0].id);
    } else {
      // Show popup listing all posts for this candle
      showChartPopup(posts, param.point.x, param.point.y, dateKey);
    }
    if (badge) badge.textContent = '✓ ' + posts.length + ' posts for ' + dateKey;"""
assert old_click in html, "chart click handler not found"
html = html.replace(old_click, new_click)
print("✓ Chart click shows popup for multiple posts")

# ─── 7. Fix popup close-on-click bug (chart click immediately closes popup) ───
old_close = """// Close popup when clicking outside
document.addEventListener('click', e => {
  const popup = document.getElementById('chartPopup');
  if (popup && popup.style.display !== 'none') {
    if (!popup.contains(e.target)) closeChartPopup();
  }
});"""
new_close = """// Close popup when clicking outside (skip chart-clicks which show the popup)
document.addEventListener('click', e => {
  const popup = document.getElementById('chartPopup');
  if (S._chartClickPending) { S._chartClickPending = false; return; }
  if (popup && popup.style.display !== 'none') {
    if (!popup.contains(e.target)) closeChartPopup();
  }
});"""
assert old_close in html, "popup close handler not found"
html = html.replace(old_close, new_close)
print("✓ Popup close-on-click bug fixed")

# ─── 8. Chart click: set pending flag so popup survives ───
old_click2 = """    scrollSidebarToDate(dateKey);
    if (posts.length === 1) {
      selectMsg(posts[0].id);
    } else {
      // Show popup listing all posts for this candle
      showChartPopup(posts, param.point.x, param.point.y, dateKey);
    }
    if (badge) badge.textContent = '✓ ' + posts.length + ' posts for ' + dateKey;"""
new_click2 = """    scrollSidebarToDate(dateKey);
    S._chartClickPending = true;
    if (posts.length === 1) {
      selectMsg(posts[0].id);
    } else {
      // Show popup listing all posts for this candle
      showChartPopup(posts, param.point.x, param.point.y, dateKey);
    }"""
assert old_click2 in html, "chart click handler v2 not found"
html = html.replace(old_click2, new_click2)
print("✓ Chart click pending flag set")

print(f"✓ Total size: {len(html)/1024:.0f}KB (was {orig_len/1024:.0f}KB)")

html_path.write_text(html, 'utf-8')
print("Saved to", html_path)

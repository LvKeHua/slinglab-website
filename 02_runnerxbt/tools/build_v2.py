"""
Build merged + cleaned self-contained HTML for runnerxbt.
Merges messages_final.json (full timestamps + media_path) with
embedded images/links, cleans TG metadata residue, embeds
lightweight-charts locally (no CDN).
"""
import json
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import re
from pathlib import Path

ROOT = Path(__file__).parent

# ─── 1. Load data ───
with open(ROOT / 'data' / 'messages_final.json', encoding='utf-8') as f:
    raw_msgs = json.load(f)

# Read the current deployed HTML to extract embedded images/links
deployed = (ROOT / 'deploy_fixed' / 'index.html').read_text('utf-8')
m = re.search(r'const __DATA__ = (.*?);\nconst __DAILY__', deployed, re.DOTALL)
assert m, "Cannot find __DATA__ in deploy_fixed/index.html"
embedded_data = json.loads(m.group(1))
embedded = {x['id']: x for x in embedded_data['messages']}

# OHLCV data
with open(ROOT / 'data' / 'btc_ohlcv_1d.json', encoding='utf-8') as f:
    btc = json.load(f)
with open(ROOT / 'data' / 'eth_ohlcv_1d.json', encoding='utf-8') as f:
    eth = json.load(f)
with open(ROOT / 'data' / 'btc_ohlcv_4h.json', encoding='utf-8') as f:
    btc4h = json.load(f)

# ─── 2. Text cleaning: strip TG metadata residue ───
# Patterns to strip from message text:
#   - Trailing "X.XK\nHH:MM" (views + time appended by scraper)
#   - Leading "X.XK\nHH:MM"
#   - "Forwarded from ..." headers
def clean_text(text):
    if not text:
        return text
    t = text.replace('\ufeff', '')
    # Strip trailing lines that are pure TG view/time metadata
    lines = t.rstrip().split('\n')
    while lines:
        last = lines[-1].strip()
        # "4.5K", "2.2K", "1M", "5.1K" style views
        if re.fullmatch(r'\d+(?:[.,]\d+)?[KM]?', last):
            lines.pop()
            continue
        # "17:22" style time, possibly with the emoji char
        if re.fullmatch(r'[\uE000-\uF8FF\u2022·]?\d{1,2}:\d{2}', last):
            lines.pop()
            continue
        break
    t = '\n'.join(lines).rstrip()
    # Strip leading view/time metadata
    lines = t.lstrip().split('\n')
    while lines and lines[0].strip():
        first = lines[0].strip()
        if re.fullmatch(r'\d+(?:[.,]\d+)?[KM]?', first):
            lines.pop(0)
            continue
        if re.fullmatch(r'[\uE000-\uF8FF\u2022·]?\d{1,2}:\d{2}', first):
            lines.pop(0)
            continue
        break
    t = '\n'.join(lines).lstrip()
    return t

# ─── 3. Merge messages ───
def normalize_msg(m):
    raw_date = m.get('date', '')
    if 'T' in raw_date:
        # ISO datetime (UTC) -> Beijing time (UTC+8)
        from datetime import datetime, timedelta
        try:
            dt = datetime.fromisoformat(raw_date.replace('Z', '+00:00'))
            dt_bj = dt + timedelta(hours=8)
            date_part = dt_bj.strftime('%Y-%m-%d')
            time_part = dt_bj.strftime('%H:%M')
        except ValueError:
            date_part = raw_date[:10]
            time_part = raw_date[11:16]
    else:
        date_part = raw_date
        time_part = m.get('timestamp', '')

    mid = m.get('id', 0)
    emb = embedded.get(mid, {})

    # Clean the text
    text = clean_text(m.get('text', ''))

    # Filter out pure-garbage messages (empty after cleaning or metadata-only)
    return {
        'id': mid,
        'date': date_part,
        'text': text,
        'timestamp': time_part,
        'images': m.get('images', []) or emb.get('images', []),
        'links': m.get('links', []) or emb.get('links', []),
        'videos': m.get('videos', []) or emb.get('videos', []),
        'media_path': ('/media/' + m['media_path'].split('/')[-1]) if m.get('media_path') else None,
    }

messages = [normalize_msg(m) for m in raw_msgs]
# Drop pure metadata junk (empty or only whitespace)
messages = [m for m in messages if (m['text'] or '').strip()]
# Sort by date DESCENDING so newest posts appear at top of timeline.
# Messages with full ISO datetime sort after plain YYYY-MM-DD on the same day;
# use date + time components. Plain dates become midnight UTC.
def _msg_key(m):
    d = (m.get('date') or '')
    t = (m.get('timestamp') or '')
    if 'T' in d:
        return d
    return d + 'T' + (t if t and ':' in t else '00:00') + '+00:00'
messages.sort(key=_msg_key, reverse=True)

# ─── 4. Daily counts ───
daily_map = {}
for m in messages:
    d = m['date']
    if d:
        daily_map[d] = daily_map.get(d, 0) + 1
total_days = len(daily_map)

# ─── 5. Serialize ───
messages_json = json.dumps(messages, ensure_ascii=False)
btc_json = json.dumps(btc, ensure_ascii=False)
eth_json = json.dumps(eth, ensure_ascii=False)
btc4h_json = json.dumps(btc4h, ensure_ascii=False)
daily_json = json.dumps(daily_map, ensure_ascii=False)

# ─── 6. Read frontend template ───
# The deploy_fixed/index.html IS the current working frontend
html = deployed

# Build new embedded data block
new_data_block = f"""// ─── EMBEDDED DATA (no API needed) ───
const __DATA__ = {{
  messages: {messages_json},
  btc: {btc_json},
  eth: {eth_json},
  btc4h: {btc4h_json},
}};
const __DAILY__ = {daily_json};
const __TOTAL_DAYS__ = {total_days};"""

# Replace old embedded data block
html = re.sub(
    r'// ─── EMBEDDED DATA \(no API needed\) ───\nconst __DATA__ = \{.*?\nconst __TOTAL_DAYS__ = \d+;',
    lambda _: new_data_block,
    html,
    flags=re.DOTALL
)

# ─── 7. Embed lightweight-charts locally (replace CDN script) ───
lw_path = ROOT / 'vendor' / 'lightweight-charts.standalone.production.js'
if lw_path.exists():
    lw_js = lw_path.read_text('utf-8')
    # Replace the external script tag with inline script
    html = re.sub(
        r'<script src="https://unpkg\.com/lightweight-charts[^"]*"></script>',
        lambda _: '<script>' + lw_js + '</script>',
        html
    )
    print(f"  Lightweight-charts embedded: {len(lw_js)/1024:.0f}KB")
else:
    print("  WARNING: lightweight-charts not found locally, keeping CDN")

# ─── 8. Remove Google Fonts (blocked in China) ───
html = re.sub(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">', '', html)
html = re.sub(r'<link href="https://fonts\.googleapis\.com/css2\?family=JetBrains\+Mono[^"]*" rel="stylesheet">', '', html)

# ─── 9. Write output ───
out_dir = ROOT / 'deploy_v2'
out_dir.mkdir(exist_ok=True)
out_path = out_dir / 'index.html'
out_path.write_text(html, 'utf-8')

# Copy media files
media_src = ROOT / 'data' / 'media'
media_dst = out_dir / 'media'
media_dst.mkdir(exist_ok=True)
import shutil
count = 0
for f in media_src.iterdir():
    if f.is_file():
        shutil.copy2(f, media_dst / f.name)
        count += 1

size_kb = len(html) / 1024
print(f"✓ Self-contained HTML generated")
print(f"  Size: {size_kb:.0f}KB")
print(f"  Messages: {len(messages)} (was {len(raw_msgs)})")
print(f"  Days: {total_days}")
print(f"  Media files copied: {count}")
print(f"  Output: {out_path}")

"""
Build self-contained static HTML for GitHub Pages deployment.
Embeds all message + OHLCV data directly into the HTML.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent

# ─── Load data ───
with open(ROOT / 'data' / 'messages_final.json', encoding='utf-8') as f:
    raw_msgs = json.load(f)

with open(ROOT / 'data' / 'btc_ohlcv_1d.json', encoding='utf-8') as f:
    btc = json.load(f)

with open(ROOT / 'data' / 'eth_ohlcv_1d.json', encoding='utf-8') as f:
    eth = json.load(f)

with open(ROOT / 'data' / 'btc_ohlcv_4h.json', encoding='utf-8') as f:
    btc4h = json.load(f)

# ─── Normalize messages to the format the frontend expects ───
def normalize_msg(m):
    """Ensure every message has: id, date (YYYY-MM-DD), text, timestamp, images[], links[], videos[]"""
    # Normalize date to YYYY-MM-DD
    raw_date = m.get('date', '')
    if 'T' in raw_date:
        date_part = raw_date[:10]
        time_part = raw_date[11:16]
    else:
        date_part = raw_date
        time_part = m.get('timestamp', '')

    return {
        'id': m.get('id', 0),
        'date': date_part,
        'text': m.get('text', ''),
        'timestamp': time_part,
        'images': m.get('images', []),
        'links': m.get('links', []),
        'videos': m.get('videos', []),
    }

messages = [normalize_msg(m) for m in raw_msgs]

# ─── Compute daily counts ───
daily_map = {}
for m in messages:
    d = m['date']
    if d:
        daily_map[d] = daily_map.get(d, 0) + 1
total_days = len(daily_map)
daily_json = json.dumps(daily_map, ensure_ascii=False)

# ─── Serialize embedded data ───
messages_json = json.dumps(messages, ensure_ascii=False)
btc_json = json.dumps(btc, ensure_ascii=False)
eth_json = json.dumps(eth, ensure_ascii=False)
btc4h_json = json.dumps(btc4h, ensure_ascii=False)

# ─── Read frontend HTML ───
html_path = ROOT / 'frontend' / 'index.html'
html = html_path.read_text('utf-8')

# ─── Build replacement loadAll() ───
old_loadAll_pattern = r'async function loadAll\(\).*?\n\}'

new_loadAll = f"""// ─── EMBEDDED DATA (no API needed) ───
const __DATA__ = {{
  messages: {messages_json},
  btc: {btc_json},
  eth: {eth_json},
  btc4h: {btc4h_json},
}};
const __DAILY__ = {daily_json};
const __TOTAL_DAYS__ = {total_days};

function loadAll() {{
  S.messages = __DATA__.messages;
  S.dailyMsgs = __DAILY__;
  S.btcData = __DATA__.btc;
  S.ethData = __DATA__.eth;
  S.btc4hData = __DATA__.btc4h;

  classifyAllPosts();

  document.getElementById('msgCount').textContent = S.messages.length.toLocaleString();
  document.getElementById('dayCount').textContent = __TOTAL_DAYS__;
  document.getElementById('tlCount').textContent = S.messages.length;

  if (S.btc4hData.length) {{
    document.querySelectorAll('.tf-btn[data-tf="4h"]').forEach(b => {{ b.disabled = false; b.style.opacity=''; b.title=''; }});
  }}

  updateStats();
  renderTimeline(S.messages);
  initChart();
}}"""

# Replace in HTML using regex (handle multiline)
replaced = re.sub(
    r'async function loadAll\(\) \{.*?(?:\n.*?)*?\n\}',
    new_loadAll,
    html,
    flags=re.DOTALL
)

if replaced == html:
    print("ERROR: Could not find loadAll() function in HTML. Check frontend/index.html")
    exit(1)

# ─── Write output ───
out_dir = ROOT / 'docs'
out_dir.mkdir(exist_ok=True)
out_path = out_dir / 'index.html'
out_path.write_text(replaced, 'utf-8')

# Also ensure .nojekyll exists (for GitHub Pages w/ underscore paths)
nojekyll = out_dir / '.nojekyll'
nojekyll.touch()

size_kb = len(replaced) / 1024
data_kb = len(messages_json) / 1024
print(f"Self-contained HTML generated")
print(f"  Size: {size_kb:.1f}KB (messages data: {data_kb:.1f}KB)")
print(f"  Messages: {len(messages)}")
print(f"  Days: {total_days}")
print(f"  BTC candles: {len(btc)}")
print(f"  ETH candles: {len(eth)}")
print(f"  BTC 4H candles: {len(btc4h)}")
print(f"  Output: {out_path}")

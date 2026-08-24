"""Check the original data - with UTF-8 output"""
import json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\Vibe Coding 项目合集\runnerxbt\data\messages_enriched.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
print(f'Total: {len(data)} messages')
print(f'Keys: {list(data[0].keys())}')
with_imgs = [m for m in data if m.get('images')]
blob_imgs = [m for m in data if any('blob:' in img for img in (m.get('images') or []))]
telegram_imgs = [m for m in data if any('web.telegram.org' in img for img in (m.get('images') or []))]
live_imgs = [m for m in data if any(not img.startswith('blob:') for img in (m.get('images') or []))]
print(f'Messages with images: {len(with_imgs)}')
print(f'  blob: URLs: {len(blob_imgs)}')
print(f'  telegram URLs: {len(telegram_imgs)}')
print(f'  non-blob: {len(live_imgs)}')
# Check timestamps
timestamps = [m.get('timestamp') for m in data if m.get('timestamp')]
print(f'Timestamps: min={min(timestamps)} max={max(timestamps)}')
import time
print(f'  Earliest: {time.strftime("%Y-%m-%d %H:%M", time.gmtime(min(timestamps)))}')
print(f'  Latest:   {time.strftime("%Y-%m-%d %H:%M", time.gmtime(max(timestamps)))}')

# First 3 message texts
for m in data[:3]:
    t = json.dumps(m.get('text',''), ensure_ascii=False)
    print(f'  [{m["id"]}] ts={m.get("timestamp")} text={t[:80]}')
# Last 3
for m in data[-3:]:
    t = json.dumps(m.get('text',''), ensure_ascii=False)
    print(f'  [{m["id"]}] ts={m.get("timestamp")} text={t[:80]}')

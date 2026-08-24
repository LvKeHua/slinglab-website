"""Check the original 3295 messages"""
import json
with open(r'D:\Vibe Coding 项目合集\runnerxbt\data\messages_enriched.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
print(f'Total: {len(data)} messages')
print(f'First msg keys: {list(data[0].keys())}')
print(f'Sample IDs: first={data[0].get("id")}, last={data[-1].get("id")}')
print(f'First 3 messages:')
for i, m in enumerate(data[:3]):
    print(f'  [{m.get("id")}] ts={m.get("timestamp")} {m.get("text", "")[:80]}')
print(f'Last 3 messages:')
for m in data[-3:]:
    print(f'  [{m.get("id")}] ts={m.get("timestamp")} {m.get("text", "")[:80]}')
# Check images
with_imgs = [m for m in data if m.get('images')]
print(f'Messages with images: {len(with_imgs)}')
if with_imgs:
    print(f'  Sample image: {with_imgs[0]["images"][:3]}')
blob_imgs = [m for m in data if any('blob:' in img for img in (m.get('images') or []))]
print(f'Messages with blob URL images: {len(blob_imgs)}')
telegram_imgs = [m for m in data if any('web.telegram.org' in img for img in (m.get('images') or []))]
print(f'Messages with telegram URL images: {len(telegram_imgs)}')
live_imgs = [m for m in data if any(not img.startswith('blob:') for img in (m.get('images') or []))]
print(f'Messages with non-blob images: {len(live_imgs)}')

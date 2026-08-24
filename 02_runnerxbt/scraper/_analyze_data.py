"""Analyze the current state of message data"""
import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')

DATA_DIR = r'D:\Vibe Coding 项目合集\runnerxbt\data'

with open(os.path.join(DATA_DIR, 'messages_enriched.json'), 'r', encoding='utf-8') as f:
    orig = json.load(f)

with open(os.path.join(DATA_DIR, 'messages_enriched_with_media.json'), 'r', encoding='utf-8') as f:
    updated = json.load(f)

print(f'Original: {len(orig)} msgs')
print(f'Updated:  {len(updated)} msgs')

# In the updated data, check image types
with_blob = 0
with_local = 0
with_telegram = 0
no_images = 0
local_msgs_list = []

for m in updated:
    imgs = m.get('images', [])
    if not imgs:
        no_images += 1
        continue
    
    has_blob = any('blob:' in i for i in imgs)
    has_local = any(os.path.sep in i and ('media' in i or 'download' in i) for i in imgs if not 'blob:' in i and not 'telegram' in i)
    has_telegram = any('telegram' in i for i in imgs)
    
    if has_blob: with_blob += 1
    if has_local: 
        with_local += 1
        local_msgs_list.append(m)
    if has_telegram: with_telegram += 1

print(f'\nUpdated breakdown:')
print(f'  No images: {no_images}')
print(f'  With blob URLs (dead): {with_blob}')
print(f'  With local files: {with_local}')
print(f'  With telegram URLs: {with_telegram}')

print(f'\nMessages with local media paths: {len(local_msgs_list)}')
for m in local_msgs_list[:5]:
    local_imgs = [i for i in m['images'] if 'media' in i or 'download' in i]
    print(f'  ID={m.get("id")} imgs={local_imgs}')

# Check media directory
MEDIA_DIR = r'D:\Vibe Coding 项目合集\runnerxbt\media'
print(f'\nMedia directory ({MEDIA_DIR}):')
if os.path.exists(MEDIA_DIR):
    files = [f for f in os.listdir(MEDIA_DIR) if os.path.isfile(os.path.join(MEDIA_DIR, f))]
    print(f'  Total files: {len(files)}')
    for f in sorted(files)[:10]:
        size = os.path.getsize(os.path.join(MEDIA_DIR, f))
        print(f'  {f}: {size} bytes')
    if len(files) > 10:
        print(f'  ... and {len(files)-10} more')
else:
    print('  (not found)')

# Check frontend index.html for image handling
FRONTEND = r'D:\Vibe Coding 项目合集\runnerxbt\frontend\index.html'
if os.path.exists(FRONTEND):
    with open(FRONTEND, 'r', encoding='utf-8') as f:
        content = f.read()
    # Find image-related code
    import re
    img_patterns = re.findall(r'\.images[^;]*', content)
    print(f'\nFrontend image handling patterns ({len(img_patterns)} found):')
    for p in img_patterns[:5]:
        print(f'  {p.strip()[:120]}')

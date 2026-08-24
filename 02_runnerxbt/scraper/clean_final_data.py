"""Clean and prepare the final dataset for the frontend"""
import json, os, sys, shutil, re
from collections import defaultdict
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r'D:\Vibe Coding 项目合集\runnerxbt'
DATA_DIR = os.path.join(BASE_DIR, 'data')
MEDIA_DIR = os.path.join(BASE_DIR, 'media')
DATA_MEDIA_DIR = os.path.join(DATA_DIR, 'media')
RUNNER_TG_DIR = os.path.join(BASE_DIR, 'runner tg')

# Load the enriched data
with open(os.path.join(DATA_DIR, 'messages_enriched_with_media.json'), 'r', encoding='utf-8') as f:
    msgs = json.load(f)

print(f'Loaded {len(msgs)} messages')

# 1. Copy all media to data/media/ for serving
os.makedirs(DATA_MEDIA_DIR, exist_ok=True)
if os.path.exists(MEDIA_DIR):
    for fname in os.listdir(MEDIA_DIR):
        src = os.path.join(MEDIA_DIR, fname)
        if os.path.isfile(src):
            shutil.copy2(src, os.path.join(DATA_MEDIA_DIR, fname))

print(f'Media in data/media/: {len([f for f in os.listdir(DATA_MEDIA_DIR) if os.path.isfile(os.path.join(DATA_MEDIA_DIR, f))])} files')

# 2. Build a mapping from filename -> path for all media files
media_files = {}
if os.path.exists(DATA_MEDIA_DIR):
    for fname in os.listdir(DATA_MEDIA_DIR):
        fpath = os.path.join(DATA_MEDIA_DIR, fname)
        if os.path.isfile(fpath):
            media_files[fname] = fpath

print(f'Media file index: {len(media_files)} files')

# 3. Clean each message's images field
cleaned = []
cleaned_count = 0
blob_removed = 0
local_mapped = 0

for m in msgs:
    new_imgs = []
    for img in m.get('images', []):
        if not img:
            continue
        
        # Case 1: It's a dead blob URL -> remove
        if img.startswith('blob:'):
            blob_removed += 1
            continue
        
        # Case 2: It's already a local path like ..\media\blob_xxx.jpg
        # Extract the filename and use /media/ prefix
        fname = os.path.basename(img)
        if fname in media_files:
            new_imgs.append(f'/media/{fname}')
            local_mapped += 1
        # Case 3: It's a telegram URL (emoji, etc.) -> keep as-is (still live)
        elif img.startswith('https://'):
            new_imgs.append(img)
        # Case 4: Unknown format -> keep as-is
        else:
            # Try extracting filename
            if fname and fname in media_files:
                new_imgs.append(f'/media/{fname}')
                local_mapped += 1
            else:
                # Keep original but it might not work
                new_imgs.append(img)
    
    m['images'] = new_imgs
    if new_imgs:
        cleaned_count += 1
    cleaned.append(m)

print(f'\nCleaning results:')
print(f'  Messages with images after cleaning: {cleaned_count}')
print(f'  Dead blob URLs removed: {blob_removed}')
print(f'  Local paths mapped to /media/: {local_mapped}')
total_imgs = sum(len(m.get('images', [])) for m in cleaned)
print(f'  Total image entries remaining: {total_imgs}')

# 4. Sort and reassign IDs
cleaned.sort(key=lambda x: x.get('timestamp', 0) if isinstance(x.get('timestamp'), int) else 0)
for i, m in enumerate(cleaned):
    m['id'] = i

# 5. Save final clean data
output_path = os.path.join(DATA_DIR, 'messages_final.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(cleaned, f, ensure_ascii=False, indent=1)
print(f'\nSaved final: {output_path} ({len(cleaned)} msgs)')

# 6. Generate daily index
daily = defaultdict(list)
for m in cleaned:
    d = m.get('date', '')[:10] if m.get('date') else ''
    if not d and m.get('timestamp'):
        import time
        d = time.strftime('%Y-%m-%d', time.gmtime(m['timestamp']))
    daily[d].append(m['id'])

daily_path = os.path.join(DATA_DIR, 'messages_daily_final.json')
with open(daily_path, 'w', encoding='utf-8') as f:
    json.dump(dict(daily), f, ensure_ascii=False, indent=1)
print(f'Saved daily: {daily_path}')

# 7. Copy to runner tg/
os.makedirs(RUNNER_TG_DIR, exist_ok=True)
shutil.copy2(output_path, os.path.join(RUNNER_TG_DIR, 'messages_final.json'))
shutil.copy2(daily_path, os.path.join(RUNNER_TG_DIR, 'messages_daily_final.json'))
runner_media = os.path.join(RUNNER_TG_DIR, 'media')
os.makedirs(runner_media, exist_ok=True)
for fname in os.listdir(DATA_MEDIA_DIR):
    src = os.path.join(DATA_MEDIA_DIR, fname)
    if os.path.isfile(src):
        shutil.copy2(src, os.path.join(runner_media, fname))
print(f'Copied to: {RUNNER_TG_DIR}/')

# 8. Summary
print(f'\n{"="*60}')
print(f'DATA CLEANING COMPLETE')
print(f'{"="*60}')
print(f'  Total messages: {len(cleaned)}')
print(f'  Messages with images: {cleaned_count}')
print(f'  Local media files: {len(media_files)}')
print(f'  Dead blob URLs stripped: {blob_removed}')
print(f'')
print(f'  Frontend image formats:')
print(f'    /media/filename.jpg - local files')
print(f'    https://... - telegram emoji URLs')
print(f'{"="*60}')

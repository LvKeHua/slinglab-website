"""
Scraper v6 — Extract ALL messages from Telegram Web's IndexedDB + download blob media

Telegram K stores ALL loaded messages in:
  IndexedDB: tt-data
  Store: store
  Key: tt-global-state
  Path: messages.byChatId['-1002233421487'].byId

This gives us ALL messages in memory without any scrolling!
"""
import asyncio, json, os, re, hashlib, base64, shutil, time
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from playwright.async_api import async_playwright

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA_DIR = os.path.join(BASE_DIR, "media")
DATA_DIR = os.path.join(BASE_DIR, "data")
RUNNER_TG_DIR = os.path.join(BASE_DIR, "runner tg")
CHAT_ID = "-1002233421487"

os.makedirs(MEDIA_DIR, exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, "media"), exist_ok=True)

def generate_filename(url_or_data, prefix='img'):
    h = hashlib.md5(str(url_or_data).encode()).hexdigest()
    return f"{prefix}_{h}"


EXTRACT_ALL_MSGS = f"""
async () => {{
    try {{
        const db = await new Promise((resolve, reject) => {{
            const req = indexedDB.open('tt-data');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        }});
        const tx = db.transaction('store', 'readonly');
        const state = await new Promise((resolve, reject) => {{
            const req = tx.objectStore('store').get('tt-global-state');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        }});
        db.close();

        const chat = state?.messages?.byChatId?.['{CHAT_ID}'];
        if (!chat?.byId) return {{error: 'no chat messages found', keys: Object.keys(state?.messages?.byChatId || {{}}) }};

        const byId = chat.byId;
        const msgIds = Object.keys(byId).map(Number).sort((a,b) => a-b);
        const messages = [];

        for (const id of msgIds) {{
            const m = byId[id];
            if (!m) continue;

            const content = m.content || m.message || m;
            const text = content?.text?.text || content?.message || '';
            const date = m.date ? (typeof m.date === 'number' ? new Date(m.date * 1000).toISOString() : m.date) : '';
            
            // Extract photo blob URLs from content.photo
            let photoUrl = '';
            if (content?.photo?.thumbnail) {{
                // thumbnails have localBlobPath or url
                const t = content.photo.thumbnail;
                if (t.localBlobPath) photoUrl = t.localBlobPath;
                else if (t.url && t.url.startsWith('blob:')) photoUrl = t.url;
            }}
            if (!photoUrl && content?.photo?.url && content.photo.url.startsWith('blob:')) {{
                photoUrl = content.photo.url;
            }}

            // Extract video blob URLs
            let videoUrl = '';
            if (content?.video?.thumbnail) {{
                const t = content.video.thumbnail;
                if (t.localBlobPath) videoUrl = t.localBlobPath;
                else if (t.url && t.url.startsWith('blob:')) videoUrl = t.url;
            }}
            if (!videoUrl && content?.video?.url && content.video.url.startsWith('blob:')) {{
                videoUrl = content.video.url;
            }}

            // Also check document media
            let docUrl = '';
            if (content?.document?.thumbnail) {{
                const t = content.document.thumbnail;
                if (t.localBlobPath) docUrl = t.localBlobPath;
                else if (t.url && t.url.startsWith('blob:')) docUrl = t.url;
            }}

            // Collect ALL blob URLs from thumbnail objects recursively
            const allBlobUrls = new Set();
            const findBlobs = (obj, depth=0) => {{
                if (depth > 5 || !obj || typeof obj !== 'object') return;
                for (const [k, v] of Object.entries(obj)) {{
                    if (v && typeof v === 'string' && v.startsWith('blob:https://')) {{
                        allBlobUrls.add(v);
                    }} else if (v && typeof v === 'object') {{
                        findBlobs(v, depth+1);
                    }}
                }}
            }};
            findBlobs(content);

            const imgs = [photoUrl, docUrl].filter(Boolean);
            const allUrls = Array.from(allBlobUrls);
            
            messages.push({{
                id: id,
                mid: id,
                date: date,
                date_raw: m.date,
                text: text,
                photoUrl: photoUrl,
                videoUrl: videoUrl,
                docUrl: docUrl,
                allBlobUrls: allUrls,
                hasPhoto: !!content?.photo,
                hasVideo: !!content?.video,
                hasDocument: !!content?.document,
                hasWebpage: !!content?.webpage,
                contentType: content?._ === 'messagePhoto' ? 'photo' : (content?._  || ''),
            }});

            if (messages.length >= 5000) break;
        }}

        return {{
            count: messages.length,
            totalInDb: msgIds.length,
            firstId: msgIds[0],
            lastId: msgIds[msgIds.length-1],
            messages: messages,
        }};
    }} catch(e) {{
        return {{error: e.message}};
    }}
}}
"""


DOWNLOAD_BLOB_JS = """
async (blobUrl) => {
    try {
        const resp = await fetch(blobUrl);
        if (!resp.ok) return 'ERR_HTTP:' + resp.status;
        const blob = await resp.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve('ERR_FILEREADER');
            setTimeout(() => resolve('ERR_TIMEOUT'), 20000);
            reader.readAsDataURL(blob);
        });
    } catch(e) { return 'ERR:' + e.message; }
}
"""


def classify_post(text: str) -> str:
    t = text.lower()
    emoji_count = sum(1 for ch in t if ord(ch) > 0x1F000)
    emoji_ratio = emoji_count / max(len(t), 1)
    dollar_keywords = ['$', 'usd', 'btc', 'eth', 'sol', 'price', 'entry', 'target', 'tp', 'sl']
    dollar_count = sum(1 for kw in dollar_keywords if kw in t)
    dollar_ratio = dollar_count / max(len(t), 1)
    if emoji_ratio > 0.06:
        return "red"
    elif dollar_ratio > 0.02:
        return "blue"
    else:
        return "yellow"


def clean_text(text: str) -> str:
    text = re.sub(r'[\u200b\u200c\u200d\ufeff]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def ts_to_beijing_iso(ts: int) -> str:
    """Convert Unix timestamp to Beijing time ISO string"""
    dt = datetime.fromtimestamp(ts, tz=timezone.utc) + timedelta(hours=8)
    return dt.isoformat()


def parse_date_to_ts(date_val) -> int:
    """Parse Telegram's date field to Unix timestamp"""
    if isinstance(date_val, (int, float)):
        return int(date_val)
    return 0


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]

        # Ensure we're on the channel page
        if 'RunnerXBT' not in page.url:
            await page.goto("https://web.telegram.org/k/#@RunnerXBT_Insights")
            await asyncio.sleep(5)

        print(f"\n{'='*60}")
        print(f"SCRAPER v6 — IndexedDB extraction")
        print(f"{'='*60}\n")

        # Phase 1: Extract all messages from IndexedDB
        print("Phase 1: Reading messages from IndexedDB...")
        result = await page.evaluate(EXTRACT_ALL_MSGS)
        
        if 'error' in result:
            print(f"ERROR: {result['error']}")
            print(f"  Available chats: {result.get('keys', 'unknown')}")
            return

        raw_messages = result['messages']
        print(f"  Found {result['count']} messages in IndexedDB")
        print(f"  Total in DB: {result['totalInDb']}")
        print(f"  Range: {result['firstId']} -> {result['lastId']}")
        
        # Count those with media
        with_photo = sum(1 for m in raw_messages if m.get('hasPhoto'))
        with_video = sum(1 for m in raw_messages if m.get('hasVideo'))
        with_doc = sum(1 for m in raw_messages if m.get('hasDocument'))
        with_blob = sum(1 for m in raw_messages if m.get('allBlobUrls') and len(m['allBlobUrls']) > 0)
        print(f"  With photo: {with_photo}, video: {with_video}, document: {with_doc}, blob URLs: {with_blob}")
        
        # Phase 2: Download blob media
        print(f"\nPhase 2: Downloading {with_blob} messages with blob media...")
        total_downloaded = 0
        blob_to_path = {}  # blob_url -> local_path
        
        for i, msg in enumerate(raw_messages):
            blob_urls = msg.get('allBlobUrls', [])
            if not blob_urls:
                continue
            
            downloaded_urls = []
            for blob_url in blob_urls:
                if blob_url in blob_to_path:
                    downloaded_urls.append(blob_to_path[blob_url])
                    continue
                
                fname = generate_filename(blob_url, 'blob')
                save_path = os.path.join(MEDIA_DIR, fname)
                
                data_url = await page.evaluate(DOWNLOAD_BLOB_JS, blob_url)
                if data_url and isinstance(data_url, str) and ',' in data_url:
                    mime = data_url.split(';')[0].split(':')[1] if ':' in data_url else 'image/png'
                    _, b64_data = data_url.split(',', 1)
                    ext_map = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 
                               'image/webp': '.webp', 'video/mp4': '.mp4', 'video/webm': '.webm',
                               'image/jpg': '.jpg'}
                    ext = ext_map.get(mime, '.bin')
                    final_path = os.path.splitext(save_path)[0] + ext
                    try:
                        raw = base64.b64decode(b64_data)
                        with open(final_path, 'wb') as f:
                            f.write(raw)
                        blob_to_path[blob_url] = final_path
                        downloaded_urls.append(final_path)
                        total_downloaded += 1
                    except Exception as e:
                        print(f"    Error saving {blob_url}: {e}")
                        downloaded_urls.append(blob_url)
                else:
                    downloaded_urls.append(blob_url)
            
            # Store local paths in message
            msg['downloaded_media'] = downloaded_urls
            
            if (i + 1) % 100 == 0:
                print(f"  ... {i+1}/{len(raw_messages)} processed, {total_downloaded} files downloaded")
        
        print(f"\n  Total media files downloaded: {total_downloaded}")
        
        # Phase 3: Build clean output
        print(f"\nPhase 3: Building clean dataset...")
        
        # Index blobs by message ID (for matching with existing data)
        mid_to_media = {}
        for m in raw_messages:
            if m.get('downloaded_media'):
                mid_to_media[m['mid']] = m['downloaded_media']

        # Build clean messages
        clean_msgs = []
        for m in raw_messages:
            ts = parse_date_to_ts(m.get('date_raw'))
            text = clean_text(m.get('text', ''))
            if not text and not m.get('hasPhoto') and not m.get('hasVideo'):
                continue  # Skip empty messages without media
            
            rel_media = []
            for path in m.get('downloaded_media', []):
                # Make path relative to data/ directory
                try:
                    rel = os.path.relpath(path, DATA_DIR)
                    rel_media.append(rel)
                except:
                    rel_media.append(path)
            
            msg_out = {
                "id": m['mid'],
                "mid": m['mid'],
                "date": ts_to_beijing_iso(ts) if ts else m.get('date', ''),
                "timestamp": ts or 0,
                "text": text,
                "images": rel_media,
                "videos": [rel_media[0]] if m.get('hasVideo') and rel_media else [],
                "links": re.findall(r'https?://t\.me/\S+|https?://[^\s]+', text),
                "level": classify_post(text),
            }
            clean_msgs.append(msg_out)
        
        # Sort by timestamp
        clean_msgs.sort(key=lambda x: x['timestamp'])
        for i, m in enumerate(clean_msgs):
            m['id'] = i
        
        print(f"  Clean messages: {len(clean_msgs)}")
        media_count = sum(1 for m in clean_msgs if m['images'] or m['videos'])
        print(f"  Messages with media: {media_count}")
        
        # Phase 4: Save
        print(f"\nPhase 4: Saving...")
        
        # Save main data
        clean_path = os.path.join(DATA_DIR, "messages_v6_idb.json")
        with open(clean_path, 'w', encoding='utf-8') as f:
            json.dump(clean_msgs, f, ensure_ascii=False, indent=1)
        print(f"  Saved: {clean_path} ({len(clean_msgs)} msgs)")
        
        # Daily index
        daily = defaultdict(list)
        for m in clean_msgs:
            day = m['date'][:10] if m['date'] else 'unknown'
            daily[day].append(m['id'])
        daily_path = os.path.join(DATA_DIR, "messages_daily_v6.json")
        with open(daily_path, 'w', encoding='utf-8') as f:
            json.dump(dict(daily), f, ensure_ascii=False, indent=1)
        print(f"  Saved: {daily_path}")
        
        # Copy media to data/media
        data_media = os.path.join(DATA_DIR, "media")
        os.makedirs(data_media, exist_ok=True)
        for fname in os.listdir(MEDIA_DIR):
            src = os.path.join(MEDIA_DIR, fname)
            if os.path.isfile(src):
                shutil.copy2(src, os.path.join(data_media, fname))
        
        # Copy to runner tg/
        os.makedirs(RUNNER_TG_DIR, exist_ok=True)
        runner_media = os.path.join(RUNNER_TG_DIR, "media")
        os.makedirs(runner_media, exist_ok=True)
        for fname in os.listdir(MEDIA_DIR):
            src = os.path.join(MEDIA_DIR, fname)
            if os.path.isfile(src):
                shutil.copy2(src, os.path.join(runner_media, fname))
        shutil.copy2(clean_path, os.path.join(RUNNER_TG_DIR, "messages_v6_idb.json"))
        shutil.copy2(daily_path, os.path.join(RUNNER_TG_DIR, "messages_daily_v6.json"))
        print(f"  Copied to {RUNNER_TG_DIR}/")
        
        # Summary
        print(f"\n{'='*60}")
        print(f"ALL DONE!")
        print(f"  Messages: {len(clean_msgs)}")
        print(f"  Media files downloaded: {total_downloaded}")
        print(f"{'='*60}")

asyncio.run(main())

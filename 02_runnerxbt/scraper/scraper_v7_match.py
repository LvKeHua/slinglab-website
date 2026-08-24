"""
Scraper v7 — Scroll Telegram K, extract blob URLs, match to existing messages by text

Strategy:
  1. Load existing messages_enriched.json (3295 msgs with metadata)
  2. Start at bottom of channel in Telegram Web K
  3. Scroll through all messages, for each bubble:
     - Extract text + data-mid + blob URLs
     - Match by text similarity to existing messages
     - Download blob URLs, save file paths
  4. Continue scrolling until no new matches for many cycles
  5. Save updated data with local file paths
"""
import asyncio, json, os, re, hashlib, base64, shutil, sys, time
from datetime import datetime, timezone, timedelta
from difflib import SequenceMatcher
from collections import defaultdict
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA_DIR = os.path.join(BASE_DIR, "media")
DATA_DIR = os.path.join(BASE_DIR, "data")
RUNNER_TG_DIR = os.path.join(BASE_DIR, "runner tg")
os.makedirs(MEDIA_DIR, exist_ok=True)

EXTRACT_JS = """
() => {
    const scrollEl = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
    if (!scrollEl) return {error: 'no scrollable'};
    const bubbles = scrollEl.querySelectorAll('.bubble[data-mid]');
    const messages = [];
    for (const b of bubbles) {
        try {
            if (b.classList.contains('service')) continue;
            const mid = b.getAttribute('data-mid');
            const ts = b.getAttribute('data-timestamp') || '0';
            
            // Text - try multiple selectors
            const textEl = b.querySelector('.message, .message-content, [class*="content"]');
            let text = textEl ? (textEl.innerText || textEl.textContent || '') : b.innerText || '';
            // Clean up Telegram UI elements (reactions, etc)
            text = text.replace(/\\d+\\.?\\d*k?[\\s]*\\ue951/g, '').replace(/\\ue951.*$/, '').trim();
            if (text.length === 0) text = b.innerText.replace(/\\d+\\.?\\d*k?[\\s]*\\ue951/g, '').trim();
            
            // Blob images
            const imgs = b.querySelectorAll('img[src*="blob:"]');
            const imgSrcs = Array.from(imgs).map(img => img.getAttribute('src') || '').filter(Boolean);
            
            // Blob videos
            const vids = b.querySelectorAll('video[src*="blob:"]');
            const vidSrcs = Array.from(vids).map(v => v.getAttribute('src') || '').filter(Boolean);
            
            // Also check source elements inside videos
            for (const v of b.querySelectorAll('video')) {
                for (const s of v.querySelectorAll('source[src*="blob:"]')) {
                    vidSrcs.push(s.getAttribute('src'));
                }
            }
            
            if (imgSrcs.length > 0 || vidSrcs.length > 0 || text.length > 3) {
                messages.push({mid, timestamp: ts, text: text.slice(0, 500), images: imgSrcs, videos: vidSrcs});
            }
        } catch(e) {}
    }
    return {
        scrollTop: scrollEl.scrollTop,
        scrollHeight: scrollEl.scrollHeight,
        count: messages.length,
        messages,
    };
}
"""

DOWNLOAD_JS = """
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

def text_similarity(a: str, b: str) -> float:
    a = re.sub(r'\\s+', ' ', a).strip().lower()[:100]
    b = re.sub(r'\\s+', ' ', b).strip().lower()[:100]
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()

def generate_filename(url: str, prefix='img') -> str:
    h = hashlib.md5(url.encode()).hexdigest()
    return f"{prefix}_{h}"

def download_blob_data(data_url: str) -> tuple:
    """Returns (success, final_path, ext)"""
    if not data_url or not isinstance(data_url, str) or ',' not in data_url:
        return (False, '', '')
    mime = data_url.split(';')[0].split(':')[1] if ':' in data_url else 'image/png'
    _, b64_data = data_url.split(',', 1)
    ext_map = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 
               'image/webp': '.webp', 'video/mp4': '.mp4', 'video/webm': '.webm',
               'image/jpg': '.jpg'}
    ext = ext_map.get(mime, '.bin')
    try:
        raw = base64.b64decode(b64_data)
        return (True, raw, ext)
    except:
        return (False, '', ext)

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]

        if 'RunnerXBT' not in page.url:
            await page.goto("https://web.telegram.org/k/#@RunnerXBT_Insights")
            await asyncio.sleep(5)

        # Load existing messages
        existing_path = os.path.join(DATA_DIR, "messages_enriched.json")
        with open(existing_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
        print(f"Loaded {len(existing)} existing messages")

        # Index existing msgs by cleaned text for matching
        for msg in existing:
            text = re.sub(r'\\s+', ' ', msg.get('text', '')).strip().lower()[:150]
            msg['_clean'] = text

        # Track messages that need images (have blob URLs)
        need_images = []
        for msg in existing:
            for img in msg.get('images', []):
                if 'blob:' in img:
                    need_images.append(msg)
                    break
        print(f"Messages needing blob image downloads: {len(need_images)}")
        
        # Track which existing msgs have been matched to blob URLs
        matched_mids = set()  # index in existing list that matched
        blob_to_file = {}  # blob_url -> local_path
        
        # Phase 1: Scroll and match
        print(f"\nPhase 1: Scrolling through channel to match messages...")
        no_new_streak = 0
        total_blobs_downloaded = 0
        start_time = time.time()

        for cycle in range(300):
            await page.evaluate("""
                const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                if (el) { el.scrollTop = 0; el.dispatchEvent(new Event('scroll', {bubbles: true})); }
            """)
            await asyncio.sleep(3.0)

            new_match_count = 0
            
            for substep in range(8):
                data = await page.evaluate(EXTRACT_JS)
                if 'error' in data:
                    await asyncio.sleep(1)
                    continue

                for m in data.get('messages', []):
                    dom_text = re.sub(r'\\s+', ' ', m.get('text', '')).strip().lower()[:150]
                    if not dom_text and not m.get('images') and not m.get('videos'):
                        continue

                    blob_urls = list(set(m.get('images', []) + m.get('videos', [])))
                    if not blob_urls:
                        continue

                    # Try to match this DOM message to an existing message
                    best_idx = -1
                    best_score = 0.0
                    
                    for i, em in enumerate(existing):
                        if i in matched_mids:
                            continue
                        score = text_similarity(dom_text, em['_clean'])
                        if score > best_score:
                            best_score = score
                            best_idx = i
                    
                    if best_score >= 0.5 and best_idx >= 0:
                        matched_mids.add(best_idx)
                        new_match_count += 1
                        
                        # Download blob URLs
                        local_paths = []
                        for blob_url in blob_urls:
                            if blob_url in blob_to_file:
                                local_paths.append(blob_to_file[blob_url])
                                continue
                            
                            fname = generate_filename(blob_url, 'blob')
                            save_path = os.path.join(MEDIA_DIR, fname)
                            
                            data_url = await page.evaluate(DOWNLOAD_JS, blob_url)
                            ok, raw_data, ext = download_blob_data(data_url)
                            if ok:
                                final_path = os.path.splitext(save_path)[0] + ext
                                with open(final_path, 'wb') as f:
                                    f.write(raw_data)
                                blob_to_file[blob_url] = final_path
                                local_paths.append(final_path)
                                total_blobs_downloaded += 1
                            else:
                                local_paths.append(blob_url)
                        
                        # Update existing message with local paths
                        rel_paths = []
                        for p in local_paths:
                            try:
                                rel = os.path.relpath(p, DATA_DIR)
                                rel_paths.append(rel)
                            except:
                                rel_paths.append(p)
                        existing[best_idx]['images'] = rel_paths

                # Scroll down
                await page.evaluate("""
                    const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                    if (el) {
                        const maxS = Math.max(0, el.scrollHeight - el.clientHeight);
                        el.scrollTop = Math.min(maxS, el.scrollTop + el.clientHeight * 0.85);
                        el.dispatchEvent(new Event('scroll', {bubbles: true}));
                    }
                """)
                await asyncio.sleep(1.2)

            elapsed = time.time() - start_time
            pct = f"{len(matched_mids)*100//max(len(need_images),1)}%"
            print(f"  Cycle {cycle+1:3d} | Matched: {len(matched_mids):4d}/{len(need_images)} ({pct}) | +{new_match_count:3d} this cycle | Downloaded: {total_blobs_downloaded} | {elapsed:.0f}s")

            if new_match_count == 0:
                no_new_streak += 1
                if no_new_streak >= 20:
                    print(f"\n  No new matches for {no_new_streak} cycles. Moving on.")
                    break
            else:
                no_new_streak = 0

        # Phase 2: Save
        print(f"\nPhase 2: Saving updated data...")
        
        # Clean up existing data
        for msg in existing:
            msg.pop('_clean', None)
            # Clean timestamp to ISO if needed
            ts = msg.get('timestamp')
            if ts and isinstance(ts, str):
                try:
                    # Try to parse timestamp
                    msg['date'] = ts
                except:
                    pass

        # Save updated
        updated_path = os.path.join(DATA_DIR, "messages_enriched_with_media.json")
        with open(updated_path, 'w', encoding='utf-8') as f:
            json.dump(existing, f, ensure_ascii=False, indent=1)
        print(f"  Saved: {updated_path}")

        # Copy media
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
        shutil.copy2(updated_path, os.path.join(RUNNER_TG_DIR, "messages_enriched_with_media.json"))
        
        # Stats
        with_media = sum(1 for m in existing if m.get('images') and not any('blob:' in i for i in m['images']))
        still_blob = sum(1 for m in existing if any('blob:' in i for i in m.get('images', [])))
        print(f"\n  Messages with local media: {with_media}")
        print(f"  Messages still with blob URLs: {still_blob}")
        print(f"  Total media files: {total_blobs_downloaded}")
        print(f"\n{'='*60}")
        print(f"ALL DONE")
        print(f"{'='*60}")

asyncio.run(main())

"""
Scraper v8 — Systematic scroll through entire channel, extract blob URLs + download, match to existing data

Approach:
  Phase 1: Scroll from bottom to top in small increments
           At each step: extract all visible bubbles (text + blob URLs + scroll position)
                        download all blob URLs immediately
           Goal: capture every message's blob URL at least once
  Phase 2: Match extracted messages to existing messages_enriched.json by text similarity
           Copy local file paths
  Phase 3: Save final data
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
            
            const textEl = b.querySelector('.message, .message-content, [class*="content"]');
            let text = textEl ? (textEl.innerText || textEl.textContent || '') : b.innerText || '';
            text = text.replace(/[\\ue900-\\uea00\\ue951\\ue950]/g, '').trim();
            if (text.length === 0) text = b.innerText.replace(/[\\ue900-\\uea00\\ue951\\ue950]/g, '').trim();
            
            const imgs = b.querySelectorAll('img[src*="blob:"]');
            const imgSrcs = Array.from(imgs).map(img => img.getAttribute('src') || '').filter(Boolean);
            
            const vids = b.querySelectorAll('video[src*="blob:"], video source[src*="blob:"]');
            const vidSrcs = Array.from(vids).map(v => v.getAttribute('src') || '').filter(Boolean);
            
            if (imgSrcs.length > 0 || vidSrcs.length > 0 || text.length > 2) {
                messages.push({mid, timestamp: ts, text: text.slice(0, 300), images: imgSrcs, videos: vidSrcs});
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

def generate_filename(url_or_data, prefix='img'):
    h = hashlib.md5(str(url_or_data).encode()).hexdigest()
    return f"{prefix}_{h}"

def text_similarity(a: str, b: str) -> float:
    a = re.sub(r'[^a-z0-9$%\\s]', ' ', re.sub(r'\\s+', ' ', a).strip().lower())[:150]
    b = re.sub(r'[^a-z0-9$%\\s]', ' ', re.sub(r'\\s+', ' ', b).strip().lower())[:150]
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]

        # Make sure we're on Telegram K version
        if 'web.telegram.org/k/' not in page.url and 'RunnerXBT' not in page.url:
            await page.goto("https://web.telegram.org/k/#@RunnerXBT_Insights")
            await asyncio.sleep(6)
        elif 'web.telegram.org/a/' in page.url:
            # Navigate from A to K
            await page.goto("https://web.telegram.org/k/#@RunnerXBT_Insights")
            await asyncio.sleep(6)
        elif 'RunnerXBT' not in page.url:
            await page.goto("https://web.telegram.org/k/#@RunnerXBT_Insights")
            await asyncio.sleep(6)

        page_info = await page.evaluate("() => ({url: location.href, title: document.title})")
        print(f"Page: {page_info['title']} — {page_info['url']}")

        # ── Phase 1: Scroll & Extract ──
        print(f"\n{'='*60}")
        print(f"PHASE 1: Systematic scroll and extract")
        print(f"{'='*60}")
        
        scraped = {}
        blob_downloaded = 0
        media_files = {}
        
        async def try_download(blob_url):
            nonlocal blob_downloaded
            fname = generate_filename(blob_url, 'blob')
            save_path = os.path.join(MEDIA_DIR, fname)
            if os.path.exists(save_path) and os.path.getsize(save_path) > 0:
                return save_path
            data_url = await page.evaluate(DOWNLOAD_JS, blob_url)
            if data_url and isinstance(data_url, str) and ',' in data_url:
                mime = data_url.split(';')[0].split(':')[1] if ':' in data_url else 'image/png'
                _, b64_data = data_url.split(',', 1)
                ext_map = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 
                           'image/webp': '.webp', 'video/mp4': '.mp4', 'video/webm': '.webm'}
                ext = ext_map.get(mime, '.bin')
                final_path = os.path.splitext(save_path)[0] + ext
                try:
                    raw = base64.b64decode(b64_data)
                    with open(final_path, 'wb') as f:
                        f.write(raw)
                    blob_downloaded += 1
                    return final_path
                except:
                    pass
            return None

        # Get initial scroll info
        info = await page.evaluate("""
            () => {
                const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                if (!el) return {st: 0, sh: 0, ch: 0, error: 'no element'};
                return {st: el.scrollTop, sh: el.scrollHeight, ch: el.clientHeight};
            }
        """)
        print(f"  Initial scroll: st={info['st']:.0f} sh={info['sh']} ch={info['ch']}")
        if info.get('error'):
            print(f"  ERROR: {info['error']}")
            return
        
        # Scroll to top first to trigger loading
        await page.evaluate("""
            const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
            if (el) { el.scrollTop = 0; el.dispatchEvent(new Event('scroll', {bubbles: true})); }
        """)
        await asyncio.sleep(3)
        
        info = await page.evaluate("""
            () => {
                const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                if (!el) return {};
                return {st: el.scrollTop, sh: el.scrollHeight, ch: el.clientHeight};
            }
        """)
        print(f"  After scroll to top: st={info.get('st',0):.0f} sh={info.get('sh',0)} ch={info.get('ch',0)}")
        
        # Main scroll cycle
        start_time = time.time()
        no_new_streak = 0
        
        for cycle in range(500):
            # Scroll to top (triggers loading older messages)
            await page.evaluate("""
                const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                if (el) { el.scrollTop = 0; el.dispatchEvent(new Event('scroll', {bubbles: true})); }
            """)
            await asyncio.sleep(2.5)
            
            new_in_cycle = 0
            
            for substep in range(10):
                data = await page.evaluate(EXTRACT_JS)
                if 'error' in data:
                    await asyncio.sleep(1)
                    continue
                
                for m in data.get('messages', []):
                    mid = m['mid']
                    if mid in scraped:
                        continue
                    
                    scraped[mid] = {
                        'text': m.get('text', ''),
                        'timestamp': m.get('timestamp', '0'),
                        'images': m.get('images', []),
                        'videos': m.get('videos', []),
                    }
                    new_in_cycle += 1
                    
                    # Download blob media
                    all_blobs = list(set(m.get('images', []) + m.get('videos', [])))
                    local_paths = []
                    for blob_url in all_blobs:
                        local_path = await try_download(blob_url)
                        if local_path:
                            local_paths.append(local_path)
                    media_files[mid] = local_paths
                
                # Scroll down 85% of viewport
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
            sh = data.get('scrollHeight', '?')
            print(f"  Cycle {cycle+1:3d} | Unique: {len(scraped):4d} | +{new_in_cycle:3d} | DL: {blob_downloaded:3d} | sh={sh} | {elapsed:.0f}s")
            
            if new_in_cycle == 0:
                no_new_streak += 1
                if no_new_streak >= 25:
                    print(f"\n  >> No new messages for {no_new_streak} cycles. Phase 1 done.")
                    break
            else:
                no_new_streak = 0
            
            if len(scraped) >= 3500:
                print(f"\n  >> Collected {len(scraped)} unique messages. Phase 1 done.")
                break
        
        # ── Phase 2: Match ──
        print(f"\n{'='*60}")
        print(f"PHASE 2: Match scraped data to existing messages")
        print(f"{'='*60}")
        
        existing_path = os.path.join(DATA_DIR, "messages_enriched.json")
        with open(existing_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
        print(f"  Existing messages: {len(existing)}")
        print(f"  Scraped unique messages: {len(scraped)}")
        
        existing_with_blobs = []
        for i, m in enumerate(existing):
            for img in m.get('images', []):
                if 'blob:' in img:
                    existing_with_blobs.append(i)
                    break
        print(f"  Existing messages needing images: {len(existing_with_blobs)}")
        
        scraped_texts = {}
        for mid, m in scraped.items():
            clean = re.sub(r'[^a-z0-9$%\\s]', ' ', re.sub(r'\\s+', ' ', m['text']).strip().lower())[:150]
            if clean:
                scraped_texts[mid] = clean
        
        matched_count = 0
        for idx in existing_with_blobs:
            ex_text = re.sub(r'[^a-z0-9$%\\s]', ' ', re.sub(r'\\s+', ' ', existing[idx].get('text', '')).strip().lower())[:150]
            if not ex_text:
                continue
            
            best_mid = None
            best_score = 0.0
            for mid, sc_text in scraped_texts.items():
                score = text_similarity(ex_text, sc_text)
                if score > best_score and score > 0.4:
                    best_score = score
                    best_mid = mid
            
            if best_mid and best_mid in media_files and media_files[best_mid]:
                local_paths = media_files[best_mid]
                rel_paths = []
                for p in local_paths:
                    try:
                        rel = os.path.relpath(p, DATA_DIR)
                        rel_paths.append(rel)
                    except:
                        rel_paths.append(p)
                existing[idx]['images'] = rel_paths
                matched_count += 1
        
        print(f"  Matched & updated: {matched_count}")
        
        # ── Phase 3: Save ──
        print(f"\n{'='*60}")
        print(f"PHASE 3: Save")
        print(f"{'='*60}")
        
        updated_path = os.path.join(DATA_DIR, "messages_enriched_with_media.json")
        with open(updated_path, 'w', encoding='utf-8') as f:
            json.dump(existing, f, ensure_ascii=False, indent=1)
        print(f"  Saved: {updated_path}")
        
        data_media = os.path.join(DATA_DIR, "media")
        os.makedirs(data_media, exist_ok=True)
        for fname in os.listdir(MEDIA_DIR):
            src = os.path.join(MEDIA_DIR, fname)
            if os.path.isfile(src):
                shutil.copy2(src, os.path.join(data_media, fname))
        
        os.makedirs(RUNNER_TG_DIR, exist_ok=True)
        runner_media = os.path.join(RUNNER_TG_DIR, "media")
        os.makedirs(runner_media, exist_ok=True)
        for fname in os.listdir(MEDIA_DIR):
            src = os.path.join(MEDIA_DIR, fname)
            if os.path.isfile(src):
                shutil.copy2(src, os.path.join(runner_media, fname))
        shutil.copy2(updated_path, os.path.join(RUNNER_TG_DIR, "messages_enriched_with_media.json"))
        
        total_media_files = sum(1 for f in os.listdir(MEDIA_DIR) if os.path.isfile(os.path.join(MEDIA_DIR, f)))
        final_with_media = sum(1 for m in existing if m.get('images') and not any('blob:' in i for i in m.get('images', [])))
        still_blob = sum(1 for m in existing if any('blob:' in i for i in m.get('images', [])))
        
        print(f"\n{'='*60}")
        print(f"SUMMARY")
        print(f"  Scraped unique messages: {len(scraped)}")
        print(f"  Media files downloaded: {blob_downloaded}")
        print(f"  Total media files on disk: {total_media_files}")
        print(f"  Existing msgs with local media: {final_with_media}")
        print(f"  Existing msgs still with blob URLs: {still_blob}")
        print(f"  Duration: {time.time()-start_time:.0f}s")
        print(f"{'='*60}")

asyncio.run(main())

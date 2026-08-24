"""
Telegram Channel Scraper v5 — Scrape @RunnerXBT_Insights with proper virtual scrolling

Approach:
  1. Start at bottom (newest messages)
  2. Each cycle: scroll TOP (triggers loading older messages) → extract all bubbles
  3. Track unique messages by data-mid
  4. Download blob media (images/videos) via fetch() + data URL
  5. Stop when no new messages for N consecutive cycles
  
Output:
  - data/messages_clean_v5.json — Full scraped messages
  - data/media/ — Downloaded media files
"""
import asyncio, json, os, re, time, hashlib, base64
from datetime import datetime, timezone, timedelta
from playwright.async_api import async_playwright

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA_DIR = os.path.join(BASE_DIR, "media")
DATA_DIR = os.path.join(BASE_DIR, "data")
RUNNER_TG_DIR = os.path.join(BASE_DIR, "runner tg")

os.makedirs(MEDIA_DIR, exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, "media"), exist_ok=True)


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


def ts_to_iso(ts: int) -> str:
    dt = datetime.fromtimestamp(ts, tz=timezone.utc) + timedelta(hours=8)
    return dt.isoformat()


def generate_filename(url: str) -> str:
    h = hashlib.md5(url.encode()).hexdigest()
    if url.startswith("blob:"):
        return f"blob_{h}.png"
    ext = os.path.splitext(url.split('?')[0].split('#')[0])[1] or '.jpg'
    return f"img_{h}{ext}"


EXTRACT_JS = """
() => {
    const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
    if (!el) return {error: 'no scrollable'};
    const bubbles = el.querySelectorAll('.bubble[data-mid]');
    const messages = [];
    for (const b of bubbles) {
        try {
            const mid = b.getAttribute('data-mid');
            const timestamp = b.getAttribute('data-timestamp') || '0';
            const isService = b.classList.contains('service');
            let text = '';
            if (!isService) {
                const textEl = b.querySelector('.message, .message-content, [class*=content]');
                text = textEl ? (textEl.innerText || textEl.textContent || '') : b.innerText || '';
            }
            const imgs = b.querySelectorAll('img[src]');
            const imgSrcs = [];
            for (const img of imgs) {
                const src = img.getAttribute('src') || '';
                // Skip Telegram emoji images
                if (src && !src.startsWith('blob:https://web.telegram.org/a/img-apple-64/')) {
                    imgSrcs.push(src);
                }
            }
            const vids = b.querySelectorAll('video[src]');
            const vidSrcs = Array.from(vids).map(v => v.getAttribute('src') || '').filter(s => s && !s.startsWith('blob:https://'));
            messages.push({mid, timestamp, text, images: imgSrcs, videos: vidSrcs, isService});
        } catch(e) {}
    }
    return {
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        count: messages.length,
        messages,
    };
}
"""


async def download_blob(page, blob_url: str, save_path: str) -> tuple:
    """Download a blob URL from browser. Returns (success, final_path)."""
    try:
        esc_url = blob_url.replace("'", "\\'")
        data_url = await page.evaluate(f"""
            async () => {{
                try {{
                    const resp = await fetch('{esc_url}');
                    if (!resp.ok) return 'ERR_HTTP:' + resp.status;
                    const blob = await resp.blob();
                    return await new Promise((resolve, reject) => {{
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = () => resolve('ERR_FILEREADER');
                        setTimeout(() => resolve('ERR_TIMEOUT'), 15000);
                        reader.readAsDataURL(blob);
                    }});
                }} catch(e) {{ return 'ERR:' + e.message; }}
            }}
        """)
        if data_url and isinstance(data_url, str) and ',' in data_url:
            mime = data_url.split(';')[0].split(':')[1] if ':' in data_url else 'image/png'
            _, b64_data = data_url.split(',', 1)
            ext_map = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'video/mp4': '.mp4', 'video/webm': '.webm'}
            ext = ext_map.get(mime, '.bin')
            final_path = os.path.splitext(save_path)[0] + ext
            raw = base64.b64decode(b64_data)
            with open(final_path, 'wb') as f:
                f.write(raw)
            return (True, final_path)
        return (False, save_path)
    except Exception as e:
        return (False, save_path)


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]

        if 'RunnerXBT' not in page.url:
            await page.goto("https://web.telegram.org/k/#@RunnerXBT_Insights")
            await asyncio.sleep(5)

        print(f"\n{'='*60}")
        print(f"SCRAPER v5 — @RunnerXBT_Insights")
        print(f"Media dir: {MEDIA_DIR}")
        print(f"{'='*60}\n")

        all_msgs = {}  # data-mid -> message
        no_new_streak = 0
        total_media = 0
        start_time = time.time()

        for cycle in range(500):
            # ── Scroll to top to trigger loading ──
            await page.evaluate("""
                const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                if (el) { el.scrollTop = 0; el.dispatchEvent(new Event('scroll', {bubbles: true})); }
            """)
            await asyncio.sleep(2.5)

            new_this_cycle = 0
            media_this_cycle = 0

            # ── Scroll down in steps, extracting at each step ──
            for substep in range(6):
                data = await page.evaluate(EXTRACT_JS)
                if 'error' in data:
                    await asyncio.sleep(2)
                    continue

                st = data.get('scrollTop', 0)
                sh = data.get('scrollHeight', 0)

                for m in data.get('messages', []):
                    mid = m['mid']
                    if mid in all_msgs or m.get('isService'):
                        continue

                    msg = {
                        "id": int(mid),
                        "data_mid": int(mid),
                        "timestamp": int(m['timestamp']),
                        "datetime": ts_to_iso(int(m['timestamp'])),
                        "text": clean_text(m['text']),
                        "raw_text": m['text'],
                        "level": classify_post(m['text']),
                        "images": [],
                        "videos": [],
                        "links": re.findall(r'https?://[^\s]+', m['text']),
                    }

                    # Download blob images
                    for img_url in m.get('images', []):
                        if img_url.startswith('blob:'):
                            fname = generate_filename(img_url)
                            save_path = os.path.join(MEDIA_DIR, fname)
                            if not os.path.exists(save_path):
                                ok, final_path = await download_blob(page, img_url, save_path)
                                if ok:
                                    total_media += 1
                                    media_this_cycle += 1
                                    rel = os.path.relpath(final_path, DATA_DIR)
                                    msg['images'].append(rel)
                                else:
                                    msg['images'].append(img_url)
                            else:
                                rel = os.path.relpath(save_path, DATA_DIR)
                                msg['images'].append(rel)
                        else:
                            msg['images'].append(img_url)

                    # Download blob videos
                    for vid_url in m.get('videos', []):
                        if vid_url.startswith('blob:'):
                            fname = generate_filename(vid_url)
                            save_path = os.path.join(MEDIA_DIR, fname)
                            if not os.path.exists(save_path):
                                ok, final_path = await download_blob(page, vid_url, save_path)
                                if ok:
                                    total_media += 1
                                    media_this_cycle += 1
                                    rel = os.path.relpath(final_path, DATA_DIR)
                                    msg['videos'].append(rel)
                                else:
                                    msg['videos'].append(vid_url)
                            else:
                                rel = os.path.relpath(save_path, DATA_DIR)
                                msg['videos'].append(rel)
                        else:
                            msg['videos'].append(vid_url)

                    all_msgs[mid] = msg
                    new_this_cycle += 1

                # Scroll down 85%
                await page.evaluate("""
                    const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                    if (el) {
                        const maxS = Math.max(0, el.scrollHeight - el.clientHeight);
                        el.scrollTop = Math.min(maxS, el.scrollTop + el.clientHeight * 0.85);
                        el.dispatchEvent(new Event('scroll', {bubbles: true}));
                    }
                """)
                await asyncio.sleep(1.2)

            # ── Progress ──
            elapsed = time.time() - start_time
            print(f"  Cycle {cycle+1:3d} | Total: {len(all_msgs):5d} | +{new_this_cycle:3d} new | +{media_this_cycle} media | sh={sh} | {elapsed:.0f}s")

            if new_this_cycle == 0:
                no_new_streak += 1
                if no_new_streak >= 15:
                    print(f"\n>> No new messages for {no_new_streak} cycles. Done!")
                    break
            else:
                no_new_streak = 0

            if len(all_msgs) >= 3500:
                print(f"\n>> Reached 3500 messages. Likely all captured.")
                break

        # ── Save results ──
        elapsed = time.time() - start_time
        print(f"\n{'='*60}")
        print(f"SCRAPE COMPLETE")
        print(f"  Duration: {elapsed:.0f}s")
        print(f"  Total unique messages: {len(all_msgs)}")
        print(f"  Total media downloaded: {total_media}")
        print(f"{'='*60}\n")

        # Sort by timestamp
        sorted_msgs = sorted(all_msgs.values(), key=lambda x: x['timestamp'])
        
        # Reassign sequential IDs
        for i, m in enumerate(sorted_msgs):
            m['id'] = i

        # Save to data/
        clean_path = os.path.join(DATA_DIR, "messages_clean_v5.json")
        with open(clean_path, 'w', encoding='utf-8') as f:
            json.dump(sorted_msgs, f, ensure_ascii=False, indent=1)
        print(f"Saved {len(sorted_msgs)} messages to {clean_path}")

        # Daily index
        from collections import defaultdict
        daily = defaultdict(list)
        for m in sorted_msgs:
            day = m['datetime'][:10]
            daily[day].append(m['id'])
        daily_path = os.path.join(DATA_DIR, "messages_daily_v5.json")
        with open(daily_path, 'w', encoding='utf-8') as f:
            json.dump(dict(daily), f, ensure_ascii=False, indent=1)

        # Copy media to data/media
        import shutil
        data_media = os.path.join(DATA_DIR, "media")
        os.makedirs(data_media, exist_ok=True)
        for fname in os.listdir(MEDIA_DIR):
            src = os.path.join(MEDIA_DIR, fname)
            if os.path.isfile(src):
                shutil.copy2(src, os.path.join(data_media, fname))
        media_count = len([f for f in os.listdir(MEDIA_DIR) if os.path.isfile(os.path.join(MEDIA_DIR, f))])
        print(f"  Media: {media_count} files in {MEDIA_DIR}")

        # Copy to runner tg/
        runner_media = os.path.join(RUNNER_TG_DIR, "media")
        os.makedirs(runner_media, exist_ok=True)
        for fname in os.listdir(MEDIA_DIR):
            src = os.path.join(MEDIA_DIR, fname)
            if os.path.isfile(src):
                shutil.copy2(src, os.path.join(runner_media, fname))
        shutil.copy2(clean_path, os.path.join(RUNNER_TG_DIR, "messages_clean_v5.json"))
        shutil.copy2(daily_path, os.path.join(RUNNER_TG_DIR, "messages_daily_v5.json"))
        print(f"  Copied to {RUNNER_TG_DIR}/")

        print(f"\n{'='*60}")
        print(f"ALL DONE!")
        print(f"{'='*60}")

        return sorted_msgs


if __name__ == '__main__':
    asyncio.run(main())

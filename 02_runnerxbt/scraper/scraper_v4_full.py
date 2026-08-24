"""
RunnerXBT Scraper v4 — Full scrape with media download + data cleaning
- Connects via CDP to existing Chrome session (must be logged into Telegram Web)
- Scrapes ALL messages from @RunnerXBT_Insights
- Downloads all images/videos from blob URLs
- Saves cleaned data to data/ and runner tg/
"""
import asyncio, json, re, os, base64, time, html as h
from pathlib import Path
from datetime import datetime
from playwright.async_api import async_playwright

# ── Paths ──
BASE_DIR = Path("D:/Vibe Coding 项目合集/runnerxbt")
DATA_DIR = BASE_DIR / "data"
MEDIA_DIR = BASE_DIR / "media"
RUNNER_TG_DIR = BASE_DIR / "runner tg"
RUNNER_TG_MEDIA = RUNNER_TG_DIR / "media"
for d in [MEDIA_DIR, RUNNER_TG_DIR, RUNNER_TG_MEDIA]:
    d.mkdir(exist_ok=True)

# ── Deduplication ──
# Track downloaded blob URLs to avoid re-downloading
_downloaded_blobs = {}  # blob_url -> local_path
_media_counter = [0]    # unique filename counter

# ── Post Classification (same as frontend) ──
RED_KW = [
    "buy ","sell ","short ","long ","entry ","target ","tp ","sl ","bid ","ask ",
    "limit ","stop ","add ","trim ","position","size","fill","dump","pump",
    "profit","loss","leverage","margin","hedge","shorting","longing",
    "bought","sold","exit","entered","calls","puts","spread","allocation",
    "portfolio","swing","scalp","dca","positioning","exposure",
]
YELLOW_KW = [
    "market","sector","flow","mood","feel","analysis","chart","trend",
    "liquidity","volatility","correlation","macro","economy","fed","rate",
    "inflation","earnings","revenue","guidance","valuation","cap","mcap",
    "dominance","stoch","rsi","volume","support","resistance",
    "looking at","watching","setup","forming","breaking","consolidation",
]

def classify_post(text):
    if not text:
        return "blue"
    t = text.lower()
    score = 0
    for kw in RED_KW:
        i = -1
        while True:
            i = t.find(kw, i + 1)
            if i == -1:
                break
            score += 2
    for kw in YELLOW_KW:
        i = -1
        while True:
            i = t.find(kw, i + 1)
            if i == -1:
                break
            score += 1
    pct = re.findall(r"\d+\.?\d*%", t)
    if pct:
        score += len(pct) * 2
    dollar = re.findall(r"\$\d+(?:,\d{3})*(?:\.\d+)?", t)
    if dollar:
        score += len(dollar) * 2
    emoji_count = len(re.findall(r'[\U0001F300-\U0001FAFF]', t))
    emoji_ratio = emoji_count / max(len(t), 1)
    if emoji_ratio > 0.15 or len(t) < 10:
        return "blue"
    if score >= 3:
        return "red"
    if score >= 1:
        return "yellow"
    return "blue"


async def download_blob(page, blob_url):
    """Download a blob URL, save to media/, return (local_path, content_type)."""
    if blob_url in _downloaded_blobs:
        return _downloaded_blobs[blob_url]

    try:
        b64 = await page.evaluate("""
            async (url) => {
                try {
                    const resp = await fetch(url);
                    const blob = await resp.blob();
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                } catch(e) { return "ERR:" + e.message; }
            }
        """, blob_url)

        if b64.startswith("ERR:"):
            print(f"      [FAIL] blob: {b64[:60]}")
            _downloaded_blobs[blob_url] = blob_url  # keep original as fallback
            return blob_url

        # Parse data URL
        header, data = b64.split(",", 1)
        raw = base64.b64decode(data)
        # Determine extension from content-type
        ct = header.split(";")[0].split(":")[1] if ":" in header else "image/png"
        ext_map = {"image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg",
                    "image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg",
                    "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov"}
        ext = ext_map.get(ct, ct.split("/")[-1])
        if ext == "jpeg":
            ext = "jpg"

        _media_counter[0] += 1
        fname = f"media_{_media_counter[0]:05d}.{ext}"
        fpath = MEDIA_DIR / fname
        fpath.write_bytes(raw)
        rel_path = f"media/{fname}"
        _downloaded_blobs[blob_url] = rel_path
        return rel_path
    except Exception as e:
        print(f"      [ERROR] downloading blob: {e}")
        _downloaded_blobs[blob_url] = blob_url
        return blob_url


def parse_aria_date(aria_label):
    """Parse Telegram aria-label like '12:00 AM, July 20, 2026' -> '2026-07-20'"""
    if not aria_label:
        return None
    # Try common Telegram formats
    for fmt in ["%I:%M %p, %B %d, %Y", "%I:%M %p, %B %d, %Y",
                "%H:%M, %B %d, %Y", "%I:%M %p, %B %d",
                "%b %d, %Y %I:%M %p", "%Y-%m-%d"]:
        try:
            dt = datetime.strptime(aria_label.strip(), fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def extract_date_from_data(data_attrs):
    """Try to extract a date from data attributes."""
    # Check common Telegram data attributes
    for key in ["data-date", "data-message-date", "data-send-date", "data-original-date"]:
        val = data_attrs.get(key, "")
        if val:
            try:
                ts = int(val)
                if ts > 1e8:  # looks like unix ms
                    return datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d")
            except (ValueError, TypeError):
                pass
    return None


def clean_text(text):
    """Clean message text."""
    if not text:
        return ""
    # Normalize whitespace
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()
    return text


async def scrape_channel(page, existing_count=0):
    """Main scrape loop. Returns list of cleaned message dicts."""
    all_msgs = {}  # key -> msg dict
    no_new_steps = 0
    total_seen = 0
    total_downloaded = 0

    print(f"\n{'='*60}")
    print(f"STARTING SCRAPE — Target: @RunnerXBT_Insights")
    print(f"Media dir: {MEDIA_DIR}")
    print(f"Existing messages in session: {existing_count}")
    print(f"{'='*60}\n")

    for step in range(500):
        # ── Extract messages from DOM ──
        msgs = await page.evaluate("""
            () => {
                const results = [];
                // Try multiple selectors for message wrappers
                const selectors = [
                    '.bubble',                    // Telegram K version
                    '.message-content-wrapper',   // Telegram K version
                    '.message',                   // General
                    '[data-message-id]',          // By attribute
                ];
                let wrappers = [];
                for (const sel of selectors) {
                    const found = document.querySelectorAll(sel);
                    if (found.length > 0) {
                        wrappers = found;
                        break;
                    }
                }

                for (const w of wrappers) {
                    // Collect data attributes
                    const data = {};
                    for (const attr of w.attributes) {
                        if (attr.name.startsWith('data-')) {
                            data[attr.name] = attr.value;
                        }
                    }

                    // Text content
                    const textEl = w.querySelector('.text-content, [class*="text-content"], .message-text, [class*="message-text"]');
                    let text = '';
                    if (textEl) {
                        text = textEl.innerText.trim();
                    } else {
                        text = w.innerText.trim();
                    }

                    // Timestamp
                    const timeEl = w.querySelector('.time, [class*="time"], .message-time, [class*="message-time"]');
                    const timestamp = timeEl ? timeEl.innerText.trim() : '';

                    // Aria label (often contains full date)
                    const ariaLabel = w.getAttribute('aria-label') || '';

                    // Links
                    const links = [];
                    for (const a of w.querySelectorAll('a')) {
                        if (a.href) links.push(a.href);
                    }

                    // Images
                    const images = [];
                    for (const img of w.querySelectorAll('img')) {
                        if (img.src) images.push(img.src);
                    }

                    // Videos
                    const videos = [];
                    for (const v of w.querySelectorAll('video')) {
                        if (v.src) videos.push(v.src);
                        for (const s of v.querySelectorAll('source')) {
                            if (s.src) videos.push(s.src);
                        }
                    }

                    results.push({
                        text, timestamp, ariaLabel, data,
                        links, images, videos,
                    });
                }
                return results;
            }
        """)

        # ── Process messages ──
        new_count = 0
        media_in_step = 0
        for m in msgs:
            text = clean_text(m["text"])
            if not text:
                continue

            # Create dedup key
            img_key = "|".join(m.get("images", []))
            link_key = "|".join(m.get("links", []))
            key = f"{text}|{img_key}|{link_key}"

            if key in all_msgs:
                continue

            # Extract date
            date = None
            d = parse_aria_date(m.get("ariaLabel", ""))
            if d:
                date = d
            if not date:
                d = extract_date_from_data(m.get("data", {}))
                if d:
                    date = d
            if not date:
                # Generate from timestamp pattern if present
                ts = m.get("timestamp", "")
                date = datetime.now().strftime("%Y-%m-%d")

            # Download media files
            local_images = []
            for img_url in m.get("images", []):
                if img_url.startswith("blob:"):
                    lp = await download_blob(page, img_url)
                    local_images.append(lp)
                    if not lp.startswith("blob:"):
                        media_in_step += 1
                else:
                    # Keep non-blob URLs (emoji, stickers, data URIs)
                    local_images.append(img_url)

            local_videos = []
            for vid_url in m.get("videos", []):
                if vid_url.startswith("blob:"):
                    lp = await download_blob(page, vid_url)
                    local_videos.append(lp)
                    if not lp.startswith("blob:"):
                        media_in_step += 1
                else:
                    local_videos.append(vid_url)

            # Build cleaned message
            clean_msg = {
                "id": total_seen,
                "text": text,
                "date": date,
                "timestamp": m.get("timestamp", ""),
                "ariaLabel": m.get("ariaLabel", ""),
                "images": local_images,
                "videos": local_videos,
                "links": m.get("links", []),
                "level": classify_post(text),
            }
            all_msgs[key] = clean_msg
            total_seen += 1
            new_count += 1

        total_downloaded += media_in_step

        # ── Scroll info ──
        scroll_info = await page.evaluate("""
            () => {
                const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable')
                    || document.querySelector('.MessageList')
                    || document.querySelector('[class*="messages-list"]')
                    || document.querySelector('.chat-container');
                if (!el) return null;
                return {
                    st: el.scrollTop,
                    sh: el.scrollHeight,
                    ch: el.clientHeight,
                };
            }
        """)

        # Log progress
        if new_count > 0 or step % 5 == 0:
            print(f"  Step {step:3d} | Total: {len(all_msgs):4d} | New: {new_count:3d} | "
                  f"Media: +{media_in_step} | "
                  f"Scroll: {scroll_info['st']:.0f}/{scroll_info['sh']:.0f}" if scroll_info else "")

        # ── Stop condition ──
        if new_count == 0:
            no_new_steps += 1
        else:
            no_new_steps = 0

        if no_new_steps >= 30:
            print(f"\n  No new messages for 30 steps. Done scraping!")
            break

        # ── Scroll down (load older messages) ──
        if scroll_info and scroll_info["sh"] > scroll_info["ch"]:
            await page.evaluate("""
                (si) => {
                    const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable')
                        || document.querySelector('.MessageList')
                        || document.querySelector('[class*="messages-list"]')
                        || document.querySelector('.chat-container');
                    if (!el) return;
                    el.scrollTop = Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + el.clientHeight * 0.8);
                    el.dispatchEvent(new Event('scroll', {bubbles: true}));
                }
            """, scroll_info)
        await asyncio.sleep(2)

    print(f"\n{'='*60}")
    print(f"SCRAPE COMPLETE")
    print(f"Total unique messages: {len(all_msgs)}")
    print(f"Total media downloaded: {_media_counter[0]}")
    print(f"{'='*60}\n")

    # Convert to list and assign sequential IDs
    result = []
    for idx, (key, msg) in enumerate(all_msgs.items()):
        msg["id"] = idx
        result.append(msg)

    return result


def clean_and_enrich(messages):
    """Post-scrape data cleaning and enrichment."""
    print("\n── Data Cleaning ──")

    # 1. Sort by date then timestamp
    def sort_key(m):
        d = m.get("date", "2000-01-01")
        t = m.get("timestamp", "00:00")
        # Normalize timestamp
        t_clean = re.sub(r"[^0-9:]", "", t)
        if not t_clean:
            t_clean = "00:00"
        return (d, t_clean)

    messages.sort(key=sort_key)
    print(f"  Sorted {len(messages)} messages by date")

    # 2. Reassign sequential IDs
    for i, m in enumerate(messages):
        m["id"] = i
    print(f"  Reassigned IDs 0-{len(messages)-1}")

    # 3. Remove duplicates (already deduped during scrape but double-check)
    seen_texts = set()
    unique = []
    for m in messages:
        # Use date + first 100 chars of text as duplicate key
        dup_key = f"{m['date']}|{m['text'][:100]}"
        if dup_key not in seen_texts:
            seen_texts.add(dup_key)
            unique.append(m)
    print(f"  Removed {len(messages) - len(unique)} duplicates (final check)")
    messages = unique

    # 4. Reassign IDs after dedup
    for i, m in enumerate(messages):
        m["id"] = i

    # 5. Clean text
    for m in messages:
        m["text"] = clean_text(m["text"])

    # 6. Ensure level is set
    for m in messages:
        if "level" not in m:
            m["level"] = classify_post(m["text"])

    # 7. Standardize image/video paths — ensure they exist locally
    for m in messages:
        m["images"] = [img for img in m.get("images", []) if img]
        m["videos"] = [vid for vid in m.get("videos", []) if vid]
        m["links"] = [link for link in m.get("links", []) if link]

    print(f"  Levels: red={sum(1 for m in messages if m.get('level')=='red')}, "
          f"yellow={sum(1 for m in messages if m.get('level')=='yellow')}, "
          f"blue={sum(1 for m in messages if m.get('level')=='blue')}")
    print(f"  Messages with images: {sum(1 for m in messages if m.get('images'))}")
    print(f"  Messages with videos: {sum(1 for m in messages if m.get('videos'))}")
    print(f"  Messages with links: {sum(1 for m in messages if m.get('links'))}")
    print(f"  Total cleaned: {len(messages)}")
    return messages


def save_data(messages, output_dir, label=""):
    """Save messages and build daily index + archive HTML."""
    output_dir.mkdir(exist_ok=True)
    media_out = output_dir / "media"
    media_out.mkdir(exist_ok=True)

    # Copy media files
    copied = 0
    for m in messages:
        for img in m.get("images", []):
            if not img.startswith("blob:") and not img.startswith("data:") and not img.startswith("http"):
                src = BASE_DIR / img
                if src.exists():
                    dst = media_out / src.name
                    if not dst.exists():
                        dst.write_bytes(src.read_bytes())
                        copied += 1
        for vid in m.get("videos", []):
            if not vid.startswith("blob:") and not vid.startswith("data:") and not vid.startswith("http"):
                src = BASE_DIR / vid
                if src.exists():
                    dst = media_out / src.name
                    if not dst.exists():
                        dst.write_bytes(src.read_bytes())
                        copied += 1
    print(f"  Copied {copied} new media files to {media_out}")

    # Save messages JSON
    msg_path = output_dir / "messages_clean.json"
    msg_path.write_text(json.dumps(messages, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  Saved messages: {msg_path} ({len(messages)} msgs)")

    # Build daily index
    daily = {}
    for m in messages:
        d = m.get("date", "unknown")
        if d not in daily:
            daily[d] = []
        daily[d].append({
            "id": m["id"],
            "text": m["text"],
            "timestamp": m.get("timestamp", ""),
            "images": m.get("images", []),
            "videos": m.get("videos", []),
            "links": m.get("links", []),
            "level": m.get("level", "blue"),
        })

    daily_path = output_dir / "messages_daily.json"
    daily_path.write_text(json.dumps(daily, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  Saved daily index: {daily_path} ({len(daily)} days)")

    # Build archive HTML
    html_parts = [
        '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
        '<title>RunnerXBT Insights Archive</title>'
        '<style>'
        'body{font-family:JetBrains Mono,monospace;background:#0c100e;color:#c8d8c8;max-width:800px;margin:0 auto;padding:20px}'
        'h1{color:#ffb000}.sub{color:#4a604a;font-size:12px}'
        '.p{background:#121a14;border:1px solid #1e2a20;padding:10px 14px;margin-bottom:8px}'
        '.d{font-size:10px;color:#4a604a;margin-bottom:4px}'
        '.t{font-size:10px;color:#80a080;margin-bottom:2px}'
        '.x{font-size:12px;white-space:pre-wrap;word-break:break-word;line-height:1.5;color:#c8d8c8}'
        'img,video{max-width:100%;margin-top:4px;border-radius:2px}'
        'a{color:#ffb000}'
        '.lvl{display:inline-block;font-size:8px;padding:0 4px;border-radius:2px;margin-left:4px}'
        '.lvl.r{background:#e04040;color:#fff}.lvl.y{background:#ffb000;color:#0c100e}.lvl.b{background:#4d9fff88;color:#fff}'
        '</style></head><body>'
        f'<h1>@RunnerXBT_Insights</h1>'
        f'<p class="sub">{len(messages)} posts · {len(daily)} days · '
        f'{sum(1 for m in messages if m.get("images"))} with images · '
        f'{sum(1 for m in messages if m.get("videos"))} with videos</p>'
    ]
    for m in messages:
        ts = m.get("timestamp", "")
        lvl = m.get("level", "blue")
        lvl_tag = f'<span class="lvl {lvl[0]}">{lvl.upper()}</span>'
        html_parts.append(f'<div class="p">')
        html_parts.append(f'<div class="d">{m.get("date","")} · {ts} {lvl_tag}</div>')
        html_parts.append(f'<div class="x">{h.escape(m.get("text",""))}</div>')
        for u in m.get("links", []):
            html_parts.append(f'<a href="{h.escape(u)}" target="_blank">{h.escape(u)}</a><br>')
        for u in m.get("images", []):
            if u.startswith("data:") or u.startswith("blob:"):
                html_parts.append(f'<img src="{h.escape(u)}" loading="lazy">')
            elif u.startswith("http"):
                html_parts.append(f'<img src="{h.escape(u)}" loading="lazy" referrerpolicy="no-referrer">')
            else:
                # Local file — copy to media_out and reference
                src_path = BASE_DIR / u
                if src_path.exists():
                    html_parts.append(f'<img src="media/{src_path.name}" loading="lazy">')
        for u in m.get("videos", []):
            if u.startswith("data:") or u.startswith("blob:"):
                html_parts.append(f'<video controls preload="metadata"><source src="{h.escape(u)}"></video>')
            elif u.startswith("http"):
                html_parts.append(f'<video controls preload="metadata"><source src="{h.escape(u)}"></video>')
            else:
                src_path = BASE_DIR / u
                if src_path.exists():
                    html_parts.append(f'<video controls preload="metadata"><source src="media/{src_path.name}"></video>')
        html_parts.append('</div>')

    html_parts.append('</body></html>')
    archive_path = output_dir / "archive.html"
    archive_path.write_text("\n".join(html_parts), encoding="utf-8")
    print(f"  Saved archive: {archive_path}")

    return messages


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        page = ctx.pages[0]

        print(f"Connected to Chrome — Page: {page.url[:120]}")

        # Ensure we're on the right channel
        if "runnerxbt" not in page.url.lower():
            print("WARNING: Not on @RunnerXBT_Insights. Navigating...")
            await page.goto("https://web.telegram.org/k/#@RunnerXBT_Insights")
            await asyncio.sleep(5)

        # PHASE 1: Scrape all messages with media download
        raw_messages = await scrape_channel(page)
        print(f"\nPhase 1 complete: {len(raw_messages)} raw messages extracted")

        # PHASE 2: Data cleaning
        cleaned = clean_and_enrich(raw_messages)
        print(f"\nPhase 2 complete: {len(cleaned)} cleaned messages")

        # PHASE 3: Save to data/ (for frontend)
        print(f"\n── Saving to data/ (frontend) ──")
        save_data(cleaned, DATA_DIR, "frontend")

        # PHASE 4: Save to runner tg/ (user copy)
        print(f"\n── Saving to runner tg/ (user copy) ──")
        save_data(cleaned, RUNNER_TG_DIR, "runner_tg")

        # ── Summary ──
        print(f"\n{'='*60}")
        print(f"ALL DONE!")
        print(f"  Messages: {len(cleaned)}")
        print(f"  Media files downloaded: {_media_counter[0]}")
        print(f"  Data saved to: {DATA_DIR}")
        print(f"  User copy saved to: {RUNNER_TG_DIR}")
        print(f"{'='*60}")

    # Keep browser alive (don't close it)


if __name__ == "__main__":
    asyncio.run(main())

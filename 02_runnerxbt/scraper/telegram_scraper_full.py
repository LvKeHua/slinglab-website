"""
FINAL scraper: reload page, scroll in patterns, extract ALL data including timestamps
"""
import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("D:/Vibe Coding 项目合集/runnerxbt")
CHANNEL_NAME = "RunnerXBT"

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        page = ctx.pages[0]
        
        # Navigate to telegram web
        await page.goto("https://web.telegram.org/k/", wait_until="domcontentloaded")
        await page.wait_for_timeout(4000)
        
        # Click channel
        clicked = await page.evaluate("""
            (channelName) => {
                const items = document.querySelectorAll('.ListItem.Chat.chat-item-clickable');
                for (const item of items) {
                    if (item.innerText.includes(channelName)) {
                        const rect = item.getBoundingClientRect();
                        return {x: rect.x + rect.width/2, y: rect.y + rect.height/2};
                    }
                }
                return null;
            }
        """, CHANNEL_NAME)
        
        if clicked:
            await page.mouse.click(clicked['x'], clicked['y'])
            await page.wait_for_timeout(5000)
            print("Clicked channel", flush=True)
        else:
            print("Channel not found!", flush=True)
            return
        
        all_msgs = {}  # key -> msg
        no_new = 0
        
        for step in range(300):
            # Extract with full data attributes
            msgs = await page.evaluate("""
                () => {
                    const results = [];
                    const wrappers = document.querySelectorAll('.message-content-wrapper');
                    for (const w of wrappers) {
                        // Get all data-* attributes from wrapper and its message
                        const allData = {};
                        for (const attr of w.attributes) {
                            if (attr.name.startsWith('data-')) {
                                allData[attr.name] = attr.value;
                            }
                        }
                        
                        // Also check the message element itself
                        const msgEl = w.closest('[data-message-id]') || w.querySelector('[data-message-id]');
                        if (msgEl) {
                            for (const attr of msgEl.attributes) {
                                if (attr.name.startsWith('data-')) {
                                    allData[attr.name] = attr.value;
                                }
                            }
                        }
                        
                        // Check message element with msg-id class
                        const msgIdEl = w.closest('.message') || w.querySelector('.message');
                        if (msgIdEl) {
                            for (const attr of msgIdEl.attributes) {
                                if (attr.name.startsWith('data-')) {
                                    allData[attr.name] = attr.value;
                                }
                            }
                        }
                        
                        // Check closest scroll-item or similar
                        const sci = w.closest('[id]');
                        if (sci && sci.id) allData['_parent_id'] = sci.id;
                        
                        const c = w.querySelector('[class*="message-content"]') || w;
                        
                        // Text content
                        const te = c.querySelector('.text-content, [class*="text-content"]');
                        let text = '';
                        if (te) {
                            text = te.innerText.trim();
                        } else if (c.innerText) {
                            text = c.innerText.trim();
                        }
                        
                        // Timestamp element - full text
                        const ti = c.querySelector('.message-time, [class*="message-time"]');
                        const timestamp = ti ? ti.innerText.trim() : '';
                        
                        // Also check aria-label on the message (often contains full date)
                        const aria = c.closest('[aria-label]') || w;
                        const ariaLabel = aria.getAttribute ? aria.getAttribute('aria-label') || '' : '';
                        
                        // Links
                        const links = [];
                        for (const a of c.querySelectorAll('a')) {
                            if (a.href) links.push(a.href);
                        }
                        
                        // Images
                        const images = [];
                        for (const img of c.querySelectorAll('img')) {
                            if (img.src) images.push(img.src);
                        }
                        
                        // Videos
                        const videos = [];
                        for (const v of c.querySelectorAll('video')) {
                            if (v.src) videos.push(v.src);
                            for (const s of v.querySelectorAll('source')) if (s.src) videos.push(s.src);
                        }
                        
                        results.push({
                            text,
                            timestamp,
                            ariaLabel,
                            allData,
                            links,
                            images,
                            videos
                        });
                    }
                    return results;
                }
            """)
            
            # Deduplicate
            new_count = 0
            for m in msgs:
                key = m['text'] + '|' + '|'.join(m['images']) + '|' + '|'.join(m['links'])
                if key not in all_msgs:
                    all_msgs[key] = m
                    new_count += 1
            
            # Scroll info
            si = await page.evaluate("""
                () => {
                    const el = document.querySelector('.MessageList');
                    if (!el) return null;
                    return {st: el.scrollTop, sh: el.scrollHeight, ch: el.clientHeight};
                }
            """)
            
            if new_count > 0 or step % 10 == 0:
                print(f"  Step {step:3d} | Coll: {len(all_msgs):4d} | New: {new_count:3d} | st={si['st']:.0f} sh={si['sh']:.0f}" + (f" | NoNew: {no_new}" if no_new else ""), flush=True)
            
            if new_count == 0:
                no_new += 1
            else:
                no_new = 0
            
            if no_new >= 40:
                print(f"\n  No new for 40 steps. DONE!", flush=True)
                break
            
            # Scroll down then up pattern
            if si and si['sh'] > si['ch']:
                await page.evaluate("""
                    (si) => {
                        const el = document.querySelector('.MessageList');
                        if (!el) return;
                        // Scroll down ~80% of visible area
                        el.scrollTop = Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + el.clientHeight * 0.8);
                        el.dispatchEvent(new Event('scroll', {bubbles: true}));
                    }
                """, si)
            await page.wait_for_timeout(1500)
            
            await page.evaluate("""
                () => {
                    const el = document.querySelector('.MessageList');
                    if (!el) return;
                    el.scrollTop = 0;
                    el.dispatchEvent(new Event('scroll', {bubbles: true}));
                }
            """)
            await page.wait_for_timeout(2000)
        
        # Save
        output = []
        for key, m in all_msgs.items():
            text = re.sub(r"\n{3,}", "\n\n", m['text']).strip()
            if not text: continue
            output.append({
                'text': text,
                'timestamp': m.get('timestamp', ''),
                'ariaLabel': m.get('ariaLabel', ''),
                'dataAttrs': m.get('allData', {}),
                'links': m.get('links', []),
                'images': m.get('images', []),
                'videos': m.get('videos', []),
            })
        
        json_path = OUTPUT_DIR / "posts_all.json"
        json_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\n  [JSON] posts_all.json ({len(output)} msgs)", flush=True)
        
        # Summary of data attributes found
        all_attrs = {}
        for m in output:
            for k in m.get('dataAttrs', {}):
                all_attrs[k] = all_attrs.get(k, 0) + 1
        print(f"\n  Data attributes found:", flush=True)
        for k, v in sorted(all_attrs.items(), key=lambda x: -x[1]):
            print(f"    {k}: {v}x", flush=True)
        
        # Check for aria labels with dates
        with_dates = [m for m in output if m.get('ariaLabel')]
        print(f"\n  Messages with aria-label: {len(with_dates)}", flush=True)
        if with_dates:
            print(f"  Sample:", flush=True)
            for m in with_dates[:5]:
                print(f"    {m['ariaLabel'][:100]}", flush=True)
        
        print(f"\n  DONE! {len(output)} messages", flush=True)

if __name__ == "__main__":
    asyncio.run(run())

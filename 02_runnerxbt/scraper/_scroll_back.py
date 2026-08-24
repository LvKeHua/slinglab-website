"""Scroll backwards to load older messages"""
import asyncio, json, re, hashlib
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("D:/Vibe Coding 项目合集/runnerxbt")

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        if "#-1002233421487" not in page.url:
            click_pos = await page.evaluate("""
                () => {
                    const items = document.querySelectorAll('.ListItem.Chat.chat-item-clickable');
                    for (const item of items) {
                        if (item.innerText.includes('RunnerXBT')) {
                            const rect = item.getBoundingClientRect();
                            return {x: rect.x + rect.width/2, y: rect.y + rect.height/2};
                        }
                    }
                    return null;
                }
            """)
            if click_pos:
                await page.mouse.click(click_pos['x'], click_pos['y'])
                await page.wait_for_timeout(5000)
        
        all_msgs = {}
        no_new_steps = 0
        
        for step in range(200):
            # Extract messages
            msgs = await page.evaluate("""
                () => {
                    const results = [];
                    const wrappers = document.querySelectorAll('.message-content-wrapper');
                    for (const wrapper of wrappers) {
                        const content = wrapper.querySelector('[class*="message-content"]') || wrapper;
                        const textEl = content.querySelector('.text-content, [class*="text-content"]');
                        const text = textEl ? textEl.innerText.trim() : content.innerText.trim();
                        if (!text) continue;
                        const timeEl = content.querySelector('.message-time, [class*="message-time"]');
                        const timestamp = timeEl ? timeEl.innerText.trim() : '';
                        const senderEl = content.querySelector('.sender-title, .peer-title');
                        const sender = senderEl ? senderEl.innerText.trim() : '';
                        const links = [];
                        for (const a of content.querySelectorAll('a')) if (a.href) links.push(a.href);
                        const images = [];
                        for (const img of content.querySelectorAll('img')) if (img.src) images.push(img.src);
                        const videos = [];
                        for (const video of content.querySelectorAll('video')) {
                            if (video.src) videos.push(video.src);
                            for (const source of video.querySelectorAll('source')) if (source.src) videos.push(source.src);
                        }
                        results.push({text, timestamp, sender, links, images, videos});
                    }
                    return results;
                }
            """)
            
            new_count = 0
            for m in msgs:
                key = m['text'] + '|' + '|'.join(m['images']) + '|' + '|'.join(m['links'])
                if key not in all_msgs:
                    all_msgs[key] = m
                    new_count += 1
            
            if step % 3 == 0 or new_count > 0:
                print(f"  Step {step:3d} | Collected: {len(all_msgs):4d} | New: {new_count:3d} | NoNew: {no_new_steps:2d}", flush=True)
            
            if new_count == 0:
                no_new_steps += 1
            else:
                no_new_steps = 0
            
            if no_new_steps >= 20:
                print(f"\n  No new msgs. DONE!", flush=True)
                break
            
            # Scroll BACKWARDS-trigger into view (to load OLDER messages)
            await page.evaluate("""
                () => {
                    const list = document.querySelector('.MessageList');
                    if (!list) return;
                    
                    // First try to scroll backwards-trigger into view at the TOP
                    const trigger = document.querySelector('.backwards-trigger');
                    if (trigger) {
                        const cr = list.getBoundingClientRect();
                        const tr = trigger.getBoundingClientRect();
                        const relY = tr.top - cr.top;
                        // Scroll backwards-trigger to be visible at the top
                        list.scrollTop = Math.max(0, list.scrollTop + relY + 200);
                    } else {
                        // Scroll up
                        list.scrollTop = Math.max(0, list.scrollTop - list.clientHeight * 0.5);
                    }
                    list.dispatchEvent(new Event('scroll', {bubbles: true}));
                }
            """)
            await page.wait_for_timeout(1500)
        
        # Save results
        print(f"\n{'='*60}", flush=True)
        print(f"  Collected {len(all_msgs)} unique messages", flush=True)
        
        output = []
        for key, m in all_msgs.items():
            text = re.sub(r"\n{3,}", "\n\n", m['text']).strip()
            if not text: continue
            output.append({
                'text': text,
                'timestamp': m.get('timestamp', ''),
                'sender': m.get('sender', ''),
                'links': m.get('links', []),
                'images': m.get('images', []),
                'videos': m.get('videos', []),
            })
        
        json_path = OUTPUT_DIR / "posts.json"
        json_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  [JSON] posts.json ({len(output)} msgs)", flush=True)

asyncio.run(run())

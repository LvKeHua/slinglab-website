"""
Scraper v3 - saves periodically, .bubble selectors, proper dedup
"""
import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("D:/Vibe Coding 项目合集/runnerxbt")

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Load existing messages to continue
        all_msgs = {}
        posts_path = OUTPUT_DIR / "posts.json"
        if posts_path.exists():
            existing = json.loads(posts_path.read_text(encoding="utf-8"))
            for m in existing:
                key = m['text'] + '|' + '|'.join(m.get('images',[])) + '|' + '|'.join(m.get('links',[]))
                all_msgs[key] = m
            print(f"Loaded {len(existing)} existing msgs", flush=True)
        
        print(f"URL: {page.url}", flush=True)
        
        no_new = 0
        
        for step in range(500):
            msgs = await page.evaluate("""
                () => {
                    const results = [];
                    const bubbles = document.querySelectorAll('.bubble');
                    for (const b of bubbles) {
                        const data = {};
                        for (const attr of b.attributes) {
                            if (attr.name.startsWith('data-')) {
                                data[attr.name] = attr.value;
                            }
                        }
                        
                        const senderEl = b.querySelector('.peer-title, [class*="peer-title"], [class*="sender"]');
                        const sender = senderEl ? senderEl.innerText.trim() : '';
                        
                        const contentEl = b.querySelector('.text-content, [class*="text-content"]') || b;
                        let text = contentEl.innerText.trim();
                        
                        const ti = b.querySelector('.time, [class*="time"]');
                        const timestamp = ti ? ti.innerText.trim() : '';
                        
                        const ariaLabel = b.getAttribute('aria-label') || '';
                        
                        const links = [];
                        for (const a of b.querySelectorAll('a')) {
                            if (a.href) links.push(a.href);
                        }
                        
                        const images = [];
                        for (const img of b.querySelectorAll('img')) {
                            if (img.src) images.push(img.src);
                        }
                        
                        const videos = [];
                        for (const v of b.querySelectorAll('video')) {
                            if (v.src) videos.push(v.src);
                            for (const s of v.querySelectorAll('source')) if (s.src) videos.push(s.src);
                        }
                        
                        results.push({
                            text, sender, timestamp, ariaLabel, data,
                            links, images, videos
                        });
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
            
            si = await page.evaluate("""
                () => {
                    const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                    if (!el) return null;
                    return {st: el.scrollTop, sh: el.scrollHeight, ch: el.clientHeight};
                }
            """)
            
            print(f"  Step {step:3d} | Coll: {len(all_msgs):4d} | New: {new_count:3d} | st={si['st'] if si else 0:.0f}" + (f" | NoNew: {no_new}" if no_new else ""), flush=True)
            
            if new_count == 0:
                no_new += 1
            else:
                no_new = 0
            
            # Save periodically
            if step > 0 and step % 25 == 0:
                save(all_msgs)
                print(f"    [saved at {len(all_msgs)}]", flush=True)
            
            if no_new >= 40:
                print(f"\n  No new for 40 steps. DONE!", flush=True)
                break
            
            # Scroll down ~80% then back to top
            if si and si['sh'] > si['ch']:
                await page.evaluate("""
                    () => {
                        const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                        if (!el) return;
                        el.scrollTop = Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + el.clientHeight * 0.8);
                        el.dispatchEvent(new Event('scroll', {bubbles: true}));
                    }
                """)
            await page.wait_for_timeout(1500)
            
            await page.evaluate("""
                () => {
                    const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                    if (!el) return;
                    el.scrollTop = 0;
                    el.dispatchEvent(new Event('scroll', {bubbles: true}));
                }
            """)
            await page.wait_for_timeout(2000)
        
        save(all_msgs)
        analyze(all_msgs)
        print(f"\n  DONE! {len(all_msgs)} messages", flush=True)

def save(all_msgs):
    output = []
    for key, m in all_msgs.items():
        text = re.sub(r"\n{3,}", "\n\n", m['text']).strip()
        if not text: continue
        output.append({
            'text': text,
            'sender': m.get('sender', ''),
            'timestamp': m.get('timestamp', ''),
            'ariaLabel': m.get('ariaLabel', ''),
            'data': m.get('data', {}),
            'links': m.get('links', []),
            'images': m.get('images', []),
            'videos': m.get('videos', []),
        })
    
    posts_path = OUTPUT_DIR / "posts.json"
    posts_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n  [SAVED] posts.json ({len(output)} msgs)", flush=True)
    
    # Build HTML
    import html as h
    parts = [
        '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
        '<title>@RunnerXBT_Insights Archive</title><style>'
        'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;'
        'background:#0d1117;color:#e6edf3;max-width:800px;margin:0 auto;padding:20px}'
        'h1{color:#58a6ff}.sub{color:#8b949e;font-size:13px}'
        '.p{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px;margin-bottom:10px}'
        '.p:hover{border-color:#58a6ff}'
        '.t{font-size:11px;color:#6e7681;font-family:monospace;margin-bottom:6px}'
        '.x{font-size:15px;white-space:pre-wrap;word-break:break-word;line-height:1.6}'
        'img,video{max-width:100%;border-radius:4px;margin-top:6px}'
        'a{color:#58a6ff}'
        '</style></head><body>'
        f'<h1>@RunnerXBT_Insights</h1><p class="sub">{len(output)} posts</p>'
    ]
    for m in output:
        parts.append('<div class="p">')
        ts = m.get('timestamp', '') or m.get('ariaLabel', '')
        if ts:
            parts.append(f'<div class="t">{h.escape(ts)}</div>')
        parts.append(f'<div class="x">{h.escape(m.get("text",""))}</div>')
        for u in m.get('links', []):
            parts.append(f'<a href="{h.escape(u)}" target="_blank">{h.escape(u)}</a><br>')
        for u in m.get('images', []):
            parts.append(f'<img src="{h.escape(u)}" loading="lazy">')
        for u in m.get('videos', []):
            parts.append(f'<video controls preload="metadata"><source src="{h.escape(u)}"></video>')
        parts.append('</div>')
    parts.append('</body></html>')
    html_path = OUTPUT_DIR / "archive.html"
    html_path.write_text("\n".join(parts), encoding="utf-8")

def analyze(all_msgs):
    all_attrs = {}
    for m in all_msgs.values():
        for k in m.get('data', {}):
            all_attrs[k] = all_attrs.get(k, 0) + 1
    
    print('\nData attributes:', flush=True)
    for k, v in sorted(all_attrs.items(), key=lambda x: -x[1])[:10]:
        print(f'  {k}: {v}', flush=True)
    
    with_aria = [m for m in all_msgs.values() if m.get('ariaLabel')]
    print(f'Aria labels: {len(with_aria)}', flush=True)

if __name__ == "__main__":
    asyncio.run(run())

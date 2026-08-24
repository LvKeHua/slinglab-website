"""Scroll backwards to collect older messages (IDs 1~2964)"""
import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("D:/Vibe Coding 项目合集/runnerxbt")

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        await page.wait_for_timeout(2000)
        print(f"URL: {page.url}", flush=True)
        
        # Load existing messages from posts.json
        existing_path = OUTPUT_DIR / "posts.json"
        if existing_path.exists():
            existing = json.loads(existing_path.read_text(encoding="utf-8"))
            all_msgs = {m["message_id"]: m["text"] for m in existing}
            print(f"Loaded {len(all_msgs)} existing messages (IDs {min(all_msgs.keys())}~{max(all_msgs.keys())})", flush=True)
        else:
            all_msgs = {}
        
        no_new_steps = 0
        
        for step in range(200):
            # Extract current visible messages from DOM
            msgs = await page.evaluate("""
                () => {
                    const groups = document.querySelectorAll('.message-date-group');
                    const result = {};
                    for (const group of groups) {
                        const msgEls = group.querySelectorAll('[data-message-id]');
                        for (const el of msgEls) {
                            const rawId = el.getAttribute('data-message-id');
                            const id = parseInt(rawId);
                            if (isNaN(id) || id !== Math.floor(id)) continue;
                            let text = el.innerText || '';
                            if (id in result) {
                                if (text.length > result[id].length) result[id] = text;
                            } else {
                                result[id] = text;
                            }
                        }
                    }
                    return result;
                }
            """)
            
            new_count = 0
            for msg_id_str, text in msgs.items():
                msg_id = int(msg_id_str)
                if msg_id not in all_msgs:
                    all_msgs[msg_id] = text
                    new_count += 1
            
            ids = sorted(all_msgs.keys())
            if step % 3 == 0 or new_count > 0:
                print(f"  Step {step:3d} | Collected: {len(all_msgs):4d} | IDs: {ids[0]}~{ids[-1]} | New: {new_count:3d} | NoNew: {no_new_steps:2d}", flush=True)
            
            if new_count == 0:
                no_new_steps += 1
            else:
                no_new_steps = 0
            
            if no_new_steps >= 15:
                print(f"\n  No new messages for {no_new_steps} steps. Done scrolling.", flush=True)
                break
            
            # Scroll backwards-trigger into view to load OLDER messages
            await page.evaluate("""
                () => {
                    const trigger = document.querySelector('.backwards-trigger');
                    const list = document.querySelector('.MessageList');
                    if (!trigger || !list) return;
                    
                    const containerRect = list.getBoundingClientRect();
                    const triggerRect = trigger.getBoundingClientRect();
                    const relativeY = triggerRect.top - containerRect.top;
                    // Scroll so trigger is at the TOP of the visible area + some offset
                    const target = list.scrollTop + relativeY - 100;
                    list.scrollTop = Math.max(0, target);
                    list.dispatchEvent(new Event('scroll', {bubbles: true}));
                }
            """)
            await page.wait_for_timeout(2000)
        
        # Save updated JSON
        sorted_ids = sorted(all_msgs.keys())
        output = []
        for mid in sorted_ids:
            text = re.sub(r"\n{3,}", "\n\n", all_msgs[mid]).strip()
            if not text or len(text) < 2:
                continue
            output.append({"message_id": mid, "text": text})
        
        json_path = OUTPUT_DIR / "posts.json"
        json_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\n  [JSON] {json_path.name} ({len(output)} msgs)", flush=True)
        print(f"  IDs: {output[0]['message_id']}~{output[-1]['message_id']}", flush=True)
        
        # Build HTML
        html_path = OUTPUT_DIR / "archive.html"
        build_html(output, html_path, "RunnerXBT_Insights")
        print(f"  [HTML] {html_path.name}", flush=True)

def build_html(msgs, path, channel):
    import html as h
    parts = [
        '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
        f'<title>@{channel} Archive</title><style>'
        'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;'
        'background:#0d1117;color:#e6edf3;max-width:800px;margin:0 auto;padding:20px}'
        'h1{color:#58a6ff}.sub{color:#8b949e;font-size:13px}'
        '.p{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px;margin-bottom:10px}'
        '.p:hover{border-color:#58a6ff}'
        '.t{font-size:11px;color:#6e7681;font-family:monospace;margin-bottom:6px}'
        '.x{font-size:15px;white-space:pre-wrap;word-break:break-word;line-height:1.6}'
        '</style></head><body>'
        f'<h1>@{channel}</h1><p class="sub">{len(msgs)} posts</p>'
    ]
    for m in msgs:
        parts.append(f'<div class="p"><div class="t">#{m["message_id"]}</div>')
        parts.append(f'<div class="x">{h.escape(m.get("text",""))}</div>')
        parts.append('</div>')
    parts.append('</body></html>')
    path.write_text("\n".join(parts), encoding="utf-8")

if __name__ == "__main__":
    asyncio.run(run())

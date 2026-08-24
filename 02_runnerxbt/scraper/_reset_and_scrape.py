"""
Reset page to start from ID 1, then scroll forward to collect ALL messages.
Strategy: Navigate away from channel, then back, then scroll from top to bottom.
"""
import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("D:/Vibe Coding 项目合集/runnerxbt")

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # 1. Navigate to Telegram Web main page (no channel)
        print("Navigating away from channel...", flush=True)
        await page.goto("https://web.telegram.org/a/", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        print(f"  URL: {page.url}", flush=True)
        
        # 2. Click on the channel in the chat list
        # Find and click the RunnerXBT channel
        clicked = await page.evaluate("""
            () => {
                const chats = document.querySelectorAll('.chat-list .chat');
                for (const chat of chats) {
                    if (chat.innerText.includes('RunnerXBT')) {
                        chat.click();
                        return true;
                    }
                }
                // Try by href or data attributes
                const links = document.querySelectorAll('[href*="RunnerXBT"], a[href*="-1002233421487"]');
                for (const link of links) {
                    link.click();
                    return true;
                }
                return false;
            }
        """)
        if clicked:
            print("  Clicked RunnerXBT in chat list", flush=True)
        else:
            print("  Could not click via chat list, navigating via URL", flush=True)
            await page.goto("https://web.telegram.org/a/#-1002233421487", wait_until="domcontentloaded")
        
        await page.wait_for_timeout(5000)
        
        # 3. Check initial message IDs
        for i in range(60):
            has = await page.evaluate("document.querySelector('[data-message-id]') !== null")
            if has:
                info = await page.evaluate("""
                    () => {
                        const items = document.querySelectorAll('[data-message-id]');
                        const ids = Array.from(items)
                            .map(el => parseInt(el.getAttribute('data-message-id')))
                            .filter(id => !isNaN(id) && id === Math.floor(id));
                        const unique = [...new Set(ids)].sort((a,b)=>a-b);
                        const el = document.querySelector('.MessageList');
                        return {
                            count: unique.length,
                            first: unique[0],
                            last: unique[unique.length-1],
                            scrollTop: el?.scrollTop || 0,
                            scrollHeight: el?.scrollHeight || 0,
                        };
                    }
                """)
                print(f"Initial messages: {info}", flush=True)
                break
            await page.wait_for_timeout(1000)
            if i % 10 == 0: print(f"  waiting... {i}s", flush=True)
        
        # 4. Check if we need to scroll to bottom first (oldest msgs)
        scroll_info = await page.evaluate("""
            () => {
                const el = document.querySelector('.MessageList');
                if (!el) return null;
                return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
            }
        """)
        print(f"  Scroll: {scroll_info}", flush=True)
        
        # 5. Scroll to the BOTTOM to see oldest messages if needed
        if scroll_info:
            # Telegram renders oldest at bottom, newest at top
            # At scrollTop=0 we see newest. Need scrollTop=max to see oldest.
            target = scroll_info['scrollHeight'] - scroll_info['clientHeight']
            if scroll_info['scrollTop'] < target * 0.5:
                # We're at the top, need to scroll to bottom for oldest
                print("  Scrolling to bottom...", flush=True)
        
        # 6. Now scroll forward collecting all messages
        all_msgs = {}
        no_new_steps = 0
        
        # First scroll all the way to bottom to see oldest messages
        await page.evaluate("""
            () => {
                const el = document.querySelector('.MessageList');
                if (el) {
                    el.scrollTop = el.scrollHeight - el.clientHeight;
                    el.dispatchEvent(new Event('scroll', {bubbles: true}));
                }
            }
        """)
        await page.wait_for_timeout(3000)
        
        info2 = await page.evaluate("""
            () => {
                const items = document.querySelectorAll('[data-message-id]');
                const ids = Array.from(items)
                    .map(el => parseInt(el.getAttribute('data-message-id')))
                    .filter(id => !isNaN(id) && id === Math.floor(id));
                const unique = [...new Set(ids)].sort((a,b)=>a-b);
                const el = document.querySelector('.MessageList');
                return {
                    count: unique.length,
                    first: unique[0],
                    last: unique[unique.length-1],
                    scrollTop: el?.scrollTop || 0,
                    scrollH: el?.scrollHeight || 0,
                };
            }
        """)
        print(f"After scroll-to-bottom: {info2}", flush=True)
        
        # Now scroll upward (toward forwards-trigger which loads newer msgs)
        # Wait - the forwards-trigger was at the bottom (newest position).
        # We're now at the bottom. We need to scroll the forwards-trigger UP?
        # Actually: forwards-trigger is at the newest messages.
        # When at the bottom (oldest), scrolling up should load more... 
        # Let me just try scrolling forward using forwards-trigger
        
        for step in range(200):
            # Extract current messages from DOM
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
            for mid_str, text in msgs.items():
                mid = int(mid_str)
                if mid not in all_msgs:
                    all_msgs[mid] = text
                    new_count += 1
            
            ids = sorted(all_msgs.keys())
            if step % 3 == 0 or new_count > 0 or step < 5:
                print(f"  Step {step:3d} | Collected: {len(all_msgs):4d} | IDs: {ids[0]}~{ids[-1]} | New: {new_count:3d} | NoNew: {no_new_steps:2d}", flush=True)
            
            if new_count == 0:
                no_new_steps += 1
            else:
                no_new_steps = 0
            
            if no_new_steps >= 20:
                print(f"\n  No new messages for 20 steps. Done!", flush=True)
                break
            
            # Try both triggers
            await page.evaluate("""
                () => {
                    const list = document.querySelector('.MessageList');
                    if (!list) return;
                    
                    // Try forwards-trigger
                    let trigger = document.querySelector('.forwards-trigger');
                    if (trigger) {
                        const triggerRect = trigger.getBoundingClientRect();
                        const containerRect = list.getBoundingClientRect();
                        const relativeY = triggerRect.top - containerRect.top;
                        const target = list.scrollTop + relativeY - list.clientHeight + 50;
                        if (target > list.scrollTop && target < list.scrollHeight - list.clientHeight) {
                            list.scrollTop = target;
                        }
                    }
                    
                    // Also try scrolling up a bit
                    list.scrollTop = Math.max(0, list.scrollTop - list.clientHeight * 0.3);
                    list.dispatchEvent(new Event('scroll', {bubbles: true}));
                }
            """)
            await page.wait_for_timeout(2000)
        
        # Save progress
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

if __name__ == "__main__":
    asyncio.run(run())

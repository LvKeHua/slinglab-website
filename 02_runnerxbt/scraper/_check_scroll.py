"""Debug scroll state"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        info = await page.evaluate("""
            () => {
                const el = document.querySelector('.MessageList');
                if (!el) return {error: 'no MessageList'};
                
                const ft = document.querySelector('.forwards-trigger');
                const bt = document.querySelector('.backwards-trigger');
                
                // Count all message-like elements
                const wrappers = document.querySelectorAll('.message-content-wrapper').length;
                
                // Check for any lazy-loading sentinels
                const all_children = el.querySelector('*')?.children || [];
                
                return {
                    st: el.scrollTop,
                    sh: el.scrollHeight,
                    ch: el.clientHeight,
                    has_forwards: !!ft,
                    has_backwards: !!bt,
                    wrappers: wrappers,
                    at_bottom: (el.scrollHeight - el.scrollTop - el.clientHeight) < 50,
                    at_top: el.scrollTop < 50,
                    first_child_tag: el.children[0]?.tagName,
                    first_child_cls: el.children[0]?.className?.substring(0, 60),
                };
            }
        """)
        print(f"Scroll info: {json.dumps(info, indent=2)}", flush=True)

asyncio.run(run())

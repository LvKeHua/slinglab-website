"""Precise click on RunnerXBT channel"""
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Debug: find exactly where RunnerXBT is in the DOM
        debug = await page.evaluate("""
            () => {
                // Find all elements containing RunnerXBT in their text
                const all = document.querySelectorAll('*');
                const found = [];
                for (const el of all) {
                    if (el.children.length === 0 && el.innerText?.trim() === 'RunnerXBT') {
                        // This is a leaf element with just the text
                        const rect = el.getBoundingClientRect();
                        found.push({
                            tag: el.tagName,
                            cls: el.className.substring(0, 60),
                            text: el.innerText,
                            rect: {x: rect.x, y: rect.y, w: rect.width, h: rect.height},
                            parentCls: el.parentElement?.className?.substring(0, 60),
                            parentTag: el.parentElement?.tagName,
                        });
                    }
                }
                return found;
            }
        """)
        print(f"RunnerXBT elements: {len(debug)}", flush=True)
        for d in debug[:5]:
            print(f"  {d}", flush=True)
        
        # Try to click on the chat list item that contains RunnerXBT
        # First, find the clickable chat item
        click_info = await page.evaluate("""
            () => {
                // The chat list items are typically divs with class containing "chat"
                const items = document.querySelectorAll('.chat-list [class*=\"chat\"]');
                for (const item of items) {
                    if (item.innerText.includes('RunnerXBT')) {
                        const rect = item.getBoundingClientRect();
                        return {
                            text: item.innerText.substring(0, 100),
                            rect: {x: rect.x, y: rect.y, w: rect.width, h: rect.height},
                            tag: item.tagName,
                            cls: item.className.substring(0, 80),
                        };
                    }
                }
                return null;
            }
        """)
        print(f"Chat item: {click_info}", flush=True)
        
        if click_info:
            # Click at the center of the element
            cx = click_info['rect']['x'] + click_info['rect']['w'] / 2
            cy = click_info['rect']['y'] + click_info['rect']['h'] / 2
            await page.mouse.click(cx, cy)
            print(f"Clicked at ({cx:.0f}, {cy:.0f})", flush=True)
            await page.wait_for_timeout(5000)
            print(f"URL after click: {page.url}", flush=True)
            
            # Check for messages
            for i in range(30):
                has = await page.evaluate("document.querySelector('[data-message-id]') !== null")
                if has:
                    info = await page.evaluate("""
                        () => {
                            const items = document.querySelectorAll('[data-message-id]');
                            const ids = Array.from(items).map(el => parseInt(el.getAttribute('data-message-id')))
                                .filter(id => !isNaN(id) && id === Math.floor(id));
                            const unique = [...new Set(ids)].sort((a,b)=>a-b);
                            return {count: unique.length, first: unique[0], last: unique[unique.length-1]};
                        }
                    """)
                    print(f"Messages: {info}", flush=True)
                    break
                await page.wait_for_timeout(1000)
                if i % 5 == 0: print(f"  wait {i}s", flush=True)
        else:
            print("Could not find RunnerXBT chat item", flush=True)

asyncio.run(run())

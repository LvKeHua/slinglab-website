"""Real Playwright click on the RunnerXBT channel - wait longer for messages"""
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        
        # Use a DIFFERENT page - the second one if it exists
        page = None
        for p in ctx.pages:
            if "#-1002233421487" in p.url:
                # Already on channel, try reloading
                page = p
                break
        
        if not page:
            # Find any page on web.telegram.org
            for p in ctx.pages:
                if "web.telegram.org" in p.url:
                    page = p
                    break
        
        if not page:
            page = ctx.pages[0]
        
        print(f"Using page: {page.url}", flush=True)
        
        # Navigate to main page first
        await page.goto("https://web.telegram.org/a/", wait_until="domcontentloaded")
        await page.wait_for_timeout(5000)
        
        # Find the RunnerXBT chat item and get its bounding box
        chat_rect = await page.evaluate("""
            () => {
                const items = document.querySelectorAll('.ListItem.Chat.chat-item-clickable');
                for (const item of items) {
                    if (item.innerText.includes('RunnerXBT')) {
                        const rect = item.getBoundingClientRect();
                        return {x: rect.x, y: rect.y, w: rect.width, h: rect.height};
                    }
                }
                return null;
            }
        """)
        
        if chat_rect:
            # Perform a REAL Playwright click
            cx = chat_rect['x'] + chat_rect['w'] / 2
            cy = chat_rect['y'] + chat_rect['h'] / 2
            print(f"Clicking at ({cx:.0f}, {cy:.0f})", flush=True)
            
            await page.mouse.move(cx, cy)
            await page.wait_for_timeout(200)
            await page.mouse.down()
            await page.wait_for_timeout(100)
            await page.mouse.up()
            await page.wait_for_timeout(200)
            # Also dispatch a proper click
            await page.mouse.click(cx, cy)
            
            # Wait LONGER for messages to load
            for i in range(30):
                count = await page.evaluate("document.querySelectorAll('.message-content-wrapper').length")
                has_ml = await page.evaluate("document.querySelector('.MessageList') !== null")
                if i % 5 == 0:
                    print(f"  [{i}s] Wrappers: {count}, ML: {has_ml}", flush=True)
                if count > 0:
                    print(f"  Messages loaded at {i}s! Count: {count}", flush=True)
                    break
                await page.wait_for_timeout(1000)
            
            print(f"Final URL: {page.url}", flush=True)
        else:
            print("Could not find RunnerXBT chat item", flush=True)

asyncio.run(run())

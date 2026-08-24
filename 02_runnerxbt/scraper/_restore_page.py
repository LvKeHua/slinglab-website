"""Restore page to workable channel state"""
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        text = await page.evaluate("document.body?.innerText?.substring?.(0, 500) || 'no body'")
        print(f"Body:\n{text[:400]}\n", flush=True)
        print(f"URL: {page.url}", flush=True)
        
        # Check for any overlays blocking the view
        overlays = await page.evaluate("""
            () => {
                const all = document.querySelectorAll('*');
                const blocking = [];
                for (const el of all) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 300 && rect.height > 300 && rect.top < 100 && rect.left < 100) {
                        const style = window.getComputedStyle(el);
                        if (style.display !== 'none' && style.visibility !== 'hidden') {
                            const z = parseInt(style.zIndex);
                            if (!isNaN(z) && z > 0) {
                                blocking.push({
                                    tag: el.tagName,
                                    cls: el.className.substring(0, 60),
                                    zIndex: z,
                                    text: (el.innerText || '').substring(0, 60),
                                });
                            }
                        }
                    }
                }
                return blocking.slice(0, 10);
            }
        """)
        print(f"\nBlocking overlays: {overlays}", flush=True)
        
        # Try to navigate to main page and back to channel
        print("\nRe-navigating...", flush=True)
        await page.goto("https://web.telegram.org/a/", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        
        # Click on RunnerXBT
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
            print(f"Clicked channel", flush=True)
        else:
            await page.goto("https://web.telegram.org/a/#-1002233421487", wait_until="domcontentloaded")
            await page.wait_for_timeout(5000)
        
        # Check for messages now
        count = await page.evaluate("document.querySelectorAll('.message-content-wrapper').length")
        has_ml = await page.evaluate("document.querySelector('.MessageList') !== null")
        print(f"Messages: {count}, MessageList: {has_ml}", flush=True)
        print(f"URL: {page.url}", flush=True)

asyncio.run(run())

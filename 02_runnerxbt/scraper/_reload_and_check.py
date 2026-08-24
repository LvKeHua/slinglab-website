"""Reload Telegram Web and check message state"""
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]

        # Reload to refresh Telegram Web state
        await page.reload(wait_until="domcontentloaded")
        print("Page reloaded", flush=True)

        # Wait for the channel to navigate
        await page.wait_for_timeout(5000)
        print(f"URL: {page.url}", flush=True)

        # Wait for messages
        for i in range(60):
            has_msgs = await page.evaluate(
                "document.querySelector('[data-message-id]') !== null"
            )
            if has_msgs:
                info = await page.evaluate("""
                    () => {
                        const items = document.querySelectorAll('[data-message-id]');
                        const ids = Array.from(items)
                            .map(el => parseInt(el.getAttribute('data-message-id')))
                            .filter(id => !isNaN(id) && id === Math.floor(id));
                        const unique = [...new Set(ids)].sort((a,b)=>a-b);
                        return {
                            count: unique.length,
                            first: unique[0],
                            last: unique[unique.length-1],
                            sample: unique.slice(0, 10)
                        };
                    }
                """)
                print(f"Messages loaded: {info}", flush=True)
                
                # Also check scroll state
                scroll = await page.evaluate("""
                    () => {
                        const el = document.querySelector('.MessageList');
                        if (!el) return null;
                        return {st: el.scrollTop, sh: el.scrollHeight, ch: el.clientHeight};
                    }
                """)
                print(f"Scroll: {scroll}", flush=True)
                break
            await page.wait_for_timeout(1000)
            if i % 10 == 0:
                print(f"  waiting... {i}s", flush=True)

asyncio.run(run())

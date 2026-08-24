"""Remove QR code overlay and show messages"""
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Find and remove QR overlays
        removed = await page.evaluate("""
            () => {
                const removed = [];
                // Find QR-related elements and remove them
                const qrElements = document.querySelectorAll(
                    '[class*="qr"], [class*="QR"], [class*="auth"], [class*="Auth"], ' +
                    '[class*="login"], [class*="Login"], canvas, ' +
                    '[class*="overlay"], [class*="modal"], [class*="popup"]'
                );
                for (const el of qrElements) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 100 && rect.height > 100) {
                        el.remove();
                        removed.push({tag: el.tagName, cls: el.className.substring(0, 40), rect: {w: rect.width, h: rect.height}});
                    }
                }
                
                // Also try removing any fullscreen overlay
                const fullElements = document.querySelectorAll('[class*="overlay"], [class*="Overlay"]');
                for (const el of fullElements) {
                    el.remove();
                    removed.push({tag: el.tagName, cls: el.className.substring(0, 40)});
                }
                
                return removed;
            }
        """)
        print(f"Removed {len(removed)} elements", flush=True)
        for r in removed:
            print(f"  {r}", flush=True)
        
        await page.wait_for_timeout(2000)
        
        # Check for messages now
        has_msgs = await page.evaluate("document.querySelector('[data-message-id]') !== null")
        print(f"Has msgs after cleanup: {has_msgs}", flush=True)
        
        if not has_msgs:
            # Try to dismiss any dialogs
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(2000)
            has_msgs = await page.evaluate("document.querySelector('[data-message-id]') !== null")
            print(f"Has msgs after Escape: {has_msgs}", flush=True)
        
        # Check full body
        text = await page.evaluate("document.body?.innerText?.substring?.(0, 400) || 'no body'")
        print(f"\nBody text:\n{text[:300]}", flush=True)
        
        # Check URL
        print(f"\nURL: {page.url}", flush=True)

asyncio.run(run())

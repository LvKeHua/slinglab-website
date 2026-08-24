"""Navigate to channel and check status"""
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        await page.goto("https://web.telegram.org/a/#-1002233421487", wait_until="domcontentloaded")
        await page.wait_for_timeout(5000)
        print(f"URL: {page.url}", flush=True)
        
        # Check if there's a QR code or login form
        text = await page.evaluate("document.body?.innerText?.substring?.(0, 500) || 'no body'")
        print(f"Body text: {text[:200]}", flush=True)
        
        # Check for messages or login elements
        has_qr = await page.evaluate("document.querySelector('canvas') !== null || document.querySelector('[class*=\"qr\"]') !== null || document.body.innerText.includes('QR')")
        print(f"Has QR: {has_qr}", flush=True)
        
        has_msgs = await page.evaluate("document.querySelector('[data-message-id]') !== null")
        print(f"Has msgs: {has_msgs}", flush=True)

asyncio.run(run())

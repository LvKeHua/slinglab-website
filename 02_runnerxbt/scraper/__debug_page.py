"""
Debug: check page state and find the channel
"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        url = page.url
        title = await page.title()
        print(f"URL: {url}", flush=True)
        print(f"Title: {title}", flush=True)
        
        # Check for chat items
        info = await page.evaluate("""
            () => {
                const items = document.querySelectorAll('.ListItem.Chat.chat-item-clickable');
                const chats = [];
                for (const item of items) {
                    chats.push(item.innerText.slice(0, 80));
                }
                
                // Check for login page indicators
                const hasQr = !!document.querySelector('.qr-container, [class*="qr"]');
                const hasPhoneInput = !!document.querySelector('input[type="tel"], input[name="phone"]');
                
                return {
                    url: location.href,
                    chatCount: items.length,
                    chats: chats.slice(0, 10),
                    hasQr,
                    hasPhoneInput,
                    bodyText: document.body.innerText.slice(0, 500)
                };
            }
        """)
        
        print(f"\nPage info: {json.dumps(info, ensure_ascii=False, indent=2)}", flush=True)

asyncio.run(run())

"""
Debug page state after login
"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        for p in ctx.pages:
            print(f"Page: {await p.title()} | {p.url[:100]}", flush=True)
        
        # Use the current page
        page = ctx.pages[0]
        
        # Check whats on the page
        info = await page.evaluate("""
            () => {
                const items = document.querySelectorAll('.ListItem.Chat.chat-item-clickable, .ListItem.chat-item-clickable, [class*="Chat"]');
                const chats = [];
                for (const item of items) {
                    chats.push({
                        text: item.innerText.slice(0, 100),
                        cls: item.className.slice(0, 60)
                    });
                }
                
                // Also check for any clickable items
                const allItems = document.querySelectorAll('[class*="chat-item"], [class*="ListItem"]');
                
                return {
                    url: location.href,
                    chats: chats,
                    allItemsCount: allItems.length,
                    bodyPreview: document.body.innerText.slice(0, 300),
                    hasQr: !!document.querySelector('.qr-container, [class*="qr"]'),
                };
            }
        """)
        
        print(f"\nPage info:", flush=True)
        print(json.dumps(info, ensure_ascii=False, indent=2), flush=True)

asyncio.run(run())

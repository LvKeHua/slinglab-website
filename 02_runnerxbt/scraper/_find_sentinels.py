"""Find sentinel elements and understand Telegram's virtual list mechanism"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Wait for page to settle
        await page.wait_for_timeout(3000)

        # Explore the message list structure in detail
        info = await page.evaluate("""
            () => {
                const el = document.querySelector('.MessageList');
                if (!el) return {error: 'no MessageList'};
                
                // Find the scrollable container
                const container = el.querySelector('.messages-container');
                if (!container) return {error: 'no messages-container'};
                
                const children = [];
                for (const child of container.children) {
                    const tag = child.tagName;
                    const cls = child.className.substring(0, 80);
                    const mid = child.getAttribute('data-message-id');
                    const rect = child.getBoundingClientRect();
                    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
                    
                    children.push({
                        tag,
                        cls,
                        data_message_id: mid || null,
                        rect: `L:${rect.left.toFixed(0)} T:${rect.top.toFixed(0)} B:${rect.bottom.toFixed(0)} H:${rect.height.toFixed(0)}`,
                        visible: isVisible,
                        text: (child.innerText || '').substring(0, 50),
                    });
                }
                
                return {
                    containerTag: container.tagName,
                    containerChildren: container.children.length,
                    children,
                    scrollTop: el.scrollTop,
                    scrollHeight: el.scrollHeight,
                    clientHeight: el.clientHeight,
                };
            }
        """)
        
        print(f"Message list structure:")
        print(json.dumps(info, ensure_ascii=False, indent=2), flush=True)
        
        # Also check placeholder/interstitial elements
        placeholders = await page.evaluate("""
            () => {
                const items = [];
                // Find all elements that might be loading indicators or interstitials
                const all = document.querySelectorAll('[class*="interstitial"], [class*="loader"], [class*="loading"], [class*="spinner"], [class*="sentinel"], [class*="observer"], [class*="placeholder"]');
                for (const el of all) {
                    items.push({
                        tag: el.tagName,
                        cls: el.className.substring(0, 80),
                        text: (el.innerText || '').substring(0, 60),
                        rect: el.getBoundingClientRect(),
                    });
                }
                return items;
            }
        """)
        print(f"\nPlaceholder/interstitial elements:")
        print(json.dumps(placeholders, ensure_ascii=False, indent=2), flush=True)

asyncio.run(run())

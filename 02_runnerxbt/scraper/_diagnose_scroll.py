"""Diagnose scrolling in Telegram Web"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        page = ctx.pages[0]

        # Find the message list container
        info = await page.evaluate("""
            () => {
                // Try various selectors
                const candidates = [
                    '.MessageList',
                    '.messages-container',
                    '.chat-container',
                    '[class*="MessageList"]',
                    '[class*="messages"]',
                    '[class*="chat"]',
                    'main',
                    '#column-center',
                    '.chat',
                ];
                const results = {};
                for (const sel of candidates) {
                    const el = document.querySelector(sel);
                    if (el) {
                        const rect = el.getBoundingClientRect();
                        results[sel] = {
                            tag: el.tagName,
                            class: el.className.substring(0, 100),
                            rect: `${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`,
                            scrollH: el.scrollHeight,
                            clientH: el.clientHeight,
                            scrollTop: el.scrollTop,
                            children: el.children.length,
                        };
                    }
                }
                return results;
            }
        """)
        print("=== Scroll containers ===")
        print(json.dumps(info, ensure_ascii=False, indent=2))

        # Check actual message elements  
        msginfo = await page.evaluate("""
            () => {
                const items = document.querySelectorAll('[data-message-id]');
                const ids = Array.from(items).map(el => el.getAttribute('data-message-id'));
                return {
                    count: items.length,
                    ids: ids.map(Number).sort((a,b)=>a-b),
                };
            }
        """)
        print("\n=== Messages in DOM ===")
        print(json.dumps(msginfo, ensure_ascii=False, indent=2))

        # Now try manual scroll on the scrollable element
        scroll_test = await page.evaluate("""
            () => {
                // Find the actual scrollable element
                const all = document.querySelectorAll('*');
                const scrollables = [];
                for (const el of all) {
                    if (el.scrollHeight > el.clientHeight + 50) {
                        scrollables.push({
                            tag: el.tagName,
                            class: el.className.substring(0, 60),
                            scrollH: el.scrollHeight,
                            clientH: el.clientHeight,
                            scrollTop: el.scrollTop,
                        });
                    }
                }
                // Limit output
                return scrollables.slice(0, 15);
            }
        """)
        print("\n=== All scrollable elements ===")
        print(json.dumps(scroll_test, ensure_ascii=False, indent=2))

asyncio.run(run())

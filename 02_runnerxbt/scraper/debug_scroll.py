"""Debug scroll behavior on Telegram Web K"""
import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        print("URL:", page.url)

        # Find the right scroll container and measure all containers
        info = await page.evaluate("""
            () => {
                const results = {};
                
                // Try all potential scroll containers
                const selectors = [
                    '.scrollable.scrollable-y',
                    '.scrollable.scrollable-y.bubbles-scrollable',
                    '.MessageList',
                    '.messages-container',
                    '.chat-container',
                    '.messages-layout',
                    '[class*="bubbles"]',
                    '[class*="messages-list"]',
                    '.chat',
                    '.conversation',
                    '[class*="conversation"]',
                ];
                
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el) {
                        results[sel] = {
                            st: el.scrollTop,
                            sh: el.scrollHeight,
                            ch: el.clientHeight,
                            tag: el.tagName,
                            class: el.className.slice(0, 100),
                            id: el.id || '(none)',
                            children: el.children.length,
                            bubbles: el.querySelectorAll('.bubble').length,
                        };
                    }
                }
                
                // Total DOM stats
                results['_all_bubbles'] = document.querySelectorAll('.bubble').length;
                results['_all_msg_wrappers'] = document.querySelectorAll('.message-content-wrapper').length;
                results['_all_messages'] = document.querySelectorAll('[data-message-id]').length;
                
                return results;
            }
        """)
        print(json.dumps(info, indent=2, default=str))

asyncio.run(main())

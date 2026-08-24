"""Try to properly activate the channel via direct event"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # First let's see what's in the right column / main content area
        right_area = await page.evaluate("""
            () => {
                // Find elements in the right portion of the page
                const all = document.querySelectorAll('*');
                const rightEls = [];
                for (const el of all) {
                    const rect = el.getBoundingClientRect();
                    // Elements in the right area (x > 400)
                    if (rect.left > 350 && rect.width > 200 && rect.height > 100) {
                        if (el.children.length <= 2 && el.innerText.trim()) {
                            rightEls.push({
                                tag: el.tagName,
                                text: el.innerText.trim().substring(0, 100),
                                rect: `${rect.left.toFixed(0)}x${rect.top.toFixed(0)} ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`,
                                children: el.children.length,
                                cls: el.className.substring(0, 60),
                            });
                        }
                    }
                }
                return rightEls.slice(0, 15);
            }
        """)
        print(f"Right area elements:", flush=True)
        for e in right_area:
            print(f"  {e['rect']} {e['tag']} {e['cls'][:40]}", flush=True)
            if e['text']:
                print(f"    text: {e['text'][:80]}", flush=True)
        
        # Also try to dispatch a proper click event on the RunnerXBT chat item
        click_result = await page.evaluate("""
            () => {
                const items = document.querySelectorAll('.ListItem.Chat.chat-item-clickable');
                for (const item of items) {
                    if (item.innerText.includes('RunnerXBT')) {
                        // Try dispatching a proper click event
                        const event = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                            button: 0,
                            buttons: 1,
                        });
                        item.dispatchEvent(event);
                        return 'dispatched click on: ' + item.innerText.substring(0, 60);
                    }
                }
                return 'not found';
            }
        """)
        print(f"\nClick result: {click_result}", flush=True)
        await page.wait_for_timeout(5000)
        
        # Check messages now
        wrappers = await page.evaluate("document.querySelectorAll('.message-content-wrapper').length")
        has_ml = await page.evaluate("document.querySelector('.MessageList') !== null")
        print(f"\nAfter dispatch click - Wrappers: {wrappers}, MessageList: {has_ml}", flush=True)
        print(f"URL: {page.url}", flush=True)

asyncio.run(run())

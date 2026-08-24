"""Remove blocking overlays and get messages visible"""
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Remove blocking overlays
        await page.evaluate("""
            () => {
                const blockers = document.querySelectorAll('.PrANy0qS, ._2CTTPsLV');
                for (const el of blockers) {
                    el.remove();
                    console.log('removed blocking overlay');
                }
            }
        """)
        await page.wait_for_timeout(3000)
        
        # Check if messages are now visible
        count = await page.evaluate("document.querySelectorAll('.message-content-wrapper').length")
        has_ml = await page.evaluate("document.querySelector('.MessageList') !== null")
        print(f"After overlay removal - Messages: {count}, MessageList: {has_ml}", flush=True)
        
        if count == 0:
            # Try pressing Escape to dismiss any dialogs
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(2000)
            count = await page.evaluate("document.querySelectorAll('.message-content-wrapper').length")
            print(f"After Escape - Messages: {count}", flush=True)
        
        if count == 0:
            # Try clicking on the chat list again
            text = await page.evaluate("document.body?.innerText?.substring?.(0, 500) || ''")
            print(f"Body:\n{text[:300]}", flush=True)
            
            # Maybe we need to click on a specific chat element
            runnerbt = await page.evaluate("""
                () => {
                    const elements = document.querySelectorAll('*');
                    for (const el of elements) {
                        if (el.children.length === 0 && el.innerText?.trim() === 'RunnerXBT Insights') {
                            // Click on the parent that's clickable
                            let parent = el.parentElement;
                            while (parent) {
                                if (parent.className.includes('chat-item-clickable') || 
                                    parent.tagName === 'A' ||
                                    parent.getAttribute('role') === 'button' ||
                                    parent.onclick) {
                                    const rect = parent.getBoundingClientRect();
                                    return {x: rect.x + rect.width/2, y: rect.y + rect.height/2};
                                }
                                parent = parent.parentElement;
                            }
                            // Fallback: click the element itself
                            const rect = el.getBoundingClientRect();
                            return {x: rect.x + rect.width/2, y: rect.y + rect.height/2};
                        }
                    }
                    return null;
                }
            """)
            if runnerbt:
                print(f"Clicking RunnerXBT at {runnerbt}", flush=True)
                await page.mouse.click(runnerbt['x'], runnerbt['y'])
                await page.wait_for_timeout(5000)
                count = await page.evaluate("document.querySelectorAll('.message-content-wrapper').length")
                print(f"After re-click - Messages: {count}", flush=True)
        
        if count > 0:
            # Get message preview
            preview = await page.evaluate("""
                () => {
                    const wrappers = document.querySelectorAll('.message-content-wrapper');
                    const out = [];
                    for (let i = 0; i < Math.min(5, wrappers.length); i++) {
                        const c = wrappers[i].querySelector('[class*="message-content"]') || wrappers[i];
                        const ti = c.querySelector('.message-time, [class*="message-time"]');
                        out.push({
                            text: (c.innerText || '').substring(0, 60),
                            time: ti ? ti.innerText.trim() : '',
                        });
                    }
                    return {count: wrappers.length, sample: out};
                }
            """)
            print(f"Messages: {preview}", flush=True)

asyncio.run(run())

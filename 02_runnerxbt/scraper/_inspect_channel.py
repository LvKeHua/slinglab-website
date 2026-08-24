"""Inspect what's shown when clicking on the channel"""
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Click RunnerXBT
        clicked = await page.evaluate("""
            () => {
                const items = document.querySelectorAll('.ListItem.Chat.chat-item-clickable');
                for (const item of items) {
                    if (item.innerText.includes('RunnerXBT')) {
                        const rect = item.getBoundingClientRect();
                        return {x: rect.x + rect.width/2, y: rect.y + rect.height/2};
                    }
                }
                return null;
            }
        """)
        
        if clicked:
            await page.mouse.click(clicked['x'], clicked['y'])
            await page.wait_for_timeout(3000)
            
            # Get full page HTML to understand what's in the main content area
            html = await page.evaluate("""
                () => {
                    // Get second column / main area content
                    const columns = document.querySelectorAll('[class*=\"column\"]');
                    const result = {};
                    
                    // Find all major sections
                    const sections = document.querySelectorAll('main, section, [class*=\"content\"], [class*=\"main\"]');
                    for (const s of sections) {
                        const rect = s.getBoundingClientRect();
                        if (rect.width > 300 && rect.height > 200) {
                            result[s.className.substring(0, 60)] = {
                                rect: {x: rect.x.toFixed(0), y: rect.y.toFixed(0), w: rect.width.toFixed(0), h: rect.height.toFixed(0)},
                                text: s.innerText.substring(0, 200),
                                children: s.children.length,
                            };
                        }
                    }
                    
                    return result;
                }
            """)
            
            print("Sections in page:", flush=True)
            for name, data in html.items():
                print(f"  [{name}]", flush=True)
                print(f"    rect: {data['rect']}", flush=True)
                print(f"    text: {data['text'][:150]}", flush=True)
                print(f"    children: {data['children']}", flush=True)
            
            print(f"\nURL: {page.url}", flush=True)

asyncio.run(run())

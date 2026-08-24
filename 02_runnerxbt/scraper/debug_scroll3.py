"""Test how many scroll-to-top cycles needed to load ALL messages"""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]

        prev_sh = 0
        same_count = 0
        
        for cycle in range(50):
            info = await page.evaluate("""
                () => {
                    const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                    if (!el) return {};
                    el.scrollTop = 0;
                    el.dispatchEvent(new Event('scroll', {bubbles: true}));
                    return {scrollHeight: el.scrollHeight, bubbles: el.querySelectorAll('.bubble').length};
                }
            """)
            await asyncio.sleep(2)
            
            info = await page.evaluate("""
                () => {
                    const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                    if (!el) return {};
                    return {scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, bubbles: el.querySelectorAll('.bubble').length};
                }
            """)
            
            sh = info['scrollHeight']
            delta = sh - prev_sh if prev_sh > 0 else 0
            prev_sh = sh
            
            if delta == 0:
                same_count += 1
            else:
                same_count = 0
            
            print(f"Cycle {cycle+1:2d}: st={info['scrollTop']:.0f} sh={sh} Δ={'+'+str(delta) if delta else ' 0'} bubbles={info['bubbles']}")
            
            if same_count >= 5:
                print(f"\n>> Stabilized at scrollHeight={sh} after {cycle+1} cycles")
                break

asyncio.run(main())

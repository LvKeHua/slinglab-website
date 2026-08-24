"""Trigger IntersectionObserver by scrolling sentinel elements into view"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        await page.wait_for_timeout(2000)
        
        async def get_state(label):
            el = page.locator('.MessageList')
            st = await el.evaluate("el => el.scrollTop")
            sh = await el.evaluate("el => el.scrollHeight")
            ids = await page.evaluate("""
                () => {
                    const items = document.querySelectorAll('[data-message-id]');
                    const ids = Array.from(items)
                        .map(el => parseInt(el.getAttribute('data-message-id')))
                        .filter(id => !isNaN(id) && id === Math.floor(id));
                    const unique = [...new Set(ids)].sort((a,b)=>a-b);
                    return {first: unique[0], last: unique[unique.length-1], count: unique.length};
                }
            """)
            print(f"[{label}] st={st:.0f}/{sh} | IDs: {ids['first']}~{ids['last']} ({ids['count']})", flush=True)
            return {"st": st, "sh": sh, "ids": ids}
        
        await get_state("start")
        
        # Try scrolling forwards-trigger into view
        print("\n--- Scrolling forwards-trigger into view ---", flush=True)
        for i in range(50):
            # Use JS to scroll the forwards-trigger into view
            result = await page.evaluate("""
                () => {
                    const trigger = document.querySelector('.forwards-trigger');
                    const list = document.querySelector('.MessageList');
                    if (!trigger || !list) return null;
                    
                    // Approach: scroll the MessageList so forwards-trigger is at the bottom
                    // Get the trigger's position relative to the container
                    const containerRect = list.getBoundingClientRect();
                    const triggerRect = trigger.getBoundingClientRect();
                    const relativeY = triggerRect.top - containerRect.top;
                    
                    // Scroll so trigger is at the bottom of the visible area
                    const targetScrollTop = list.scrollTop + relativeY - list.clientHeight + 50;
                    list.scrollTop = Math.max(0, targetScrollTop);
                    
                    // Dispatch both scroll and pointer events
                    list.dispatchEvent(new Event('scroll', {bubbles: true}));
                    list.dispatchEvent(new PointerEvent('pointermove', {bubbles: true}));
                    
                    return {
                        triggerTop: triggerRect.top,
                        containerBottom: containerRect.bottom,
                        scrollTop: list.scrollTop,
                        triggerVisible: triggerRect.top < containerRect.bottom && triggerRect.bottom > containerRect.top,
                    };
                }
            """)
            if result:
                # print(f"  [{i}] trigger at top={result['triggerTop']:.0f}, visible={result['triggerVisible']}", flush=True)
                pass
            
            await page.wait_for_timeout(2000)
            s = await get_state(f"fwd_{i}")
            
            # Check if scrollHeight increased (new messages loaded)
            if s["st"] >= s["sh"] - 100:
                print("  -> Reached bottom of loaded content", flush=True)
            
            # Check if IDs changed
            if s["ids"]["last"] > 61:
                print(f"  *** NEW MESSAGES! IDs up to {s['ids']['last']} ***", flush=True)
            
            if s["ids"]["count"] > 60:
                print(f"  *** MORE MESSAGES! {s['ids']['count']} unique IDs ***", flush=True)

        await get_state("final")

asyncio.run(run())

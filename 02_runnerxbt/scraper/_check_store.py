"""Check Telegram Web's internal data store"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Navigate to channel if not already
        if "im?" not in page.url and "#-" not in page.url:
            # Find and click RunnerXBT Insights in chat list
            try:
                await page.click("text=RunnerXBT Insights", timeout=3000)
                await page.wait_for_timeout(3000)
            except:
                pass
        
        print(f"URL: {page.url}", flush=True)
        
        # Check IndexedDB databases
        dbs = await page.evaluate("""
            async () => {
                try {
                    const names = await indexedDB.databases();
                    return names.map(d => d.name);
                } catch(e) {
                    return "indexedDB.databases() error: " + e.message;
                }
            }
        """)
        print(f"IndexedDB databases: {dbs}", flush=True)
        
        # Check global objects
        globs = await page.evaluate("""
            () => {
                const keys = [];
                for (const k in window) {
                    const lk = k.toLowerCase();
                    if (lk.includes('telegram') || lk.includes('mtproto') || 
                        lk.includes('app') || lk.includes('store') ||
                        lk.includes('state') || lk.includes('cache')) {
                        keys.push(k);
                    }
                }
                return keys.slice(0, 30);
            }
        """)
        print(f"Global objects: {globs}", flush=True)
        
        # Check if there's a messages cache in localStorage
        ls_keys = await page.evaluate("Object.keys(localStorage).filter(k => k.includes('message') || k.includes('chat') || k.includes('channel')).slice(0, 10)")
        print(f"localStorage keys: {ls_keys}", flush=True)
        
        # Check WebSQL or other storage
        # Try to find the app's internal message store
        store = await page.evaluate("""
            () => {
                // Look for React/Redux store
                const root = document.getElementById('root') || document.getElementById('app');
                if (!root) return 'no root';
                
                // Try to find React internal fiber
                const key = Object.keys(root).find(k => k.startsWith('__reactFiber'));
                if (!key) return 'no react fiber';
                
                return 'has react fiber: ' + key;
            }
        """)
        print(f"React store: {store}", flush=True)
        
        # Count unique IDs in DOM
        ids = await page.evaluate("""
            () => {
                const ids = new Set();
                document.querySelectorAll('[data-message-id]').forEach(el => {
                    const mid = parseInt(el.getAttribute('data-message-id'));
                    if (mid) ids.add(mid);
                });
                return {count: ids.size, min: Math.min(...ids), max: Math.max(...ids)};
            }
        """)
        print(f"DOM message IDs: {ids}", flush=True)

asyncio.run(run())

"""Quick check of page state"""
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        print(f"URL: {page.url}", flush=True)
        
        # Check DOM messages
        dom = await page.evaluate("""
            () => {
                const items = document.querySelectorAll('[data-message-id]');
                const ids = Array.from(items)
                    .map(el => parseInt(el.getAttribute('data-message-id')))
                    .filter(id => !isNaN(id) && id === Math.floor(id));
                const unique = [...new Set(ids)].sort((a,b)=>a-b);
                return {count: unique.length, first: unique[0], last: unique[unique.length-1]};
            }
        """)
        print(f"DOM: {dom}", flush=True)
        
        # Check MessageList
        ml = await page.evaluate("""
            () => {
                const el = document.querySelector('.MessageList');
                if (!el) return 'no MessageList';
                const ft = document.querySelector('.forwards-trigger');
                return {
                    st: el.scrollTop,
                    sh: el.scrollHeight,
                    ch: el.clientHeight,
                    hasForwardsTrigger: !!ft,
                };
            }
        """)
        print(f"MessageList: {ml}", flush=True)
        
        # Now try IndexedDB (might hang)
        print("Trying IndexedDB...", flush=True)
        idb = await page.evaluate("""
            async () => {
                try {
                    const db = await new Promise((resolve, reject) => {
                        const req = indexedDB.open("tt-data");
                        req.onsuccess = () => resolve(req.result);
                        req.onerror = () => reject(req.error);
                        req.onupgradeneeded = () => {
                            // If db doesn't exist, this might timeout
                            req.transaction.abort();
                            reject(new Error("upgrade needed"));
                        };
                    });
                    return {dbName: db.name, version: db.version};
                } catch(e) {
                    return {error: e.message};
                }
            }
        """)
        print(f"IndexedDB: {idb}", flush=True)

asyncio.run(run())

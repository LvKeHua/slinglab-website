"""Check Telegram Web's internal state"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Read tt-shared-state and tt-global-state from IndexedDB
        state = await page.evaluate("""
            async () => {
                const db = await new Promise((resolve, reject) => {
                    const req = indexedDB.open('tt-data');
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });
                
                const result = {};
                for (const key of ['tt-shared-state', 'tt-global-state']) {
                    try {
                        const tx = db.transaction('store', 'readonly');
                        const val = await new Promise((resolve, reject) => {
                            const req = tx.objectStore('store').get(key);
                            req.onsuccess = () => resolve(req.result);
                            req.onerror = () => reject(req.error);
                        });
                        if (val) {
                            const str = JSON.stringify(val);
                            result[key] = { type: typeof val, keys: Object.keys(val).slice(0, 20), preview: str.substring(0, 500) };
                        }
                    } catch(e) {
                        result[key] = { error: e.message };
                    }
                }
                
                db.close();
                return result;
            }
        """)
        print(json.dumps(state, ensure_ascii=False, indent=2), flush=True)

asyncio.run(run())

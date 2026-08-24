"""Extract auth data from tweb IndexedDB session store for Telethon"""
import asyncio, json, sys, base64
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]

        if 'k/' not in page.url:
            await page.goto("https://web.telegram.org/k/#@RunnerXBT_Insights")
            await asyncio.sleep(5)

        # Read all session data
        session_data = await page.evaluate("""
            async () => {
                const db = await new Promise((resolve, reject) => {
                    const req = indexedDB.open('tweb-account-1');
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });
                
                const tx = db.transaction('session', 'readonly');
                const store = tx.objectStore('session');
                const keys = await new Promise((resolve, reject) => {
                    const req = store.getAllKeys();
                    req.onsuccess = () => resolve(Array.from(req.result));
                    req.onerror = () => reject(req.error);
                });
                
                const allData = {};
                for (const key of keys) {
                    const val = await new Promise((resolve, reject) => {
                        const req = store.get(key);
                        req.onsuccess = () => resolve(req.result);
                        req.onerror = () => reject(req.error);
                    });
                    
                    if (val && typeof val === 'object') {
                        const str = JSON.stringify(val);
                        allData[key] = {
                            type: val._ || Object.keys(val).slice(0, 10),
                            length: str.length,
                            preview: str.substring(0, 300),
                            fullKeys: Object.keys(val).slice(0, 30),
                        };
                        
                        // Special handling for authState
                        if (key === 'authState' || key.toLowerCase().includes('auth')) {
                            allData[key + '_full'] = str.substring(0, 2000);
                        }
                    } else {
                        allData[key] = { type: typeof val, value: String(val).substring(0, 200) };
                    }
                }
                
                db.close();
                return allData;
            }
        """)
        
        print(json.dumps(session_data, indent=2, ensure_ascii=False))

asyncio.run(run())

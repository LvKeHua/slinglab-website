"""Enumerate ALL IndexedDB databases and their stores"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Enumerate all databases
        dbs = await page.evaluate("""
            async () => {
                const dbNames = await indexedDB.databases();
                const result = [];
                for (const dbInfo of dbNames) {
                    const db = await new Promise((resolve, reject) => {
                        const req = indexedDB.open(dbInfo.name, dbInfo.version);
                        req.onsuccess = () => resolve(req.result);
                        req.onerror = () => reject(req.error);
                    });
                    
                    const stores = [];
                    for (const name of db.objectStoreNames) {
                        const tx = db.transaction(name);
                        const store = tx.objectStore(name);
                        const count = await new Promise((resolve, reject) => {
                            const req = store.count();
                            req.onsuccess = () => resolve(req.result);
                            req.onerror = () => reject(req.error);
                        });
                        
                        // Get sample keys
                        const keys = await new Promise((resolve, reject) => {
                            const req = store.getAllKeys();
                            req.onsuccess = () => resolve(Array.from(req.result).slice(0, 5));
                            req.onerror = () => reject(req.error);
                        });
                        
                        stores.push({
                            name: name,
                            count: count,
                            sampleKeys: keys.map(k => String(k).substring(0, 80)),
                            keyPath: store.keyPath,
                            autoIncrement: store.autoIncrement,
                        });
                    }
                    
                    result.push({
                        name: db.name,
                        version: db.version,
                        stores: stores,
                    });
                    db.close();
                }
                return result;
            }
        """)
        
        print(json.dumps(dbs, indent=2, ensure_ascii=False))

asyncio.run(run())

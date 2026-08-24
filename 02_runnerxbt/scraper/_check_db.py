"""Read Telegram Web's IndexedDB database"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Explore IndexedDB structure
        info = await page.evaluate("""
            async () => {
                const result = {};
                try {
                    const db = await new Promise((resolve, reject) => {
                        const req = indexedDB.open('tt-data');
                        req.onsuccess = () => resolve(req.result);
                        req.onerror = () => reject(req.error);
                    });
                    
                    result.dbName = db.name;
                    result.version = db.version;
                    result.objectStores = [];
                    
                    for (const name of db.objectStoreNames) {
                        const store = db.transaction(name).objectStore(name);
                        const countReq = store.count();
                        const count = await new Promise((resolve, reject) => {
                            countReq.onsuccess = () => resolve(countReq.result);
                            countReq.onerror = () => reject(countReq.error);
                        });
                        
                        // Get sample keys
                        const keysReq = store.getAllKeys();
                        const keys = await new Promise((resolve, reject) => {
                            keysReq.onsuccess = () => resolve(Array.from(keysReq.result).slice(0, 5));
                            keysReq.onerror = () => reject(keysReq.error);
                        });
                        
                        result.objectStores.push({ name, count, sampleKeys: keys.map(k => String(k).substring(0, 80)) });
                    }
                    
                    db.close();
                    return result;
                } catch(e) {
                    return {error: e.message};
                }
            }
        """)
        print(json.dumps(info, ensure_ascii=False, indent=2), flush=True)
        
        # If there's a messages store, try reading some messages
        stores = info.get("objectStores", [])
        for s in stores:
            if "message" in s["name"].lower() or "chat" in s["name"].lower() or s["count"] > 100:
                print(f"\n--- Exploring store: {s['name']} ({s['count']} items) ---", flush=True)
                
                # Read sample entries
                sample = await page.evaluate(f"""
                    async () => {{
                        const db = await new Promise((resolve, reject) => {{
                            const req = indexedDB.open('tt-data');
                            req.onsuccess = () => resolve(req.result);
                            req.onerror = () => reject(req.error);
                        }});
                        const tx = db.transaction('{s["name"]}', 'readonly');
                        const store = tx.objectStore('{s["name"]}');
                        
                        const items = [];
                        const cursorReq = store.openCursor();
                        await new Promise((resolve, reject) => {{
                            cursorReq.onsuccess = (e) => {{
                                const cursor = e.target.result;
                                if (cursor && items.length < 5) {{
                                    const val = cursor.value;
                                    // Limit size
                                    const str = JSON.stringify(val);
                                    items.push({{ key: String(cursor.key).substring(0, 60), type: typeof val, keys: Object.keys(val).slice(0, 15), preview: str.substring(0, 200) }});
                                    cursor.continue();
                                }} else {{
                                    resolve();
                                }}
                            }};
                            cursorReq.onerror = () => reject(cursorReq.error);
                        }});
                        
                        db.close();
                        return items;
                    }}
                """)
                for item in sample:
                    print(f"  Key: {item['key']}", flush=True)
                    print(f"  Type: {item['type']}, Keys: {item['keys']}", flush=True)
                    print(f"  Preview: {item['preview']}", flush=True)
                    print()

asyncio.run(run())

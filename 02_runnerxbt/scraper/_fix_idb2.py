"""
Fix IndexedDB by forcing version upgrade to create 'store' object store.
Then load channel and let Telegram's caching work properly.
"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        page = ctx.pages[0]
        
        # Step 1: Force-create the 'store' object store in IndexedDB
        # by opening with a higher version number
        fixed = await page.evaluate("""
            async () => {
                try {
                    // Delete existing corrupted database
                    await new Promise((resolve) => {
                        const req = indexedDB.deleteDatabase('tt-data');
                        req.onsuccess = () => resolve();
                        req.onerror = () => resolve();
                        setTimeout(() => resolve(), 1000);
                    });
                    
                    // Create it fresh with the 'store' object store
                    const result = await new Promise((resolve) => {
                        const req = indexedDB.open('tt-data', 2);
                        req.onupgradeneeded = (event) => {
                            const db = event.target.result;
                            if (!db.objectStoreNames.contains('store')) {
                                db.createObjectStore('store');
                                console.log('Created store object store');
                            }
                        };
                        req.onsuccess = () => {
                            const db = req.result;
                            // Verify store exists
                            resolve({
                                version: db.version,
                                stores: Array.from(db.objectStoreNames),
                            });
                            db.close();
                        };
                        req.onerror = () => resolve({error: 'open error: ' + req.error.message});
                        setTimeout(() => resolve({error: 'timeout'}), 3000);
                    });
                    return result;
                } catch(e) {
                    return {error: e.message};
                }
            }
        """)
        print(f"Fixed IndexedDB: {json.dumps(fixed)}", flush=True)
        
        # Step 2: Now that the store exists, reload the page
        # The Telegram Web app should now be able to use IndexedDB properly
        await page.reload(wait_until="domcontentloaded")
        await page.wait_for_timeout(5000)
        print("Page reloaded", flush=True)
        
        # Step 3: Wait for IndexedDB to be ready
        for i in range(30):
            idb = await page.evaluate("""
                async () => {
                    try {
                        const result = await new Promise((resolve) => {
                            const req = indexedDB.open('tt-data');
                            req.onsuccess = () => {
                                const db = req.result;
                                const stores = Array.from(db.objectStoreNames);
                                let hasStore = stores.includes('store');
                                let count = 0;
                                if (hasStore) {
                                    try {
                                        const tx = db.transaction('store', 'readonly');
                                        const c = tx.objectStore('store').count();
                                        count = c;
                                    } catch(e) {}
                                }
                                resolve({version: db.version, stores: stores, hasStore: hasStore, count: count});
                                db.close();
                            };
                            req.onerror = () => resolve({error: req.error.message});
                            setTimeout(() => resolve({error: 'timeout'}), 2000);
                        });
                        return result;
                    } catch(e) { return {error: e.message}; }
                }
            """)
            print(f"  [{i}s] IDB: {json.dumps(idb)}", flush=True)
            if isinstance(idb, dict) and idb.get('hasStore'):
                print(f"\n  IndexedDB healthy!", flush=True)
                break
            await page.wait_for_timeout(1000)
        
        # Step 4: Click on RunnerXBT channel
        click_pos = await page.evaluate("""
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
        if click_pos:
            await page.mouse.click(click_pos['x'], click_pos['y'])
            await page.wait_for_timeout(5000)
            print(f"Clicked channel", flush=True)
        
        # Step 5: Wait and check if IndexedDB accumulates messages
        for i in range(20):
            count = await page.evaluate("document.querySelectorAll('.message-content-wrapper').length")
            idb_data = await page.evaluate("""
                async () => {
                    try {
                        const db = await new Promise((resolve, reject) => {
                            const req = indexedDB.open('tt-data');
                            req.onsuccess = () => resolve(req.result);
                            req.onerror = () => reject(req.error);
                        });
                        const tx = db.transaction('store', 'readonly');
                        const sr = tx.objectStore('store').get('tt-global-state');
                        const state = await new Promise((resolve) => {
                            sr.onsuccess = () => resolve(sr.result);
                            sr.onerror = () => resolve(null);
                        });
                        db.close();
                        if (!state?.messages?.byChatId) return {chatMsgs: 0};
                        const byId = state.messages.byChatId['-1002233421487']?.byId;
                        return {chatMsgs: byId ? Object.keys(byId).length : 0};
                    } catch(e) { return {error: e.message}; }
                }
            """)
            print(f"  [{i}s] DOM msgs: {count}, IDB msgs: {json.dumps(idb_data)}", flush=True)
            idb_count = idb_data.get('chatMsgs', 0) if isinstance(idb_data, dict) else 0
            if idb_count > 50:
                print(f"\n  IndexedDB building up! {idb_count} messages", flush=True)
                break
            await page.wait_for_timeout(2000)

asyncio.run(run())

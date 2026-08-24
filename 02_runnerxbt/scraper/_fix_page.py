"""
Phase 1: Restore the browser page to a working state with clean IndexedDB
"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Step 1: Check current page state
        url = page.url
        print(f"Current URL: {url}", flush=True)
        
        # Step 2: Navigate to channel if not there
        if "#-1002233421487" not in url:
            print("Navigating to channel...", flush=True)
            await page.goto("https://web.telegram.org/a/#-1002233421487", wait_until="domcontentloaded")
            await page.wait_for_timeout(5000)
        
        # Step 3: Check IndexedDB state
        idb_state = await page.evaluate("""
            async () => {
                try {
                    const result = await new Promise((resolve) => {
                        const req = indexedDB.open('tt-data');
                        req.onsuccess = () => {
                            const db = req.result;
                            const storeNames = Array.from(db.objectStoreNames);
                            const tx = db.transaction('store', 'readonly');
                            const countReq = tx.objectStore('store').count();
                            countReq.onsuccess = () => {
                                const info = {dbName: db.name, version: db.version, stores: storeNames, count: countReq.result};
                                db.close();
                                resolve(info);
                            };
                            countReq.onerror = () => {
                                resolve({error: 'count failed', dbName: db.name, version: db.version});
                                db.close();
                            };
                            // timeout fallback
                            setTimeout(() => resolve({error: 'timeout', dbName: db.name}), 3000);
                        };
                        req.onerror = () => resolve({error: 'open failed: ' + req.error.message});
                        req.onupgradeneeded = (e) => {
                            // DB was deleted and needs upgrade - let it handle
                            console.log('onupgradeneeded fired', e);
                        };
                        // timeout fallback
                        setTimeout(() => resolve({error: 'open timeout'}), 5000);
                    });
                    return result;
                } catch(e) {
                    return {error: e.message};
                }
            }
        """)
        print(f"IndexedDB state: {json.dumps(idb_state, ensure_ascii=False)}", flush=True)
        
        # Step 4: If IndexedDB is stuck/broken, delete and reload
        if isinstance(idb_state, dict) and idb_state.get('error'):
            print(f"IndexedDB error: {idb_state['error']}. Attempting fix...", flush=True)
            
            # Delete and reload
            await page.evaluate("""
                async () => {
                    try {
                        await new Promise((resolve, reject) => {
                            const req = indexedDB.deleteDatabase('tt-data');
                            req.onsuccess = () => resolve();
                            req.onerror = () => reject(req.error);
                        });
                    } catch(e) {
                        console.error('delete failed', e);
                    }
                }
            """)
            print("Deleted IndexedDB tt-data", flush=True)
            
            # Reload the page fresh
            await page.goto("https://web.telegram.org/a/#-1002233421487", wait_until="domcontentloaded")
            print("Reloaded page", flush=True)
            
            # Wait for messages and IndexedDB to initialize
            for i in range(60):
                # Check for messages
                has_msgs = await page.evaluate("document.querySelector('[data-message-id]') !== null")
                
                # Check IndexedDB
                idb_check = await page.evaluate("""
                    async () => {
                        try {
                            const result = await new Promise((resolve) => {
                                const req = indexedDB.open('tt-data');
                                req.onsuccess = () => {
                                    const db = req.result;
                                    const info = {version: db.version, stores: Array.from(db.objectStoreNames)};
                                    db.close();
                                    resolve(info);
                                };
                                req.onerror = () => resolve({error: req.error.message});
                                setTimeout(() => resolve({error: 'timeout'}), 3000);
                            });
                            return result;
                        } catch(e) { return {error: e.message}; }
                    }
                """)
                
                if has_msgs:
                    print(f"  Messages visible at {i}s", flush=True)
                if isinstance(idb_check, dict) and 'error' not in idb_check:
                    print(f"  IndexedDB ready at {i}s: {json.dumps(idb_check)}", flush=True)
                    break
                    
                await page.wait_for_timeout(1000)
                if i % 10 == 0:
                    print(f"  Waiting... {i}s", flush=True)
                    if has_msgs:
                        print(f"    msgs=yes idb={json.dumps(idb_check)}", flush=True)
        
        # Step 5: Final state
        final_idb = await page.evaluate("""
            async () => {
                try {
                    const result = await new Promise((resolve) => {
                        const req = indexedDB.open('tt-data');
                        req.onsuccess = () => {
                            const db = req.result;
                            const tx = db.transaction('store', 'readonly');
                            const countReq = tx.objectStore('store').count();
                            countReq.onsuccess = () => {
                                const info = {version: db.version, count: countReq.result};
                                db.close();
                                resolve(info);
                            };
                            setTimeout(() => resolve({error: 'count timeout', version: db.version}), 2000);
                        };
                        req.onerror = () => resolve({error: req.error.message});
                        setTimeout(() => resolve({error: 'open timeout'}), 5000);
                    });
                    return result;
                } catch(e) { return {error: e.message}; }
            }
        """)
        print(f"\nFinal IndexedDB: {json.dumps(final_idb, ensure_ascii=False)}", flush=True)
        
        # Step 6: Check DOM messages
        dom_info = await page.evaluate("""
            () => {
                const items = document.querySelectorAll('[data-message-id]');
                const ids = Array.from(items)
                    .map(el => parseInt(el.getAttribute('data-message-id')))
                    .filter(id => !isNaN(id) && id === Math.floor(id));
                const unique = [...new Set(ids)].sort((a,b)=>a-b);
                const el = document.querySelector('.MessageList');
                return {
                    count: unique.length,
                    first: unique[0],
                    last: unique[unique.length-1],
                    scrollTop: el?.scrollTop || 0,
                    scrollH: el?.scrollHeight || 0,
                };
            }
        """)
        print(f"DOM messages: {json.dumps(dom_info)}", flush=True)
        
        print(f"\nPage is ready! Now I can scrape with full data.", flush=True)

asyncio.run(run())

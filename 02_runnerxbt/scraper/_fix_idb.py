"""
Fix IndexedDB by re-creating the 'store' object store, then reload
"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Step 1: Fix the IndexedDB by deleting and letting app recreate it
        # Instead of CDP clear, navigate to the main page and let app handle DB creation
        
        # Navigate to main Telegram page (not channel)
        await page.goto("https://web.telegram.org/a/", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        
        # Wait for IndexedDB to be properly initialized
        for i in range(30):
            idb_check = await page.evaluate("""
                async () => {
                    try {
                        const result = await new Promise((resolve) => {
                            const req = indexedDB.open('tt-data');
                            req.onsuccess = () => {
                                const db = req.result;
                                const stores = Array.from(db.objectStoreNames);
                                let count = 0;
                                if (stores.includes('store')) {
                                    try {
                                        const tx = db.transaction('store');
                                        count = tx.objectStore('store').count();
                                    } catch(e) {}
                                }
                                resolve({version: db.version, stores: stores, count: count});
                                db.close();
                            };
                            req.onerror = () => resolve({error: req.error.message});
                            setTimeout(() => resolve({error: 'timeout'}), 3000);
                        });
                        return result;
                    } catch(e) { return {error: e.message}; }
                }
            """)
            print(f"  [{i}s] IDB: {json.dumps(idb_check)}", flush=True)
            
            stores = idb_check.get('stores', [])
            if 'store' in stores:
                print(f"\n  IndexedDB is healthy! Store found.", flush=True)
                break
            
            await page.wait_for_timeout(2000)
        
        # Navigate to the channel
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
            print(f"\n  Clicked channel.", flush=True)
        
        # Wait for messages
        for i in range(30):
            count = await page.evaluate("document.querySelectorAll('.message-content-wrapper').length")
            if count > 0:
                print(f"  Messages loaded: {count}", flush=True)
                break
            await page.wait_for_timeout(1000)
        
        # Check if IndexedDB now has messages
        idb_data = await page.evaluate("""
            async () => {
                try {
                    const result = await new Promise((resolve) => {
                        const req = indexedDB.open('tt-data');
                        req.onsuccess = () => {
                            const db = req.result;
                            try {
                                const tx = db.transaction('store', 'readonly');
                                const gr = tx.objectStore('store').get('tt-global-state');
                                gr.onsuccess = () => {
                                    const state = gr.result;
                                    if (!state?.messages?.byChatId) { resolve({error: 'no byChatId'}); db.close(); return; }
                                    const byId = state.messages.byChatId['-1002233421487']?.byId;
                                    if (!byId) { resolve({error: 'no chat msgs'}); db.close(); return; }
                                    const keys = Object.keys(byId).map(Number).sort((a,b)=>a-b);
                                    resolve({count: keys.length, first: keys[0], last: keys[keys.length-1],
                                        first_date: byId[keys[0]]?.date, last_date: byId[keys[keys.length-1]]?.date});
                                    db.close();
                                };
                                gr.onerror = () => { resolve({error: 'get failed'}); db.close(); };
                            } catch(e) { resolve({error: 'tx error: ' + e.message}); db.close(); }
                        };
                        req.onerror = () => resolve({error: 'open failed'});
                        setTimeout(() => resolve({error: 'timeout'}), 3000);
                    });
                    return result;
                } catch(e) { return {error: e.message}; }
            }
        """)
        print(f"\n  IDB messages: {json.dumps(idb_data)}", flush=True)

asyncio.run(run())

"""
Delete corrupted IndexedDB, reload, let app recreate properly
Then scrape all messages using IndexedDB + scroll triggers
"""
import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("D:/Vibe Coding 项目合集/runnerxbt")

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Step 1: Delete the corrupted IndexedDB from JS context
        await page.evaluate("""
            async () => {
                await new Promise((resolve) => {
                    const req = indexedDB.deleteDatabase('tt-data');
                    req.onsuccess = () => { console.log('DB deleted'); resolve(); };
                    req.onerror = () => { console.error('DB delete error'); resolve(); };
                    req.onblocked = () => { console.log('DB blocked, retrying'); resolve(); };
                    setTimeout(() => resolve(), 2000);
                });
            }
        """)
        print("IndexedDB deleted", flush=True)
        
        # Step 2: Reload and wait for fresh initialization
        await page.reload(wait_until="domcontentloaded")
        print("Page reloaded", flush=True)
        
        # Step 3: Wait for IndexedDB to be recreated with 'store'
        for i in range(60):
            idb = await page.evaluate("""
                async () => {
                    try {
                        const result = await new Promise((resolve) => {
                            const req = indexedDB.open('tt-data');
                            req.onsuccess = () => {
                                const db = req.result;
                                const stores = Array.from(db.objectStoreNames);
                                resolve({version: db.version, stores: stores, hasStore: stores.includes('store')});
                                db.close();
                            };
                            req.onerror = () => resolve({error: req.error.message});
                            setTimeout(() => resolve({error: 'timeout'}), 2000);
                        });
                        return result;
                    } catch(e) { return {error: e.message}; }
                }
            """)
            
            if isinstance(idb, dict) and idb.get('hasStore'):
                print(f"  IndexedDB ready at {i}s: {json.dumps(idb)}", flush=True)
                break
            if i % 5 == 0:
                print(f"  [{i}s] IDB: {json.dumps(idb)}", flush=True)
            await page.wait_for_timeout(1000)
        
        # Step 4: Click on the channel
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
        
        # Step 5: Wait for messages
        for i in range(30):
            count = await page.evaluate("document.querySelectorAll('.message-content-wrapper').length")
            if count > 0:
                print(f"  Messages: {count}", flush=True)
                break
            await page.wait_for_timeout(1000)
        
        # Step 6: Check IndexedDB now
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
                                    resolve({count: keys.length, first: keys[0], last: keys[keys.length-1]});
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
        print(f"IDB messages: {json.dumps(idb_data)}", flush=True)

asyncio.run(run())

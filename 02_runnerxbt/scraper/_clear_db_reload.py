"""Clear IndexedDB and reload to start fresh"""
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]

        # First check how many messages in IndexedDB before clearing
        before = await page.evaluate("""
            async () => {
                try {
                    const db = await new Promise((resolve, reject) => {
                        const req = indexedDB.open('tt-data');
                        req.onsuccess = () => resolve(req.result);
                        req.onerror = () => reject(req.error);
                    });
                    const tx = db.transaction('store', 'readonly');
                    const state = await new Promise((resolve, reject) => {
                        const req = tx.objectStore('store').get('tt-global-state');
                        req.onsuccess = () => resolve(req.result);
                        req.onerror = () => reject(req.error);
                    });
                    db.close();
                    if (!state || !state.messages || !state.messages.byChatId) return 'no_msgs';
                    const byId = state.messages.byChatId['-1002233421487'];
                    if (!byId || !byId.byId) return 'no_chat';
                    return Object.keys(byId.byId).length;
                } catch(e) { return 'error: ' + e.message; }
            }
        """)
        print(f"IndexedDB messages before: {before}", flush=True)

        # Delete the IndexedDB database
        await page.evaluate("""
            async () => {
                // Delete tt-data database
                await new Promise((resolve, reject) => {
                    const req = indexedDB.deleteDatabase('tt-data');
                    req.onsuccess = () => resolve();
                    req.onerror = () => reject(req.error);
                });
            }
        """)
        print("IndexedDB 'tt-data' deleted!", flush=True)

        # Reload the page
        await page.reload(wait_until="domcontentloaded")
        await page.wait_for_timeout(10000)
        print(f"URL: {page.url}", flush=True)

        # Wait for messages to load
        for i in range(60):
            has_msgs = await page.evaluate(
                "document.querySelector('[data-message-id]') !== null"
            )
            if has_msgs:
                info = await page.evaluate("""
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
                print(f"Messages: {info}", flush=True)
                break
            await page.wait_for_timeout(1000)
            if i % 10 == 0:
                print(f"  waiting... {i}s", flush=True)
        
        # Check IndexedDB now
        after = await page.evaluate("""
            async () => {
                try {
                    const db = await new Promise((resolve, reject) => {
                        const req = indexedDB.open('tt-data');
                        req.onsuccess = () => resolve(req.result);
                        req.onerror = () => reject(req.error);
                    });
                    const tx = db.transaction('store', 'readonly');
                    const state = await new Promise((resolve, reject) => {
                        const req = tx.objectStore('store').get('tt-global-state');
                        req.onsuccess = () => resolve(req.result);
                        req.onerror = () => reject(req.error);
                    });
                    db.close();
                    if (!state || !state.messages || !state.messages.byChatId) return 'no_msgs';
                    const byId = state.messages.byChatId['-1002233421487'];
                    if (!byId || !byId.byId) return 'no_chat';
                    return Object.keys(byId.byId).length;
                } catch(e) { return 'error: ' + e.message; }
            }
        """)
        print(f"IndexedDB messages after: {after}", flush=True)

asyncio.run(run())

"""Debug IndexedDB state"""
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Check IndexedDB state
        r = await page.evaluate("""
            async () => {
                try {
                    const db = await new Promise((resolve, reject) => {
                        const req = indexedDB.open("tt-data");
                        req.onsuccess = () => resolve(req.result);
                        req.onerror = () => reject(req.error);
                    });
                    const tx = db.transaction("store", "readonly");
                    const state = await new Promise((resolve, reject) => {
                        const req = tx.objectStore("store").get("tt-global-state");
                        req.onsuccess = () => resolve(req.result);
                        req.onerror = () => reject(req.error);
                    });
                    db.close();
                    const byChatId = state?.messages?.byChatId;
                    if (!byChatId) return {error: "no byChatId", keys: state?.messages ? Object.keys(state.messages) : "no messages"};
                    const chat = byChatId["-1002233421487"];
                    if (!chat) return {error: "no chat", chats: Object.keys(byChatId).slice(0,10)};
                    const byId = chat.byId;
                    if (!byId) return {error: "no byId in chat"};
                    const keys = Object.keys(byId).map(Number).sort((a,b)=>a-b);
                    return {count: keys.length, first: keys[0], last: keys[keys.length-1]};
                } catch(e) {
                    return {error: e.message, stack: e.stack};
                }
            }
        """)
        print("IndexedDB state:", r, flush=True)
        
        # Also check DOM messages
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
        print("DOM messages:", dom, flush=True)
        
        # Try to get ALL messages from in-memory state
        # Telegram Web Astro version uses a global store
        mem = await page.evaluate("""
            () => {
                // Try to find the app store in various globals
                const candidates = [];
                for (const key of Object.keys(window)) {
                    if (key.toLowerCase().includes('store') || 
                        key.toLowerCase().includes('state') ||
                        key.toLowerCase().includes('app') ||
                        key.toLowerCase().includes('telegram') ||
                        key.toLowerCase().includes('mtc')) {
                        candidates.push(key);
                    }
                }
                return {
                    windowKeys: candidates,
                    hasApp: typeof window.app !== 'undefined',
                    hasStore: typeof window.store !== 'undefined',
                };
            }
        """)
        print("Globals:", mem, flush=True)

asyncio.run(run())

"""Click on RunnerXBT channel and start scraping"""
import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("D:/Vibe Coding 项目合集/runnerxbt")

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Click on RunnerXBT Insights in chat list
        clicked = await page.evaluate("""
            () => {
                const chats = document.querySelectorAll('[class*="chat"]');
                for (const chat of chats) {
                    if (chat.innerText.includes('RunnerXBT')) {
                        chat.click();
                        return true;
                    }
                }
                return false;
            }
        """)
        print(f"Clicked channel: {clicked}", flush=True)
        await page.wait_for_timeout(5000)
        
        # Wait for messages
        for i in range(60):
            has = await page.evaluate("document.querySelector('[data-message-id]') !== null")
            if has:
                info = await page.evaluate("""
                    () => {
                        const items = document.querySelectorAll('[data-message-id]');
                        const ids = Array.from(items)
                            .map(el => parseInt(el.getAttribute('data-message-id')))
                            .filter(id => !isNaN(id) && id === Math.floor(id));
                        const unique = [...new Set(ids)].sort((a,b)=>a-b);
                        const el = document.querySelector('.MessageList');
                        return {
                            count: unique.length, first: unique[0], last: unique[unique.length-1],
                            scrollTop: el?.scrollTop || 0, scrollH: el?.scrollHeight || 0
                        };
                    }
                """)
                print(f"Messages: {info}", flush=True)
                break
            await page.wait_for_timeout(1000)
            if i % 5 == 0: print(f"  waiting {i}s", flush=True)
        
        # Check IndexedDB
        idb = await page.evaluate("""
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
                    if (!state?.messages?.byChatId) return {error: 'no byChatId'};
                    const byId = state.messages.byChatId['-1002233421487']?.byId;
                    if (!byId) return {error: 'no chat msgs'};
                    const keys = Object.keys(byId).map(Number).sort((a,b)=>a-b);
                    return {count: keys.length, first: keys[0], last: keys[keys.length-1]};
                } catch(e) { return {error: e.message}; }
            }
        """)
        print(f"IndexedDB: {json.dumps(idb)}", flush=True)

asyncio.run(run())

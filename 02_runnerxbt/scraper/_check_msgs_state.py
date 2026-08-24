"""Read messages from tt-global-state"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Read messages from state
        msgs = await page.evaluate("""
            async () => {
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
                
                if (!state || !state.messages) return {error: 'no messages'};
                
                const result = {};
                const msgKeys = Object.keys(state.messages);
                result.messageCount = msgKeys.length;
                result.sampleKeys = msgKeys.slice(0, 5);
                
                // Check one message structure
                const firstKey = msgKeys[0];
                const firstMsg = state.messages[firstKey];
                result.sampleMessage = {
                    key: firstKey,
                    type: typeof firstMsg,
                    keys: firstMsg ? Object.keys(firstMsg).slice(0, 20) : [],
                    preview: JSON.stringify(firstMsg).substring(0, 300),
                };
                
                // Count total
                let totalMsgs = 0;
                for (const k of msgKeys) {
                    const group = state.messages[k];
                    if (Array.isArray(group)) totalMsgs += group.length;
                    else if (typeof group === 'object') totalMsgs += Object.keys(group).length;
                }
                result.totalMessageObjects = totalMsgs;
                
                return result;
            }
        """)
        print(json.dumps(msgs, ensure_ascii=False, indent=2), flush=True)

asyncio.run(run())

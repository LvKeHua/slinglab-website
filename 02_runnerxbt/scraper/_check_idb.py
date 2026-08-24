"""Check IndexedDB for accumulated messages and try to extract with full data"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Check IndexedDB
        idb = await page.evaluate("""
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
                                    if (!state?.messages?.byChatId) { db.close(); resolve({error: 'no chat data'}); return; }
                                    const byId = state.messages.byChatId['-1002233421487']?.byId;
                                    if (!byId) { db.close(); resolve({error: 'no chat msgs'}); return; }
                                    const keys = Object.keys(byId).map(Number).sort((a,b)=>a-b);
                                    
                                    // Sample first and last
                                    const first = byId[keys[0]];
                                    const last = byId[keys[keys.length-1]];
                                    
                                    // Get a sample message with all fields
                                    const sample = byId[keys[Math.floor(keys.length/2)]];
                                    
                                    resolve({
                                        count: keys.length,
                                        first_id: keys[0],
                                        last_id: keys[keys.length-1],
                                        first_date: first?.date,
                                        last_date: last?.date,
                                        sample_keys: Object.keys(sample || {}),
                                        sample_id: sample?.id,
                                        sample_date: sample?.date,
                                        has_photo: !!(sample?.content?.photo),
                                        has_video: !!(sample?.content?.video?.id),
                                        has_document: !!(sample?.content?.document),
                                        has_webpage: !!(sample?.content?.webpage),
                                        sample_text: (sample?.content?.text?.text || '').substring(0, 60),
                                    });
                                    db.close();
                                };
                                gr.onerror = () => { db.close(); resolve({error: 'get failed'}); };
                            } catch(e) { db.close(); resolve({error: 'tx error: ' + e.message}); }
                        };
                        req.onerror = () => resolve({error: 'open failed'});
                        setTimeout(() => resolve({error: 'open timeout'}), 3000);
                    });
                    return result;
                } catch(e) { return {error: e.message}; }
            }
        """)
        
        print(f"IndexedDB: {json.dumps(idb, indent=2, ensure_ascii=False)}", flush=True)

asyncio.run(run())

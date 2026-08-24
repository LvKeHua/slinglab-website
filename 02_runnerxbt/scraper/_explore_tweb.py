"""Explore tweb-account-1 database for message data"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        chats = await page.evaluate("""
            async () => {
                const db = await new Promise((resolve, reject) => {
                    const req = indexedDB.open('tweb-account-1');
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });
                
                const results = {};
                
                // Get all chat keys
                const tx = db.transaction('chats', 'readonly');
                const allKeys = await new Promise((resolve, reject) => {
                    const req = tx.objectStore('chats').getAllKeys();
                    req.onsuccess = () => resolve(Array.from(req.result));
                    req.onerror = () => reject(req.error);
                });
                results['_chat_count'] = allKeys.length;
                results['_chat_keys'] = allKeys.slice(0, 20);
                
                // Check RunnerXBT chat (ID should be 2233421487 or -1002233421487)
                for (const key of allKeys) {
                    if (String(key).includes('2233421487')) {
                        const val = await new Promise((resolve, reject) => {
                            const req = tx.objectStore('chats').get(key);
                            req.onsuccess = () => resolve(req.result);
                            req.onerror = () => reject(req.error);
                        });
                        results['_runner_chat'] = {
                            key: key,
                            keys: val ? Object.keys(val).slice(0, 20) : [],
                            type: val?._,
                            title: val?.title || val?.name || '',
                            hasMessages: !!val?.messages?.byId || !!val?.topMessage || !!val?.pinnedMessage,
                            messageCount: val?.messages ? Object.keys(val.messages).length : 0,
                            topMsg: val?.topMessage ? 'yes' : 'no',
                            fullPreview: JSON.stringify(val).substring(0, 500),
                        };
                    }
                }
                
                // Check dialogs store
                const tx2 = db.transaction('dialogs', 'readonly');
                const dialogKeys = await new Promise((resolve, reject) => {
                    const req = tx2.objectStore('dialogs').getAllKeys();
                    req.onsuccess = () => resolve(Array.from(req.result));
                    req.onerror = () => reject(req.error);
                });
                results['_dialog_keys'] = dialogKeys.slice(0, 20);
                
                for (const key of dialogKeys) {
                    if (String(key).includes('2233421487')) {
                        const val = await new Promise((resolve, reject) => {
                            const req = tx2.objectStore('dialogs').get(key);
                            req.onsuccess = () => resolve(req.result);
                            req.onerror = () => reject(req.error);
                        });
                        results['_runner_dialog'] = {
                            key: key,
                            keys: val ? Object.keys(val).slice(0, 20) : [],
                            preview: JSON.stringify(val).substring(0, 500),
                        };
                    }
                }
                
                // Check messages store more carefully
                const tx3 = db.transaction('messages', 'readonly');
                const msgKeys = await new Promise((resolve, reject) => {
                    const req = tx3.objectStore('messages').getAllKeys();
                    req.onsuccess = () => resolve(Array.from(req.result));
                    req.onerror = () => reject(req.error);
                });
                results['_msg_count'] = msgKeys.length;
                results['_msg_keys_sample'] = msgKeys.slice(0, 10);
                
                db.close();
                return results;
            }
        """)
        
        print(json.dumps(chats, indent=2, ensure_ascii=False))

asyncio.run(run())

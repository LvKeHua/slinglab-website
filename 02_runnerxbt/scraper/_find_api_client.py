"""Find Telegram Web's MTProto API client in JavaScript context"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Check for MTProto / API related objects
        api_info = await page.evaluate("""
            () => {
                const found = {};
                
                // Check all window keys
                for (const key of Object.getOwnPropertyNames(window)) {
                    try {
                        const val = window[key];
                        if (val && typeof val === 'object') {
                            const str = JSON.stringify(val).substring(0, 100);
                            if (str.includes('mtproto') || str.includes('MTProto') || 
                                str.includes('api') || str.includes('gramjs') ||
                                key.toLowerCase().includes('mtproto') || key.toLowerCase().includes('telegram')) {
                                found[key] = {type: typeof val, preview: str.substring(0, 80)};
                            }
                        }
                    } catch(e) {}
                }
                
                // Check for WebSocket connections
                // We can find the service worker or worker
                
                // Check for specific patterns
                const patterns = ['MTProto', 'mtproto', 'api_hash', 'dcId', 'messages.getHistory', 'getHistory'];
                for (const p of patterns) {
                    // Search in page source
                    if (document.body?.innerText?.includes(p)) {
                        console.log('Found pattern:', p);
                    }
                }
                
                return found;
            }
        """)
        
        print(f"API objects found: {len(api_info)}", flush=True)
        for k, v in api_info.items():
            print(f"  {k}: {v}", flush=True)
        
        # Also try to intercept WebSocket messages
        ws_info = await page.evaluate("""
            () => {
                // Check for WebSocket in the page
                const origWebSocket = window.WebSocket;
                if (origWebSocket) {
                    // Try to find active WebSocket connections
                }
                
                // Check if navigator has service worker
                return {
                    hasServiceWorker: 'serviceWorker' in navigator,
                    hasWebSocket: typeof WebSocket !== 'undefined',
                    workerCount: navigator.serviceWorker?.controller ? 1 : 0,
                };
            }
        """)
        print(f"\nWeb info: {json.dumps(ws_info)}", flush=True)

asyncio.run(run())

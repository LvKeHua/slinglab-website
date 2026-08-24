"""Find and use Telegram Web's internal API client from within the page"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]

        if 'k/' not in page.url:
            await page.goto("https://web.telegram.org/k/#@RunnerXBT_Insights")
            await asyncio.sleep(5)

        # Try to access the app through internal module system
        # In tweb, the app modules are loaded via a bundler
        # Look for the app state in well-known locations
        
        result = await page.evaluate("""
            async () => {
                const found = {};
                
                // Method 1: Look for app via DOM component deep inspection
                const chatEl = document.querySelector('.chat');
                if (chatEl) {
                    const keys = Object.getOwnPropertyNames(chatEl);
                    found['chatEl_keys'] = keys.filter(k => k.startsWith('__')).slice(0, 20);
                    
                    // Check __reactFiber on chat element
                    for (const key of keys) {
                        try {
                            if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance') || key.startsWith('__preact')) {
                                const fiber = chatEl[key];
                                // Try to traverse the fiber tree to find state
                                let node = fiber;
                                let attempts = 0;
                                while (node && attempts < 50) {
                                    attempts++;
                                    const memoized = node.memoizedState || node.stateNode || node.pendingProps || node._state;
                                    if (memoized && typeof memoized === 'object') {
                                        const ks = Object.keys(memoized).slice(0, 10);
                                        // Check for message-related keys
                                        if (ks.some(k => k.includes('message') || k.includes('chat') || k.includes('api') || k.includes('mtproto'))) {
                                            found['state_at_depth_' + attempts] = {
                                                keys: ks,
                                                type: memoized?.constructor?.name || typeof memoized,
                                            };
                                            // Try to drill into messages
                                            for (const k of ks) {
                                                if (k.includes('message') || k.includes('chat')) {
                                                    const val = memoized[k];
                                                    if (val && typeof val === 'object') {
                                                        const vkeys = Object.keys(val).slice(0, 15);
                                                        found['state_' + k] = { type: typeof val, keys: vkeys };
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    node = node.child || node.sibling || node.return;
                                }
                            }
                        } catch(e) {}
                    }
                }
                
                // Method 2: Check service worker
                if ('serviceWorker' in navigator) {
                    const reg = await navigator.serviceWorker.getRegistration();
                    if (reg) {
                        found['sw'] = {
                            active: !!reg.active,
                            scriptURL: reg.active?.scriptURL || 'none',
                            state: reg.active?.state || 'none',
                        };
                    } else {
                        found['sw'] = 'no registration found';
                    }
                }
                
                // Method 3: Check for API-related functions exposed on window
                const scriptEls = document.querySelectorAll('script[src]');
                for (const s of scriptEls) {
                    if (s.src && s.src.includes('index-C')) {
                        found['mainScript'] = s.src.split('/').pop();
                    }
                }
                
                return found;
            }
        """)
        
        print(json.dumps(result, indent=2, ensure_ascii=False))

asyncio.run(run())

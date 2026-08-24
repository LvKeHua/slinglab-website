"""Check Cache API and Service Worker for message data"""
import asyncio, json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Check Cache API
        cache_info = await page.evaluate("""
            async () => {
                try {
                    if (!('caches' in self)) return {error: 'no cache API'};
                    const names = await caches.keys();
                    const result = {};
                    for (const name of names) {
                        const cache = await caches.open(name);
                        const requests = await cache.keys();
                        result[name] = requests.length;
                    }
                    return {cacheNames: names, cacheCounts: result};
                } catch(e) { return {error: e.message}; }
            }
        """)
        print(f"Cache API: {json.dumps(cache_info, indent=2)}", flush=True)
        
        # Try to access via __REACT_DEVTOOLS_GLOBAL_HOOK__
        react = await page.evaluate("""
            () => {
                const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
                if (!hook) return {error: 'no react hook'};
                
                const result = {};
                if (hook.renderers) result.rendererCount = hook.renderers.size;
                
                // Try to find the app fiber
                const rootEl = document.getElementById('root') || document.querySelector('#app');
                if (rootEl) {
                    const keys = Object.keys(rootEl);
                    const reactKey = keys.find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
                    if (reactKey) {
                        result.fiberKey = reactKey;
                        // Walk the fiber tree to find state
                        try {
                            let fiber = rootEl[reactKey];
                            // Walk up to find root
                            while (fiber.return) fiber = fiber.return;
                            result.hasRoot = true;
                            
                            // Check memoizedState
                            const stateKeys = fiber.memoizedState ? Object.keys(fiber.memoizedState).slice(0, 10) : [];
                            result.stateKeys = stateKeys;
                        } catch(e) {
                            result.fiberWalkError = e.message;
                        }
                    }
                }
                
                return result;
            }
        """)
        print(f"\nReact: {json.dumps(react, indent=2)}", flush=True)

asyncio.run(run())

"""Find tweb's internal message store via webpack modules and other internals"""
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

        # Approach 1: Check for webpack require
        result = await page.evaluate("""
            () => {
                const found = {};
                
                // Check for webpack require on various elements
                for (const key of Object.getOwnPropertyNames(window)) {
                    if (key.startsWith('webpack') || key.includes('chunk') || key.includes('__webpack')) {
                        try {
                            found[key] = typeof window[key];
                        } catch(e) {}
                    }
                }
                
                // Check for __webpack_require__ on script tags
                const scripts = document.querySelectorAll('script');
                for (const s of scripts) {
                    try {
                        const keys = Object.keys(s);
                        const webpackKeys = keys.filter(k => k.includes('webpack') || k.includes('__'));
                        if (webpackKeys.length > 0) {
                            found['script_webpack'] = webpackKeys.slice(0, 10);
                            break;
                        }
                    } catch(e) {}
                }
                
                // Check if there's a global webpack require hidden in a closure
                // by checking function sources
                const globalObj = Function('return this')();
                for (const key of Object.getOwnPropertyNames(globalObj)) {
                    if (key.startsWith('webpack') || key === '__webpack_require__') {
                        try { found['global_' + key] = typeof globalObj[key]; } catch(e) {}
                    }
                }
                
                return found;
            }
        """)
        print("Webpack:", json.dumps(result, indent=2, ensure_ascii=False))

        # Approach 2: Access tweb internal state via prototype chain
        state = await page.evaluate("""
            () => {
                try {
                    // Look for the main app component
                    const appRoot = document.querySelector('.app, #app, #root, [class*="app-wrapper"]');
                    if (!appRoot) return {error: 'no app root'};
                    
                    // Try to find __reactFiber or similar on all major elements
                    const checkElements = ['#app', '#root', '.chat', '.scrollable', document.body, document.documentElement];
                    const results = {};
                    
                    for (const el of checkElements) {
                        const e = typeof el === 'string' ? document.querySelector(el) : el;
                        if (!e) continue;
                        const keys = Object.getOwnPropertyNames(e).filter(k => 
                            k.startsWith('__react') || k.startsWith('__preact') || 
                            k.startsWith('__svelte') || k.startsWith('__vue') ||
                            k.startsWith('__ember')
                        );
                        if (keys.length > 0) {
                            results[typeof el === 'string' ? el : el.tagName] = keys.slice(0, 10);
                        }
                    }
                    
                    return results;
                } catch(e) { return {error: e.message}; }
            }
        """)
        print("\nFramework fibers:", json.dumps(state, indent=2, ensure_ascii=False))

        # Approach 3: Search for message data in caches API
        cache_info = await page.evaluate("""
            async () => {
                try {
                    const cacheNames = await caches.keys();
                    const results = {};
                    for (const name of cacheNames) {
                        const cache = await caches.open(name);
                        const requests = await cache.keys();
                        const urls = requests.map(r => r.url).slice(0, 20);
                        results[name] = urls;
                    }
                    return results;
                } catch(e) { return {error: e.message}; }
            }
        """)
        print("\nCache API:", json.dumps(cache_info, indent=2, ensure_ascii=False) if isinstance(cache_info, dict) else cache_info)

asyncio.run(run())

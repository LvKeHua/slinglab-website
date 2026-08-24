"""Use Telegram Web internal JS API to fetch all messages"""
import asyncio, json, re, sys
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("D:/Vibe Coding 项目合集/runnerxbt")

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        print(f"URL: {page.url}", flush=True)
        
        # Try to find Telegram's internal API
        apis = await page.evaluate("""
            () => {
                const result = {};
                
                // Check for common Telegram Web globals
                const checks = ['Telegram', 'TelegramWeb', 'MtProto', 'gramjs', 'MTProto', 
                    'tg', 'app', 'App', 'TWA', '_telegram'];
                
                for (const name of checks) {
                    if (typeof window[name] !== 'undefined') {
                        const val = window[name];
                        result[name] = typeof val;
                        if (typeof val === 'object') {
                            const keys = Object.keys(val).slice(0, 15);
                            result[name + '_keys'] = keys;
                        }
                    }
                }
                
                return result;
            }
        """)
        print(f"Globals:", json.dumps(apis, indent=2, ensure_ascii=False), flush=True)
        
        # Check for the preact/react internal state
        # The app state is usually accessible via __REACT_DEVTOOLS_GLOBAL_HOOK__
        fiber = await page.evaluate("""
            () => {
                // Try to find the app root via React/Preact internals
                const root = document.getElementById('root') || document.querySelector('#app') || document.querySelector('[data-app]');
                if (!root) return {error: 'no root'};
                
                // Check for React fiber
                const fiberKey = Object.keys(root).find(k => k.startsWith('__reactFiber') || k.startsWith('__preact'));
                if (fiberKey) return {fiberKey, found: 'react_or_preact'};
                
                // Check for __reactContainer
                const containerKey = Object.keys(root).find(k => k.startsWith('__reactContainer'));
                if (containerKey) return {containerKey, found: 'react_container'};
                
                // Check for __vue_
                const vueKey = Object.keys(root).find(k => k.startsWith('__vue'));
                if (vueKey) return {vueKey, found: 'vue'};
                
                return {error: 'no framework detected', rootKeys: Object.keys(root).filter(k => k.startsWith('__')).slice(0, 20)};
            }
        """)
        print(f"Framework:", json.dumps(fiber, indent=2, ensure_ascii=False), flush=True)

asyncio.run(run())

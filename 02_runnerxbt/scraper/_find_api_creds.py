"""Find api_id and api_hash from Telegram Web's source code"""
import asyncio, json, sys, re
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]

        if 'k/' not in page.url:
            await page.goto("https://web.telegram.org/k/#@RunnerXBT_Insights")
            await asyncio.sleep(5)

        # Search for api_id pattern in page source
        result = await page.evaluate("""
            () => {
                const results = {};
                
                // Search for api_id in page script contents
                const scripts = document.querySelectorAll('script');
                let allSource = '';
                for (const s of scripts) {
                    if (s.src) {
                        results['script_' + (s.src.split('/').pop() || '')] = 'external: ' + s.src.slice(0,80);
                    } else if (s.textContent) {
                        allSource += s.textContent + '\\n';
                    }
                }
                
                // Search for api_id pattern
                const apiIdMatch = allSource.match(/api[_\\-]?id[\\s]*[:=][\\s]*(\\d+)/i);
                if (apiIdMatch) results['api_id'] = apiIdMatch[1];
                
                const apiHashMatch = allSource.match(/api[_\\-]?hash[\\s]*[:=][\\s]*[\"']([^\"']+)[\"']/i);
                if (apiHashMatch) results['api_hash'] = apiHashMatch[1];
                
                // Check for dc options or known patterns
                const dcPattern = allSource.match(/dcOption|DC_OPTION|dcId/gi);
                if (dcPattern) results['dc_count'] = dcPattern.length;
                
                return results;
            }
        """)
        print("Inline scripts:", json.dumps(result, indent=2, ensure_ascii=False))

        # Try to fetch the main worker JS and search for api_id
        print("\nTrying to fetch worker JS to find api credentials...")
        try:
            worker_url = "https://web.telegram.org/k/index.worker-CxuphqsJ.js"
            resp = await page.evaluate(f"""
                async () => {{
                    try {{
                        const r = await fetch('{worker_url}', {{cache: 'force-cache'}});
                        const text = await r.text();
                        // Search for apiId pattern - try various formats
                        const patterns = [
                            /apiId[\\s]*[:=][\\s]*(\\d+)/g,
                            /api_id[\\s]*[:=][\\s]*(\\d+)/g,
                            /apiHash[\\s]*[:=][\\s]*['\"]([^'\"]+)['\"]/g,
                        ];
                        const results = {{}};
                        for (const p of patterns) {{
                            const matches = text.match(p);
                            if (matches) results[p.source.slice(0,40)] = matches.slice(0,5);
                        }}
                        // Also grep for common api ids
                        const idMatch = text.match(/2496|2040|17349|611335|94575|2834/g);
                        if (idMatch) results.common_ids = [...new Set(idMatch)].slice(0, 10);
                        return {{found: Object.keys(results).length > 0, results, length: text.length}};
                    }} catch(e) {{ return {{error: e.message}}; }}
                }}
            """)
            print(json.dumps(resp, indent=2, ensure_ascii=False) if isinstance(resp, dict) else resp)
        except Exception as e:
            print(f"Fetch error: {e}")

asyncio.run(run())

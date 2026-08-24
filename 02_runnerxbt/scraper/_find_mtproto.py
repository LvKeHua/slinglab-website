"""Find Telegram Web's MTProto API client via component tree traversal"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Ensure we're on K version
        if 'k/' not in page.url:
            await page.goto("https://web.telegram.org/k/#@RunnerXBT_Insights")
            await asyncio.sleep(5)

        # Search for MTProto / API through window global scope
        result = await page.evaluate("""
            () => {
                const found = {};
                const visited = new Set();
                
                // Deep search through window properties
                function search(obj, path, depth) {
                    if (depth > 3) return;
                    if (!obj || typeof obj !== 'object') return;
                    if (visited.has(obj)) return;
                    
                    try {
                        visited.add(obj);
                        const proto = Object.getPrototypeOf(obj);
                        const props = [...Object.getOwnPropertyNames(obj), ...Object.getOwnPropertyNames(proto || {})].filter(p => p !== '__proto__');
                        
                        for (const p of props.slice(0, 50)) {
                            try {
                                const val = obj[p];
                                if (val && typeof val === 'object' && !visited.has(val)) {
                                    const s = String(val).substring(0, 40);
                                    const keys = Object.keys(val).slice(0, 10);
                                    
                                    // Check for MTProto/Telegram API related objects
                                    const lowerP = p.toLowerCase();
                                    const hasApiKeys = keys.some(k => 
                                        k.includes('messages') || k.includes('channels') || 
                                        k.includes('api') || k.includes('mtproto')
                                    );
                                    const hasApiString = s.toLowerCase().includes('mtproto') || 
                                        s.toLowerCase().includes('message') || 
                                        keys.some(k => k === 'messages.getHistory');
                                    
                                    if (hasApiKeys || hasApiString || 
                                        lowerP.includes('mtproto') || lowerP.includes('api') || 
                                        lowerP.includes('telegram') || lowerP.includes('client') ||
                                        lowerP === 'app' || lowerP === 'tg') {
                                        
                                        found[path + '.' + p] = {
                                            type: typeof val,
                                            keys: keys.slice(0, 15),
                                            preview: s.substring(0, 60),
                                        };
                                        
                                        // Continue searching deeper
                                        search(val, path + '.' + p, depth + 1);
                                    }
                                }
                            } catch(e) {}
                        }
                    } catch(e) {}
                }
                
                search(window, 'window', 0);
                return found;
            }
        """)
        
        print(f"Found {len(result)} API-related objects:")
        for k, v in sorted(result.items()):
            print(f"  {k}")
            print(f"    keys={v['keys']}")
            print(f"    preview={v['preview']}")
            print()

asyncio.run(run())

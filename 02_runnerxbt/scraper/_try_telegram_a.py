"""Try loading RunnerXBT in Telegram A (classic) version which might render messages differently"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Try loading Telegram A (classic version)
        await page.goto("https://web.telegram.org/a/#@RunnerXBT_Insights")
        await asyncio.sleep(6)
        
        print(f"URL: {page.url}")
        
        # Check DOM structure
        info = await page.evaluate("""
            () => {
                const r = {};
                
                // Check for different elements
                const selectors = [
                    '.MessageList',
                    '.messages-container',
                    '.chat-container',
                    '[class*="bubbles"]',
                    '.scrollable',
                    '.bubble',
                    '.message-content-wrapper',
                    '[data-message-id]',
                    '.messages-layout',
                    '.im-history',
                ];
                
                for (const s of selectors) {
                    const els = document.querySelectorAll(s);
                    if (els.length > 0) {
                        r[s] = {
                            count: els.length,
                            sample: els[0] ? els[0].tagName + '.' + (els[0].className || '').slice(0, 80) : '',
                        };
                        // Check scroll info on first
                        const el = els[0];
                        if (el.scrollTop !== undefined) {
                            r[s + '_scroll'] = {
                                st: el.scrollTop,
                                sh: el.scrollHeight,
                                ch: el.clientHeight,
                            };
                        }
                    }
                }
                
                r['_total_bubbles'] = document.querySelectorAll('.bubble').length;
                r['_total_data_mid'] = document.querySelectorAll('[data-mid]').length;
                r['_total_message_content'] = document.querySelectorAll('[class*="message-content"]').length;
                
                // Check for the channel title
                const titleEl = document.querySelector('.chat-title, [class*="chat-title"]');
                r['_chat_title'] = titleEl ? titleEl.innerText?.slice(0, 50) : 'not found';
                
                return r;
            }
        """)
        print(json.dumps(info, indent=2, ensure_ascii=False))

asyncio.run(run())

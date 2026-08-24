"""Try Telegram A (classic) - navigate and check if messages render differently"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Close any other pages and navigate fresh
        for p in browser.contexts[0].pages:
            if p != page:
                await p.close()
        
        await page.goto("https://web.telegram.org/a/", wait_until="domcontentloaded")
        await asyncio.sleep(5)
        
        # Check if we see the chat list
        info = await page.evaluate("""
            () => {
                const r = {};
                r.title = document.title;
                r.url = location.href;
                
                // Check for chat list
                const chatItems = document.querySelectorAll('.chat-item-clickable, .ListItem, [class*="chat"]');
                r.chatItems = chatItems.length;
                
                // Check for sidebar with chats
                const sidebar = document.querySelector('.sidebar, .left-column, [class*="sidebar"]');
                r.hasSidebar = !!sidebar;
                
                // Check for login/QR
                const qr = document.querySelector('[class*="qr"]');
                const phoneInput = document.querySelector('input[type="tel"]');
                r.isLoggedIn = !qr && !phoneInput;
                
                return r;
            }
        """)
        print(f"Page info:", json.dumps(info, indent=2, ensure_ascii=False))
        
        if info.get('isLoggedIn'):
            # Try to find and click on RunnerXBT
            clicked = await page.evaluate("""
                () => {
                    const items = document.querySelectorAll('.chat-item-clickable, .ListItem, [class*="chat"]');
                    for (const item of items) {
                        if (item.textContent.includes('RunnerXBT')) {
                            const rect = item.getBoundingClientRect();
                            return {x: rect.x + rect.width/2, y: rect.y + rect.height/2, text: item.textContent.slice(0, 50)};
                        }
                    }
                    // Also search by title attribute
                    const withTitle = document.querySelector('[title*="RunnerXBT"], [aria-label*="RunnerXBT"]');
                    if (withTitle) {
                        const rect = withTitle.getBoundingClientRect();
                        return {x: rect.x + rect.width/2, y: rect.y + rect.height/2, text: 'found by title'};
                    }
                    return null;
                }
            """)
            
            if clicked:
                print(f"Clicking: {clicked['text']} at ({clicked['x']:.0f}, {clicked['y']:.0f})")
                await page.mouse.click(clicked['x'], clicked['y'])
                await asyncio.sleep(4)
                
                # Check messages
                msgs = await page.evaluate("""
                    () => {
                        const r = {};
                        const selectors = [
                            '.MessageList',
                            '.message-content-wrapper',
                            '.bubble',
                            '[data-message-id]',
                            '.messages-container',
                            '.im-history',
                        ];
                        for (const s of selectors) {
                            const els = document.querySelectorAll(s);
                            if (els.length > 0) {
                                r[s] = els.length;
                            }
                        }
                        
                        // Check scroll info
                        const ml = document.querySelector('.MessageList');
                        if (ml) {
                            r.MessageList_scroll = {
                                st: ml.scrollTop,
                                sh: ml.scrollHeight,
                                ch: ml.clientHeight,
                            };
                        }
                        
                        return r;
                    }
                """)
                print(f"Messages found:", json.dumps(msgs, indent=2, ensure_ascii=False))
        else:
            print("Not logged in on A version. Need to auth first.")
            print(f"URL: {page.url}")

asyncio.run(run())

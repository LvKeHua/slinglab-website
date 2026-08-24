"""Try Telegram A version - load fresh, navigate to channel, then scrape"""
import asyncio, json, sys, re, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        
        # Open fresh page for Telegram A
        page = await ctx.new_page()
        
        print("Loading Telegram A...")
        await page.goto("https://web.telegram.org/a/", wait_until="networkidle")
        await asyncio.sleep(8)
        
        # Check state
        info = await page.evaluate("""
            () => {
                const r = {};
                r.title = document.title;
                r.url = location.href;
                
                // Full body text for diagnosis
                r.bodyText = document.body?.innerText?.substring(0, 500) || 'no body';
                
                // Check chat list
                const chatItems = document.querySelectorAll('.chat-item-clickable, .ListItem');
                r.chatItems = chatItems.length;
                if (chatItems.length > 0) {
                    r.firstChat = chatItems[0]?.textContent?.substring(0, 60);
                }
                
                // Check sidebar
                r.sidebarEls = document.querySelectorAll('.sidebar, .left-column, [class*="sidebar"], [class*="Sidebar"]').length;
                
                // Check main element
                r.mainEls = document.querySelectorAll('main, .main, .chat-list, .dialogs, [class*="dialogs"]').length;
                
                // Check for QR/login
                r.qrEls = document.querySelectorAll('[class*="qr"], [class*="QR"]').length;
                r.phoneInput = document.querySelectorAll('input[type="tel"]').length;
                
                // Is there a welcome screen?
                r.welcome = document.body?.innerHTML?.includes('Welcome') || document.body?.innerText?.includes('Welcome') || false;
                
                return r;
            }
        """)
        print(f"\nPage state:")
        print(json.dumps(info, indent=2, ensure_ascii=False))
        
        # If chat list exists, find RunnerXBT
        if info.get('chatItems', 0) > 0:
            # Find and click RunnerXBT
            for attempt in range(3):
                click_info = await page.evaluate("""
                    () => {
                        // Try by chat-item-clickable
                        const items = document.querySelectorAll('.chat-item-clickable, .ListItem, .chatlist-chat');
                        for (const item of items) {
                            const text = item.textContent || '';
                            if (text.toLowerCase().includes('runnerxbt')) {
                                const rect = item.getBoundingClientRect();
                                return {found: true, x: rect.x + rect.width/2, y: rect.y + rect.height/2, text: text.substring(0, 80)};
                            }
                        }
                        // Try searching for the text anywhere clickable
                        const links = document.querySelectorAll('a, button, [role="button"]');
                        for (const link of links) {
                            if ((link.textContent || '').toLowerCase().includes('runnerxbt')) {
                                const rect = link.getBoundingClientRect();
                                return {found: true, x: rect.x + rect.width/2, y: rect.y + rect.height/2, text: link.textContent.substring(0, 80)};
                            }
                        }
                        return {found: false, items: items.length};
                    }
                """)
                
                if click_info.get('found'):
                    print(f"\nFound RunnerXBT: {click_info['text']}")
                    print(f"Clicking at ({click_info['x']:.0f}, {click_info['y']:.0f})")
                    await page.mouse.click(click_info['x'], click_info['y'])
                    await asyncio.sleep(5)
                    print(f"URL after click: {page.url}")
                    
                    # Check for MessageList
                    ml_info = await page.evaluate("""
                        () => {
                            const ml = document.querySelector('.MessageList');
                            if (!ml) return {found: false, chatContainer: !!document.querySelector('[class*="chat"]')};
                            return {
                                found: true,
                                st: ml.scrollTop,
                                sh: ml.scrollHeight,
                                ch: ml.clientHeight,
                                wrappers: document.querySelectorAll('.message-content-wrapper').length,
                                bubbles: document.querySelectorAll('.bubble').length,
                            };
                        }
                    """)
                    print(f"MessageList: {json.dumps(ml_info, indent=2, ensure_ascii=False)}")
                    
                    if ml_info.get('found'):
                        print("\nSUCCESS! Telegram A has messages. Can scrape with MessageList!")
                        break
                else:
                    print(f"\nRunnerXBT not found in chat list (attempt {attempt+1})")
                    await asyncio.sleep(5)
        else:
            print("\nNo chat items in Telegram A. Page might need interaction.")
            print("Trying to interact with page...")
            
            # Maybe there's a button to show chats?
            buttons = await page.evaluate("""
                () => {
                    const btns = document.querySelectorAll('button, [role="button"], a');
                    return Array.from(btns).slice(0, 10).map(b => ({
                        text: (b.textContent || '').substring(0, 40),
                        visible: b.offsetParent !== null,
                        rect: b.getBoundingClientRect(),
                    }));
                }
            """)
            print(f"Buttons found: {json.dumps(buttons, indent=2, ensure_ascii=False)}")

asyncio.run(run())

"""
Updated scraper for current Telegram Web DOM structure
"""
import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("D:/Vibe Coding 项目合集/runnerxbt")

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        print(f"URL: {page.url}", flush=True)
        
        # Find message elements with flexible selectors
        msg_info = await page.evaluate("""
            () => {
                // Try many possible selectors for message elements
                const selectors = [
                    '.message-content-wrapper',
                    '[class*="message-content"]',
                    '.Message',
                    '.message',
                    '.bubble',
                    '[class*="bubble"]',
                    '[class*="Message"]',
                    '[class*="message"]',
                ];
                const results = {};
                for (const sel of selectors) {
                    const els = document.querySelectorAll(sel);
                    results[sel] = els.length;
                }
                
                // Find MessageList
                const lists = [
                    '.MessageList',
                    '[class*="MessageList"]',
                    '[class*="message-list"]',
                    '.scroll-container',
                    '[class*="scroll-container"]',
                    '.chat-content',
                    '[class*="chat-content"]',
                ];
                const listResults = {};
                for (const sel of lists) {
                    const els = document.querySelectorAll(sel);
                    listResults[sel] = els.length;
                }
                
                return {messageSelectors: results, listSelectors: listResults};
            }
        """)
        print(f"DOM selectors: {json.dumps(msg_info, indent=2)}", flush=True)
        
        # Find the actual MessageList
        list_info = await page.evaluate("""
            () => {
                // Try to find any scrolling container with messages
                const all = document.querySelectorAll('*');
                const scrollables = [];
                for (const el of all) {
                    if (el.scrollHeight > el.clientHeight + 100) {
                        const cls = el.className.slice(0, 60);
                        const tag = el.tagName;
                        const children = el.children.length;
                        const textLen = (el.innerText || '').length;
                        if (textLen > 100 && children > 3) {
                            scrollables.push({
                                tag, 
                                cls,
                                children,
                                textLen: textLen,
                                scrollHeight: el.scrollHeight,
                                clientHeight: el.clientHeight
                            });
                        }
                    }
                }
                return scrollables.slice(0, 10);
            }
        """)
        print(f"\nScrollable containers: {json.dumps(list_info, indent=2)}", flush=True)

asyncio.run(run())

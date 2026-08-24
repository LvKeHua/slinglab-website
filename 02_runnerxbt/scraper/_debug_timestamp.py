"""Debug timestamp location and full message structure"""
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Find all .time elements and their parent chain
        detail = await page.evaluate("""
            () => {
                const times = document.querySelectorAll('.time');
                const out = [];
                for (const t of times) {
                    // Walk up to find containing message
                    let msg = t.parentElement;
                    let depth = 0;
                    let found_msg = false;
                    while (msg && depth < 10) {
                        if (msg.className && msg.className.includes('message-content')) {
                            found_msg = true;
                            break;
                        }
                        msg = msg.parentElement;
                        depth++;
                    }
                    
                    out.push({
                        timeText: t.innerText.trim(),
                        parentCls: t.parentElement?.className?.substring(0, 60),
                        foundMsg: found_msg,
                        msgCls: found_msg ? msg?.className?.substring(0, 80) : 'none',
                        msgText: found_msg ? (msg?.innerText || '').substring(0, 60) : 'none',
                    });
                }
                return out.slice(0, 15);
            }
        """)
        
        print("Timestamp elements:", flush=True)
        for d in detail:
            print(f"  time='{d['timeText']}' foundMsg={d['foundMsg']} parent={d['parentCls'][:40]}", flush=True)
            if d['foundMsg']:
                print(f"    msgText: {d['msgText']}", flush=True)
        
        # Also check a single message structure in detail
        structure = await page.evaluate("""
            () => {
                const wrapper = document.querySelector('.message-content-wrapper');
                if (!wrapper) return 'no wrapper';
                
                function describe(el, depth) {
                    if (depth > 5) return '';
                    let result = '  '.repeat(depth) + '<' + el.tagName;
                    const cls = el.className;
                    if (typeof cls === 'string' && cls) result += ' class=\"' + cls.substring(0, 60) + '\"';
                    if (el.innerText) result += ' text=\"' + el.innerText.replace(/\\n/g, ' ').substring(0, 40) + '\"';
                    result += '>\\n';
                    for (const child of el.children) {
                        result += describe(child, depth + 1);
                    }
                    return result;
                }
                
                return describe(wrapper, 0);
            }
        """)
        print(f"\nFull structure of first message:\n{structure}", flush=True)

asyncio.run(run())

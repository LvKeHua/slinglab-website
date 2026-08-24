"""Find message IDs in the DOM structure"""
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        detail = await page.evaluate("""
            () => {
                const sections = document.querySelectorAll('[class*=\"message-content\"]');
                const out = [];
                for (const s of sections) {
                    const attrs = {};
                    for (const attr of s.getAttributeNames()) {
                        attrs[attr] = s.getAttribute(attr);
                    }
                    const rect = s.getBoundingClientRect();
                    out.push({
                        attrs: JSON.stringify(attrs),
                        cls: s.className.substring(0, 100),
                        text: s.innerText.replace(/\\n/g, ' | ').substring(0, 80),
                        y: rect.top.toFixed(0),
                        h: rect.height.toFixed(0),
                    });
                }
                return out.slice(0, 15);
            }
        """)
        
        print("Message elements:", flush=True)
        for d in detail:
            print(f"  [{d['y']:>5} x {d['h']:>4}] cls={d['cls'][:60]}", flush=True)
            print(f"          attrs={d['attrs']}", flush=True)
            print(f"          text={d['text'][:60]}", flush=True)
        
        # Also check if there's a timestamp attribute anywhere
        ts_elements = await page.evaluate("""
            () => {
                const all = document.querySelectorAll('[class*=\"time\"], [class*=\"date\"], [class*=\"timestamp\"]');
                const out = [];
                for (const el of all) {
                    if (el.innerText && el.innerText.length < 30) {
                        out.push({
                            cls: el.className.substring(0, 60),
                            text: el.innerText.substring(0, 30),
                        });
                    }
                }
                return out.slice(0, 10);
            }
        """)
        print(f"\nTimestamp elements:", flush=True)
        for t in ts_elements:
            print(f"  cls={t['cls']} text={t['text']}", flush=True)

asyncio.run(run())

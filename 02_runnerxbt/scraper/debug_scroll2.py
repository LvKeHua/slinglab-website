"""Debug scroll: test if scrolling triggers new message loading"""
import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]

        # Initial state
        info = await page.evaluate("""
            () => {
                const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                if (!el) return {error: 'no scroll container'};
                const bubbles = el.querySelectorAll('.bubble');
                const bd = el.querySelector('.bubbles') || el.querySelector('.bubble-content');
                return {
                    scrollTop: el.scrollTop,
                    scrollHeight: el.scrollHeight,
                    clientHeight: el.clientHeight,
                    bubbles: bubbles.length,
                    bubbleContainerTag: bd ? bd.tagName + '.' + (bd.className || '').slice(0,50) : 'none',
                };
            }
        """)
        print(f"INITIAL: st={info['scrollTop']:.0f} sh={info['scrollHeight']} ch={info['clientHeight']} bubbles={info['bubbles']}")

        # Test scrolling to top (to load older msgs)
        for attempt in range(5):
            await page.evaluate("""
                () => {
                    const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                    if (!el) return;
                    el.scrollTop = 0;
                    el.dispatchEvent(new Event('scroll', {bubbles: true}));
                }
            """)
            await asyncio.sleep(2)
            
            info = await page.evaluate("""
                () => {
                    const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                    if (!el) return {};
                    const bubbles = el.querySelectorAll('.bubble');
                    return {
                        scrollTop: el.scrollTop,
                        scrollHeight: el.scrollHeight,
                        bubbles: bubbles.length,
                    };
                }
            """)
            print(f"  After scroll to top #{attempt+1}: st={info['scrollTop']:.0f} sh={info['scrollHeight']} bubbles={info['bubbles']}")
            
            if info['bubbles'] > 35:  # More bubbles loaded
                print("  >> NEW MESSAGES LOADED!")
                break

        # Now scroll down from top
        for attempt in range(5):
            info = await page.evaluate("""
                () => {
                    const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                    if (!el) return {};
                    const prev = el.scrollTop;
                    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
                    el.scrollTop = Math.min(maxScroll, prev + el.clientHeight * 0.8);
                    el.dispatchEvent(new Event('scroll', {bubbles: true}));
                    const bubbles = el.querySelectorAll('.bubble');
                    return {
                        scrollTop: el.scrollTop,
                        scrollHeight: el.scrollHeight,
                        prevScrollTop: prev,
                        maxScroll: maxScroll,
                        bubbles: bubbles.length,
                    };
                }
            """)
            await asyncio.sleep(2)
            
            info2 = await page.evaluate("""
                () => {
                    const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                    if (!el) return {};
                    const bubbles = el.querySelectorAll('.bubble');
                    return {
                        scrollTop: el.scrollTop,
                        scrollHeight: el.scrollHeight,
                        bubbles: bubbles.length,
                    };
                }
            """)
            print(f"  ScrollDown #{attempt+1}: st={info2['scrollTop']:.0f} sh={info2['scrollHeight']} bubbles={info2['bubbles']}")

        print("\nFINAL SUMMARY:")
        info = await page.evaluate("""
            () => {
                const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                if (!el) return {};
                const bubbles = el.querySelectorAll('.bubble');
                return {
                    scrollTop: el.scrollTop,
                    scrollHeight: el.scrollHeight,
                    bubbles: bubbles.length,
                };
            }
        """)
        print(json.dumps(info, indent=2))

asyncio.run(main())

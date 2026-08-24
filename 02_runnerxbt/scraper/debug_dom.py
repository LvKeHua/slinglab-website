"""Check bubble DOM structure for message IDs"""
import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]

        info = await page.evaluate("""
            () => {
                const el = document.querySelector('.scrollable.scrollable-y.bubbles-scrollable');
                if (!el) return {error: 'no scrollable'};
                const bubbles = el.querySelectorAll('.bubble');
                const results = [];
                for (let i = 0; i < Math.min(5, bubbles.length); i++) {
                    const b = bubbles[i];
                    const attrs = {};
                    for (const attr of b.attributes) {
                        attrs[attr.name] = attr.value;
                    }
                    // Get all class names
                    const classes = b.className.split(' ').filter(Boolean);
                    
                    // Check for images
                    const imgs = b.querySelectorAll('img');
                    const imgSrcs = Array.from(imgs).map(img => ({
                        src: img.src.slice(0, 100),
                        alt: img.alt,
                        cls: img.className,
                    }));
                    
                    // Check for video
                    const videos = b.querySelectorAll('video');
                    
                    // Check for data-message-id on child elements
                    const msgIdEls = b.querySelectorAll('[data-message-id]');
                    
                    // Check for message content
                    const textEl = b.querySelector('.message') || b.querySelector('.text') || b.querySelector('[class*="content"]');
                    
                    results.push({
                        attrs,
                        classes: classes.slice(0, 10),
                        imgCount: imgs.length,
                        imgSrcs,
                        videoCount: videos.length,
                        msgIdEls: msgIdEls.length,
                        msgIdFirst: msgIdEls[0]?.getAttribute('data-message-id') || null,
                        hasText: !!textEl,
                        textPreview: textEl?.textContent?.slice(0, 80) || '(none)',
                        innerHtml_len: b.innerHTML.length,
                    });
                }
                return {
                    totalBubbles: bubbles.length,
                    samples: results,
                    scrollableEl: {
                        st: el.scrollTop,
                        sh: el.scrollHeight,
                    }
                };
            }
        """)
        print(json.dumps(info, indent=2, default=str))

asyncio.run(main())

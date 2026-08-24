"""Try scraping t.me/s/ preview page for RunnerXBT - images have permanent URLs there"""
import asyncio, json, sys, re, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        # Navigate to t.me/s/ preview
        await page.goto("https://t.me/s/RunnerXBT_Insights", wait_until="domcontentloaded")
        await asyncio.sleep(5)
        
        # Check page content
        info = await page.evaluate("""
            () => {
                const r = {};
                r.title = document.title;
                r.url = location.href;
                
                // Check messages
                const messages = document.querySelectorAll('.tgme_widget_message_wrap');
                r.messages = messages.length;
                
                // Check images
                const imgs = document.querySelectorAll('.tgme_widget_message_photo_wrap');
                r.photoWraps = imgs.length;
                
                // Sample image URLs
                const allImgs = document.querySelectorAll('img');
                const imgUrls = [];
                for (const img of allImgs) {
                    if (img.src && !img.src.startsWith('data:')) {
                        imgUrls.push(img.src.substring(0, 120));
                    }
                }
                r.imgUrls = imgUrls.slice(0, 10);
                
                // Check for "Load more" button
                const moreBtn = document.querySelector('.tgme_widget_message_load_more, [class*="load_more"], [class*="load-more"]');
                r.hasMoreBtn = !!moreBtn;
                
                // Check page structure
                r.bodyPreview = document.body?.innerText?.substring(0, 300) || 'no body';
                
                return r;
            }
        """)
        print(json.dumps(info, indent=2, ensure_ascii=False))

asyncio.run(run())

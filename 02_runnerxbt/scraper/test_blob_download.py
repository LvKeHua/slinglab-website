"""Quick test: connect to Chrome CDP, scrape blob URLs, and download one"""
import asyncio, json, base64
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        page = ctx.pages[0]
        print("Page:", page.url[:120])
        print("Title:", await page.title())

        # Check channel name in URL
        if "runnerxbt" not in page.url.lower() and "RunnerXBT" not in page.url.lower():
            print("WARN: Not on RunnerXBT channel page")

        # Check for images
        info = await page.evaluate("""
            () => {
                const imgs = document.querySelectorAll('img[src^="blob:"]');
                const videos = document.querySelectorAll('video source[src^="blob:"], video[src^="blob:"]');
                const allImgs = document.querySelectorAll('img');
                return {
                    blob_imgs: imgs.length,
                    blob_vids: videos.length,
                    total_imgs: allImgs.length,
                    sample_blob: imgs.length > 0 ? imgs[0].src : null,
                };
            }
        """)
        print("Image info:", json.dumps(info, indent=2))

        if info["sample_blob"]:
            blob_url = info["sample_blob"]
            print(f"Downloading: {blob_url[:100]}")
            b64 = await page.evaluate("""
                async (url) => {
                    try {
                        const resp = await fetch(url);
                        const blob = await resp.blob();
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(blob);
                        });
                    } catch(e) { return "ERR:" + e.message; }
                }
            """, blob_url)
            if b64.startswith("ERR:"):
                print("Download FAILED:", b64)
            else:
                print(f"Download OK! {len(b64)} chars")
                # Save it
                header, data = b64.split(",", 1)
                raw = base64.b64decode(data)
                out = Path("D:/Vibe Coding 项目合集/runnerxbt/media/test_download.png")
                out.write_bytes(raw)
                print(f"Saved to {out} ({len(raw)} bytes)")
        else:
            print("No blob images found on current page")

asyncio.run(main())

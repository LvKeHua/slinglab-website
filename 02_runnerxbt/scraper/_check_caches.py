"""Check Cache API for channel media files"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]

        # Check cachedFiles for RunnerXBT related media
        result = await page.evaluate("""
            async () => {
                const results = {};
                
                // Check cachedFiles cache
                try {
                    const cache = await caches.open('cachedFiles');
                    const requests = await cache.keys();
                    results.cachedFiles = {
                        count: requests.length,
                        urls: requests.map(r => r.url).slice(0, 30),
                    };
                    
                    // Try to get content of a few document_ files
                    const docFiles = requests.filter(r => r.url.includes('document_'));
                    results.docFiles = docFiles.map(r => r.url);
                    
                    // Try to read one document and get its metadata
                    if (docFiles.length > 0) {
                        const resp = await cache.match(docFiles[0]);
                        if (resp) {
                            results.sampleDoc = {
                                url: docFiles[0].url,
                                status: resp.status,
                                contentType: resp.headers.get('content-type'),
                                contentLength: resp.headers.get('content-length'),
                                hasBody: !!resp.body,
                            };
                        }
                    }
                } catch(e) { results.cachedFilesError = e.message; }
                
                // Check tt-media cache
                try {
                    const mediaCache = await caches.open('tt-media');
                    const mediaRequests = await mediaCache.keys();
                    results.ttMedia = {
                        count: mediaRequests.length,
                        urls: mediaRequests.map(r => r.url).slice(0, 20),
                    };
                } catch(e) { results.ttMediaError = e.message; }
                
                // Check tt-media-avatars
                try {
                    const avCache = await caches.open('tt-media-avatars');
                    const avRequests = await avCache.keys();
                    results.ttAvatars = {
                        count: avRequests.length,
                        urls: avRequests.map(r => r.url).slice(0, 10),
                    };
                } catch(e) { results.ttAvatarsError = e.message; }
                
                // Check tt-media-progressive
                try {
                    const progCache = await caches.open('tt-media-progressive');
                    const progRequests = await progCache.keys();
                    results.ttProgressive = {
                        count: progRequests.length,
                        urls: progRequests.map(r => r.url).slice(0, 10),
                    };
                } catch(e) { results.ttProgressiveError = e.message; }
                
                // Check sessionStorage 
                try {
                    results.sessionStorage = {};
                    for (let i = 0; i < sessionStorage.length; i++) {
                        const key = sessionStorage.key(i);
                        if (key.includes('message') || key.includes('chat') || key.includes('channel')) {
                            results.sessionStorage[key] = sessionStorage.getItem(key).substring(0, 100);
                        }
                    }
                } catch(e) { results.sessionStorageError = e.message; }
                
                return results;
            }
        """)
        
        print(json.dumps(result, indent=2, ensure_ascii=False))

asyncio.run(run())

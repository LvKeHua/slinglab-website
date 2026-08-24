#!/usr/bin/env python3
"""抓 Binance 全量 1d klines（120根，覆盖因子窗口）+ 31天 OI 历史。"""
import asyncio, json
import aiohttp

PROXY = "http://127.0.0.1:7897"

async def get_json(session, url, retries=4, delay=0.5):
    for attempt in range(retries):
        try:
            async with session.get(url, proxy=PROXY, timeout=aiohttp.ClientTimeout(total=25)) as r:
                if r.status == 200:
                    return await r.json()
                await asyncio.sleep(delay * (attempt + 1))
        except Exception:
            await asyncio.sleep(delay * (attempt + 1))
    return None

async def main():
    out = {}
    async with aiohttp.ClientSession() as s:
        # symbol 列表
        b24 = await get_json(s, "https://fapi.binance.com/fapi/v1/ticker/24hr")
        syms = [t["symbol"] for t in b24 if t["symbol"].endswith("USDT")]
        print(f"syms: {len(syms)}", flush=True)

        # 1) 全量 1d klines × 120（含 OHLC + quoteVolume）
        sem = asyncio.Semaphore(30)
        async def kline(sym):
            async with sem:
                data = await get_json(s, f"https://fapi.binance.com/fapi/v1/klines?symbol={sym}&interval=1d&limit=120")
                if isinstance(data, list) and data:
                    return sym, data
                return sym, None
        kmap = {}
        tasks = [kline(x) for x in syms]
        for i, coro in enumerate(asyncio.as_completed(tasks)):
            sym, rows = await coro
            kmap[sym] = rows
            if (i + 1) % 150 == 0:
                print(f"  klines {i+1}/{len(syms)}", flush=True)
        out["klines"] = kmap
        json.dump(out, open("weekly_klines.json", "w", encoding="utf-8"))
        print(f"klines done: {sum(1 for v in kmap.values() if v)}/{len(syms)}", flush=True)

        # 2) 31天 OI 历史（openInterestHist，低并发防限流）
        sem2 = asyncio.Semaphore(3)
        async def oih(sym):
            async with sem2:
                data = await get_json(s, f"https://fapi.binance.com/fapi/v1/openInterestHist?symbol={sym}&period=1d&limit=31", delay=0.4)
                await asyncio.sleep(0.35)
                if isinstance(data, list) and data:
                    return sym, data
                return sym, None
        omap = {}
        tasks = [oih(x) for x in syms]
        for i, coro in enumerate(asyncio.as_completed(tasks)):
            sym, rows = await coro
            omap[sym] = rows
            if (i + 1) % 100 == 0:
                print(f"  oiHist {i+1}/{len(syms)}", flush=True)
        out["oi_hist"] = omap
        json.dump(out, open("weekly_klines.json", "w", encoding="utf-8"))
        print(f"oiHist done: {sum(1 for v in omap.values() if v)}/{len(syms)}", flush=True)

    print("saved weekly_klines.json", flush=True)

asyncio.run(main())

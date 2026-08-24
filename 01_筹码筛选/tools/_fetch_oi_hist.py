#!/usr/bin/env python3
"""续抓 Binance 31天 OI 历史（增量，5并发，无额外sleep）。"""
import asyncio, json
import aiohttp

PROXY = "http://127.0.0.1:7897"

async def get_json(session, url, retries=3):
    for attempt in range(retries):
        try:
            async with session.get(url, proxy=PROXY, timeout=aiohttp.ClientTimeout(total=25)) as r:
                if r.status == 200:
                    return await r.json()
                await asyncio.sleep(0.5 * (attempt + 1))
        except Exception:
            await asyncio.sleep(0.5 * (attempt + 1))
    return None

async def main():
    data = json.load(open("weekly_klines.json", encoding="utf-8"))
    existing = data.get("oi_hist", {})
    syms = list(data["klines"].keys())
    todo = [s for s in syms if s not in existing or not existing[s]]
    print(f"todo oiHist: {len(todo)}", flush=True)

    async with aiohttp.ClientSession() as s:
        sem = asyncio.Semaphore(5)
        async def oih(sym):
            async with sem:
                d = await get_json(s, f"https://fapi.binance.com/futures/data/openInterestHist?symbol={sym}&period=1d&limit=31")
                if isinstance(d, list) and d:
                    return sym, d
                return sym, None
        done = 0
        for i, coro in enumerate(asyncio.as_completed([oih(x) for x in todo])):
            sym, rows = await coro
            existing[sym] = rows
            done += 1
            if done % 100 == 0:
                data["oi_hist"] = existing
                json.dump(data, open("weekly_klines.json", "w", encoding="utf-8"))
                print(f"  oiHist {done}/{len(todo)} (saved checkpoint)", flush=True)
        data["oi_hist"] = existing
        json.dump(data, open("weekly_klines.json", "w", encoding="utf-8"))
    got = sum(1 for v in existing.values() if v)
    print(f"done: oiHist {got}/{len(syms)}", flush=True)

asyncio.run(main())

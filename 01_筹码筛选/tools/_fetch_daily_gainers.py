#!/usr/bin/env python3
"""抓 Binance/Bybit 永续 1d klines（最近9根，覆盖 08-09~08-11），算 08-10 单日与 08-09→08-11 两日涨幅榜。"""
import asyncio, json
import aiohttp

PROXY = "http://127.0.0.1:7897"

async def get_json(session, url, retries=4):
    for attempt in range(retries):
        try:
            async with session.get(url, proxy=PROXY, timeout=aiohttp.ClientTimeout(total=20)) as r:
                if r.status == 200:
                    return await r.json()
                await asyncio.sleep(0.5 * (attempt + 1))
        except Exception:
            await asyncio.sleep(0.5 * (attempt + 1))
    return None

async def fetch_daily(session, exchange, symbol, sem):
    """返回 (symbol, [(date_ts, close), ...]) 按时间升序"""
    async with sem:
        if exchange == "binance":
            url = f"https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1d&limit=9"
        else:
            url = f"https://api.bybit.com/v5/market/kline?category=linear&symbol={symbol}&interval=D&limit=9"
        data = await get_json(session, url)
        if data is None:
            return symbol, None
        if exchange == "binance":
            if isinstance(data, dict):
                return symbol, None
            rows = [(x[0], float(x[4])) for x in data]
        else:
            rows = (data.get("result") or {}).get("list") or []
            rows = [(int(x[0]), float(x[4])) for x in rows][::-1]  # 倒序转升序
        return symbol, rows

async def main():
    out = {}
    async with aiohttp.ClientSession() as s:
        sem = asyncio.Semaphore(30)
        # Binance 永续 symbol 列表
        b24 = await get_json(s, "https://fapi.binance.com/fapi/v1/ticker/24hr")
        b_syms = [t["symbol"] for t in b24 if t["symbol"].endswith("USDT")]
        print(f"binance syms: {len(b_syms)}", flush=True)
        tasks = [fetch_daily(s, "binance", sym, sem) for sym in b_syms]
        bmap = {}
        for i, coro in enumerate(asyncio.as_completed(tasks)):
            sym, rows = await coro
            bmap[sym] = rows
            if (i + 1) % 150 == 0:
                print(f"  binance {i+1}/{len(b_syms)}", flush=True)
        out["binance"] = bmap

        # Bybit 永续
        bb = await get_json(s, "https://api.bybit.com/v5/market/tickers?category=linear")
        y_syms = [t["symbol"] for t in (bb.get("result") or {}).get("list") or [] if t["symbol"].endswith("USDT")]
        print(f"bybit syms: {len(y_syms)}", flush=True)
        tasks = [fetch_daily(s, "bybit", sym, sem) for sym in y_syms]
        ymap = {}
        for i, coro in enumerate(asyncio.as_completed(tasks)):
            sym, rows = await coro
            ymap[sym] = rows
            if (i + 1) % 150 == 0:
                print(f"  bybit {i+1}/{len(y_syms)}", flush=True)
        out["bybit"] = ymap

    json.dump(out, open("daily_klines.json", "w", encoding="utf-8"))
    print("saved daily_klines.json", flush=True)

asyncio.run(main())

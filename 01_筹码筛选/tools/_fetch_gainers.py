#!/usr/bin/env python3
"""抓取 Binance/Bybit 永续 24h/72h 涨幅榜（asyncio 高并发版）。"""
import asyncio, json, time, sys
import aiohttp

PROXY = "http://127.0.0.1:7897"

async def get_json(session, url, retries=4):
    for attempt in range(retries):
        try:
            async with session.get(url, proxy=PROXY, timeout=aiohttp.ClientTimeout(total=20)) as r:
                if r.status == 200:
                    return await r.json()
                await asyncio.sleep(0.8 * (attempt + 1))
        except Exception:
            await asyncio.sleep(0.8 * (attempt + 1))
    return None

async def kline_ret_72h(session, exchange, symbol, sem):
    async with sem:
        if exchange == "binance":
            url = f"https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval=1h&limit=73"
        else:
            url = f"https://api.bybit.com/v5/market/kline?category=linear&symbol={symbol}&interval=60&limit=73"
        data = await get_json(session, url)
        if data is None:
            return symbol, None
        if exchange == "binance":
            if isinstance(data, dict):
                return symbol, None
            rows = data
            if len(rows) < 2:
                return symbol, None
            start = float(rows[0][1]); cur = float(rows[-1][4])
        else:
            rows = (data.get("result") or {}).get("list") or []
            if len(rows) < 2:
                return symbol, None
            # bybit list 倒序（最新在前），数组格式 [ts, open, high, low, close, ...]
            start = float(rows[-1][1]); cur = float(rows[0][4])
        return symbol, (cur / start - 1.0 if start else None)

async def main():
    out = {}
    # ---- Binance 永续 24h ----
    async with aiohttp.ClientSession() as s:
        print("fetching binance fapi ticker/24hr ...", flush=True)
        b24 = await get_json(s, "https://fapi.binance.com/fapi/v1/ticker/24hr")
        binance = []
        if b24:
            for t in b24:
                sym = t["symbol"]
                if not sym.endswith("USDT"):
                    continue
                binance.append({
                    "symbol": sym, "base": sym[:-4],
                    "change_24h_pct": float(t["priceChangePercent"]),
                    "last_price": float(t["lastPrice"]),
                    "volume_24h_usdt": float(t["quoteVolume"]),
                })
            print(f"  binance fapi symbols: {len(binance)}", flush=True)
            sem = asyncio.Semaphore(30)
            tasks = [kline_ret_72h(s, "binance", x["symbol"], sem) for x in binance]
            rets = {}
            for i, coro in enumerate(asyncio.as_completed(tasks)):
                sym, r = await coro
                rets[sym] = r
                if (i + 1) % 100 == 0:
                    print(f"  binance klines {i+1}/{len(binance)}", flush=True)
            for x in binance:
                x["ret_72h"] = rets.get(x["symbol"])
            out["binance_perp"] = binance
            json.dump(out, open("gainers_live.json", "w", encoding="utf-8"), ensure_ascii=False)
        else:
            print("!! binance ticker/24hr failed", flush=True)

        # ---- Bybit 永续 24h ----
        print("fetching bybit linear tickers ...", flush=True)
        bb = await get_json(s, "https://api.bybit.com/v5/market/tickers?category=linear")
        bybit = []
        if bb:
            for t in (bb.get("result") or {}).get("list") or []:
                sym = t["symbol"]
                if not sym.endswith("USDT"):
                    continue
                try:
                    pct = float(t.get("price24hPcnt", "0")) * 100.0
                except Exception:
                    pct = 0.0
                bybit.append({
                    "symbol": sym, "base": sym[:-4],
                    "change_24h_pct": pct,
                    "last_price": float(t.get("lastPrice", 0)),
                    "volume_24h_usdt": float(t.get("turnover24h", 0)),
                })
            print(f"  bybit linear symbols: {len(bybit)}", flush=True)
            sem = asyncio.Semaphore(30)
            tasks = [kline_ret_72h(s, "bybit", x["symbol"], sem) for x in bybit]
            rets = {}
            for i, coro in enumerate(asyncio.as_completed(tasks)):
                sym, r = await coro
                rets[sym] = r
                if (i + 1) % 100 == 0:
                    print(f"  bybit klines {i+1}/{len(bybit)}", flush=True)
            for x in bybit:
                x["ret_72h"] = rets.get(x["symbol"])
            out["bybit_perp"] = bybit
            json.dump(out, open("gainers_live.json", "w", encoding="utf-8"), ensure_ascii=False)
        else:
            print("!! bybit tickers failed", flush=True)

        # ---- Binance 现货 24h（参考）----
        print("fetching binance spot ticker/24hr ...", flush=True)
        sp = await get_json(s, "https://api.binance.com/api/v3/ticker/24hr")
        if sp:
            spot = []
            for t in sp:
                sym = t["symbol"]
                if not sym.endswith("USDT"):
                    continue
                spot.append({
                    "symbol": sym, "base": sym[:-4],
                    "change_24h_pct": float(t["priceChangePercent"]),
                    "volume_24h_usdt": float(t["quoteVolume"]),
                })
            out["binance_spot"] = spot
            print(f"  binance spot symbols: {len(spot)}", flush=True)
        else:
            print("!! binance spot failed", flush=True)

    json.dump(out, open("gainers_live.json", "w", encoding="utf-8"), ensure_ascii=False)
    print("saved gainers_live.json", flush=True)

asyncio.run(main())

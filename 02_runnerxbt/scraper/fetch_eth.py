"""Fetch ETH 1D data from OKX"""
import json, time, requests
from pathlib import Path
from datetime import datetime, timezone

DATA_DIR = Path(__file__).parent.parent / "data"

def fetch_okx_daily(symbol):
    base = "https://www.okx.com/api/v5/market/candles"
    all_candles = []
    after = None
    
    while True:
        params = {"instId": symbol, "bar": "1D", "limit": 300}
        if after:
            params["after"] = str(after)
        
        resp = requests.get(base, params=params, timeout=15)
        data = resp.json()
        candles = data.get("data", [])
        if not candles:
            break
        
        all_candles.extend(candles)
        oldest_ts = int(candles[-1][0])
        after = oldest_ts
        
        dt = datetime.fromtimestamp(oldest_ts/1000, tz=timezone.utc)
        print(f"  {len(all_candles):4d} | {dt.strftime('%Y-%m-%d')}", flush=True)
        
        if oldest_ts <= 1727740800000 or len(candles) < 20:
            break
        time.sleep(0.3)
    
    formatted = []
    for c in reversed(all_candles):
        formatted.append({
            "t": int(c[0]), "o": float(c[1]), "h": float(c[2]),
            "l": float(c[3]), "c": float(c[4]), "v": float(c[5]),
        })
    return formatted

# BTC 1D
print("BTC 1D...")
btc = fetch_okx_daily("BTC-USDT")
(DATA_DIR / "btc_ohlcv_1d.json").write_text(json.dumps(btc), encoding="utf-8")
print(f"  -> {len(btc)} candles")

# ETH 1D
print("ETH 1D...")
eth = fetch_okx_daily("ETH-USDT")
(DATA_DIR / "eth_ohlcv_1d.json").write_text(json.dumps(eth), encoding="utf-8")
print(f"  -> {len(eth)} candles")

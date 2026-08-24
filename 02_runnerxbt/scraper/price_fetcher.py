"""
Fetch OHLCV data from multiple sources to work around regional blocks
"""
import json, time, requests
from pathlib import Path
from datetime import datetime, timezone

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

def fetch_okx_various_intervals():
    """Try OKX with different intervals to get full history."""
    base = "https://www.okx.com/api/v5/market/candles"
    results = {}
    
    for interval, name in [("4H", "4h"), ("1D", "1d")]:
        print(f"\n  OKX {interval}...", flush=True)
        all_candles = []
        after = None
        
        while True:
            params = {
                "instId": "BTC-USDT",
                "bar": interval,
                "limit": 300,
            }
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
            
            print(f"    {len(all_candles):4d} | oldest={datetime.fromtimestamp(oldest_ts/1000,tz=timezone.utc).strftime('%Y-%m-%d')}", flush=True)
            
            if oldest_ts <= 1727740800000 or len(candles) < 20:
                break
            
            time.sleep(0.3)
        
        # Format
        formatted = []
        for c in all_candles:
            formatted.append({
                "t": int(c[0]),
                "o": float(c[1]),
                "h": float(c[2]),
                "l": float(c[3]),
                "c": float(c[4]),
                "v": float(c[5]),
            })
        formatted.reverse()
        results[name] = formatted
        print(f"    -> {len(formatted)} candles", flush=True)
    
    return results

def fetch_coingecko():
    """Try CoinGecko public API."""
    print(f"\n  CoinGecko (BTC)...", flush=True)
    
    # CoinGecko /coins/{id}/market_chart/range
    # end_date=21-07-2026, start_date=01-10-2024
    start_ts = int(datetime(2024, 10, 1, tzinfo=timezone.utc).timestamp())
    end_ts = int(datetime(2026, 7, 21, tzinfo=timezone.utc).timestamp())
    
    url = f"https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range"
    params = {
        "vs_currency": "usd",
        "from": start_ts,
        "to": end_ts,
    }
    
    try:
        resp = requests.get(url, params=params, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            prices = data.get("prices", [])
            if prices:
                print(f"    Got {len(prices)} price points", flush=True)
                # Convert to OHLCV (Coingecko only gives price, not OHLC)
                return prices
        else:
            print(f"    Error {resp.status_code}: {resp.text[:200]}", flush=True)
    except Exception as e:
        print(f"    Exception: {e}", flush=True)
    
    return None

def fetch_gateio():
    """Try Gate.io API."""
    print(f"\n  Gate.io (BTC)...", flush=True)
    
    candles = []
    current_from = int(datetime(2024, 10, 1, tzinfo=timezone.utc).timestamp())
    end_ts = int(datetime(2026, 7, 21, tzinfo=timezone.utc).timestamp())
    
    while current_from < end_ts:
        params = {
            "currency_pair": "BTC_USDT",
            "interval": "3600",  # 1H in seconds
            "from": current_from,
            "to": min(current_from + 86400 * 30, end_ts),  # 30 day range per request
            "limit": 1000,
        }
        
        try:
            resp = requests.get(
                "https://api.gateio.ws/api/v4/spot/candlesticks",
                params=params,
                timeout=15,
            )
            if resp.status_code != 200:
                print(f"    Error {resp.status_code}: {resp.text[:200]}", flush=True)
                break
            
            data = resp.json()
            if not data:
                break
            
            candles.extend(data)
            # data is nested: [ts, vol, close, high, low, open, ...]
            # Gate.io returns oldest first
            
            last_ts = int(data[-1][0])
            current_from = last_ts + 3600  # next hour
            
            if len(candles) % 5000 == 0:
                print(f"    {len(candles):5d} candles", flush=True)
            
            time.sleep(0.3)
        except Exception as e:
            print(f"    Exception: {e}", flush=True)
            break
    
    if candles:
        formatted = []
        for c in candles:
            formatted.append({
                "t": int(c[0]) * 1000,  # Gate.io returns seconds
                "o": float(c[5]),
                "h": float(c[3]),
                "l": float(c[4]),
                "c": float(c[2]),
                "v": float(c[1]),
            })
        print(f"    -> {len(formatted)} candles (Gate.io)", flush=True)
        return formatted
    
    return None

def main():
    # Try OKX variants
    print("=== OKX variants ===", flush=True)
    okx_results = fetch_okx_various_intervals()
    
    for name, data in okx_results.items():
        if data:
            path = DATA_DIR / f"btc_ohlcv_{name}.json"
            path.write_text(json.dumps(data), encoding="utf-8")
            print(f"  Saved {path} ({len(data)} candles)", flush=True)
    
    # Try CoinGecko  
    print("\n=== CoinGecko ===", flush=True)
    cg_data = fetch_coingecko()
    if cg_data:
        path = DATA_DIR / "btc_prices_coingecko.json"
        path.write_text(json.dumps(cg_data), encoding="utf-8")
        print(f"  Saved {path} ({len(cg_data)} points)", flush=True)
    
    # Try Gate.io
    print("\n=== Gate.io ===", flush=True)
    gate_data = fetch_gateio()
    if gate_data:
        path = DATA_DIR / "btc_ohlcv.json"
        path.write_text(json.dumps(gate_data), encoding="utf-8")
        print(f"  Saved {path} ({len(gate_data)} candles)", flush=True)
        
        # Also fetch ETH from Gate.io
        print("\n  Gate.io (ETH)...", flush=True)
        eth_candles = []
        current_from = int(datetime(2024, 10, 1, tzinfo=timezone.utc).timestamp())
        end_ts = int(datetime(2026, 7, 21, tzinfo=timezone.utc).timestamp())
        
        while current_from < end_ts:
            params = {
                "currency_pair": "ETH_USDT",
                "interval": "3600",
                "from": current_from,
                "to": min(current_from + 86400 * 30, end_ts),
                "limit": 1000,
            }
            try:
                resp = requests.get(
                    "https://api.gateio.ws/api/v4/spot/candlesticks",
                    params=params, timeout=15,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data:
                        eth_candles.extend(data)
                        last_ts = int(data[-1][0])
                        current_from = last_ts + 3600
                        if len(eth_candles) % 5000 == 0:
                            print(f"    {len(eth_candles):5d} candles", flush=True)
                        time.sleep(0.3)
                    else:
                        break
                else:
                    print(f"    Error {resp.status_code}", flush=True)
                    break
            except Exception as e:
                print(f"    Exception: {e}", flush=True)
                break
        
        if eth_candles:
            formatted = []
            for c in eth_candles:
                formatted.append({
                    "t": int(c[0]) * 1000,
                    "o": float(c[5]),
                    "h": float(c[3]),
                    "l": float(c[4]),
                    "c": float(c[2]),
                    "v": float(c[1]),
                })
            eth_path = DATA_DIR / "eth_ohlcv.json"
            eth_path.write_text(json.dumps(formatted), encoding="utf-8")
            print(f"  Saved ETH: {eth_path} ({len(formatted)} candles)", flush=True)
    
    # Summary
    print("\n=== Summary ===", flush=True)
    for p in sorted(DATA_DIR.glob("*.json")):
        data = json.loads(p.read_text(encoding="utf-8"))
        if isinstance(data, list) and len(data) > 0:
            if isinstance(data[0], dict) and 't' in data[0]:
                first = datetime.fromtimestamp(data[0]['t']/1000, tz=timezone.utc)
                last = datetime.fromtimestamp(data[-1]['t']/1000, tz=timezone.utc)
                print(f"  {p.name}: {len(data)} entries, {first.strftime('%Y-%m-%d')} ~ {last.strftime('%Y-%m-%d')}", flush=True)
            else:
                print(f"  {p.name}: {len(data)} entries", flush=True)

if __name__ == "__main__":
    main()

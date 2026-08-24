"""
Binance K-line data updater for RunnerXBT.
Fetches fresh BTC/ETH 1D + BTC 4H candles and replaces local JSON files.
Uses local proxy (127.0.0.1:7897) to reach Binance futures API.
"""
import os, sys, json, time
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(r'D:\Vibe Coding 项目合集\runnerxbt')
DATA_DIR = BASE_DIR / 'data'
LOG_FILE = BASE_DIR / 'sync.log'

PROXY = 'http://127.0.0.1:7897'
API = 'https://fapi.binance.com/fapi/v1/klines'

# Coverage: start of existing 1d data (2024-02-01) to present
START_MS = 1706803200000  # 2024-02-01 00:00 UTC

def log(msg):
    line = f'[{__import__("datetime").datetime.now().isoformat(timespec="seconds")}] {msg}'
    print(line)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line + '\n')

def fetch_klines(symbol, interval, start_ms, end_ms=None):
    """Paginated fetch of klines. Returns list of {t,o,h,l,c,v}."""
    import requests
    out = []
    cur = start_ms
    while True:
        params = {
            'symbol': symbol,
            'interval': interval,
            'startTime': cur,
            'limit': 1500,
        }
        if end_ms:
            params['endTime'] = end_ms
        r = requests.get(API, params=params, proxies={'https': PROXY, 'http': PROXY}, timeout=30)
        r.raise_for_status()
        data = r.json()
        if not data:
            break
        for k in data:
            out.append({
                't': k[0],
                'o': float(k[1]),
                'h': float(k[2]),
                'l': float(k[3]),
                'c': float(k[4]),
                'v': float(k[5]),
            })
        last_t = data[-1][0]
        if end_ms and last_t >= end_ms:
            break
        if len(data) < 1500:
            break
        cur = last_t + 1
        time.sleep(0.3)
    # Dedup by timestamp, keep chronological
    seen = {}
    for row in out:
        seen[row['t']] = row
    return [seen[k] for k in sorted(seen)]

def main():
    try:
        import requests
    except ImportError:
        log('ERROR: requests not installed')
        return 1

    log('Fetching BTCUSDT 1D klines...')
    btc1d = fetch_klines('BTCUSDT', '1d', START_MS)
    log(f'  BTC 1D: {len(btc1d)} candles, last {btc1d[-1]["t"] if btc1d else "none"}')

    log('Fetching ETHUSDT 1D klines...')
    eth1d = fetch_klines('ETHUSDT', '1d', START_MS)
    log(f'  ETH 1D: {len(eth1d)} candles, last {eth1d[-1]["t"] if eth1d else "none"}')

    log('Fetching BTCUSDT 4H klines...')
    btc4h = fetch_klines('BTCUSDT', '4h', START_MS)
    log(f'  BTC 4H: {len(btc4h)} candles, last {btc4h[-1]["t"] if btc4h else "none"}')

    if not btc1d or not eth1d or not btc4h:
        log('ERROR: incomplete data, aborting')
        return 1

    (DATA_DIR / 'btc_ohlcv_1d.json').write_text(json.dumps(btc1d), 'utf-8')
    (DATA_DIR / 'eth_ohlcv_1d.json').write_text(json.dumps(eth1d), 'utf-8')
    (DATA_DIR / 'btc_ohlcv_4h.json').write_text(json.dumps(btc4h), 'utf-8')
    log(f'K-lines saved: BTC 1D {len(btc1d)}, ETH 1D {len(eth1d)}, BTC 4H {len(btc4h)}')
    return 0

if __name__ == '__main__':
    sys.exit(main())

"""
OKX K-line updater for GitHub Actions (Binance blocked from Actions IPs).
OKX candles format: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm] NEWEST FIRST
Converts to the {t,o,h,l,c,v} ascending format the frontend expects.
"""
import os, sys, json, time
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'data'
LOG_FILE = BASE_DIR / 'sync.log'

API = 'https://www.okx.com/api/v5/market/candles'
# OKX limits: 300 candles per request for most bars
# BTC-USDT-SWAP / ETH-USDT-SWAP
INSTRUMENTS = [
    ('BTC-USDT-SWAP', 'BTCUSDT', '1D', 900),   # ~2.5 years of daily
    ('ETH-USDT-SWAP', 'ETHUSDT', '1D', 900),
    ('BTC-USDT-SWAP', 'BTCUSDT', '4H', 1440),  # 4H candles
]

def log(msg):
    line = f'[{time.strftime("%Y-%m-%d %H:%M:%S")}] {msg}'
    print(line)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line + '\n')

def fetch_candles(inst_id, bar, limit):
    """Fetch candles paginated, returns ascending {t,o,h,l,c,v}."""
    import requests
    out = []
    after = None  # paginate backwards (OKX returns newest first)
    fetched = 0
    while fetched < limit:
        params = {'instId': inst_id, 'bar': bar, 'limit': min(300, limit - fetched)}
        if after:
            params['after'] = after
        r = requests.get(API, params=params, timeout=30)
        r.raise_for_status()
        d = r.json()
        if d.get('code') != '0' or not d.get('data'):
            break
        rows = d['data']  # newest first
        for k in rows:
            out.append({
                't': int(k[0]),
                'o': float(k[1]),
                'h': float(k[2]),
                'l': float(k[3]),
                'c': float(k[4]),
                'v': float(k[5]),
            })
        fetched += len(rows)
        if len(rows) < 300:
            break
        after = rows[-1][0]  # oldest timestamp so far → next batch goes older
        time.sleep(0.2)
    # Dedup + ascending
    seen = {}
    for row in out:
        seen[row['t']] = row
    return [seen[k] for k in sorted(seen)][-limit:]

def main():
    try:
        import requests
    except ImportError:
        log('ERROR: requests not installed')
        return 1

    for inst, symbol, bar, limit in INSTRUMENTS:
        try:
            log(f'Fetching OKX {inst} {bar} (limit {limit})...')
            candles = fetch_candles(inst, bar, limit)
            if not candles:
                log(f'  ERROR: no data for {inst} {bar}')
                continue
            fname = {'BTCUSDT': 'btc', 'ETHUSDT': 'eth'}[symbol]
            out_path = DATA_DIR / f'{fname}_ohlcv_{("4h" if bar == "4H" else "1d")}.json'
            out_path.write_text(json.dumps(candles), 'utf-8')
            log(f'  {symbol} {bar}: {len(candles)} candles saved, last {candles[-1]["t"]}')
        except Exception as e:
            log(f'  ERROR {inst} {bar}: {e}')

    return 0

if __name__ == '__main__':
    sys.exit(main())

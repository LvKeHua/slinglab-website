"""
Fetch Bybit + CoinGecko data through proxy and merge for KV upload.
"""
import json, os, urllib.request, sys
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Set up proxy handler
proxy_support = urllib.request.ProxyHandler({
    'http': 'http://127.0.0.1:7897',
    'https': 'http://127.0.0.1:7897',
})
opener = urllib.request.build_opener(proxy_support)

def fetch_json(url, headers=None, timeout=30, use_proxy=False):
    opener_to_use = opener if use_proxy else urllib.request.build_opener()
    req = urllib.request.Request(url, headers=headers or {})
    with opener_to_use.open(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())

print("=== Bybit tickers (direct) ===")
try:
    tickers = fetch_json("https://api.bybit.com/v5/market/tickers?category=linear", timeout=15)
    print(f"  OK - {len(tickers.get('result', {}).get('list', []))} tickers")
    BYBIT_WORKS = True
except Exception as e:
    print(f"  Direct failed: {e}")
    print("  Trying through proxy...")
    try:
        tickers = fetch_json("https://api.bybit.com/v5/market/tickers?category=linear", timeout=15, use_proxy=True)
        print(f"  Proxy OK - {len(tickers.get('result', {}).get('list', []))} tickers")
        BYBIT_WORKS = True
    except Exception as e2:
        print(f"  Proxy also failed: {e2}")
        print("  Trying with instruments-info...")
        try:
            instr = fetch_json("https://api.bybit.com/v5/market/instruments-info?category=linear", timeout=15, use_proxy=True)
            print(f"  Instruments OK via proxy!")
            BYBIT_WORKS = True
        except Exception as e3:
            print(f"  All Bybit attempts failed.")
            BYBIT_WORKS = False

if BYBIT_WORKS:
    instr = fetch_json("https://api.bybit.com/v5/market/instruments-info?category=linear", timeout=15, use_proxy=True)

print("\n=== CoinGecko top 250 (through proxy) ===")
try:
    cg = fetch_json(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=7d",
        {"User-Agent": "CryptoScreener/2.0"},
        timeout=30,
        use_proxy=True
    )
    print(f"  OK - {len(cg)} coins")
except Exception as e:
    print(f"  FAILED: {e}")
    sys.exit(1)

# Build CoinGecko map
cg_map = {}
for c in cg:
    sym = (c.get('symbol') or '').upper()
    total_sup = c.get('total_supply')
    circ_sup = c.get('circulating_supply')
    cr = None
    if total_sup and total_sup > 0 and circ_sup is not None:
        cr = circ_sup / total_sup
    cg_map[sym] = {
        'symbol': sym,
        'market_cap': c.get('market_cap'),
        'circulating_supply': circ_sup,
        'total_supply': total_sup,
        'max_supply': c.get('max_supply'),
        'circulating_ratio': round(cr, 4) if cr is not None else None,
        'cmc_rank': c.get('market_cap_rank'),
        'name': c.get('name') or sym,
        'percent_change_7d': c.get('price_change_percentage_7d_in_currency'),
    }

if BYBIT_WORKS:
    # Build Bybit rows
    instr_list = instr.get('result', {}).get('list', [])
    tick_list = tickers.get('result', {}).get('list', [])

    symbols = set(
        s['symbol'] for s in instr_list
        if s.get('status') == 'Trading' and s.get('quoteCoin') == 'USDT' and s.get('contractType') == 'LinearPerpetual'
    )
    print(f"\n  Bybit trading pairs: {len(symbols)}")

    ticker_map = {t['symbol']: t for t in tick_list}

    bybit_rows = []
    for sym in symbols:
        t = ticker_map.get(sym)
        if not t:
            continue
        price = float(t.get('lastPrice', 0))
        high = float(t.get('highPrice24h', 0))
        low = float(t.get('lowPrice24h', 0))
        pcnt = float(t.get('price24hPcnt', '0')) * 100
        if price <= 0:
            continue
        bybit_rows.append({
            'symbol': sym,
            'base_asset': sym.replace('USDT', ''),
            'price': price,
            'change_24h_pct': round(pcnt, 2),
            'amplitude_24h_pct': round(((high - low) / price) * 100, 2),
            'volume_24h_usdt': float(t.get('turnover24h', 0)),
        })

    print(f"  Bybit rows: {len(bybit_rows)}")
else:
    # Fallback: generate data from CoinGecko only
    print("\n=== Bybit unavailable - using CoinGecko only ===")
    bybit_rows = []
    for c in cg:
        sym = c.get('symbol', '').upper() + 'USDT'
        price = c.get('current_price') or 0
        if price <= 0:
            continue
        high_24h = c.get('high_24h') or price
        low_24h = c.get('low_24h') or price
        amp = ((high_24h - low_24h) / price) * 100 if price > 0 else 0
        bybit_rows.append({
            'symbol': sym,
            'base_asset': (c.get('symbol') or '').upper(),
            'price': price,
            'change_24h_pct': round(c.get('price_change_percentage_24h') or 0, 2),
            'amplitude_24h_pct': round(amp, 2),
            'volume_24h_usdt': c.get('total_volume') or 0,
        })
    print(f"  Generated {len(bybit_rows)} rows from CoinGecko")

# Merge
def assign_stars(mcap, cr):
    if mcap is None or cr is None or mcap < 15_000_000:
        return 0
    if mcap <= 100_000_000 and cr < 0.3:
        return 5
    if mcap <= 500_000_000 and cr < 0.3:
        return 5
    if mcap <= 100_000_000 and cr < 0.5:
        return 4
    if mcap <= 500_000_000 and cr < 0.5:
        return 3
    if mcap <= 2_000_000_000 and cr < 0.5:
        return 3
    if mcap > 2_000_000_000:
        return 2
    if cr >= 0.8:
        return 1
    return 2

def unlock_label(cr):
    if cr is None:
        return '\u26a0\ufe0f \u672a\u77e5'
    if cr < 0.3:
        return '\U0001f534 \u9ad8\u901a\u80c0\u98ce\u9669'
    if cr < 0.5:
        return '\U0001f7e1 \u89e3\u9501\u98ce\u9669'
    return '\U0001f7e2 \u4f4e\u98ce\u9669'

merged = []
for row in bybit_rows:
    ba = row['base_asset'].upper()
    cg_entry = cg_map.get(ba)
    mcap = cg_entry['market_cap'] if cg_entry else None
    cr = cg_entry['circulating_ratio'] if cg_entry else None
    if mcap is None or mcap < 15_000_000:
        continue
    merged.append({
        'symbol': row['symbol'],
        'name': cg_entry['name'] if cg_entry else ba,
        'base_asset': row['base_asset'],
        'price': row['price'],
        'market_cap': mcap,
        'circulating_supply': cg_entry['circulating_supply'] if cg_entry else None,
        'total_supply': cg_entry['total_supply'] if cg_entry else None,
        'max_supply': cg_entry['max_supply'] if cg_entry else None,
        'circulating_ratio': cr,
        'cmc_rank': cg_entry['cmc_rank'] if cg_entry else None,
        'volume_24h_usdt': row['volume_24h_usdt'],
        'percent_change_7d': cg_entry['percent_change_7d'] if cg_entry else None,
        'change_24h_pct': row['change_24h_pct'],
        'amplitude_24h_pct': row['amplitude_24h_pct'],
        'star_rating': assign_stars(mcap, cr),
        'unlock_risk': unlock_label(cr),
        'momentum_alert': (cg_entry and cg_entry.get('percent_change_7d') is not None and cg_entry['percent_change_7d'] > 0 and row['amplitude_24h_pct'] > 10) or False,
    })

print(f"\n=== Merged result: {len(merged)} coins (mcap >= $15M) ===")
if merged:
    print(f"  Sample: {merged[0]['symbol']} @ ${merged[0]['price']}, mcap=${merged[0]['market_cap']:.0f}")

# Save data
data_json = json.dumps(merged, ensure_ascii=False)
now = datetime.now(timezone.utc).isoformat()

out_json = os.path.join(BASE_DIR, "__fresh_data.json")
with open(out_json, "w", encoding="utf-8") as f:
    f.write(data_json)

out_meta = os.path.join(BASE_DIR, "__fresh_meta.json")
with open(out_meta, "w", encoding="utf-8") as f:
    json.dump({"last_updated": now, "count": str(len(merged))}, f, ensure_ascii=False)

print(f"Data: {len(data_json)} chars, {len(merged)} coins")
print(f"Timestamp: {now}")
print(f"Saved to: {out_json}")
print(f"Meta: {out_meta}")

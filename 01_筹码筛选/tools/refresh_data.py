"""
Step 1: Fetch Bybit + CoinGecko data from local machine
Step 2: Merge with same logic as the worker
Step 3: Save for upload to KV via cloudflare_execute
"""
import json, os, urllib.request, sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def fetch_json(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())

print("=== Fetching Bybit instruments ===")
try:
    instr = fetch_json("https://api.bybit.com/v5/market/instruments-info?category=linear")
    print(f"  OK - {len(instr.get('result', {}).get('list', []))} instruments")
except Exception as e:
    print(f"  FAILED: {e}")
    sys.exit(1)

print("=== Fetching Bybit tickers ===")
try:
    tickers = fetch_json("https://api.bybit.com/v5/market/tickers?category=linear")
    print(f"  OK - {len(tickers.get('result', {}).get('list', []))} tickers")
except Exception as e:
    print(f"  FAILED: {e}")
    sys.exit(1)

print("=== Fetching CoinGecko top 250 ===")
try:
    cg = fetch_json(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=7d",
        {"User-Agent": "CryptoScreener/2.0"}
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

print(f"  CoinGecko map: {len(cg_map)} symbols")

# Build Bybit rows
instr_list = instr.get('result', {}).get('list', [])
tick_list = tickers.get('result', {}).get('list', [])

symbols = set(
    s['symbol'] for s in instr_list
    if s.get('status') == 'Trading' and s.get('quoteCoin') == 'USDT' and s.get('contractType') == 'LinearPerpetual'
)
print(f"  Bybit trading pairs: {len(symbols)}")

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
        return 2 if cr >= 0.5 else 2
    if cr >= 0.8:
        return 1
    return 2

def unlock_label(cr):
    if cr is None:
        return '⚠️ 未知'
    if cr < 0.3:
        return '🔴 高通胀风险'
    if cr < 0.5:
        return '🟡 解锁风险'
    return '🟢 低风险'

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
        'momentum_alert': (cg_entry and cg_entry.get('percent_change_7d') and cg_entry['percent_change_7d'] > 0 and row['amplitude_24h_pct'] > 10) or False,
    })

filtered = merged  # already filtered by mcap >= 15M
print(f"\n=== Merged: {len(filtered)} coins ===")

# Save data
data_json = json.dumps(filtered, ensure_ascii=False)
with open(os.path.join(BASE_DIR, "__fresh_data.json"), "w", encoding="utf-8") as f:
    f.write(data_json)

# Generate KV timestamp
from datetime import datetime, timezone
now = datetime.now(timezone.utc).isoformat()

print(f"Data size: {len(data_json)} chars")
print(f"Timestamp: {now}")
print(f"\nSaved to: {os.path.join(BASE_DIR, '__fresh_data.json')}")
print(f"\nJSON preview (first 300 chars):")
print(data_json[:300])

#!/usr/bin/env python3
"""回填 gainer_hist_20260812：从 Binance 日线算 8-12 单日涨幅榜，写入 KV。"""
import json, datetime, urllib.request, ssl, sys

PROXY = "http://127.0.0.1:7897"
KV_PUT = "https://api.cloudflare.com/client/v4/accounts/1ab09277ed038add4925d28a343c9dc5/storage/kv/namespaces/6d56b8307fd04814892f9c2b15723c02/values/"
TOKEN = "cfoat_ZiotRvYUXjg6hAvuGaVwkZGmWn2R-8ttiStUqYZoyWg.FAdaMefvHV-KIlZ8VaeVyHhct51yeZBOQOeGU56TEw0"

HOSTS = ['fapi.binance.com', 'fapi1.binance.com', 'fapi2.binance.com', 'fapi3.binance.com', 'fapi4.binance.com', 'fapi5.binance.com']

def http_get(url, timeout=20, retries=3):
    proxy = urllib.request.ProxyHandler({'https': PROXY, 'http': PROXY})
    opener = urllib.request.build_opener(proxy)
    last = None
    for attempt in range(retries):
        for host in HOSTS:
            u = url.replace('fapi.binance.com', host)
            try:
                req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
                with opener.open(req, timeout=timeout) as r:
                    return json.loads(r.read().decode())
            except Exception as e:
                last = e
        import time
        time.sleep(2 * (attempt + 1))
    raise last

def kv_put(key, value):
    req = urllib.request.Request(
        KV_PUT + key,
        data=json.dumps(value).encode('utf-8'),
        headers={'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json'},
        method='PUT')
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status

# 1) 抓全量 Binance 永续日线（8-11 + 8-12 两根）
print("fetching symbols...", flush=True)
tickers = http_get("https://fapi.binance.com/fapi/v1/ticker/24hr")
syms = [t['symbol'] for t in tickers if t['symbol'].endswith('USDT')]
print(f"{len(syms)} symbols", flush=True)

klines = {}
for i in range(0, len(syms), 50):
    batch = syms[i:i+50]
    for sym in batch:
        try:
            k = http_get(f"https://fapi.binance.com/fapi/v1/klines?symbol={sym}&interval=1d&limit=3", timeout=15)
            if len(k) >= 2:
                klines[sym] = k
        except Exception:
            pass
    print(f"  {min(i+50, len(syms))}/{len(syms)}", flush=True)

print(f"got {len(klines)} klines", flush=True)

# 2) 算 8-12 单日涨幅（close[8-12]/close[8-11]-1）
def day_close(k, day):
    for x in k:
        d = datetime.datetime.fromtimestamp(x[0]/1000, datetime.UTC).date()
        if str(d) == day:
            return float(x[4]), float(x[7])
    return None, None

gainers = []
for sym, k in klines.items():
    c12, v12 = day_close(k, "2026-08-12")
    c11, _ = day_close(k, "2026-08-11")
    if c12 is None or c11 is None or c11 <= 0:
        continue
    gainers.append({
        "symbol": sym,
        "base_asset": sym.replace("USDT", ""),
        "change_24h_pct": round((c12/c11 - 1) * 100, 2),
        "volume_24h_usdt": v12,
        "last_price": c12,
    })

gainers.sort(key=lambda g: g["change_24h_pct"], reverse=True)
print(f"computed {len(gainers)} gainers, top5:", [(g['base_asset'], g['change_24h_pct']) for g in gainers[:5]], flush=True)

# 3) 写入 KV（保留 seed 标记为 False，标注回填）
payload = {"date": "2026-08-12", "gainers": gainers, "updated": "2026-08-12T23:59:00.000Z", "backfilled": True}
st = kv_put("gainer_hist_20260812", payload)
print("KV put status:", st, flush=True)

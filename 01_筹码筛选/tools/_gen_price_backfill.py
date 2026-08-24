#!/usr/bin/env python3
"""给 gainer_hist 种子补 last_price（用日线收盘价），生成回填 bulk。"""
import json, datetime

KL = json.load(open("weekly_klines.json", encoding="utf-8"))["klines"]

def day_close(klines, day):
    """day 日收盘价"""
    for x in klines:
        d = datetime.datetime.fromtimestamp(x[0] / 1000, datetime.UTC).date()
        if d == day:
            return float(x[4])
    return None

seeds = []
for d in (datetime.date(2026, 8, 4), datetime.date(2026, 8, 5), datetime.date(2026, 8, 6),
          datetime.date(2026, 8, 7), datetime.date(2026, 8, 8), datetime.date(2026, 8, 9),
          datetime.date(2026, 8, 10), datetime.date(2026, 8, 11)):
    ds = str(d)
    key = "gainer_hist_" + ds.replace("-", "")
    gainers = []
    for sym, k in KL.items():
        if not k:
            continue
        px = day_close(k, d)
        if px is None:
            continue
        gainers.append({
            "symbol": sym, "base_asset": sym.replace("USDT", ""),
            "change_24h_pct": 0.0, "volume_24h_usdt": 0.0,
            "last_price": px,
        })
    seeds.append({"key": key, "value": json.dumps({
        "date": ds, "gainers": gainers,
        "updated": ds + "T23:59:00.000Z", "seed": True,
    }, ensure_ascii=False)})
    print(f"{ds}: {len(gainers)} 币 last_price 补齐")

json.dump(seeds, open("_seed_files/gainer_price_backfill.json", "w", encoding="utf-8"), ensure_ascii=False)
print("saved _seed_files/gainer_price_backfill.json")

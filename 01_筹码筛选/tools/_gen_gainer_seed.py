#!/usr/bin/env python3
"""生成 gainer_hist 种子（08-09/08-10 从日线算单日涨幅，08-11 用当前 ticker）。"""
import json, datetime, os

KL = json.load(open("weekly_klines.json", encoding="utf-8"))["klines"]
G = json.load(open("gainers_live.json", encoding="utf-8"))

def day_close_map(klines):
    """{date: (close, quoteVolume)}"""
    m = {}
    for x in klines:
        d = datetime.datetime.fromtimestamp(x[0] / 1000, datetime.UTC).date()
        m[d] = (float(x[4]), float(x[7]))
    return m

def daily_gainers(day):
    """day 日单日涨幅榜（close[day]/close[day-1]-1）"""
    out = []
    for sym, k in KL.items():
        if not k:
            continue
        m = day_close_map(k)
        if day not in m or (day - datetime.timedelta(days=1)) not in m:
            continue
        cur, vol = m[day]
        prev, _ = m[day - datetime.timedelta(days=1)]
        if prev <= 0:
            continue
        out.append({
            "symbol": sym,
            "base_asset": sym.replace("USDT", ""),
            "change_24h_pct": round((cur / prev - 1) * 100, 2),
            "volume_24h_usdt": vol,
        })
    return out

seeds = {}
for day in (datetime.date(2026, 8, 9), datetime.date(2026, 8, 10)):
    ds = str(day)
    gainers = daily_gainers(day)
    seeds["gainer_hist_" + ds.replace("-", "")] = {
        "date": ds, "gainers": gainers,
        "updated": ds + "T23:59:00.000Z", "seed": True,
    }
    print(f"{ds}: {len(gainers)} 币")

# 08-11：用当前 ticker 快照（relay 会持续覆盖写回）
c11 = G["binance_perp"]
seeds["gainer_hist_20260811"] = {
    "date": "2026-08-11",
    "gainers": [{"symbol": t["symbol"], "base_asset": t["base"],
                 "change_24h_pct": t["change_24h_pct"], "volume_24h_usdt": t["volume_24h_usdt"]}
                for t in c11],
    "updated": "2026-08-11T13:00:00.000Z", "seed": True,
}
print(f"2026-08-11: {len(c11)} 币 (ticker 快照)")

os.makedirs("_seed_files", exist_ok=True)
bulk = [{"key": k, "value": json.dumps(v, ensure_ascii=False)} for k, v in seeds.items()]
with open("_seed_files/gainer_hist_bulk.json", "w", encoding="utf-8") as f:
    json.dump(bulk, f, ensure_ascii=False)
print("saved _seed_files/gainer_hist_bulk.json", os.path.getsize("_seed_files/gainer_hist_bulk.json"), "B")

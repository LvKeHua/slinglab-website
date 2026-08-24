#!/usr/bin/env python3
"""对比 08-04 候选池 vs 08-10 / 08-11 两天涨幅榜。"""
import json, datetime

ACC = json.load(open("candidates_20260804.json", encoding="utf-8"))
DAILY = json.load(open("daily_klines.json", encoding="utf-8"))

cands = {c["base_asset"]: c for c in ACC}
print(f"08-04 候选池: {len(cands)} 个\n")

def day_map(exchange):
    """symbol -> {date: close}"""
    m = {}
    for sym, rows in DAILY[exchange].items():
        if not rows:
            continue
        m[sym] = {datetime.datetime.fromtimestamp(ts / 1000, datetime.UTC).date(): c for ts, c in rows}
    return m

bmap, ymap = day_map("binance"), day_map("bybit")

def daily_ret(m, sym, d):
    """sym 在 d 日单日涨幅（close[d]/close[d-1]-1），d 为 date"""
    dm = m.get(sym)
    if not dm:
        return None
    dates = sorted(dm)
    if d not in dm:
        return None
    i = dates.index(d)
    if i == 0:
        return None
    prev = dm[dates[i - 1]]
    if prev <= 0:
        return None
    return dm[d] / prev - 1.0

def two_day_ret(m, sym, d):
    """从 d-1 开盘到 d 收盘的两日涨幅（近似，用 close[d-2]->close[d] 更准）"""
    dm = m.get(sym)
    if not dm:
        return None
    dates = sorted(dm)
    if d not in dm:
        return None
    i = dates.index(d)
    if i < 2:
        return None
    prev = dm[dates[i - 2]]
    if prev <= 0:
        return None
    return dm[d] / prev - 1.0

D10 = datetime.date(2026, 8, 10)
D11 = datetime.date(2026, 8, 11)

boards = {
    "Binance永续·08-10单日": lambda m, s: daily_ret(m, s, D10),
    "Binance永续·08-11单日": lambda m, s: daily_ret(m, s, D11),
    "Binance永续·08-10至08-11两日": lambda m, s: two_day_ret(m, s, D11),
    "Bybit永续·08-10单日": lambda m, s: daily_ret(m, s, D10),
    "Bybit永续·08-11单日": lambda m, s: daily_ret(m, s, D11),
    "Bybit永续·08-10至08-11两日": lambda m, s: two_day_ret(m, s, D11),
}

for topn in (20, 50):
    print("=" * 72)
    print(f"Top{topn} 涨幅榜 × 08-04候选池({len(cands)}) 重合度")
    print("=" * 72)
    for name, fn in boards.items():
        ex = "binance" if name.startswith("Binance") else "bybit"
        m = bmap if ex == "binance" else ymap
        items = []
        for sym in m:
            r = fn(m, sym)
            if r is None:
                continue
            base = sym[:-4]
            items.append((base, r))
        items.sort(key=lambda t: -t[1])
        top = items[:topn]
        hit = [(s, v) for s, v in top if s in cands]
        print(f"── {name}: 重合 {len(hit)}/{len(top)} ({len(hit)/len(top)*100:.1f}%)")
        for s, v in top:
            c = cands.get(s)
            mark = f" ★候选(score={c['forward_score']})" if c else ""
            print(f"   {s:10s} {v*100:+7.2f}%{mark}")
        print()

# 候选池 20 币在这两天的表现明细
print("=" * 72)
print("08-04 候选池 20 币 → 08-10/11 表现明细")
print("=" * 72)
print(f"{'币':<10}{'Bin10':<9}{'Bin11':<9}{'Bin两日':<9}{'Byb10':<9}{'Byb11':<9}{'Byb两日':<9}{'两日最高':<10}")
results = []
for base in sorted(cands):
    sym = base + "USDT"
    rb10 = daily_ret(bmap, sym, D10)
    rb11 = daily_ret(bmap, sym, D11)
    rb2 = two_day_ret(bmap, sym, D11)
    ry10 = daily_ret(ymap, sym, D10)
    ry11 = daily_ret(ymap, sym, D11)
    ry2 = two_day_ret(ymap, sym, D11)
    def f(x):
        return f"{x*100:+7.2f}%" if x is not None else "   N/A "
    best = max([x for x in (rb2, ry2) if x is not None], default=None)
    results.append((base, best))
    print(f"{base:<10}{f(rb10):<9}{f(rb11):<9}{f(rb2):<9}{f(ry10):<9}{f(ry11):<9}{f(ry2):<9}{f(best):<10}")

results.sort(key=lambda t: -(t[1] or 0))
won = sum(1 for _, b in results if b is not None and b > 0)
print(f"\n候选池两日正收益: {won}/{len(results)}")
print(f"候选池两日最佳: {[(s, f'{b*100:+.1f}%') for s, b in results[:5]]}")
print(f"候选池两日最差: {[(s, f'{b*100:+.1f}%') for s, b in results[-5:]]}")

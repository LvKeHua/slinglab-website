#!/usr/bin/env python3
"""周候选池并集（08-04~08-10 每日筛出）vs 08-10/08-11 两天涨幅榜对比。"""
import json, datetime

UNION = json.load(open("weekly_union.json", encoding="utf-8"))
DAILY = json.load(open("daily_candidates_week.json", encoding="utf-8"))
DAILY_KL = json.load(open("daily_klines.json", encoding="utf-8"))
FWD = json.load(open("forward_live.json", encoding="utf-8"))  # 线上 08-11 真实候选池

cands = set(UNION.keys())
online_now = {x["base_asset"] for x in FWD["data"] if x["signal"] == "acc_candidate"}

# 08-11 当天（线上）候选池，补进并集口径（系统在 08-11 白天也会筛出币）
# 用户问"最近一个星期出现在筛选器的币"= 08-05~08-11 每天筛出的并集
# 08-11 用线上真实数据
cands_with_online = cands | online_now
print(f"周并集(重建 08-04~08-10): {len(cands)} 币")
print(f"08-11 线上候选池: {len(online_now)} 币")
print(f"合并口径(周并集∪08-11): {len(cands_with_online)} 币")

def day_map(exchange):
    m = {}
    for sym, rows in DAILY_KL[exchange].items():
        if rows:
            m[sym] = {datetime.datetime.fromtimestamp(ts / 1000, datetime.UTC).date(): c for ts, c in rows}
    return m

bmap, ymap = day_map("binance"), day_map("bybit")

def daily_ret(m, sym, d):
    dm = m.get(sym)
    if not dm: return None
    dates = sorted(dm)
    if d not in dm: return None
    i = dates.index(d)
    if i == 0: return None
    prev = dm[dates[i - 1]]
    if prev <= 0: return None
    return dm[d] / prev - 1.0

def two_day_ret(m, sym, d):
    dm = m.get(sym)
    if not dm: return None
    dates = sorted(dm)
    if d not in dm: return None
    i = dates.index(d)
    if i < 2: return None
    prev = dm[dates[i - 2]]
    if prev <= 0: return None
    return dm[d] / prev - 1.0

D10 = datetime.date(2026, 8, 10)
D11 = datetime.date(2026, 8, 11)

boards = {
    "Binance·08-10": (bmap, lambda m, s: daily_ret(m, s, D10)),
    "Binance·08-11": (bmap, lambda m, s: daily_ret(m, s, D11)),
    "Binance·两日": (bmap, lambda m, s: two_day_ret(m, s, D11)),
    "Bybit·08-10": (ymap, lambda m, s: daily_ret(m, s, D10)),
    "Bybit·08-11": (ymap, lambda m, s: daily_ret(m, s, D11)),
    "Bybit·两日": (ymap, lambda m, s: two_day_ret(m, s, D11)),
}

print("\n" + "=" * 78)
print("一、周并集(45) ∪ 08-11线上候选 vs 涨幅榜 Top20/Top50")
print("=" * 78)
for name, (m, fn) in boards.items():
    items = [(s[:-4], fn(m, s)) for s in m if fn(m, s) is not None]
    items.sort(key=lambda t: -t[1])
    for topn in (20, 50):
        top = items[:topn]
        hit = [(s, v) for s, v in top if s in cands_with_online]
        hit_old = [(s, v) for s, v in top if s in cands]
        tag = f"  其中重建周并集命中: {len(hit_old)}"
        print(f"  {name} Top{topn}: 重合 {len(hit)}/{topn} ({len(hit)/topn*100:.0f}%){tag}")
        for s, v in hit:
            src = "重建周并集" if s in cands else "08-11线上"
            days = UNION.get(s, {}).get("days", ["08-11"])
            print(f"      {s:10s} {v*100:+7.2f}%  [{src}] 出现天数: {days}")

print("\n" + "=" * 78)
print("二、命中币详情（周并集 ∩ 涨幅榜）")
print("=" * 78)
hit_all = {}
for name, (m, fn) in boards.items():
    items = [(s[:-4], fn(m, s)) for s in m if fn(m, s) is not None]
    items.sort(key=lambda t: -t[1])
    for s, v in items[:50]:
        if s in cands_with_online:
            if s not in hit_all:
                hit_all[s] = {}
            hit_all[s][name] = v

if not hit_all:
    print("  无命中")
for s in sorted(hit_all):
    u = UNION.get(s, {})
    days = u.get("days", ["08-11(线上)"])
    print(f"  {s:10s} 周内出现: {days}")
    for name, v in hit_all[s].items():
        print(f"      {name}: {v*100:+.2f}%")

print("\n" + "=" * 78)
print("三、逐日明细：每天筛出的币在 08-10/11 的表现")
print("=" * 78)
for day in sorted(DAILY.keys()):
    acc = {c["base_asset"] for c in DAILY[day] if c["signal"] == "acc_candidate"}
    # 该日候选在两天榜 Top50 的命中
    hits = []
    for name, (m, fn) in boards.items():
        items = [(s[:-4], fn(m, s)) for s in m if fn(m, s) is not None]
        items.sort(key=lambda t: -t[1])
        for s, v in items[:50]:
            if s in acc:
                hits.append((name, s, v))
    hit_names = sorted({s for _, s, _ in hits})
    print(f"  {day}: {len(acc)} 候选 -> 两天榜Top50命中 {len(hit_names)}: {hit_names if hit_names else '无'}")

print("\n" + "=" * 78)
print("四、08-11 线上候选池 vs 涨幅榜 Top50")
print("=" * 78)
for name, (m, fn) in boards.items():
    items = [(s[:-4], fn(m, s)) for s in m if fn(m, s) is not None]
    items.sort(key=lambda t: -t[1])
    top = items[:50]
    hit = [(s, v) for s, v in top if s in online_now]
    print(f"  {name} Top50: 重合 {len(hit)}/50")
    for s, v in hit:
        print(f"      {s:10s} {v*100:+7.2f}%")

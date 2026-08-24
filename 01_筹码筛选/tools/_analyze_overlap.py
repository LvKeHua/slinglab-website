#!/usr/bin/env python3
"""分析 Binance/Bybit 涨幅榜与筛选器候选池重合度。"""
import json

FWD = json.load(open("forward_live.json", encoding="utf-8"))
G = json.load(open("gainers_live.json", encoding="utf-8"))

cands = {x["base_asset"]: x for x in FWD["data"] if x["signal"] == "acc_candidate"}
print(f"筛选器候选池: {len(cands)} 个  (updated {FWD['updated']})")

b_perp = {x["base"]: x for x in G["binance_perp"]}
y_perp = {x["base"]: x for x in G["bybit_perp"]}
b_spot = {x["base"]: x for x in G["binance_spot"]}

def rank_lists(d, key, topn=50, minvol=0):
    """按 key 降序，过滤 volume。返回 (symbol, value) 列表"""
    items = [(s, x[key]) for s, x in d.items() if x[key] is not None and x["volume_24h_usdt"] >= minvol]
    items.sort(key=lambda t: -t[1])
    return items[:topn]

topn = 50

def fmt(v, is_pct):
    """is_pct=True 时 v 已是百分数，否则为小数"""
    if is_pct:
        return f"{v:+7.2f}%"
    return f"{v*100:+7.2f}%"

boards_nofilter = {
    "Binance永续·24h": (rank_lists(b_perp, "change_24h_pct", topn, 0), True),
    "Binance永续·72h": (rank_lists(b_perp, "ret_72h", topn, 0), False),
    "Bybit永续·24h": (rank_lists(y_perp, "change_24h_pct", topn, 0), True),
    "Bybit永续·72h": (rank_lists(y_perp, "ret_72h", topn, 0), False),
    "Binance现货·24h": (rank_lists(b_spot, "change_24h_pct", topn, 0), True),
}

print(f"\n口径A: Top{topn} 无成交量过滤（交易所涨幅榜原始口径）\n")
for name, (lst, is_pct) in boards_nofilter.items():
    hit = [s for s, v in lst if s in cands]
    print(f"── {name}: 重合 {len(hit)}/{len(lst)} ({len(hit)/len(lst)*100:.1f}%)  重合币: {', '.join(hit) if hit else '无'}")
    for s, v in lst:
        mark = " ★" if s in cands else ""
        print(f"   {s:10s} {fmt(v, is_pct)}{mark}")
    print()

minvol = 5_000_000  # 500万U 日成交过滤噪音
boards = {
    "Binance永续·24h": (rank_lists(b_perp, "change_24h_pct", topn, minvol), True),
    "Binance永续·72h": (rank_lists(b_perp, "ret_72h", topn, minvol), False),
    "Bybit永续·24h": (rank_lists(y_perp, "change_24h_pct", topn, minvol), True),
    "Bybit永续·72h": (rank_lists(y_perp, "ret_72h", topn, minvol), False),
    "Binance现货·24h": (rank_lists(b_spot, "change_24h_pct", topn, minvol), True),
}

print(f"\n口径B: Top{topn}, 24h成交额≥{minvol/1e6:.0f}M USDT\n")
for name, (lst, is_pct) in boards.items():
    hit = [s for s, v in lst if s in cands]
    print(f"── {name}: 重合 {len(hit)}/{len(lst)} ({len(hit)/len(lst)*100:.1f}%)  重合币: {', '.join(hit) if hit else '无'}")
    for s, v in lst:
        mark = " ★候选" if s in cands else ""
        print(f"   {s:10s} {fmt(v, is_pct)}{mark}")
    print()

# 详细:候选池中谁上了榜
print("\n候选池 24 币上榜情况:")
print(f"{'币':<10}{'Bin24h':<10}{'Bin72h':<10}{'Byb24h':<10}{'Byb72h':<10}{'现货24h':<10}")
for base in sorted(cands):
    def g(d, k):
        x = d.get(base)
        if not x or x.get(k) is None:
            return "  -  "
        return f"{x[k]:+7.2f}%"
    print(f"{base:<10}{g(b_perp,'change_24h_pct'):<10}{g(b_perp,'ret_72h'):<10}{g(y_perp,'change_24h_pct'):<10}{g(y_perp,'ret_72h'):<10}{g(b_spot,'change_24h_pct'):<10}")

# 重合币详情（候选池 ∩ 榜单，口径A+B并集）
print("\n重合币详情 (口径A∪B):")
seen = set()
for name, (lst, is_pct) in {**boards_nofilter, **boards}.items():
    for s, v in lst:
        if s in cands and s not in seen:
            c = cands[s]
            seen.add(s)
            print(f"  {s:10s} score={c['forward_score']}  {name}: {fmt(v, is_pct)}")

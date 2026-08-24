#!/usr/bin/env python3
"""
逐日重建 08-04 ~ 08-10 的筛选器候选池（每天收盘时点）
按 relay.mjs computeForwardScore 精确公式。
OI = Binance 单所 oiHist 当日值（无 Bybit/OKX 历史，跨日一致）。
"""
import json, datetime

DATA = json.load(open("weekly_klines.json", encoding="utf-8"))
LISTING = json.load(open("listing_dates.json", encoding="utf-8"))

DAYS = [datetime.date(2026, 8, d) for d in range(4, 11)]  # 08-04 ~ 08-10

def compute_oi_stage(oi):
    if oi < 2e6: return "accumulation"
    if oi <= 8e6: return "early_pump"
    if oi <= 30e6: return "pump"
    if oi <= 80e6: return "mid"
    return "late_distribution"

def rebuild_day(day):
    """重建 day 日收盘时点的候选池。"""
    day_ts_end = int(datetime.datetime(day.year, day.month, day.day, 23, 59, tzinfo=datetime.UTC).timestamp() * 1000)
    next_day = day + datetime.timedelta(days=1)
    out = []
    for sym, k in DATA["klines"].items():
        if not k:
            continue
        rows = [x for x in k if x[0] <= day_ts_end]
        if len(rows) < 20:
            continue
        closes = [float(x[4]) for x in rows]
        cur = closes[-1]
        if cur <= 0:
            continue
        # 结构因子
        hi60 = max(closes[-60:])
        drawdown_60d = round(1 - cur / hi60, 4) if hi60 > 0 else None
        win20 = closes[-20:]
        mn, mx = min(win20), max(win20)
        range_20d = round((mx - mn) / mn, 4) if mn > 0 else None
        near_low_20d = round(cur / mn, 4) if mn > 0 else None
        turns = [float(x[7]) for x in rows[-60:]]
        turn_max = max(turns)
        turn5 = sum(turns[-5:]) / 5
        vol_shrink_20d = round(turn5 / turn_max, 4) if turn_max > 0 else None
        dayrets = [0] + [closes[j] / closes[j-1] - 1 for j in range(1, len(closes))]
        big_move_5d = any(abs(x) > 0.15 for x in dayrets[-5:])
        amps = [(float(x[2]) - float(x[3])) / float(x[4]) for x in rows[-5:]]
        vol_compress_5d = round(sum(amps) / len(amps), 4)
        ret_10d = round(cur / closes[-11] - 1, 4) if len(closes) > 11 else None
        breakout_consolidation = False
        for i in range(max(1, len(closes) - 60), len(closes) - 5):
            dret = closes[i] / closes[i-1] - 1
            if dret >= 0.15:
                future_high = max(closes[i:min(i + 20, len(closes))])
                candle_high = float(rows[i][2])
                if future_high <= candle_high * 1.15:
                    breakout_consolidation = True
                    break
        spring_test = False
        for i in range(max(2, len(closes) - 60), len(closes) - 5):
            prior_low = min(closes[max(0, i - 20):i])
            if prior_low > 0 and closes[i] <= prior_low * 0.92:
                recovered = max(closes[i:i + 6])
                if recovered >= prior_low:
                    spring_test = True
                    break
        prev_close = closes[-2] if len(closes) >= 2 else cur
        change_24h_pct = round((cur / prev_close - 1) * 100, 2)
        vol_24h = float(rows[-1][7])

        # OI：oiHist 中 ≤ day 的最近值
        oi = None
        oi_series = DATA["oi_hist"].get(sym)
        if oi_series:
            best = None
            for h in oi_series:
                ts = h.get("timestamp")
                if ts and ts <= day_ts_end:
                    if best is None or ts > best[0]:
                        best = (ts, float(h.get("sumOpenInterestValue", 0)))
            if best:
                oi = best[1]
        if oi is None:
            continue
        volume_oi_ratio = vol_24h / oi if oi > 0 else 0

        onboard = LISTING.get(sym)
        days_since_listing = None
        if onboard:
            listing_day = datetime.datetime.fromtimestamp(onboard / 1000, datetime.UTC).date()
            days_since_listing = (next_day - listing_day).days

        # computeForwardScore（relay.mjs 原样）
        acc_structure = (
            drawdown_60d is not None and drawdown_60d >= 0.40 and
            range_20d is not None and range_20d < 0.30 and
            vol_shrink_20d is not None and vol_shrink_20d < 0.20 and
            near_low_20d is not None and near_low_20d > 1.03 and
            big_move_5d is not None and not big_move_5d
        )
        if not acc_structure:
            score = -3 if volume_oi_ratio >= 5 else 0
        else:
            s = 3
            if drawdown_60d >= 0.60: s += 1
            if range_20d < 0.20: s += 1
            if vol_shrink_20d < 0.10: s += 1
            if vol_compress_5d < 0.08: s += 1
            if 2e6 <= oi < 8e6: s += 2
            elif 8e6 <= oi < 30e6: s += 1
            if breakout_consolidation: s += 1
            if ret_10d is not None and -0.05 <= ret_10d <= 0.15: s += 1
            if spring_test: s += 1
            # funding 无历史 → None，跳过
            if days_since_listing is not None and days_since_listing <= 180: s += 1
            if volume_oi_ratio >= 5: s -= 3
            score = s
        if score >= 4:
            signal = "acc_candidate"
        elif volume_oi_ratio >= 5:
            signal = "avoid_event"
        elif score > 0:
            signal = "watch"
        else:
            signal = "noise"
        out.append({
            "symbol": sym, "base_asset": sym[:-4], "day": str(day),
            "price": cur, "change_24h_pct": change_24h_pct,
            "volume_24h_usdt": vol_24h, "oi_value": oi,
            "volume_oi_ratio": round(volume_oi_ratio, 4),
            "oi_stage": compute_oi_stage(oi),
            "days_since_listing": days_since_listing,
            "drawdown_60d": drawdown_60d, "range_20d": range_20d,
            "vol_shrink_20d": vol_shrink_20d, "near_low_20d": near_low_20d,
            "big_move_5d": big_move_5d, "vol_compress_5d": vol_compress_5d,
            "ret_10d": ret_10d, "breakout_consolidation": breakout_consolidation,
            "spring_test": spring_test, "funding_rate_pct": None,
            "forward_score": score, "signal": signal,
        })
    return out

all_days = {}
for day in DAYS:
    cands = rebuild_day(day)
    acc = [c for c in cands if c["signal"] == "acc_candidate"]
    all_days[str(day)] = acc
    print(f"{day}: 候选池 {len(acc)} 个 -> {sorted(c['base_asset'] for c in acc)}")

json.dump(all_days, open("daily_candidates_week.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# 周并集
union = {}
for day, acc in all_days.items():
    for c in acc:
        b = c["base_asset"]
        if b not in union:
            union[b] = {"first_day": day, "days": [], "max_score": 0}
        union[b]["days"].append(day)
        union[b]["max_score"] = max(union[b]["max_score"], c["forward_score"])
print(f"\n周并集: {len(union)} 个币")
for b in sorted(union):
    print(f"  {b:10s} 首现 {union[b]['first_day']} 出现 {len(union[b]['days'])} 天 最高分 {union[b]['max_score']}  天数: {union[b]['days']}")
json.dump(union, open("weekly_union.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("saved daily_candidates_week.json + weekly_union.json")

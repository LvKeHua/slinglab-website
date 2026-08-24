#!/usr/bin/env python3
"""
重建一周前（2026-08-04）的筛选器候选池
========================================
用 backtest_binance_30d.json（530币×100天日线 + OI历史 + 资费快照）
在 08-03 收盘时点，按 relay.mjs computeForwardScore 精确公式重建。
"""
import json, datetime, math

DATA = json.load(open("backtest_binance_30d.json", encoding="utf-8"))
OKX = json.load(open("backtest_okx_3m.json", encoding="utf-8"))
LISTING = json.load(open("listing_dates.json", encoding="utf-8"))

TARGET_DATE = datetime.date(2026, 8, 3)   # 收盘时点（08-04 白天系统所见）
TARGET_TS = int(datetime.datetime(2026, 8, 3, 23, 59, tzinfo=datetime.UTC).timestamp() * 1000)
NEXT_DAY = datetime.date(2026, 8, 4)

def closes_upto(klines, ts=TARGET_TS):
    return [x for x in klines if x[0] <= ts]

def compute_oi_stage(oi):
    if oi < 2e6: return "accumulation"
    if oi <= 8e6: return "early_pump"
    if oi <= 30e6: return "pump"
    if oi <= 80e6: return "mid"
    return "late_distribution"

def rebuild_candidates():
    out = []
    klines_all = DATA["klines_100d"]
    oi_hist_all = DATA["oiHist_31d"]
    # OKX OI 08-03 值
    okx_oi = {}
    for sym, series in OKX["oi"].items():
        base = sym.replace("-USDT-SWAP", "")
        best = None
        for item in series:
            ts = int(item[0])
            if ts <= TARGET_TS:
                if best is None or ts > best[0]:
                    best = (ts, item[1])
        if best:
            okx_oi[base] = best[1]

    for sym in DATA["syms"]:
        base = sym[:-4]
        k = klines_all.get(sym)
        if not k or len(k) < 20:
            continue
        rows = closes_upto(k)
        if len(rows) < 20:
            continue
        closes = [float(x[4]) for x in rows]
        cur = closes[-1]
        if cur <= 0:
            continue

        # ── 结构因子（与 relay.mjs 完全一致）──
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

        # 大阳线后盘整
        breakout_consolidation = False
        for i in range(max(1, len(closes) - 60), len(closes) - 5):
            dret = closes[i] / closes[i-1] - 1
            if dret >= 0.15:
                future_high = max(closes[i:min(i + 20, len(closes))])
                candle_high = float(rows[i][2])
                if future_high <= candle_high * 1.15:
                    breakout_consolidation = True
                    break
        # Spring 测试
        spring_test = False
        for i in range(max(2, len(closes) - 60), len(closes) - 5):
            prior_low = min(closes[max(0, i - 20):i])
            if prior_low > 0 and closes[i] <= prior_low * 0.92:
                recovered = max(closes[i:i + 6])
                if recovered >= prior_low:
                    spring_test = True
                    break

        # ── 当日行情（08-03 收盘口径）──
        prev_close = closes[-2] if len(closes) >= 2 else cur
        change_24h_pct = round((cur / prev_close - 1) * 100, 2)
        amp = (float(rows[-1][2]) - float(rows[-1][3])) / cur * 100 if cur else 0
        vol_24h = float(rows[-1][7])

        # ── OI（Binance 单所 08-03 + OKX 聚合）──
        oi_binance = None
        oi_series = oi_hist_all.get(sym)
        if oi_series:
            best = None
            for h in oi_series:
                ts = h.get("timestamp")
                if ts and ts <= TARGET_TS:
                    if best is None or ts > best[0]:
                        best = (ts, float(h.get("sumOpenInterestValue", 0)))
            if best:
                oi_binance = best[1]
        if oi_binance is None:
            continue  # 无 OI 数据，线上逻辑同样跳过
        oi_value = oi_binance + okx_oi.get(base, 0)
        # Bybit OI 历史缺失 → 仅 Binance+OKX 聚合（线上是三所）
        volume_oi_ratio = vol_24h / oi_value if oi_value > 0 else 0

        # ── funding（无历史，缺失，标注 None）──
        funding_rate_pct = None

        # ── listing ──
        onboard = LISTING.get(sym)
        days_since_listing = None
        if onboard:
            listing_day = datetime.datetime.fromtimestamp(onboard / 1000, datetime.UTC).date()
            days_since_listing = (NEXT_DAY - listing_day).days

        # ── computeForwardScore（照抄 relay.mjs）──
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
            if 2e6 <= oi_value < 8e6: s += 2
            elif 8e6 <= oi_value < 30e6: s += 1
            if breakout_consolidation: s += 1
            if ret_10d is not None and -0.05 <= ret_10d <= 0.15: s += 1
            if spring_test: s += 1
            if funding_rate_pct is not None:
                if funding_rate_pct > 0.05: s += 1
                elif funding_rate_pct < -0.05 and change_24h_pct > 0: s -= 3
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
            "symbol": sym, "base_asset": base,
            "price": cur,
            "change_24h_pct": change_24h_pct,
            "amplitude_24h_pct": round(amp, 2),
            "volume_24h_usdt": vol_24h,
            "oi_value": oi_value,
            "volume_oi_ratio": round(volume_oi_ratio, 4),
            "oi_stage": compute_oi_stage(oi_value),
            "days_since_listing": days_since_listing,
            "drawdown_60d": drawdown_60d, "range_20d": range_20d,
            "vol_shrink_20d": vol_shrink_20d, "near_low_20d": near_low_20d,
            "big_move_5d": big_move_5d, "vol_compress_5d": vol_compress_5d,
            "ret_10d": ret_10d, "breakout_consolidation": breakout_consolidation,
            "spring_test": spring_test,
            "funding_rate_pct": funding_rate_pct,
            "forward_score": score, "signal": signal,
        })
    return out

cands = rebuild_candidates()
acc = [c for c in cands if c["signal"] == "acc_candidate"]
acc.sort(key=lambda c: -c["forward_score"])
print(f"重建完成: 总币数 {len(cands)}, 候选池 {len(acc)} 个")
print(f"{'币':<10}{'评分':<5}{'24h%':<8}{'OI(M)':<8}{'额/OI':<8}{'回撤':<7}{'横盘':<7}{'缩量':<7}")
for c in acc:
    print(f"{c['base_asset']:<10}{c['forward_score']:<5}{c['change_24h_pct']:+7.2f}%{c['oi_value']/1e6:7.1f} {c['volume_oi_ratio']:<8.2f}{c['drawdown_60d']:<7.2f}{c['range_20d']:<7.2f}{c['vol_shrink_20d']:<7.2f}")

json.dump(acc, open("candidates_20260804.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("\n已保存 candidates_20260804.json")

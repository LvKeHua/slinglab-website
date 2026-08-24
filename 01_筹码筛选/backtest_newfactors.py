# -*- coding: utf-8 -*-
"""
新因子事件研究回测
==================
对 6 个新因子做滚动事件研究：
  每个交易日 T，计算全市场各因子的命中集合，
  统计命中集合的 fwd3 / fwd5 / fwd10 收益 vs 全市场基准，
  以及 <-10% 概率（下行风险）。

数据：backtest_binance_30d.json（530 币 × 100 天日线含 taker + 31 天 OI 历史）
窗口：2026-05-15 ~ 2026-07-25（留出前 30 天算因子、后 10 天算 fwd）
"""
import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'backtest_binance_30d.json')

# ── 加载 ──────────────────────────────────────────────
def load():
    with open(DATA_PATH, encoding='utf-8') as f:
        return json.load(f)


# ── 单币因子计算（在给定日期索引 i 处）────────────────
def compute_factors(sym, klines, oi_hist, i):
    """在日期 i 计算所有因子（用 i 及之前的数据，不含未来）。"""
    if i < 30:
        return None
    closes = [float(x[4]) for x in klines[:i+1]]
    highs = [float(x[2]) for x in klines[:i+1]]
    lows = [float(x[3]) for x in klines[:i+1]]
    vols = [float(x[7]) for x in klines[:i+1]]
    takers = [float(x[9]) for x in klines[:i+1]]
    bases = [float(x[5]) for x in klines[:i+1]]
    cur = closes[-1]
    if cur <= 0:
        return None

    r = {'down_wash': False, 'down_wash_score': 0, 'horizontal': False,
         'sm_flow': 0, 'liquidity_test': False, 'dual_open': False,
         'trapped_dense': False, 'oi_surge': None, 'taker5': None}

    # OI
    if oi_hist and len(oi_hist) >= 2:
        # oi_hist 是 31 天逐日，取与当前日期最近的
        oi_vals = []
        for h in oi_hist:
            ts = h.get('timestamp')
            v = h.get('sumOpenInterestValue')
            if ts and v:
                oi_vals.append((ts, float(v)))
        oi_vals.sort()
        # 当前日期的 OI = 不超过 klines[i] 时间戳的最后一个
        cur_ts = klines[i][0]
        past = [v for ts, v in oi_vals if ts <= cur_ts]
        if len(past) >= 2:
            r['oi_surge'] = (past[-1] / past[-2] - 1) * 100

    # ── 1. 下跌洗盘 ──
    if len(closes) >= 21:
        rets20 = [closes[j] / closes[j-1] - 1 for j in range(max(1, len(closes)-20), len(closes))]
        down_days = sum(1 for x in rets20 if x < 0)
        ret20 = cur / closes[-21] - 1
        turn5 = sum(vols[-5:]) / 5
        turn_max = max(vols[-60:]) if len(vols) >= 60 else max(vols)
        shrink = turn5 / turn_max if turn_max > 0 else 1
        low10 = min(lows[-10:])
        steady = cur > low10 * 1.02
        mn20, mx20 = min(closes[-20:]), max(closes[-20:])
        r['horizontal'] = (mx20 - mn20) / mn20 < 0.30 if mn20 > 0 else False
        if down_days >= 12 and -0.40 <= ret20 <= -0.05 and shrink < 0.30 and steady:
            r['down_wash'] = True
            r['down_wash_score'] = 1 + (1 if down_days >= 15 else 0) + (1 if shrink < 0.15 else 0) + (1 if ret20 <= -0.15 else 0)

    # ── 2. SM 代理 ──
    if len(takers) >= 25 and all(b > 0 for b in bases[-25:]):
        r5 = sum(takers[-5:]) / sum(bases[-5:])
        r20 = sum(takers[-20:]) / sum(bases[-20:])
        r['taker5'] = r5
        score = 0
        if r5 > r20 + 0.02: score += 1
        elif r5 < r20 - 0.02: score -= 1
        if r['oi_surge'] is not None:
            if r['oi_surge'] > 2: score += 1
            elif r['oi_surge'] < -2: score -= 1
        r['sm_flow'] = score

    # ── 3. 套牢盘密度 ──
    if oi_hist and len(closes) >= 20:
        past_oi = [v for ts, v in sorted((h.get('timestamp'), float(h.get('sumOpenInterestValue', 0))) for h in oi_hist if h.get('timestamp')) if ts <= klines[i][0]]
        if len(past_oi) >= 15:
            prices = closes[-20:]
            lo, hi = min(prices), max(prices)
            if hi > lo:
                n = min(len(past_oi), len(prices))
                buckets = [0.0] * 5
                for k2 in range(n):
                    p = prices[k2]
                    idx = min(4, int((p - lo) / (hi - lo) * 5))
                    buckets[idx] += past_oi[k2]
                total = sum(buckets)
                if total > 0 and max(buckets) / total > 0.5:
                    r['trapped_dense'] = True

    # ── 4. 画门 ──
    if len(closes) >= 30:
        n = len(highs)
        test_count = 0
        extremes = []
        for k2 in range(max(2, n - 30), n - 2):
            if highs[k2] >= max(highs[k2-2:k2+3]) and highs[k2] > 0:
                extremes.append(('H', k2, highs[k2]))
            if lows[k2] <= min(lows[k2-2:k2+3]) and lows[k2] > 0:
                extremes.append(('L', k2, lows[k2]))
        for typ, k2, p in extremes:
            touches = 0
            recent_touch = False
            for j in range(k2 + 1, n):
                hit = abs(highs[j] - p) / p < 0.01 if typ == 'H' else abs(lows[j] - p) / p < 0.01
                if hit:
                    touches += 1
                    if j >= n - 3:
                        recent_touch = True
            if touches >= 4 and recent_touch:
                test_count += 1
                break
        if r.get('oi_surge') is not None:
            oi_now = None
            for h in oi_hist:
                if h.get('timestamp') and h.get('timestamp') <= klines[i][0]:
                    oi_now = float(h.get('sumOpenInterestValue', 0))
            if oi_now is None or oi_now <= 50e6:
                r['liquidity_test'] = test_count > 0

    # ── 5. 多空双开 ──
    if r['oi_surge'] is not None and r['oi_surge'] > 5 and len(closes) >= 10:
        mn10, mx10 = min(closes[-10:]), max(closes[-10:])
        range10 = (mx10 - mn10) / mn10 if mn10 > 0 else 1
        if range10 < 0.05 and r['taker5'] is not None and 0.45 <= r['taker5'] <= 0.55:
            r['dual_open'] = True

    return r


# ── 回测主流程 ──────────────────────────────────────
def run_backtest():
    data = load()
    syms = data['syms']
    klines_map = data['klines_100d']
    oi_map = data['oiHist_31d']

    # 确定回测窗口（留 30 天因子 + 10 天 fwd）
    all_dates = []
    for sym in syms[:5]:
        kl = klines_map.get(sym)
        if kl:
            all_dates = [x[0] for x in kl]
            break
    total_days = len(all_dates)
    start_i = 30          # 因子最少需要 30 天
    end_i = total_days - 11  # 留 10 天 fwd
    print(f'回测窗口: {start_i} ~ {end_i} (共 {end_i - start_i + 1} 天)，数据 {len(all_dates)} 天')

    factors = ['down_wash', 'horizontal', 'sm_flow_pos', 'sm_flow_neg', 'liquidity_test', 'dual_open', 'trapped_dense']
    # 每个因子: {hit: [fwd3, fwd5, fwd10], ...}
    results = {f: {'hits': [], 'fwd3': [], 'fwd5': [], 'fwd10': [], 'n': 0} for f in factors}
    baseline = {'fwd3': [], 'fwd5': [], 'fwd10': [], 'n': 0}
    daily_events = {f: [] for f in factors}  # 每日命中数

    for i in range(start_i, end_i + 1):
        # 全市场基准
        market_ret3, market_ret5, market_ret10 = [], [], []
        # 各因子命中
        hit_sets = {f: [] for f in factors}
        for sym in syms:
            kl = klines_map.get(sym)
            if not kl or i + 10 >= len(kl):
                continue
            closes = [float(x[4]) for x in kl]
            c0 = closes[i]
            if c0 <= 0:
                continue
            r3 = closes[i+3] / c0 - 1 if i + 3 < len(closes) else None
            r5 = closes[i+5] / c0 - 1 if i + 5 < len(closes) else None
            r10 = closes[i+10] / c0 - 1 if i + 10 < len(closes) else None
            if r3 is not None:
                market_ret3.append(r3)
                baseline['fwd3'].append(r3)
            if r5 is not None:
                market_ret5.append(r5)
                baseline['fwd5'].append(r5)
            if r10 is not None:
                market_ret10.append(r10)
                baseline['fwd10'].append(r10)

            fac = compute_factors(sym, kl, oi_map.get(sym), i)
            if not fac:
                continue
            # 因子命中（SM 分正负）
            if fac['down_wash']:
                hit_sets['down_wash'].append((r3, r5, r10))
            if fac['horizontal']:
                hit_sets['horizontal'].append((r3, r5, r10))
            if fac['sm_flow'] > 0:
                hit_sets['sm_flow_pos'].append((r3, r5, r10))
            if fac['sm_flow'] < 0:
                hit_sets['sm_flow_neg'].append((r3, r5, r10))
            if fac['liquidity_test']:
                hit_sets['liquidity_test'].append((r3, r5, r10))
            if fac['dual_open']:
                hit_sets['dual_open'].append((r3, r5, r10))
            if fac['trapped_dense']:
                hit_sets['trapped_dense'].append((r3, r5, r10))

        for f in factors:
            for r3, r5, r10 in hit_sets[f]:
                if r3 is not None: results[f]['fwd3'].append(r3)
                if r5 is not None: results[f]['fwd5'].append(r5)
                if r10 is not None: results[f]['fwd10'].append(r10)
                results[f]['n'] += 1
            daily_events[f].append(len(hit_sets[f]))

    # 输出汇总
    print()
    print(f'{"因子":20s} {"n":>6s} {"fwd3":>8s} {"fwd5":>8s} {"fwd10":>8s} {"胜率5":>7s} {"<-10%5":>8s}')
    print('-' * 70)
    print(f'{"全市场基准":20s} {baseline["n"]:6d} {avg(baseline["fwd3"]):8.3f} {avg(baseline["fwd5"]):8.3f} {avg(baseline["fwd10"]):8.3f} {winrate(baseline["fwd5"]):7.1f} {drawdown10(baseline["fwd5"]):8.1f}')
    for f in factors:
        res = results[f]
        if res['n'] == 0:
            print(f'{f:20s} {"0":>6s}')
            continue
        print(f'{f:20s} {res["n"]:6d} {avg(res["fwd3"]):8.3f} {avg(res["fwd5"]):8.3f} {avg(res["fwd10"]):8.3f} {winrate(res["fwd5"]):7.1f} {drawdown10(res["fwd5"]):8.1f}')

    # 保存
    out = {
        'baseline': {k: avg(v) for k, v in baseline.items() if k != 'n'},
        'factors': {},
        'daily_events': daily_events,
    }
    for f in factors:
        res = results[f]
        out['factors'][f] = {
            'n': res['n'],
            'fwd3': avg(res['fwd3']),
            'fwd5': avg(res['fwd5']),
            'fwd10': avg(res['fwd10']),
            'winrate5': winrate(res['fwd5']),
            'dn10_5': drawdown10(res['fwd5']),
        }
    with open(os.path.join(BASE_DIR, 'newfactors_backtest_result.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print()
    print('已保存 newfactors_backtest_result.json')


def avg(xs):
    return sum(xs) / len(xs) if xs else 0.0


def winrate(xs):
    return sum(1 for x in xs if x > 0) / len(xs) * 100 if xs else 0.0


def drawdown10(xs):
    return sum(1 for x in xs if x < -0.10) / len(xs) * 100 if xs else 0.0


if __name__ == '__main__':
    run_backtest()

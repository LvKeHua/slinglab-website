# -*- coding: utf-8 -*-
"""
新因子 Demo 本地服务器
======================
基于 backtest_binance_30d.json（530 币 × 100 天日线含 taker + 31 天 OI 历史），
计算 6 个新优化点：

  1. 下跌洗盘识别（阴跌+缩量+企稳，与横盘吸筹并行）
  2. Smart Money 代理因子（taker buy 失衡趋势 + OI 变化）
  3. 套牢盘密度区（OI × 价格区间估算筹码堆积）
  4. 收线窗口（4h/日线收线前 30 分钟 = 庄家启动窗口）
  5. 画门/流动性测试（同价位 3+ 次触及未破）
  6. 多空双开识别（OI 激增 + 价格横盘 + taker≈0.5）

用法:  python serve_demo2.py [端口]  （默认 8766）
      浏览器打开 http://127.0.0.1:8766/
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'backtest_binance_30d.json')


def load_data():
    with open(DATA_PATH, encoding='utf-8') as f:
        return json.load(f)


# ── 因子计算 ──────────────────────────────────────────────
def analyze_symbol(sym, klines, oi_hist):
    """返回 6 个优化点的计算结构。"""
    closes = [float(x[4]) for x in klines]
    highs = [float(x[2]) for x in klines]
    lows = [float(x[3]) for x in klines]
    vols = [float(x[7]) for x in klines]       # quoteVolume
    takers = [float(x[9]) for x in klines]     # takerBuyBase
    bases = [float(x[5]) for x in klines]      # volume(base)
    cur = closes[-1]

    r = {
        'symbol': sym,
        'base_asset': sym.replace('USDT', ''),
        'price': cur,
        'oi_value': None,
        'taker_ratio_5d': None,
        'taker_ratio_20d': None,
        'sm_flow': None,          # 聪明钱流入分 -2~+2
        'down_wash': False,       # 下跌洗盘
        'down_wash_score': 0,
        'horizontal': False,      # 横盘吸筹（现有硬门槛）
        'trapped_zone': None,     # 套牢盘区间 [low, high]（OI 密度最大区）
        'trapped_oi_ratio': None, # 套牢区 OI / 当前 OI
        'liquidity_test': False,  # 画门/流动性测试
        'test_count': 0,
        'dual_open': False,       # 多空双开
        'oi_surge': None,         # OI 24h 变化 %
        'close_window_4h': None,  # 距 4h 收线分钟数（模拟）
        'close_window_1d': None,
        'score': 0,
        'tags': [],
    }

    # OI
    if oi_hist:
        oi_vals = [h.get('sumOpenInterestValue') for h in oi_hist if h.get('sumOpenInterestValue')]
        oi_vals = [float(v) for v in oi_vals]
        if oi_vals:
            r['oi_value'] = oi_vals[-1]
            if len(oi_vals) >= 2 and oi_vals[-2] > 0:
                r['oi_surge'] = round((oi_vals[-1] / oi_vals[-2] - 1) * 100, 2)

    # ── 1. 下跌洗盘：阴跌 + 缩量 + 底部企稳 ──
    if len(closes) >= 20:
        # 阴跌：近20日跌多涨少 + 累计跌幅在 -5%~-40%
        rets20 = [closes[i] / closes[i-1] - 1 for i in range(max(1, len(closes)-20), len(closes))]
        down_days = sum(1 for x in rets20 if x < 0)
        ret20 = cur / closes[-21] - 1 if len(closes) > 21 else 0
        # 缩量：近5日均额 / 60日峰额
        turn5 = sum(vols[-5:]) / 5
        turn_max = max(vols[-60:]) if len(vols) >= 60 else max(vols)
        shrink = turn5 / turn_max if turn_max > 0 else 1
        # 企稳：收盘 > 近10日低点 ×1.02
        low10 = min(lows[-10:])
        steady = cur > low10 * 1.02
        # 横盘（现有 H2）：近20日区间 <30%
        mn20, mx20 = min(closes[-20:]), max(closes[-20:])
        horizontal = (mx20 - mn20) / mn20 < 0.30

        r['horizontal'] = horizontal
        if down_days >= 12 and -0.40 <= ret20 <= -0.05 and shrink < 0.30 and steady:
            r['down_wash'] = True
            r['down_wash_score'] = 1 + (1 if down_days >= 15 else 0) + (1 if shrink < 0.15 else 0) + (1 if ret20 <= -0.15 else 0)

    # ── 2. Smart Money 代理：taker 失衡趋势 ──
    if len(takers) >= 25 and all(b > 0 for b in bases[-25:]):
        r5 = sum(takers[-5:]) / sum(bases[-5:])
        r20 = sum(takers[-20:]) / sum(bases[-20:])
        r['taker_ratio_5d'] = round(r5, 3)
        r['taker_ratio_20d'] = round(r20, 3)
        # 聪明钱流入 = taker 抬升 + OI 增长
        score = 0
        if r5 > r20 + 0.02: score += 1
        elif r5 < r20 - 0.02: score -= 1
        if r['oi_surge'] is not None:
            if r['oi_surge'] > 2: score += 1
            elif r['oi_surge'] < -2: score -= 1
        r['sm_flow'] = score

    # ── 3. 套牢盘密度区：OI 历史 × 价格分布 ──
    if oi_hist and len(oi_hist) >= 15 and len(closes) >= 20:
        # 用 OI 历史中值价格估算筹码分布（简化：近20日价格区间分5档，OI 加权）
        oi_vals = [float(h.get('sumOpenInterestValue', 0)) for h in oi_hist]
        prices = closes[-20:]
        lo, hi = min(prices), max(prices)
        if hi > lo:
            # 每档的 OI 密度（用 OI 序列按时间对齐价格）
            n = min(len(oi_vals), len(prices))
            buckets = [0.0] * 5
            for i in range(n):
                p = prices[i]
                idx = min(4, int((p - lo) / (hi - lo) * 5))
                buckets[idx] += oi_vals[i]
            max_idx = max(range(5), key=lambda i: buckets[i])
            zone_lo = lo + (hi - lo) * max_idx / 5
            zone_hi = lo + (hi - lo) * (max_idx + 1) / 5
            r['trapped_zone'] = [round(zone_lo, 8), round(zone_hi, 8)]
            total = sum(buckets)
            r['trapped_oi_ratio'] = round(buckets[max_idx] / total, 2) if total > 0 else None

    # ── 5. 画门/流动性测试：局部极值被反复触及（±1%），近3日活跃，OI<50M ──
    # 诚实标注：画门本质是分钟级行为，日线只能捕获粗糙近似
    if len(closes) >= 30:
        test_count = 0
        n = len(highs)
        extremes = []
        for i in range(max(2, n - 30), n - 2):
            if highs[i] >= max(highs[i-2:i+3]) and highs[i] > 0:
                extremes.append(('H', i, highs[i]))
            if lows[i] <= min(lows[i-2:i+3]) and lows[i] > 0:
                extremes.append(('L', i, lows[i]))
        for typ, i, p in extremes:
            touches = 0
            recent_touch = False
            for j in range(i + 1, n):
                if typ == 'H':
                    hit = abs(highs[j] - p) / p < 0.01
                else:
                    hit = abs(lows[j] - p) / p < 0.01
                if hit:
                    touches += 1
                    if j >= n - 3:
                        recent_touch = True
            if touches >= 4 and recent_touch:
                test_count += 1
                break
        # 画门只对小币有意义（OI < 50M），大币天然波动大不标记
        if r['oi_value'] is not None and r['oi_value'] > 50e6:
            r['liquidity_test'] = False
            r['test_count'] = 0
        else:
            r['liquidity_test'] = test_count > 0
            r['test_count'] = test_count

    # ── 6. 多空双开：OI 激增 + 价格横盘 + taker≈0.5 ──
    if r['oi_surge'] is not None and r['oi_surge'] > 5 and len(closes) >= 10:
        mn10, mx10 = min(closes[-10:]), max(closes[-10:])
        range10 = (mx10 - mn10) / mn10 if mn10 > 0 else 1
        if range10 < 0.05 and r['taker_ratio_5d'] is not None and 0.45 <= r['taker_ratio_5d'] <= 0.55:
            r['dual_open'] = True

    # ── 4. 收线窗口：距 4h/日线收线分钟数（模拟最后K线时间）──
    last_ts = klines[-1][0]
    # 日线收线 = 当天 24:00；4h 收线 = 最近一个 4h 边界
    import datetime
    dt = datetime.datetime.utcfromtimestamp(last_ts / 1000)
    # 模拟：最后K线是日线，距收线 = 1天（实际应为当前时间，demo 用静态值展示机制）
    r['close_window_1d'] = '收线窗口机制（需实时时钟）'
    r['close_window_4h'] = '收线窗口机制（需实时时钟）'

    # 综合分：基础 + 各因子
    s = 0
    if r['down_wash']: s += r['down_wash_score']
    if r['horizontal']: s += 1
    if r['sm_flow'] is not None: s += max(r['sm_flow'], 0)
    if r['liquidity_test']: s += 1
    if r['dual_open']: s += 1
    r['score'] = s

    # 标签
    if r['down_wash']: r['tags'].append('📉下跌洗盘')
    if r['horizontal']: r['tags'].append('⬅️横盘吸筹')
    if r['sm_flow'] == 2: r['tags'].append('🧠SM流入强')
    elif r['sm_flow'] == 1: r['tags'].append('🧠SM流入')
    elif r['sm_flow'] == -2: r['tags'].append('🧠SM流出强')
    elif r['sm_flow'] == -1: r['tags'].append('🧠SM流出')
    if r['liquidity_test']: r['tags'].append('🎯流动性测试')
    if r['dual_open']: r['tags'].append('🔀多空双开')
    if r['trapped_oi_ratio'] is not None and r['trapped_oi_ratio'] > 0.5:
        r['tags'].append('🧱套牢盘密')
    return r


def build_payload(data):
    syms = data['syms']
    klines_map = data['klines_100d']
    oi_map = data['oiHist_31d']
    rows = []
    for sym in syms:
        klines = klines_map.get(sym)
        oi_hist = oi_map.get(sym)
        if not klines or len(klines) < 30:
            continue
        rows.append(analyze_symbol(sym, klines, oi_hist))
    # 统计
    stats = {
        'total': len(rows),
        'down_wash': sum(1 for r in rows if r['down_wash']),
        'sm_inflow': sum(1 for r in rows if r['sm_flow'] is not None and r['sm_flow'] > 0),
        'liquidity_test': sum(1 for r in rows if r['liquidity_test']),
        'dual_open': sum(1 for r in rows if r['dual_open']),
        'trapped_dense': sum(1 for r in rows if r['trapped_oi_ratio'] is not None and r['trapped_oi_ratio'] > 0.5),
    }
    return {'data': rows, 'stats': stats, 'updated': 'backtest_binance_30d.json 快照 (2026-08-06)'}


DATA = None


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        global DATA
        if DATA is None:
            DATA = build_payload(load_data())
        if self.path == '/api/newfactors':
            body = json.dumps(DATA, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path in ('/', '/index.html'):
            html_path = os.path.join(BASE_DIR, 'demo_newfactors.html')
            with open(html_path, 'rb') as f:
                body = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    srv = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print(f'新因子 Demo: http://127.0.0.1:{port}/')
    srv.serve_forever()

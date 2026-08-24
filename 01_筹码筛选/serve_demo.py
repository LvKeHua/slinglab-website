# -*- coding: utf-8 -*-
"""
前导筛选器 Demo 本地服务器
==========================
复用 backtest_binance_30d.json（530 币 × 100 天日线 + 31 天 OI + 资费快照），
按 relay.mjs 的 computeForwardScore 逻辑计算吸筹候选，提供：

  GET /              → demo_forward.html（前端）
  GET /api/forward   → { data: [...], env: {up, close, sma20}, updated }

BTC 价格只做环境对照（env 字段），不参与评分/筛选 —— 纯小币维度。

用法:  python serve_demo.py [端口]   （默认 8765）
      浏览器打开 http://127.0.0.1:8765/
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'backtest_binance_30d.json')

# ── 数据加载 ──────────────────────────────────────────────
def load_data():
    with open(DATA_PATH, encoding='utf-8') as f:
        d = json.load(f)
    return d

# ── 因子计算（对齐 relay.mjs）─────────────────────────────
def compute_factors(sym, klines, oi_hist, premium):
    """返回与 relay.mjs 前导模块同构的因子字典。"""
    closes = [float(x[4]) for x in klines]
    turns = [float(x[7]) for x in klines]  # quoteVolume
    cur = closes[-1]

    f = {
        'symbol': sym,
        'base_asset': sym.replace('USDT', ''),
        'price': cur,
        'change_24h_pct': round((closes[-1] / closes[-2] - 1) * 100, 2) if len(closes) >= 2 else None,
        'volume_24h_usdt': turns[-1],
        'oi_value': None,
        'volume_oi_ratio': None,
        'funding_rate_pct': premium.get(sym),
        'oi_pctile_30d': None,   # 展示用，不参与评分
        'drawdown_60d': None,
        'range_20d': None,
        'vol_shrink_20d': None,
        'near_low_20d': None,
        'big_move_5d': None,
        'vol_compress_5d': None,
        'ret_10d': None,
        'breakout_consolidation': False,
        'spring_test': False,
        'days_since_listing': None,
        'forward_score': None,
        'signal': None,
    }

    # OI 现值 = 31 天 OI 历史最后一天（USD 值，API 返回字符串）
    if oi_hist:
        oi_usd = [float(h.get('sumOpenInterestValue')) for h in oi_hist if h.get('sumOpenInterestValue')]
        if oi_usd:
            f['oi_value'] = oi_usd[-1]
            if len(oi_usd) >= 10:
                f['oi_pctile_30d'] = round(sum(1 for v in oi_usd if v <= oi_usd[-1]) / len(oi_usd), 4)
    if f['oi_value']:
        f['volume_oi_ratio'] = round(turns[-1] / f['oi_value'], 4)

    # 上线天数近似：klines 不足 100 根 = 上线不足 100 天
    if len(klines) < 100:
        f['days_since_listing'] = 100 - len(klines)

    if len(closes) >= 20:
        hi60 = max(closes[-60:])
        f['drawdown_60d'] = round(1 - cur / hi60, 4) if hi60 > 0 else None
        win20 = closes[-20:]
        mn, mx = min(win20), max(win20)
        f['range_20d'] = round((mx - mn) / mn, 4) if mn > 0 else None
        f['near_low_20d'] = round(cur / mn, 4) if mn > 0 else None
        turn_max = max(turns[-60:])
        turn5 = sum(turns[-5:]) / 5
        f['vol_shrink_20d'] = round(turn5 / turn_max, 4) if turn_max > 0 else None
        dayrets = [closes[i] / closes[i - 1] - 1 for i in range(max(1, len(closes) - 6), len(closes))]
        f['big_move_5d'] = any(abs(x) > 0.15 for x in dayrets[-5:])
        amps = [(float(x[2]) - float(x[3])) / float(x[4]) for x in klines[-5:]]
        f['vol_compress_5d'] = round(sum(amps) / len(amps), 4)
        if len(closes) > 11:
            f['ret_10d'] = round(cur / closes[-11] - 1, 4)

        # 大阳线后盘整：60d 内单日涨幅≥15%，其后 20d 高点 ≤ 大阳线高点×1.15
        for i in range(max(1, len(closes) - 60), len(closes) - 5):
            if closes[i] / closes[i - 1] - 1 >= 0.15:
                future_high = max(closes[i:i + 20])
                candle_high = float(klines[i][2])
                if future_high <= candle_high * 1.15:
                    f['breakout_consolidation'] = True
                    break

        # Spring 测试：60d 内跌破前 20d 低点×0.92，5d 内收回
        for i in range(max(2, len(closes) - 60), len(closes) - 5):
            prior_low = min(closes[max(0, i - 20):i])
            if prior_low > 0 and closes[i] <= prior_low * 0.92:
                if max(closes[i:i + 6]) >= prior_low:
                    f['spring_test'] = True
                    break
    return f


def compute_forward_score(f):
    """与 relay.mjs computeForwardScore 完全一致。"""
    acc_structure = (
        f['drawdown_60d'] is not None and f['drawdown_60d'] >= 0.40 and
        f['range_20d'] is not None and f['range_20d'] < 0.30 and
        f['vol_shrink_20d'] is not None and f['vol_shrink_20d'] < 0.20 and
        f['near_low_20d'] is not None and f['near_low_20d'] > 1.03 and
        f['big_move_5d'] is not None and not f['big_move_5d']
    )
    if not acc_structure:
        return -3 if (f['volume_oi_ratio'] or 0) >= 5 else 0
    s = 3
    if f['drawdown_60d'] >= 0.60: s += 1
    if f['range_20d'] < 0.20: s += 1
    if f['vol_shrink_20d'] < 0.10: s += 1
    if f['vol_compress_5d'] is not None and f['vol_compress_5d'] < 0.08: s += 1
    if f['oi_value'] is not None:
        if 2e6 <= f['oi_value'] < 8e6: s += 2
        elif 8e6 <= f['oi_value'] < 30e6: s += 1
    if f['breakout_consolidation']: s += 1
    if f['ret_10d'] is not None and -0.05 <= f['ret_10d'] <= 0.15: s += 1
    if f['spring_test']: s += 1
    if f['funding_rate_pct'] is not None:
        if f['funding_rate_pct'] > 0.05: s += 1
        elif f['funding_rate_pct'] < -0.05 and (f['change_24h_pct'] or 0) > 0: s -= 3
    if f['days_since_listing'] is not None and f['days_since_listing'] <= 180: s += 1
    if (f['volume_oi_ratio'] or 0) >= 5: s -= 3
    return s


def classify(f):
    if f['forward_score'] >= 4:
        return 'acc_candidate'
    if (f['volume_oi_ratio'] or 0) >= 5:
        return 'avoid_event'
    if f['forward_score'] > 0:
        return 'watch'
    return 'noise'


def build_payload(data):
    syms = data['syms']
    klines_map = data['klines_100d']
    oi_map = data['oiHist_31d']
    premium = data['premium']

    payload = []
    for sym in syms:
        klines = klines_map.get(sym)
        oi_hist = oi_map.get(sym)
        if not klines or len(klines) < 20:
            continue
        f = compute_factors(sym, klines, oi_hist, premium)
        f['forward_score'] = compute_forward_score(f)
        f['signal'] = classify(f)
        payload.append(f)

    # BTC 环境对照（仅展示，不参与评分/筛选）
    btc = klines_map.get('BTCUSDT')
    env = {'up': None, 'close': None, 'sma20': None}
    if btc:
        closes = [float(x[4]) for x in btc]
        sma20 = sum(closes[-20:]) / 20
        env = {'up': closes[-1] > sma20, 'close': closes[-1], 'sma20': sma20}

    return {'data': payload, 'env': env, 'updated': '2026-08-06 (backtest_binance_30d.json 快照)'}


# ── HTTP 服务 ─────────────────────────────────────────────
DATA = None

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        global DATA
        if DATA is None:
            DATA = build_payload(load_data())
        if self.path == '/api/forward':
            body = json.dumps(DATA, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path in ('/', '/index.html'):
            html_path = os.path.join(BASE_DIR, 'demo_forward.html')
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
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    srv = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print(f'前导筛选器 Demo: http://127.0.0.1:{port}/')
    srv.serve_forever()

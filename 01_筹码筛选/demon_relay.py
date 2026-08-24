#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
妖币扫描器 数据中继 (demon_relay.py)
=====================================
从币安合约 API 抓取 24hr 行情 + 每币 OI（持仓量），计算核心指标：
  - oi_value        = OI数量 × 价格（OI 价值, USD）
  - volume_oi_ratio = 24h成交额 / OI价值（额/OI比 = 挤压空间）

然后 POST 到线上 Worker `/api/relay-demon`，数据落入 KV，由
https://app.slinglab.xyz/screener/ 的「妖币扫描」Tab 展示。

用法:
  python demon_relay.py            # 单次抓取并推送
  python demon_relay.py --loop 5   # 每5分钟循环一次

环境变量:
  DEMON_RELAY_KEY  推送鉴权 Key（默认内置，与 Worker secret 一致）
  WORKER_URL       推送地址（默认 https://app.slinglab.xyz/screener/api/relay-demon）
  PROXY            可选代理（如 http://127.0.0.1:7897），直连失败时兜底
"""
import argparse
import concurrent.futures as cf
import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FAPI = "https://fapi.binance.com"
MIN_VOLUME = 300_000        # 只对 24h 成交额 >= $300k 的币抓 OI（控制请求数）
MAX_OI_SYMBOLS = 300        # 最多抓取 OI 的合约数（按成交额取前 N）
OI_WORKERS = 20             # OI 并发线程数
TIMEOUT = 20


def build_opener(proxy=None):
    if proxy:
        return urllib.request.build_opener(
            urllib.request.ProxyHandler({"https": proxy, "http": proxy})
        )
    return urllib.request.build_opener()


def fetch_json(url, opener, timeout=TIMEOUT):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 demon-relay/1.0"})
    with opener.open(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def fetch_binance_tickers():
    """直连优先，代理兜底。返回 ticker 列表。"""
    direct = build_opener()
    try:
        return fetch_json(FAPI + "/fapi/v1/ticker/24hr", direct)
    except Exception as e1:
        print(f"[WARN] 直连 fapi.binance.com 失败: {e1}")
        proxy = os.environ.get("PROXY") or "http://127.0.0.1:7897"
        try:
            return fetch_json(FAPI + "/fapi/v1/ticker/24hr", build_opener(proxy))
        except Exception as e2:
            raise RuntimeError(f"直连与代理均失败: {e2}")


def fetch_oi(symbol, opener):
    try:
        d = fetch_json(FAPI + "/fapi/v1/openInterest?symbol=" + symbol, opener)
        return symbol, float(d.get("openInterest") or 0)
    except Exception:
        return symbol, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--loop", type=int, default=0, help="循环间隔分钟（0=单次）")
    ap.add_argument("--min-vol", type=float, default=MIN_VOLUME, help="OI 抓取最低成交额")
    ap.add_argument("--max-symbols", type=int, default=MAX_OI_SYMBOLS)
    args = ap.parse_args()

    key = os.environ.get("DEMON_RELAY_KEY", "0eb3f463c85e160bbedbec6b3131bb862bdd0c82ccf9f390")
    url = os.environ.get("WORKER_URL", "https://app.slinglab.xyz/screener/api/relay-demon")

    while True:
        try:
            run_once(args, key, url)
        except Exception as e:
            print(f"[ERROR] {e}")
        if args.loop <= 0:
            break
        print(f"[SLEEP] {args.loop} 分钟后再次抓取...")
        time.sleep(args.loop * 60)


def run_once(args, key, url):
    t0 = time.time()
    print(f"[{datetime.now(timezone.utc).isoformat()[:19]}] 抓取币安合约 24hr 行情...")
    tickers = fetch_binance_tickers()
    print(f"  共 {len(tickers)} 条 ticker")

    # 过滤 USDT 永续 + 有有效价格
    rows = []
    for t in tickers:
        if not t.get("symbol", "").endswith("USDT"):
            continue
        try:
            price = float(t["lastPrice"])
            vol = float(t.get("quoteVolume") or 0)
            chg = float(t.get("priceChangePercent") or 0)
            high = float(t.get("highPrice") or 0)
            low = float(t.get("lowPrice") or 0)
        except (ValueError, KeyError):
            continue
        if price <= 0:
            continue
        amp = round(((high - low) / price) * 100, 2) if high > 0 and low > 0 else 0.0
        rows.append({
            "symbol": t["symbol"],
            "base_asset": t["symbol"][:-4],
            "price": price,
            "change_24h_pct": round(chg, 2),
            "amplitude_24h_pct": amp,
            "volume_24h_usdt": vol,
            "trade_count": int(t.get("count") or 0),
        })

    # 按成交额排序取前 N，抓 OI
    rows.sort(key=lambda r: r["volume_24h_usdt"], reverse=True)
    oi_candidates = [r for r in rows if r["volume_24h_usdt"] >= args.min_vol][: args.max_symbols]
    print(f"  需要抓取 OI 的合约: {len(oi_candidates)} 个 (成交额 >= ${args.min_vol/1e6:.1f}M)")

    opener = build_opener()
    oi_map = {}
    with cf.ThreadPoolExecutor(max_workers=OI_WORKERS) as pool:
        futs = {pool.submit(fetch_oi, r["symbol"], opener): r["symbol"] for r in oi_candidates}
        done = 0
        for fut in cf.as_completed(futs):
            sym, oi = fut.result()
            if oi is not None:
                oi_map[sym] = oi
            done += 1
            if done % 50 == 0:
                print(f"  OI 进度 {done}/{len(oi_candidates)}")
    print(f"  OI 获取成功 {len(oi_map)}/{len(oi_candidates)}")

    # 计算指标
    payload = []
    for r in rows:
        oi = oi_map.get(r["symbol"])
        if oi is None:
            continue
        oi_value = oi * r["price"]
        ratio = (r["volume_24h_usdt"] / oi_value) if oi_value > 0 else 0.0
        payload.append({
            "symbol": r["symbol"],
            "base_asset": r["base_asset"],
            "price": r["price"],
            "change_24h_pct": r["change_24h_pct"],
            "amplitude_24h_pct": r["amplitude_24h_pct"],
            "volume_24h_usdt": r["volume_24h_usdt"],
            "trade_count": r["trade_count"],
            "oi_value": round(oi_value, 2),
            "oi_contracts": oi,
            "volume_oi_ratio": round(ratio, 4),
        })

    total_vol = sum(r["volume_24h_usdt"] for r in payload)
    squeeze = sum(1 for r in payload if r["volume_oi_ratio"] > 10)
    print(f"  产出 {len(payload)} 个合约 · 24h总成交额 ${total_vol/1e9:.2f}B · 额/OI>10x: {squeeze} 个")

    # 本地备份
    backup = os.path.join(BASE_DIR, "demon_latest.json")
    with open(backup, "w", encoding="utf-8") as f:
        json.dump({"updated": datetime.now(timezone.utc).isoformat(), "data": payload}, f, ensure_ascii=False)
    print(f"  备份已存: {backup}")

    # 推送
    body = json.dumps({"data": payload}).encode()
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Content-Type": "application/json",
        "X-Auth-Key": key,
        "User-Agent": "Mozilla/5.0 demon-relay/1.0",
    })
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            resp = json.loads(r.read().decode())
            print(f"[OK] 推送成功: {resp} (耗时 {time.time()-t0:.1f}s)")
    except urllib.error.HTTPError as e:
        print(f"[FAIL] HTTP {e.code}: {e.read().decode()[:300]}")
        sys.exit(1)
    except Exception as e:
        print(f"[FAIL] 推送异常: {e}")
        # 尝试走代理
        proxy = os.environ.get("PROXY") or "http://127.0.0.1:7897"
        try:
            opener = build_opener(proxy)
            with opener.open(req, timeout=40) as r:
                resp = json.loads(r.read().decode())
                print(f"[OK] 推送成功(代理): {resp}")
        except Exception as e2:
            print(f"[FAIL] 代理推送也失败: {e2}")
            sys.exit(1)


if __name__ == "__main__":
    main()

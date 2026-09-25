"""
Screener external standby — 筛币器外部待机抓取

调用点：reporter.push_to_kv() 末尾（collect.yml 的「Push to Cloudflare KV」步骤，
该步骤注入 CF_API_TOKEN，是本仓库唯一具备直写 KV 凭据之处）。

## 它补的缺口

美国 VPS 上的 guard.sh 已有三级自愈（L1 本地补跑 / L2 触发 GA relay / L3 告警），
但 L1 与 L2 的判定与执行**都跑在那台机器上**。该机器整机下线时，自愈能力随之消失。
本模块从 GitHub Actions（独立基础设施）观测并接管，是该场景下的唯一外部兜底。

（2026-09-24 日本抓取节点 23.27.52.165 整机失联、管道静默停摆 24 小时，即此类事故。
 现抓取已迁至美国 VPS，guard.sh 的 L1/L2 因此重新可用。）

## 两条恢复路径

① 首选：触发 tokenomics-screener/relay.yml（即 relay.mjs 全量管线）。
   保真度最高——可恢复 forward_data（需 100 天日线）与 oi_stage（需 OI 历史）。
   需 SCREENER_RELAY_TOKEN（fine-grained PAT，Actions: write）；未配置则跳过。

② 兜底：本模块自抓自算并直写 KV。用于 relay 无法触达或超时未恢复时。

## 兜底路径的口径（与 relay.mjs 严格对齐）

- 交易量 = Binance + OKX 之和（bybit 对美 IP 403，relay 日志亦为 2 source(s)）
- OI 现值 = Binance OI×价格 + OKX 币数 OI×Binance 价格
- volume_oi_ratio = 聚合量 / 聚合 OI   ← 核心筛选指标，口径错则结论错
- 取数顺序与行集合与 relay 一致：按 Binance 成交额降序，OI 缺失者跳过

## 兜底路径仍无法恢复的字段（沿用上一份快照或置 null，绝不伪造）

oi_stage / oi_stage_label（需 OI 历史）、forward_data（需 100 天日线）、
funding_rate_pct / orderbook_depth_usdt / listing_date（需额外端点）、
Coinalyze 系（long_short_ratio / liq_* / oi_24h_change_pct，需 API key）。

## 安全约束

- 写入前做三重校验：行数不缩水、核心比率与线上偏差在容差内、结构完整
- 任一校验不过即放弃写入（宁可不管，也不污染线上数据）
- 绝不抛异常影响 collect.yml 主流程
- 复用既有 CF_API_TOKEN，不新增、不硬编码任何凭据
"""

from __future__ import annotations

import concurrent.futures
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# ── 目标 ────────────────────────────────────────────────────
STATUS_URL = os.getenv(
    "SCREENER_STATUS_URL",
    "https://app.slinglab.xyz/screener/api/status?standby=1",
)
CF_API_BASE = "https://api.cloudflare.com/client/v4"
KV_NAMESPACE_ID = os.getenv("SCREENER_KV_NS", "6d56b8307fd04814892f9c2b15723c02")

# ── 抓取参数（口径对齐 relay.mjs）───────────────────────────
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)
# fapi.binance.com 对数据中心 IP 返回 451；www.binance.com/fapi 是 web 端点。
# 2026-09-25 实测 GA runner 可达（tokenomics-screener 当日 relay 日志：
# "Relay OK: binance:727, okx:477"），故沿用 relay.mjs 的域名回退策略。
BINANCE_HOSTS = ["www.binance.com", "fapi.binance.com", "fapi3.binance.com"]

HTTP_TIMEOUT = 30
OI_CONCURRENCY = 8
OI_DELAY_S = 0.12       # 每请求节流，避免触发 Binance 权重限流
OI_BUDGET_S = 150       # OI 抓取预算（实测全量 727 币约 93s）
RELAY_WAIT_S = 150      # 等待 GA relay 恢复的时限（一轮约 5 分钟，此处只等一轮的早期）

MIN_ROWS = 600          # 最小行数；线上 727 行，见 NO_DEGRADE_RATIO
# 降级保护：新快照行数不得少于线上当前快照的此比例。
# worker 的 hRCF 只校验 >=100 行，残缺快照会被当作有效数据接受并覆盖线上，
# 因此这道闸必须设在客户端。
NO_DEGRADE_RATIO = float(os.getenv("STANDBY_NO_DEGRADE_RATIO", "0.9"))
# 核心指标校验：volume_oi_ratio 与线上快照的中位偏差超过此比例即放弃写入。
# 该指标是筛选器的主信号，口径一旦错（例如只聚合了单一交易所）必须宁可不动。
RATIO_TOLERANCE = float(os.getenv("STANDBY_RATIO_TOLERANCE", "0.3"))

# 演练开关：跑完抓取、聚合与校验，但不写 KV（用于在生产环境安全验证全链路）
DRY_RUN = os.getenv("STANDBY_DRY_RUN", "") == "1"

# relay 触发路径
WORKFLOW_REPO = os.getenv("STANDBY_REPO", "LvKeHua/tokenomics-screener")
WORKFLOW_FILE = os.getenv("STANDBY_WORKFLOW", "relay.yml")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _cf_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "User-Agent": "slinglab-screener-standby"}


def _resolve_account_id(token: str) -> Optional[str]:
    """运行期解析账号 ID，避免把账号 ID 写进公开仓库。"""
    try:
        resp = requests.get(
            f"{CF_API_BASE}/accounts", headers=_cf_headers(token), timeout=30
        )
        if resp.status_code != 200:
            logger.error("cannot list CF accounts (%s)", resp.status_code)
            return None
        accounts = (resp.json() or {}).get("result") or []
        if not accounts:
            logger.error("CF token has no accessible accounts")
            return None
        return accounts[0]["id"]
    except Exception as exc:  # noqa: BLE001
        logger.error("account resolve failed: %s", exc)
        return None


def fetch_live_snapshot(endpoint: str) -> Optional[dict]:
    """
    从公开 API 读取线上快照，作为校验基准。

    直写路径本可用 KV 读同一份数据，但演练（DRY_RUN）无凭据，
    而校验恰恰是演练最该验证的环节——故提供此无需凭据的读取途径。
    """
    url = f"https://app.slinglab.xyz/screener/api/{endpoint}"
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code != 200:
            return None
        data = resp.json()
        return data if isinstance(data, dict) else None
    except Exception:  # noqa: BLE001
        return None


def _baseline(prev: Optional[dict], endpoint: str) -> Optional[dict]:
    """校验基准：优先 KV 快照，其次公开 API（演练时无 KV 凭据）。"""
    if prev and prev.get("data"):
        return prev
    return fetch_live_snapshot(endpoint)


def _kv_get(key: str, token: str, account: str) -> Optional[dict]:
    url = (
        f"{CF_API_BASE}/accounts/{account}/storage/kv/namespaces/"
        f"{KV_NAMESPACE_ID}/values/{key}"
    )
    try:
        resp = requests.get(url, headers=_cf_headers(token), timeout=30)
        if resp.status_code != 200:
            return None
        body = resp.json()
        return body if isinstance(body, dict) else None
    except Exception:  # noqa: BLE001
        return None


def _kv_put(key: str, payload: dict, token: str, account: str) -> bool:
    url = (
        f"{CF_API_BASE}/accounts/{account}/storage/kv/namespaces/"
        f"{KV_NAMESPACE_ID}/values/{key}"
    )
    body = json.dumps(payload, ensure_ascii=False)
    try:
        resp = requests.put(
            url,
            headers={**_cf_headers(token), "Content-Type": "text/plain"},
            data=body.encode(),
            timeout=45,
        )
        if resp.status_code == 200:
            print(f"[standby] KV {key} 写入成功 ({len(body)} bytes)")
            return True
        logger.error("KV %s failed: HTTP %s %s", key, resp.status_code, resp.text[:200])
    except Exception as exc:  # noqa: BLE001
        logger.error("KV %s failed: %s", key, exc)
    return False


# ── 是否该接管 ──────────────────────────────────────────────

def should_take_over() -> bool:
    """
    读筛币器状态，判断待机是否应当接管。

    只接管「本模块救得了」的过期，避免在生产做无用写入：
      - market / demon / coinfilter 过期 → 接管（tickers + OI 即可重建）
      - 仅 forward 过期 → 不接管：forward 需 100 天日线做结构评分，
        直写路径无法重建（该场景由 relay 触发路径覆盖）
      - 状态不可达 → 接管（宁可恢复一次，也不静默停摆）
    """
    try:
        resp = requests.get(STATUS_URL, timeout=25)
        if resp.status_code != 200:
            print(f"[standby] status HTTP {resp.status_code} —— 视为不可达，接管")
            return True
        payload = resp.json()
        if payload.get("stale") is False:
            print("[standby] 筛币器健康 (stale=false) —— 待机空闲")
            return False
        sources = payload.get("sources") or {}
        fixable = [
            k for k in ("market", "demon", "coinfilter")
            if (sources.get(k) or {}).get("stale")
        ]
        if not fixable:
            print("[standby] 仅不可直写修复的字段过期（如 forward）—— 不接管")
            return False
        print(f"[standby] 过期且可修复的数据源: {', '.join(fixable)}")
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"[standby] status 不可达 ({exc}) —— 接管")
        return True


# ── 抓取：Binance ───────────────────────────────────────────

def fetch_binance_tickers() -> list[dict]:
    """全市场 USDT 永续 tickers，逐域名回退（对齐 relay.mjs fetchBinance）。"""
    for host in BINANCE_HOSTS:
        try:
            resp = requests.get(
                f"https://{host}/fapi/v1/ticker/24hr",
                headers={"User-Agent": BROWSER_UA},
                timeout=HTTP_TIMEOUT,
            )
            if resp.status_code != 200:
                print(f"[standby] binance {host} HTTP {resp.status_code}")
                continue
            raw = resp.json()
        except Exception as exc:  # noqa: BLE001
            print(f"[standby] binance {host} 失败: {exc}")
            continue

        rows = []
        for t in raw:
            sym = t.get("symbol") or ""
            if not sym.endswith("USDT"):
                continue
            try:
                price = float(t["lastPrice"])
                high = float(t["highPrice"])
                low = float(t["lowPrice"])
                vol = float(t.get("quoteVolume") or 0)
                chg = float(t.get("priceChangePercent") or 0)
            except (KeyError, TypeError, ValueError):
                continue
            if price <= 0:
                continue
            rows.append({
                "symbol": sym,
                "base_asset": sym[:-4],
                "price": price,
                "change_24h_pct": round(chg * 100) / 100,
                "amplitude_24h_pct": round((high - low) / price * 100 * 100) / 100,
                "volume_24h_usdt": vol,
                "trade_count": int(t.get("count") or 0),
            })
        print(f"[standby] binance {host}: {len(rows)} 个 USDT 永续")
        return rows

    logger.error("all binance hosts failed")
    return []


def fetch_binance_oi(symbols: list[str]) -> dict[str, float]:
    """逐合约抓 OI（币数）。并发 + 节流，逐域名回退。"""
    host_idx = 0
    result: dict[str, float] = {}
    started = time.time()

    def one(sym: str):
        nonlocal host_idx
        for attempt in range(len(BINANCE_HOSTS)):
            host = BINANCE_HOSTS[(host_idx + attempt) % len(BINANCE_HOSTS)]
            try:
                resp = requests.get(
                    f"https://{host}/fapi/v1/openInterest",
                    params={"symbol": sym},
                    headers={"User-Agent": BROWSER_UA},
                    timeout=15,
                )
                if resp.status_code != 200:
                    continue
                host_idx = (host_idx + attempt) % len(BINANCE_HOSTS)
                val = float(resp.json()["openInterest"])
                if val > 0:
                    return (sym, val)
                return None
            except Exception:  # noqa: BLE001
                continue
        return None

    with concurrent.futures.ThreadPoolExecutor(max_workers=OI_CONCURRENCY) as pool:
        futures = []
        for sym in symbols:
            if time.time() - started > OI_BUDGET_S:
                print(f"[standby] OI 预算耗尽，已抓 {len(result)}/{len(symbols)}")
                break
            futures.append(pool.submit(one, sym))
            time.sleep(OI_DELAY_S)
        for fut in concurrent.futures.as_completed(futures):
            try:
                r = fut.result()
            except Exception:  # noqa: BLE001
                continue
            if r:
                result[r[0]] = r[1]

    print(f"[standby] binance OI: {len(result)}/{len(symbols)}")
    return result


# ── 抓取：OKX ───────────────────────────────────────────────

def fetch_okx_tickers() -> list[dict]:
    """OKX 全量永续 tickers（单请求，对齐 relay.mjs fetchOkx）。"""
    try:
        resp = requests.get(
            "https://www.okx.com/api/v5/market/tickers",
            params={"instType": "SWAP"},
            timeout=HTTP_TIMEOUT,
        )
        if resp.status_code != 200:
            print(f"[standby] okx HTTP {resp.status_code}")
            return []
        payload = resp.json()
    except Exception as exc:  # noqa: BLE001
        print(f"[standby] okx 失败: {exc}")
        return []

    rows = []
    for t in payload.get("data") or []:
        inst = t.get("instId") or ""
        if not inst.endswith("-USDT-SWAP"):
            continue
        try:
            price = float(t["last"])
            high = float(t["high24h"])
            low = float(t["low24h"])
            open24h = float(t.get("open24h") or 0)
            # volCcy24h 是币数不是 USDT 成交额：×last 换算（relay.mjs 报告 C6 修复的口径）
            usdt_vol = float(t.get("volCcy24h") or 0) * price
        except (KeyError, TypeError, ValueError):
            continue
        if price <= 0:
            continue
        ba = inst.replace("-USDT-SWAP", "")
        rows.append({
            "symbol": ba + "USDT",
            "base_asset": ba,
            "price": price,
            "change_24h_pct": round((price - open24h) / open24h * 100 * 100) / 100
            if open24h > 0 else 0.0,
            "amplitude_24h_pct": round((high - low) / price * 100 * 100) / 100
            if high > 0 and low > 0 else 0.0,
            "volume_24h_usdt": usdt_vol,
        })
    print(f"[standby] okx: {len(rows)} 个 USDT 永续")
    return rows


def fetch_okx_oi() -> dict[str, float]:
    """OKX 全量 OI（单请求），返回 symbol -> 币数（对齐 relay.mjs fetchOkxOi）。"""
    try:
        resp = requests.get(
            "https://www.okx.com/api/v5/public/open-interest",
            params={"instType": "SWAP"},
            timeout=HTTP_TIMEOUT,
        )
        if resp.status_code != 200:
            print(f"[standby] okx OI HTTP {resp.status_code}")
            return {}
        payload = resp.json()
    except Exception as exc:  # noqa: BLE001
        print(f"[standby] okx OI 失败: {exc}")
        return {}

    out: dict[str, float] = {}
    for t in payload.get("data") or []:
        inst = t.get("instId") or ""
        if not inst.endswith("-USDT-SWAP"):
            continue
        try:
            coin = float(t.get("oiCcy") or 0)
        except (TypeError, ValueError):
            continue
        if coin > 0:
            out[inst.replace("-USDT-SWAP", "") + "USDT"] = coin
    print(f"[standby] okx OI: {len(out)}")
    return out


# ── 聚合（严格对齐 relay.mjs aggregateMarket）───────────────

def aggregate_market(
    binance: list[dict], okx: list[dict], okx_oi: dict[str, float]
) -> tuple[dict[str, float], dict[str, float]]:
    """
    全市场聚合：交易量 = Binance + OKX；OI 增量 = OKX 币数 × Binance 价格。

    bybit 对美 IP 返回 403（relay 日志亦为 "2 source(s): binance, okx"），
    故与线上 relay 同为两所聚合；若 relay 换到三所，此函数需同步。

    返回 (vol_map, oi_extra_map)：vol 为聚合成交额，oi_extra 为 Binance 之外的 OI 现值。
    """
    vol: dict[str, float] = {}
    price: dict[str, float] = {}
    for r in binance:
        vol[r["symbol"]] = r.get("volume_24h_usdt") or 0
        price[r["symbol"]] = r["price"]
    for r in okx:
        vol[r["symbol"]] = (vol.get(r["symbol"]) or 0) + (r.get("volume_24h_usdt") or 0)

    oi_extra: dict[str, float] = {}
    for sym, coin in okx_oi.items():
        p = price.get(sym)
        if p and coin > 0:
            oi_extra[sym] = coin * p
    return vol, oi_extra


def _prev_rows(snapshot: Optional[dict]) -> dict[str, dict]:
    if not isinstance(snapshot, dict):
        return {}
    rows = snapshot.get("data") or []
    return {r["symbol"]: r for r in rows if isinstance(r, dict) and r.get("symbol")}


def _oi_value(oi_contracts: float, price: float, extra: float) -> float:
    """OI 现值 = Binance 币数×价格 + 其它所增量（对齐 relay 的 oi*price + aggOi）。"""
    return oi_contracts * price + extra


# ── 组装 ────────────────────────────────────────────────────

def build_coinfilter(
    binance: list[dict],
    oi_map: dict[str, float],
    vol_map: dict[str, float],
    oi_extra: dict[str, float],
    prev: Optional[dict],
) -> dict:
    """
    构造 coinfilter_data。

    行集合与顺序对齐 relay.mjs：按 Binance 成交额降序，OI 缺失者跳过。
    抓不到的字段沿用上一份快照（绝不伪造数值）。
    """
    prev_map = _prev_rows(prev)
    rows = []
    for r in sorted(binance, key=lambda x: -(x.get("volume_24h_usdt") or 0)):
        oi = oi_map.get(r["symbol"])
        if oi is None:
            continue
        oi_value = _oi_value(oi, r["price"], oi_extra.get(r["symbol"], 0.0))
        vol = vol_map.get(r["symbol"]) or r.get("volume_24h_usdt") or 0
        ratio = (vol / oi_value) if oi_value > 0 else 0
        p = prev_map.get(r["symbol"], {})
        rows.append({
            "symbol": r["symbol"],
            "base_asset": r["base_asset"],
            "price": r["price"],
            "change_24h_pct": r.get("change_24h_pct"),
            "amplitude_24h_pct": r.get("amplitude_24h_pct"),
            "volume_24h_usdt": round(vol * 100) / 100,
            "oi_value": round(oi_value * 100) / 100,
            "oi_contracts": oi,
            "volume_oi_ratio": round(ratio * 10000) / 10000,
            # 以下字段本模块无法抓取：沿用上一份快照，避免界面列变空白/失真
            "funding_rate_pct": p.get("funding_rate_pct"),
            "orderbook_depth_usdt": p.get("orderbook_depth_usdt"),
            "listing_date": p.get("listing_date"),
            "days_since_listing": p.get("days_since_listing"),
            "oi_stage": p.get("oi_stage"),
            "oi_stage_label": p.get("oi_stage_label"),
            "tags": p.get("tags") or [],
            "long_short_ratio": p.get("long_short_ratio"),
            "long_pct": p.get("long_pct"),
            "short_pct": p.get("short_pct"),
            "liq_24h_usdt": p.get("liq_24h_usdt"),
            "liq_long_24h_usdt": p.get("liq_long_24h_usdt"),
            "liq_short_24h_usdt": p.get("liq_short_24h_usdt"),
            "oi_24h_change_pct": p.get("oi_24h_change_pct"),
            "predicted_funding_rate_pct": p.get("predicted_funding_rate_pct"),
        })
    carried = sum(1 for r in rows if r.get("funding_rate_pct") is not None)
    print(f"[standby] coinfilter 组装 {len(rows)} 行（沿用旧快照字段 {carried} 行）")
    return {
        "data": rows,
        "updated": _now(),
        "count": len(rows),
        "quality": {"usable": len(rows), "coverage": 1, "standby": True},
    }


def build_demon(
    binance: list[dict],
    oi_map: dict[str, float],
    vol_map: dict[str, float],
    oi_extra: dict[str, float],
    prev: Optional[dict],
) -> dict:
    """构造 demon_data（口径同 coinfilter，对齐 relay.mjs relayDemon）。"""
    prev_map = _prev_rows(prev)
    rows = []
    for r in sorted(binance, key=lambda x: -(x.get("volume_24h_usdt") or 0)):
        oi = oi_map.get(r["symbol"])
        if oi is None:
            continue
        oi_value = _oi_value(oi, r["price"], oi_extra.get(r["symbol"], 0.0))
        vol = vol_map.get(r["symbol"]) or r.get("volume_24h_usdt") or 0
        ratio = (vol / oi_value) if oi_value > 0 else 0
        p = prev_map.get(r["symbol"], {})
        rows.append({
            "symbol": r["symbol"],
            "base_asset": r["base_asset"],
            "price": r["price"],
            "change_24h_pct": r.get("change_24h_pct"),
            "amplitude_24h_pct": r.get("amplitude_24h_pct"),
            "volume_24h_usdt": round(vol * 100) / 100,
            "trade_count": p.get("trade_count") if p.get("trade_count") is not None
            else r.get("trade_count", 0),
            "oi_value": round(oi_value * 100) / 100,
            "oi_contracts": oi,
            "volume_oi_ratio": round(ratio * 10000) / 10000,
            # 需 OI 历史，直写路径无法重建 → 沿用旧值（过期好过错误）
            "oi_stage": p.get("oi_stage"),
            "oi_stage_label": p.get("oi_stage_label"),
        })
    print(f"[standby] demon 组装 {len(rows)} 行")
    return {"data": rows, "updated": _now(), "count": len(rows)}


# ── 首选路径：触发真 relay ──────────────────────────────────

def dispatch_full_relay() -> Optional[int]:
    """
    请求 GitHub 触发 tokenomics-screener/relay.yml（relay.mjs 全量管线）。

    保真度高于本模块的直写：可恢复 forward_data、oi_stage、资金费/盘口/
    多空比/爆仓等本模块无法重建的部分。需 SCREENER_RELAY_TOKEN
    （fine-grained PAT，Actions: write）；未配置返回 None 走直写。
    """
    token = os.getenv("SCREENER_RELAY_TOKEN", "")
    if not token:
        print("[standby] 未配置 SCREENER_RELAY_TOKEN —— 跳过 relay 触发，走直写")
        return None
    url = (
        f"https://api.github.com/repos/{WORKFLOW_REPO}"
        f"/actions/workflows/{WORKFLOW_FILE}/dispatches"
    )
    try:
        resp = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            json={"ref": "main"},
            timeout=30,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("dispatch failed: %s", exc)
        return None
    if resp.status_code == 204:
        print(f"[standby] 已触发 {WORKFLOW_REPO}/{WORKFLOW_FILE}（relay.mjs 全量管线）")
        return 0
    print(f"[standby] 触发失败 HTTP {resp.status_code}: {resp.text[:160]}")
    return None


def wait_for_relay(timeout_s: int = RELAY_WAIT_S) -> bool:
    """等待 relay 恢复新鲜度（GA relay 一轮抓取约 2 分钟）。"""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        time.sleep(20)
        try:
            resp = requests.get(STATUS_URL, timeout=25)
            if resp.status_code == 200 and resp.json().get("stale") is False:
                print("[standby] relay 已恢复数据新鲜度 —— 直写无需执行")
                return True
        except Exception:  # noqa: BLE001
            continue
    print(f"[standby] relay {timeout_s}s 内未恢复 —— 转直写兜底")
    return False


# ── 写入前校验 ──────────────────────────────────────────────

def verify_against_live(snap: dict, live_prev: Optional[dict]) -> tuple[bool, str]:
    """
    核心指标校验：新快照的 volume_oi_ratio 中位数不得偏离线上既有快照过远。

    这道闸防的是「口径错误」类缺陷（例如只聚合了单一交易所、或字段映射错位）
    —— 行数校验查不出这类问题，但 volume_oi_ratio 是筛选器主信号，偏了就废。
    取不线上数据时跳过（返回通过），由行数校验兜底。
    """
    prev_map = _prev_rows(live_prev)
    if not prev_map:
        return True, "无线上快照可比对，跳过比率校验"

    new_ratios = [
        r["volume_oi_ratio"] for r in snap.get("data") or []
        if isinstance(r.get("volume_oi_ratio"), (int, float)) and r["volume_oi_ratio"] > 0
    ]
    old_ratios = [
        r["volume_oi_ratio"] for r in prev_map.values()
        if isinstance(r.get("volume_oi_ratio"), (int, float)) and r["volume_oi_ratio"] > 0
    ]
    if len(new_ratios) < 50 or len(old_ratios) < 50:
        return True, "可比样本不足，跳过比率校验"

    new_ratios.sort()
    old_ratios.sort()
    new_med = new_ratios[len(new_ratios) // 2]
    old_med = old_ratios[len(old_ratios) // 2]
    if old_med <= 0:
        return True, "线上比率中位数为 0，跳过比率校验"
    drift = abs(new_med - old_med) / old_med
    if drift > RATIO_TOLERANCE:
        return False, (
            f"volume_oi_ratio 中位 {new_med:.4f} vs 线上 {old_med:.4f}"
            f"（偏差 {drift * 100:.1f}% > 容差 {RATIO_TOLERANCE * 100:.0f}%）"
        )
    return True, f"比率中位 {new_med:.4f} vs 线上 {old_med:.4f}（偏差 {drift * 100:.1f}%）"


def verify_rows(snap: dict, live_prev: Optional[dict], label: str) -> tuple[bool, str]:
    """行数与结构校验：既不得低于绝对下限，也不得比线上缩水。"""
    new_n = len(snap.get("data") or [])
    live_n = len(_prev_rows(live_prev))
    if new_n < MIN_ROWS:
        return False, f"仅 {new_n} 行 < 下限 {MIN_ROWS}"
    if live_n and new_n < live_n * NO_DEGRADE_RATIO:
        return False, f"新快照 {new_n} 行 < 线上 {live_n} 行的 {NO_DEGRADE_RATIO:.0%}（降级）"
    usable = sum(
        1 for r in snap["data"]
        if r.get("symbol") and r.get("base_asset")
        and isinstance(r.get("price"), (int, float))
        and isinstance(r.get("oi_value"), (int, float))
        and isinstance(r.get("oi_contracts"), (int, float))
    )
    min_usable = max(100, -(-new_n * 4 // 5))
    if usable < min_usable:
        return False, f"可用行 {usable} < 要求 {min_usable}（worker hRCF 门槛）"
    return True, f"{new_n} 行（线上 {live_n}），可用 {usable}"


# ── 主入口 ──────────────────────────────────────────────────

def run_standby() -> bool:
    """
    外部待机主入口。

    返回 True = 无需动作、已成功接管、或安全跳过；False = 确认异常且接管失败。
    绝不抛异常——调用方（collect.yml 的数据采集主流程）不应受任何影响。
    """
    try:
        if DRY_RUN:
            print("[standby] DRY_RUN=1 —— 演练模式（全链路执行，不写 KV）")
        if not should_take_over():
            return True
        print("[standby] 筛币器数据过期 —— 外部待机接管")

        # ① 首选：触发真 relay（relay.mjs 全量，含 forward_data / oi_stage）
        if not DRY_RUN and dispatch_full_relay() == 0:
            if wait_for_relay():
                return True

        # ② 兜底：自抓自算 + 直写 KV
        token = os.getenv("CF_API_TOKEN", "")
        account = ""
        if token:
            account = _resolve_account_id(token)
        elif not DRY_RUN:
            logger.error("CF_API_TOKEN missing; cannot push standby data")
            return False

        binance = fetch_binance_tickers()
        if not binance:
            logger.error("binance unavailable from this runner; standby aborted")
            return False
        okx = fetch_okx_tickers()
        okx_oi = fetch_okx_oi()

        vol_map, oi_extra = aggregate_market(binance, okx, okx_oi)
        print(
            f"[standby] 聚合完成 vol={len(vol_map)} oi_extra={len(oi_extra)} "
            f"(binance={len(binance)} okx={len(okx)})"
        )

        oi_map = fetch_binance_oi([r["symbol"] for r in binance])
        print(f"[standby] OI 覆盖 {len(oi_map)}/{len(binance)}")

        prev_cf_kv = None if DRY_RUN else _kv_get("coinfilter_data", token, account)
        prev_dm_kv = None if DRY_RUN else _kv_get("demon_data", token, account)
        # 构造时用 KV 快照延续字段；校验时优先 KV、其次公开 API
        base_cf = _baseline(prev_cf_kv, "coinfilter")

        coinfilter = build_coinfilter(binance, oi_map, vol_map, oi_extra, prev_cf_kv or base_cf)
        demon = build_demon(binance, oi_map, vol_map, oi_extra, prev_dm_kv or base_cf)

        # 写入前三重校验：结构 / 行数不缩水 / 核心比率不偏
        ok_rows, msg_rows = verify_rows(coinfilter, base_cf, "coinfilter")
        ok_ratio, msg_ratio = verify_against_live(coinfilter, base_cf)
        print(f"[standby] 校验·行数: {'通过' if ok_rows else '拒绝'} — {msg_rows}")
        print(f"[standby] 校验·比率: {'通过' if ok_ratio else '拒绝'} — {msg_ratio}")

        if DRY_RUN:
            print(
                f"[standby] DRY_RUN 结果 coinfilter={len(coinfilter['data'])} "
                f"demon={len(demon['data'])} (未写 KV)"
            )
            return ok_rows and ok_ratio

        if not (ok_rows and ok_ratio):
            print("[standby] 校验未通过 —— 放弃写入（宁可不管，也不污染线上数据）")
            return False

        pushed = _kv_put("coinfilter_data", coinfilter, token, account)
        pushed &= _kv_put("demon_data", demon, token, account)

        # ③ exchange_proxy：行情主数据（worker 的涨幅榜自愈依赖它 <30min 新鲜）
        prev_proxy = _kv_get("exchange_proxy", token, account) or {}
        payload = {
            "binance": binance,
            "okx": okx,
            "updated": _now(),
            "standby": True,
        }
        # bybit 对美 IP 403。若上一份快照有 bybit 行则原样带上：
        # worker refreshData 按 symbol 取成交额最大者，多一个来源只增不减。
        if isinstance(prev_proxy.get("bybit"), list) and prev_proxy["bybit"]:
            payload["bybit"] = prev_proxy["bybit"]
            print(f"[standby] 沿用上一份 bybit 数据 {len(prev_proxy['bybit'])} 行")
        pushed &= _kv_put("exchange_proxy", payload, token, account)

        print(
            f"[standby] 接管完成: binance={len(binance)} oi={len(oi_map)} "
            f"coinfilter={len(coinfilter['data'])} pushed={pushed}"
        )
        return pushed
    except Exception as exc:  # noqa: BLE001 — 待机绝不能影响主流程
        logger.error("standby crashed (ignored): %s", exc)
        return False

"""
Screener external standby — 筛币器外部待机抓取（美国 VPS 整机失联时接管）

调用点：reporter.push_to_kv() 的 finally 分支。
环境：slinglab-website 的 collect.yml「Push to Cloudflare KV」步骤，
      该步骤注入 CF_API_TOKEN —— 因此本模块无需任何新增密钥。

为什么需要它
------------
2026-09-24 日本抓取节点 (23.27.52.165) 整机失联，筛币器数据管道静默停摆 24 小时。
根因是「单一抓取节点 + 单一恢复路径」：美国 VPS 上的 monitor.sh 唯一恢复手段是
SSH 到那个已经死掉的节点，于是连跑 288 次 recovery-failed 也无法自愈。

美国 VPS 现有三级自愈（guard.sh：L1 本地补跑 / L2 触发 GA relay / L3 告警），
但 L1 和 L2 都**跑在那台机器上**——美国 VPS 整机下线时，自愈能力随之消失。
本模块补的正是这个缺口：从 GitHub Actions（独立基础设施）观测并接管抓取。

覆盖范围与边界
--------------
恢复：exchange_proxy（行情）/ demon_data / coinfilter_data
     → 来源新鲜度回归、界面解冻、涨幅榜归档可被 worker 自愈回填

不恢复：forward_data（蓄水候选评分）
     → 需要 100 天日线 × 700+ 币的结构评分（relay.mjs 的 computeForwardScore），
       在 collect.yml 的 10 分钟预算内重实现必然与主实现漂移。
       该场景下候选池会显示「候选(数据过期)」而非伪装成实时值——
       这是 worker 的既有降级设计，属于正确行为。

安全与约束
----------
- 仅在数据过期时动作；健康时只做一次 HTTP 查询，零副作用
- 绝不抛异常影响 collect.yml 主流程（该流程的主职责是 token 数据采集）
- 复用已有 CF_API_TOKEN，不新增/不硬编码任何凭据
- 合并上一份 KV 快照，保留本模块抓不到的字段（资金费/盘口/多空比等）
- 只依赖 requests（该仓库既有依赖）
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
# fapi.binance.com 对数据中心 IP 返回 451；www.binance.com/fapi 是 web 端点，
# 2026-09-25 实测从 GA 可用（relay.mjs 2026-09-11 提交 3666d81 为此加了域名回退）
BINANCE_HOSTS = ["www.binance.com", "fapi.binance.com", "fapi3.binance.com"]

HTTP_TIMEOUT = 30
OI_CONCURRENCY = 8
OI_DELAY_S = 0.12       # 每请求节流，避免触发 Binance 权重限流
OI_BUDGET_S = 200       # OI 抓取总预算；超时即用已抓到的部分
OI_TOP_N = 250          # 只覆盖成交额前 N 个合约
MIN_ROWS = 120          # worker hRCF 门槛：>=100 行且 80% 字段可用


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


def _kv_get(key: str, token: str, account: str) -> Optional[dict]:
    url = (
        f"{CF_API_BASE}/accounts/{account}/storage/kv/namespaces/"
        f"{KV_NAMESPACE_ID}/values/{key}"
    )
    try:
        resp = requests.get(url, headers=_cf_headers(token), timeout=30)
        return resp.json() if resp.status_code == 200 else None
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
            logger.info("KV %s written (%d bytes)", key, len(body))
            return True
        logger.error("KV %s failed: HTTP %s %s", key, resp.status_code, resp.text[:200])
    except Exception as exc:  # noqa: BLE001
        logger.error("KV %s failed: %s", key, exc)
    return False


# ── 是否该接管 ──────────────────────────────────────────────

def should_take_over() -> bool:
    """读筛币器状态。健康→False；过期或不可达→True（宁可可恢复一次也不静默）。"""
    try:
        resp = requests.get(STATUS_URL, timeout=25)
        if resp.status_code != 200:
            logger.warning("status HTTP %s — assuming stale", resp.status_code)
            return True
        payload = resp.json()
        if payload.get("stale") is False:
            logger.info("screener healthy (stale=false) — standby idle")
            return False
        logger.warning("screener reports stale — standby taking over")
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("status unreachable (%s) — assuming stale", exc)
        return True


# ── 抓取 ────────────────────────────────────────────────────

def fetch_binance_tickers() -> list[dict]:
    """全市场 USDT 永续 tickers，逐域名回退。"""
    for host in BINANCE_HOSTS:
        try:
            resp = requests.get(
                f"https://{host}/fapi/v1/ticker/24hr",
                headers={"User-Agent": BROWSER_UA},
                timeout=HTTP_TIMEOUT,
            )
            if resp.status_code != 200:
                logger.info("binance %s HTTP %s", host, resp.status_code)
                continue
            raw = resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.info("binance %s failed: %s", host, exc)
            continue

        rows = []
        for t in raw:
            sym = t.get("symbol") or ""
            if not sym.endswith("USDT"):
                continue
            try:
                price = float(t["lastPrice"])
                high, low = float(t["highPrice"]), float(t["lowPrice"])
                vol = float(t["quoteVolume"])
                chg = float(t["priceChangePercent"])
            except (KeyError, TypeError, ValueError):
                continue
            if price <= 0:
                continue
            rows.append({
                "symbol": sym,
                "base_asset": sym[:-4],
                "price": price,
                "change_24h_pct": round(chg, 4),
                "amplitude_24h_pct": round((high - low) / price * 100, 4),
                "volume_24h_usdt": round(vol, 2),
            })
        logger.info("binance %s: %d USDT perps", host, len(rows))
        return rows

    logger.error("all binance hosts failed")
    return []


def fetch_binance_oi(symbols: list[str]) -> dict[str, float]:
    """逐合约抓 OI（币数）。并发 + 节流，口径对齐 relay.mjs。"""
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
                return (sym, val) if val >= 0 else None
            except Exception:  # noqa: BLE001
                continue
        return None

    with concurrent.futures.ThreadPoolExecutor(max_workers=OI_CONCURRENCY) as pool:
        futures = []
        for sym in symbols:
            if time.time() - started > OI_BUDGET_S:
                logger.warning("OI budget exhausted at %d/%d", len(result), len(symbols))
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

    logger.info("binance OI: %d/%d symbols", len(result), len(symbols))
    return result


def fetch_okx_tickers() -> list[dict]:
    """OKX 全量永续 tickers（单请求）。"""
    try:
        resp = requests.get(
            "https://www.okx.com/api/v5/market/tickers",
            params={"instType": "SWAP"},
            timeout=HTTP_TIMEOUT,
        )
        if resp.status_code != 200:
            logger.info("okx HTTP %s", resp.status_code)
            return []
        payload = resp.json()
    except Exception as exc:  # noqa: BLE001
        logger.info("okx failed: %s", exc)
        return []

    rows = []
    for t in payload.get("data", []):
        inst = t.get("instId") or ""
        if not inst.endswith("-USDT-SWAP"):
            continue
        try:
            price = float(t["last"])
            vol_ccy = float(t.get("volCcy24h") or 0)
            high, low = float(t["high24h"]), float(t["low24h"])
        except (KeyError, TypeError, ValueError):
            continue
        if price <= 0:
            continue
        # volCcy24h 是币数，乘价格换算 USDT（relay.mjs C6 修复的口径）
        rows.append({
            "symbol": inst.replace("-USDT-SWAP", "USDT"),
            "base_asset": inst.split("-")[0],
            "price": price,
            "change_24h_pct": 0.0,
            "amplitude_24h_pct": round((high - low) / price * 100, 4),
            "volume_24h_usdt": round(vol_ccy * price, 2),
        })
    logger.info("okx: %d USDT swaps", len(rows))
    return rows


# ── 组装（合并旧快照以保留抓不到的字段）────────────────────

def _prev_rows(snapshot: Optional[dict]) -> dict[str, dict]:
    if not isinstance(snapshot, dict):
        return {}
    rows = snapshot.get("data") or []
    return {r["symbol"]: r for r in rows if isinstance(r, dict) and r.get("symbol")}


def build_coinfilter(binance: list[dict], oi_map: dict, prev: Optional[dict]) -> dict:
    prev_map = _prev_rows(prev)
    top = sorted(binance, key=lambda r: -(r.get("volume_24h_usdt") or 0))[:OI_TOP_N]
    rows = []
    for r in top:
        oi = oi_map.get(r["symbol"])
        if oi is None:
            continue
        oi_value = oi * r["price"]
        vol = r.get("volume_24h_usdt") or 0
        p = prev_map.get(r["symbol"], {})
        rows.append({
            "symbol": r["symbol"],
            "base_asset": r["base_asset"],
            "price": r["price"],
            "change_24h_pct": r.get("change_24h_pct"),
            "amplitude_24h_pct": r.get("amplitude_24h_pct"),
            "volume_24h_usdt": vol,
            "oi_value": round(oi_value, 2),
            "oi_contracts": oi,
            "volume_oi_ratio": round(vol / oi_value, 4) if oi_value > 0 else 0,
            # 以下字段本模块无法抓取：沿用上一份快照，避免界面列变空白
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
    logger.info("coinfilter rows=%d (carried enrichment=%d)", len(rows), carried)
    return {
        "data": rows,
        "updated": _now(),
        "count": len(rows),
        "quality": {"usable": len(rows), "coverage": 1, "standby": True},
    }


def build_demon(binance: list[dict], oi_map: dict, prev: Optional[dict]) -> dict:
    prev_map = _prev_rows(prev)
    rows = []
    for r in binance:
        oi = oi_map.get(r["symbol"])
        if oi is None:
            continue
        oi_value = oi * r["price"]
        vol = r.get("volume_24h_usdt") or 0
        p = prev_map.get(r["symbol"], {})
        rows.append({
            "symbol": r["symbol"],
            "base_asset": r["base_asset"],
            "price": r["price"],
            "change_24h_pct": r.get("change_24h_pct"),
            "amplitude_24h_pct": r.get("amplitude_24h_pct"),
            "volume_24h_usdt": vol,
            "trade_count": p.get("trade_count", 0),
            "oi_value": round(oi_value, 2),
            "oi_contracts": oi,
            "volume_oi_ratio": round(vol / oi_value, 4) if oi_value > 0 else 0,
            "oi_stage": p.get("oi_stage"),
            "oi_stage_label": p.get("oi_stage_label"),
        })
    logger.info("demon rows=%d", len(rows))
    return {"data": rows, "updated": _now(), "count": len(rows)}


# ── 主入口 ──────────────────────────────────────────────────

def run_standby() -> bool:
    """
    外部待机主入口。

    返回 True = 无需动作或已成功接管；False = 确认异常且接管失败。
    绝不抛异常——调用方（collect.yml 的数据采集主流程）不应受任何影响。
    """
    try:
        if not should_take_over():
            return True

        token = os.getenv("CF_API_TOKEN", "")
        if not token:
            logger.error("CF_API_TOKEN missing; cannot push standby data")
            return False
        account = _resolve_account_id(token)
        if not account:
            return False

        binance = fetch_binance_tickers()
        if not binance:
            logger.error("binance unavailable from this runner; standby aborted")
            return False
        okx = fetch_okx_tickers()

        # 1) exchange_proxy：行情主数据（worker 的涨幅榜自愈也依赖它）
        pushed = _kv_put("exchange_proxy", {
            "binance": binance,
            "okx": okx,
            "updated": _now(),
            "standby": True,
        }, token, account)

        # 2) OI → demon / coinfilter
        top = sorted(binance, key=lambda r: -(r.get("volume_24h_usdt") or 0))
        oi_map = fetch_binance_oi([r["symbol"] for r in top[:OI_TOP_N]])

        if len(oi_map) >= MIN_ROWS:
            pushed &= _kv_put(
                "demon_data",
                build_demon(binance, oi_map, _kv_get("demon_data", token, account)),
                token, account,
            )
            pushed &= _kv_put(
                "coinfilter_data",
                build_coinfilter(binance, oi_map, _kv_get("coinfilter_data", token, account)),
                token, account,
            )
        else:
            logger.warning("OI coverage low (%d < %d); tickers only", len(oi_map), MIN_ROWS)

        logger.info("standby finished (pushed=%s)", pushed)
        return pushed
    except Exception as exc:  # noqa: BLE001 — 待机绝不能影响主流程
        logger.error("standby crashed (ignored): %s", exc)
        return False

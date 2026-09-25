"""
Screener external standby relay — 筛币器外部待机 relay（美国 VPS 失联时接管）

由 slinglab-website 的 collect.yml 每小时调用，运行在 **GitHub Actions 基础设施**上，
与被监控的美国 VPS (192.255.193.128) 完全独立。

为什么需要它
------------
2026-09-24 日本抓取节点 (23.27.52.165) 整机失联，筛币器数据管道静默停摆 24 小时。
根因是「单一抓取节点 + 单一恢复路径」：美国 VPS 上的 monitor.sh 唯一恢复手段是
SSH 到那个已经死掉的节点，于是连跑 288 次 recovery-failed 也无法自愈。

美国 VPS 现有三级自愈（guard.sh），但 L1/L2 都跑在那台机器上——
**美国 VPS 整机下线时，自愈能力随之消失**。本模块补的正是这个缺口。

当前防护层次
------------
| 场景 | 接管者 | 覆盖范围 |
|------|--------|----------|
| 主 relay 推送失败 | guard.sh L1（本地补跑） | 全部（含 forward） |
| 本地补跑无效 ≥3 次 | guard.sh L2（触发 GA relay.yml） | 全部（含 forward） |
| **美国 VPS 整机下线** | **本模块（collect.yml 每小时）** | market/demon/coinfilter |

能力边界（重要）
----------------
本模块恢复 exchange_proxy / demon_data / coinfilter_data，使行情与来源新鲜度回归、
数据不再断档，涨幅榜归档也能被 worker 自愈回填。

它**不恢复** forward_data（蓄水候选评分）——那需要 100 天日线 × 715 币的完整结构
评分逻辑（relay.mjs 的 computeForwardScore），在 collect.yml 的 10 分钟预算内重实现
既慢又必然与主实现漂移。该场景下候选池需等 relay.yml 待机通道跑完（约 16 分钟）后
自然回归；本模块的作用是不让整体状态因三源过期而彻底冻结。

设计约束
--------
- 仅在数据过期时动作；健康时只做一次 HTTP 查询，零副作用
- 绝不抛异常影响 collect.yml 主流程（数据采集才是本仓库主职责）
- 不修改任何 workflow 文件（token 无 workflow scope，且不应绕过该约束）
- 不硬编码任何凭据或账号 ID：复用 collect.yml 已注入的 CF_API_TOKEN
- 只用标准库（urllib），不新增依赖
- 合并上一份快照以保留本模块无法抓取的字段（资金费/盘口/多空比等）
"""

from __future__ import annotations

import concurrent.futures
import json
import logging
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ── 目标 ────────────────────────────────────────────────────
STATUS_URL = os.getenv(
    "SCREENER_STATUS_URL",
    "https://app.slinglab.xyz/screener/api/status?standby=1",
)
KV_NAMESPACE_ID = os.getenv("SCREENER_KV_NS", "6d56b8307fd04814892f9c2b15723c02")
CF_API = "https://api.cloudflare.com/client/v4"

# ── 抓取参数（口径对齐 relay.mjs）───────────────────────────
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)
HTTP_TIMEOUT = 30
# fapi.binance.com 对 GitHub/数据中心 IP 返回 451；www.binance.com/fapi 是 web 端点，
# 2026-09-25 实测从 GA 可用（relay.mjs 2026-09-11 提交 3666d81 为此加了域名回退）
BINANCE_HOSTS = ["www.binance.com", "fapi.binance.com", "fapi3.binance.com"]

OI_CONCURRENCY = 8
OI_DELAY_S = 0.12         # 每请求节流，避免触发 Binance 权重限流
OI_BUDGET_S = 240         # OI 抓取总预算，超时即用已有部分
OI_TOP_N = 250            # 只覆盖成交额前 N 个合约
MIN_ROWS = 120            # 满足 worker hRCF 门槛（>=100 行且 80% 可用）


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _get_json(url: str, headers: dict | None = None, timeout: int = HTTP_TIMEOUT):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.load(resp)


def _is_stale() -> bool:
    """读筛币器状态。不可达视为过期（宁可可恢复一次，也不静默）。"""
    try:
        payload = _get_json(STATUS_URL)
        if payload.get("stale") is False:
            logger.info("screener healthy — standby not needed")
            return False
        logger.warning("screener reports stale")
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("status unreachable (%s) — assuming stale", exc)
        return True


# ── 交易所抓取 ──────────────────────────────────────────────

def fetch_binance_tickers() -> list[dict]:
    """全市场 USDT 永续 tickers，逐域名回退。"""
    for host in BINANCE_HOSTS:
        try:
            raw = _get_json(
                f"https://{host}/fapi/v1/ticker/24hr",
                headers={"User-Agent": BROWSER_UA},
            )
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
                high = float(t["highPrice"])
                low = float(t["lowPrice"])
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


def fetch_binance_oi(symbols: list[str], budget_s: int = OI_BUDGET_S) -> dict[str, float]:
    """逐合约抓 OI（币数）。并发 + 节流，口径对齐 relay.mjs。"""
    host_idx = 0
    result: dict[str, float] = {}
    started = time.time()

    def one(sym: str):
        nonlocal host_idx
        for attempt in range(len(BINANCE_HOSTS)):
            host = BINANCE_HOSTS[(host_idx + attempt) % len(BINANCE_HOSTS)]
            try:
                d = _get_json(
                    f"https://{host}/fapi/v1/openInterest"
                    f"?symbol={urllib.parse.quote(sym)}",
                    headers={"User-Agent": BROWSER_UA},
                    timeout=15,
                )
                host_idx = (host_idx + attempt) % len(BINANCE_HOSTS)
                val = float(d["openInterest"])
                return (sym, val) if val >= 0 else None
            except Exception:  # noqa: BLE001
                continue
        return None

    with concurrent.futures.ThreadPoolExecutor(max_workers=OI_CONCURRENCY) as pool:
        futures = []
        for sym in symbols:
            if time.time() - started > budget_s:
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
        payload = _get_json("https://www.okx.com/api/v5/market/tickers?instType=SWAP")
    except Exception as exc:  # noqa: BLE001
        logger.info("okx tickers failed: %s", exc)
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


# ── Cloudflare KV ───────────────────────────────────────────

def _cf_headers() -> dict | None:
    token = os.getenv("CF_API_TOKEN", "")
    if not token:
        logger.error("CF_API_TOKEN missing; cannot push standby data")
        return None
    return {
        "Authorization": f"Bearer {token}",
        "User-Agent": "slinglab-screener-standby",
    }


def _resolve_account_id(headers: dict) -> str | None:
    """运行期解析账号 ID，避免把账号 ID 写进公开仓库。"""
    try:
        d = _get_json(f"{CF_API}/accounts", headers=headers)
    except Exception as exc:  # noqa: BLE001
        logger.error("cannot list CF accounts: %s", exc)
        return None
    accounts = d.get("result") or []
    if not accounts:
        logger.error("CF token has no accessible accounts")
        return None
    return accounts[0].get("id")


def kv_get(key: str, headers: dict, account: str):
    url = (
        f"{CF_API}/accounts/{account}/storage/kv/namespaces/"
        f"{KV_NAMESPACE_ID}/values/{key}"
    )
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp)
    except Exception as exc:  # noqa: BLE001
        logger.info("KV %s read miss (%s)", key, exc)
        return None


def kv_put(key: str, payload, headers: dict, account: str) -> bool:
    url = (
        f"{CF_API}/accounts/{account}/storage/kv/namespaces/"
        f"{KV_NAMESPACE_ID}/values/{key}"
    )
    body = json.dumps(payload, ensure_ascii=False).encode()
    req = urllib.request.Request(
        url, data=body, method="PUT",
        headers={**headers, "Content-Type": "text/plain"},
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            logger.info("KV %s: HTTP %s (%d bytes)", key, resp.status, len(body))
            return resp.status == 200
    except urllib.error.HTTPError as exc:
        logger.error("KV %s failed: HTTP %s %s", key, exc.code, exc.read()[:200])
    except Exception as exc:  # noqa: BLE001
        logger.error("KV %s failed: %s", key, exc)
    return False


# ── 组装（合并上一份快照，保留无法抓取的字段）──────────────

def _prev_rows(snapshot) -> dict[str, dict]:
    if not isinstance(snapshot, dict):
        return {}
    rows = snapshot.get("data") or []
    return {r["symbol"]: r for r in rows if isinstance(r, dict) and r.get("symbol")}


def build_coinfilter(binance: list[dict], oi_map: dict[str, float], prev) -> dict:
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
            # 以下字段本模块无法抓取：沿用上一份快照，避免 UI 列变空白
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


def build_demon(binance: list[dict], oi_map: dict[str, float], prev) -> dict:
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
    外部待机 relay 主入口。

    返回 True 表示「无需动作或已成功接管」，False 表示「确认异常且接管失败」。
    绝不抛异常——调用方（collect.yml 的数据采集主流程）不应受任何影响。
    """
    try:
        if not _is_stale():
            return True

        logger.warning("screener stale — external standby taking over")

        headers = _cf_headers()
        if not headers:
            return False
        account = _resolve_account_id(headers)
        if not account:
            return False

        binance = fetch_binance_tickers()
        if not binance:
            logger.error("binance unavailable from this runner; standby aborted")
            return False
        okx = fetch_okx_tickers()

        # 1) exchange_proxy：行情主数据（worker 的涨幅榜自愈也依赖它）
        pushed = kv_put("exchange_proxy", {
            "binance": binance,
            "okx": okx,
            "updated": _now(),
            "standby": True,
        }, headers, account)

        # 2) OI → demon/coinfilter（读旧快照以保留无法抓取的字段）
        top = sorted(binance, key=lambda r: -(r.get("volume_24h_usdt") or 0))
        oi_map = fetch_binance_oi([r["symbol"] for r in top[:OI_TOP_N]])

        if len(oi_map) >= MIN_ROWS:
            pushed &= kv_put(
                "demon_data",
                build_demon(binance, oi_map, kv_get("demon_data", headers, account)),
                headers, account,
            )
            pushed &= kv_put(
                "coinfilter_data",
                build_coinfilter(binance, oi_map, kv_get("coinfilter_data", headers, account)),
                headers, account,
            )
        else:
            logger.warning("OI coverage too low (%d < %d); tickers only", len(oi_map), MIN_ROWS)

        logger.info("standby finished (pushed=%s)", pushed)
        return pushed
    except Exception as exc:  # noqa: BLE001 — 待机绝不能影响主流程
        logger.error("standby crashed (ignored): %s", exc)
        return False


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
    )
    run_standby()

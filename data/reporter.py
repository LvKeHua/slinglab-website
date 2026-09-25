"""
Reporter: Push validated data to Cloudflare KV and generate summary reports.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Optional
import requests

from config import (
    CF_ACCOUNT_ID, CF_API_TOKEN, KV_NAMESPACE_ID, KV_DATA_KEY,
    QUALITY_REPORT,
)

logger = logging.getLogger(__name__)

# ── Cloudflare API helpers ────────────────────────────────

CF_API_BASE = "https://api.cloudflare.com/client/v4"


def _cf_headers() -> dict:
    if not CF_API_TOKEN:
        raise RuntimeError("CF_API_TOKEN not set")
    return {
        "Authorization": f"Bearer {CF_API_TOKEN}",
        "Content-Type": "application/json",
    }


_resolved_account_id: Optional[str] = None


def _account_id() -> str:
    """
    解析 Cloudflare account ID。

    优先用环境变量/配置；未配置时调 /accounts 自动解析（token 必然绑定账号）。
    这样账号 ID 无需写进公开仓库，也修掉了原先占位符导致的 7003 路由错误。
    """
    global _resolved_account_id
    if CF_ACCOUNT_ID:
        return CF_ACCOUNT_ID
    if _resolved_account_id:
        return _resolved_account_id
    resp = requests.get(f"{CF_API_BASE}/accounts", headers=_cf_headers(), timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"cannot list CF accounts ({resp.status_code}): {resp.text[:200]}")
    accounts = (resp.json() or {}).get("result") or []
    if not accounts:
        raise RuntimeError("CF token has no accessible accounts")
    _resolved_account_id = accounts[0]["id"]
    logger.info("resolved CF account id: %s...", _resolved_account_id[:8])
    return _resolved_account_id


def kv_put(key: str, value: str) -> bool:
    """Write a string value to Cloudflare KV."""
    url = f"{CF_API_BASE}/accounts/{_account_id()}/storage/kv/namespaces/{KV_NAMESPACE_ID}/values/{key}"
    resp = requests.put(url, headers=_cf_headers(), data=value.encode("utf-8"))
    if resp.status_code == 200:
        logger.info("KV written: %s (%d bytes)", key, len(value))
        return True
    else:
        logger.error("KV write failed (%d): %s", resp.status_code, resp.text)
        return False


def kv_get(key: str) -> Optional[str]:
    """Read a string value from Cloudflare KV."""
    url = f"{CF_API_BASE}/accounts/{_account_id()}/storage/kv/namespaces/{KV_NAMESPACE_ID}/values/{key}"
    resp = requests.get(url, headers=_cf_headers())
    if resp.status_code == 200:
        return resp.text
    logger.warning("KV read failed (%d) for key: %s", resp.status_code, key)
    return None


# ── Reporting ─────────────────────────────────────────────

def build_dashboard_payload(coins: list[dict]) -> dict:
    """
    Build the exact payload format the dashboard expects.
    """
    payload = {
        "data": coins,
        "updated": datetime.now(timezone.utc).isoformat(),
        "count": len(coins),
        "source": "token-data-collector",
        "quality": {},
    }

    # Attach quality report if available
    if QUALITY_REPORT.exists():
        payload["quality"] = json.loads(QUALITY_REPORT.read_text())

    return payload


def push_to_kv(coins: list[dict]) -> bool:
    """Push the data to Cloudflare KV for the dashboard to consume."""
    payload = build_dashboard_payload(coins)
    json_str = json.dumps(payload, ensure_ascii=False)
    ok = kv_put(KV_DATA_KEY, json_str)
    _maybe_run_screener_standby()
    return ok


def _maybe_run_screener_standby() -> None:
    """
    筛币器外部待机检查（美国 VPS 整机失联时接管抓取）。

    调用点选在这里的原因：collect.yml 每小时的「Push to Cloudflare KV」步骤
    是本仓库唯一注入了 CF_API_TOKEN 的地方，而待机需要它直写 KV。

    补的缺口：美国 VPS 上的 guard.sh 虽有三级自愈，但 L1/L2 都跑在那台机器上——
    整机下线时自愈能力随之消失（2026-09-24 日本节点事故即为此类）。

    待机模块内部吞掉一切异常，绝不会影响本仓库的数据采集主流程。
    """
    try:
        from screener_standby import run_standby

        run_standby()
    except Exception as exc:  # noqa: BLE001
        logger.warning("screener standby skipped: %s", exc)


# ── Summary ───────────────────────────────────────────────

def generate_markdown_summary(coins: list[dict]) -> str:
    """Generate a human-readable summary of the data run."""
    total = len(coins)
    with_conflict = sum(1 for c in coins if c.get("data_conflict"))
    stale = sum(1 for c in coins if c.get("stale_cg_data"))
    with_ratio = sum(1 for c in coins if c.get("circulating_ratio") is not None)
    avg_ratio = (
        sum(c["circulating_ratio"] for c in coins if c.get("circulating_ratio"))
        / with_ratio
        if with_ratio
        else 0
    )

    lines = [
        f"## Token Data Collection Report",
        f"",
        f"**Run at**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"**Coins tracked**: {total}",
        f"**With circulating ratio**: {with_ratio} ({with_ratio/total*100:.1f}%)",
        f"**Average ratio**: {avg_ratio:.1f}%",
        f"**Data conflicts**: {with_conflict} ({with_conflict/total*100:.1f}%)",
        f"**Stale CG data**: {stale} ({stale/total*100:.1f}%)",
        f"",
        f"### Top 10 Conflicts (largest CMC vs CG discrepancy)",
        f"",
        f"| Symbol | CMC Ratio | CG Ratio | Diff |",
        f"|--------|-----------|----------|------|",
    ]

    conflicted = [c for c in coins if c.get("data_conflict")]
    conflicted.sort(key=lambda x: -(x.get("discrepancy_pct") or 0))
    for c in conflicted[:10]:
        lines.append(
            f"| {c['symbol']} | {c.get('circulating_ratio', 'N/A')}% "
            f"| {c.get('cg_ratio', 'N/A')}% "
            f"| {c.get('discrepancy_pct', 0)}% |"
        )

    return "\n".join(lines)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    from validator import validate
    from collector import collect

    # Full pipeline
    merged = collect()
    validated = validate(merged)
    ok = push_to_kv(validated)
    if ok:
        summary = generate_markdown_summary(validated)
        print(summary)
        logger.info("Data pushed to KV successfully!")
    else:
        logger.error("Failed to push data to KV")

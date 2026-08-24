"""
筹码筛选 (Crypto Screener) - FastAPI backend
Fetches CoinGecko data, caches locally, serves frontend + API
"""
import json
import os
import threading
import time
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
FRONTEND_DIR = BASE_DIR / "frontend"
DATA_FILE = DATA_DIR / "coins.json"

# ── CoinGecko API ──────────────────────────────────────────
COINGECKO_URL = (
    "https://api.coingecko.com/api/v3/coins/markets"
    "?vs_currency=usd"
    "&order=market_cap_desc"
    "&per_page=250"
    "&page=1"
    "&sparkline=false"
    "&price_change_percentage=7d"
)
FETCH_INTERVAL = 300  # 5 minutes

app = FastAPI(title="Crypto Screener", version="2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory cache ────────────────────────────────────────
_cache = {"data": None, "updated": None, "ok": False, "error": None}

# ── Data transformation ────────────────────────────────────
def transform_coin(c):
    cr = None
    if c.get("circulating_supply") and c.get("total_supply"):
        try:
            cr = float(c["circulating_supply"]) / float(c["total_supply"])
        except (ValueError, ZeroDivisionError):
            cr = None
    rank = c.get("market_cap_rank")
    star = max(1, 11 - min(10, rank)) if rank else 0
    return {
        "symbol": (c.get("symbol") or "").upper() + "USDT",
        "name": c.get("name") or "",
        "base_asset": (c.get("symbol") or "").upper(),
        "price": float(c["current_price"]) if c.get("current_price") else 0,
        "market_cap": float(c["market_cap"]) if c.get("market_cap") else None,
        "circulating_supply": float(c["circulating_supply"]) if c.get("circulating_supply") else None,
        "total_supply": float(c["total_supply"]) if c.get("total_supply") else None,
        "circulating_ratio": cr,
        "volume_24h_usdt": float(c["total_volume"]) if c.get("total_volume") else 0,
        "percent_change_7d": float(c["price_change_percentage_7d_in_currency"]) if c.get("price_change_percentage_7d_in_currency") is not None else None,
        "change_24h_pct": float(c["price_change_percentage_24h"]) if c.get("price_change_percentage_24h") is not None else None,
        "amplitude_24h_pct": float(c["price_change_percentage_24h"]) if c.get("price_change_percentage_24h") is not None else None,
        "star_rating": star,
        "unlock_risk": "Unknown",
        "momentum_alert": False,
    }

# ── Fetch from CoinGecko ───────────────────────────────────
def fetch_from_coingecko():
    """Fetch top 250 coins from CoinGecko. Returns list of coins or None on error."""
    req = urllib.request.Request(
        COINGECKO_URL,
        headers={"User-Agent": "Mozilla/5.0 (compatible; CryptoScreener/2.0)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = json.loads(resp.read().decode())
            return [transform_coin(c) for c in raw]
    except Exception as e:
        print(f"[FETCH ERROR] {e}")
        return None

def refresh_cache():
    """Refresh in-memory cache and persist to disk."""
    print(f"[{datetime.now().isoformat()}] Fetching data from CoinGecko...")
    coins = fetch_from_coingecko()
    if coins:
        ts = int(time.time() * 1000)
        payload = {"ok": True, "data": coins, "updated": ts}
        _cache["data"] = coins
        _cache["updated"] = ts
        _cache["ok"] = True
        _cache["error"] = None
        # Persist to disk
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            DATA_FILE.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
            print(f"[CACHE] Saved {len(coins)} coins to {DATA_FILE}")
        except Exception as e:
            print(f"[CACHE WRITE ERROR] {e}")
    else:
        _cache["ok"] = False
        _cache["error"] = "Failed to fetch from CoinGecko"
        # Try loading from disk as fallback
        if DATA_FILE.exists():
            try:
                fallback = json.loads(DATA_FILE.read_text(encoding="utf-8"))
                _cache["data"] = fallback.get("data")
                _cache["updated"] = fallback.get("updated")
                print(f"[CACHE] Loaded {len(_cache['data'] or [])} coins from disk fallback")
            except Exception:
                pass

def background_refresh():
    """Background thread: refresh on start, then every FETCH_INTERVAL."""
    refresh_cache()
    while True:
        time.sleep(FETCH_INTERVAL)
        refresh_cache()

# ── Start background refresh on import ─────────────────────
_thread = threading.Thread(target=background_refresh, daemon=True)
_thread.start()

# ── API Endpoints ──────────────────────────────────────────
@app.get("/api/data")
def get_data():
    """Return cached coin data."""
    if _cache["data"] is None and DATA_FILE.exists():
        # First load from disk if memory not ready
        try:
            fallback = json.loads(DATA_FILE.read_text(encoding="utf-8"))
            _cache["data"] = fallback.get("data")
            _cache["updated"] = fallback.get("updated")
        except Exception:
            pass
    return {
        "ok": _cache["ok"],
        "data": _cache["data"] or [],
        "updated": _cache["updated"],
        "error": _cache["error"],
    }

@app.post("/api/refresh")
def refresh_data():
    """Manually trigger a data refresh."""
    refresh_cache()
    return {"ok": _cache["ok"], "updated": _cache["updated"], "error": _cache["error"]}

@app.get("/api/status")
def get_status():
    """Service status."""
    return {
        "project": "Crypto Screener",
        "coins": len(_cache["data"]) if _cache["data"] else 0,
        "updated": _cache["updated"],
        "ok": _cache["ok"],
        "fetch_interval_s": FETCH_INTERVAL,
    }

# ── Frontend static files ──────────────────────────────────
@app.get("/")
def serve_index():
    index = FRONTEND_DIR / "index.html"
    if not index.exists():
        raise HTTPException(404, "Frontend not found")
    return FileResponse(str(index))

@app.get("/{filename:path}")
def serve_static(filename: str):
    filepath = FRONTEND_DIR / filename
    if filepath.exists() and filepath.is_file():
        return FileResponse(str(filepath))
    raise HTTPException(404, "Not found")

# ── Entry point ────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="127.0.0.1", port=port)

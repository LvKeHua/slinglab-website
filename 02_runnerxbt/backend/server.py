"""
FastAPI backend serving RunnerXBT message data + BTC/ETH price data + local media
"""
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"

app = FastAPI(title="RunnerXBT Insights", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve local media files (images/videos downloaded from Telegram)
MEDIA_DIR = DATA_DIR / "media"
MEDIA_DIR.mkdir(exist_ok=True)
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")

def load_json(path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))

@app.get("/api/messages")
def get_messages():
    """Get all messages with dates and cleaned media paths."""
    data = load_json(DATA_DIR / "messages_final.json")
    if data is None:
        raise HTTPException(404, "messages_final.json not found")
    return {"total": len(data), "data": data}

@app.get("/api/daily")
def get_daily():
    """Get messages grouped by date."""
    data = load_json(DATA_DIR / "messages_daily_final.json")
    if data is None:
        raise HTTPException(404, "messages_daily_final.json not found")
    return {"total_days": len(data), "data": data}

@app.get("/api/btc")
def get_btc():
    """Get BTC 1D OHLCV data."""
    data = load_json(DATA_DIR / "btc_ohlcv_1d.json")
    if data is None:
        raise HTTPException(404, "btc_ohlcv_1d.json not found")
    return {"symbol": "BTC/USDT", "total": len(data), "data": data}

@app.get("/api/btc4h")
def get_btc4h():
    """Get BTC 4H OHLCV data."""
    data = load_json(DATA_DIR / "btc_ohlcv_4h.json")
    if data is None:
        raise HTTPException(404, "btc_ohlcv_4h.json not found")
    return {"symbol": "BTC/USDT", "total": len(data), "data": data}

@app.get("/api/eth")
def get_eth():
    """Get ETH 1D OHLCV data."""
    data = load_json(DATA_DIR / "eth_ohlcv_1d.json")
    if data is None:
        raise HTTPException(404, "eth_ohlcv_1d.json not found")
    return {"symbol": "ETH/USDT", "total": len(data), "data": data}

@app.get("/api/status")
def get_status():
    """Get overall status summary."""
    msgs = load_json(DATA_DIR / "messages_final.json")
    daily = load_json(DATA_DIR / "messages_daily_final.json")
    btc = load_json(DATA_DIR / "btc_ohlcv_1d.json")
    eth = load_json(DATA_DIR / "eth_ohlcv_1d.json")
    media_count = len(list(MEDIA_DIR.iterdir())) if MEDIA_DIR.exists() else 0
    
    return {
        "messages": len(msgs) if msgs else 0,
        "days": len(daily) if daily else 0,
        "btc_candles": len(btc) if btc else 0,
        "eth_candles": len(eth) if eth else 0,
        "media_files": media_count,
        "project": "RunnerXBT Insights",
        "updated": datetime.now().isoformat(),
    }

# Serve frontend static files
FRONTEND_DIR = BASE_DIR / "frontend"
FRONTEND_DIR.mkdir(exist_ok=True)

@app.get("/")
def serve_index():
    index = FRONTEND_DIR / "index.html"
    if not index.exists():
        return {"error": "Frontend not built yet. Run build_frontend.py"}
    return FileResponse(str(index))

@app.get("/{filename:path}")
def serve_static(filename: str):
    filepath = FRONTEND_DIR / filename
    if filepath.exists() and filepath.is_file():
        return FileResponse(str(filepath))
    raise HTTPException(404, "Not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

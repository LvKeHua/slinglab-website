"""RunnerXBT Configuration"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"

TELEGRAM_GROUPS = [
    {"username": "@RunnerXBT_Insights", "alias": "runnerxbt", "enabled": True},
]

CLASSIFICATION_RULES = {
    "red": {"keywords": ["BUY", "LONG", "开多", "做多", "紧急", "URGENT", "SIGNAL"], "regex": []},
    "yellow": {"keywords": ["WATCH", "关注", "支撑", "阻力", "目标", "TARGET", "观察"], "regex": []},
    "blue": {"keywords": [], "regex": []},
}

TELEGRAM_API_ID = int(os.getenv("TELEGRAM_API_ID", "32862414"))
TELEGRAM_API_HASH = os.getenv("TELEGRAM_API_HASH", "ef44e2d6868e8614646abb59c58aaa05")
TELEGRAM_SESSION = os.getenv("TELEGRAM_SESSION", str(BASE_DIR / "scraper" / "tg_session"))

WS_PING_INTERVAL = int(os.getenv("WS_PING_INTERVAL", "30"))
WS_PING_TIMEOUT = int(os.getenv("WS_PING_TIMEOUT", "10"))
MEDIA_DIR = DATA_DIR / "media"
MEDIA_MAX_SIZE = 20 * 1024 * 1024

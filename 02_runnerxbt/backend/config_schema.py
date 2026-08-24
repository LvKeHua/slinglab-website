"""Pydantic models for RunnerXBT configuration validation."""
from pydantic import BaseModel
from typing import Optional
from config import (
    TELEGRAM_GROUPS, CLASSIFICATION_RULES,
    TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION,
    WS_PING_INTERVAL, WS_PING_TIMEOUT,
    MEDIA_DIR, MEDIA_MAX_SIZE, DATA_DIR,
)


class GroupConfig(BaseModel):
    username: str
    alias: str
    enabled: bool = True


class LevelRules(BaseModel):
    keywords: list[str] = []
    regex: list[str] = []


class ClassificationRules(BaseModel):
    red: LevelRules
    yellow: LevelRules
    blue: LevelRules


class AppConfig(BaseModel):
    telegram_groups: list[GroupConfig] = []
    classification_rules: ClassificationRules
    telegram_api_id: int
    telegram_api_hash: str
    telegram_session: str
    ws_ping_interval: int
    ws_ping_timeout: int
    media_dir: str
    media_max_size: int
    data_dir: str


def load_config() -> AppConfig:
    """Load and validate configuration from config.py defaults."""
    return AppConfig(
        telegram_groups=[GroupConfig(**g) for g in TELEGRAM_GROUPS],
        classification_rules=ClassificationRules(**CLASSIFICATION_RULES),
        telegram_api_id=TELEGRAM_API_ID,
        telegram_api_hash=TELEGRAM_API_HASH,
        telegram_session=TELEGRAM_SESSION,
        ws_ping_interval=WS_PING_INTERVAL,
        ws_ping_timeout=WS_PING_TIMEOUT,
        media_dir=str(MEDIA_DIR),
        media_max_size=MEDIA_MAX_SIZE,
        data_dir=str(DATA_DIR),
    )


if __name__ == "__main__":
    config = load_config()
    print(f"Config valid: {config.telegram_api_id}")
    print(f"Groups: {len(config.telegram_groups)}")
    print(f"Rules: {list(config.classification_rules.model_fields.keys())}")

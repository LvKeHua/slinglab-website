"""Unit tests for classifier module."""
import pytest
from classifier import classify_message

# Sample rules for testing
TEST_RULES = {
    "red": {
        "keywords": ["BUY", "LONG", "开多", "做多", "紧急", "URGENT", "SIGNAL"],
        "regex": [],
    },
    "yellow": {
        "keywords": ["WATCH", "关注", "支撑", "阻力", "目标", "TARGET", "观察"],
        "regex": [],
    },
    "blue": {"keywords": [], "regex": []},
}


class TestClassifyMessage:
    def test_red_keywords(self):
        assert classify_message("BUY BTC NOW", TEST_RULES) == "red"
        assert classify_message("LONG ETH", TEST_RULES) == "red"
        assert classify_message("紧急通知", TEST_RULES) == "red"
        assert classify_message("URGENT: pump incoming", TEST_RULES) == "red"

    def test_yellow_keywords(self):
        assert classify_message("WATCH: support at 65k", TEST_RULES) == "yellow"
        assert classify_message("关注 BTC 走势", TEST_RULES) == "yellow"
        assert classify_message("TARGET reached", TEST_RULES) == "yellow"
        assert classify_message("阻力位 68000", TEST_RULES) == "yellow"

    def test_blue_default(self):
        assert classify_message("Hello everyone", TEST_RULES) == "blue"
        assert classify_message("Good morning", TEST_RULES) == "blue"
        assert classify_message("今天天气不错", TEST_RULES) == "blue"

    def test_empty_text(self):
        assert classify_message("", TEST_RULES) == "blue"

    def test_none_text(self):
        assert classify_message(None, TEST_RULES) == "blue"

    def test_priority_red_over_yellow(self):
        assert classify_message("BUY WATCH list", TEST_RULES) == "red"

    def test_case_insensitive(self):
        assert classify_message("buy btc now", TEST_RULES) == "red"
        assert classify_message("Buy Btc Now", TEST_RULES) == "red"

    def test_default_rules(self):
        result = classify_message("BUY BTC")
        assert result == "red"

    def test_regex_rules(self):
        regex_rules = {
            "red": {"keywords": [], "regex": [r"\$\d{4,}"]},
            "yellow": {"keywords": [], "regex": []},
            "blue": {"keywords": [], "regex": []},
        }
        assert classify_message("BTC at " + chr(36) + "65000", regex_rules) == "red"
        assert classify_message("BTC at " + chr(36) + "50", regex_rules) == "blue"

    def test_invalid_regex_skipped(self):
        rules_with_bad_regex = {
            "red": {"keywords": ["BUY"], "regex": ["[invalid"]},
            "yellow": {"keywords": [], "regex": []},
            "blue": {"keywords": [], "regex": []},
        }
        assert classify_message("BUY now", rules_with_bad_regex) == "red"
        assert classify_message("nothing special", rules_with_bad_regex) == "blue"

"""Message classification engine using keyword and regex rules."""
import re
from config import CLASSIFICATION_RULES


def classify_message(text: str, rules: dict | None = None) -> str:
    """Classify a message by priority: red > yellow > blue (default).
    
    Args:
        text: Message text to classify.
        rules: Classification rules dict. Defaults to CLASSIFICATION_RULES from config.
    
    Returns:
        Level string: 'red', 'yellow', or 'blue'.
    """
    if not text:
        return "blue"
    
    if rules is None:
        rules = CLASSIFICATION_RULES
    
    text_upper = text.upper()
    
    # Check by priority: red first, then yellow
    for level in ["red", "yellow"]:
        level_rules = rules.get(level, {})
        
        # Check keywords
        keywords = level_rules.get("keywords", [])
        for kw in keywords:
            if kw.upper() in text_upper:
                return level
        
        # Check regex patterns
        regex_patterns = level_rules.get("regex", [])
        for pattern in regex_patterns:
            try:
                if re.search(pattern, text, re.IGNORECASE):
                    return level
            except re.error:
                continue  # Skip invalid regex
    
    return "blue"


if __name__ == "__main__":
    # Quick manual test
    test_cases = [
        ("BUY BTC NOW", "red"),
        ("LONG ETH target 4k", "red"),
        ("WATCH: support at 65k", "yellow"),
        ("关注 BTC 走势", "yellow"),
        ("Hello everyone", "blue"),
        ("", "blue"),
        ("紧急通知", "red"),
    ]
    for text, expected in test_cases:
        result = classify_message(text)
        status = "✓" if result == expected else "✗"
        print(f"  {status} '{text[:30]}' → {result} (expected {expected})")

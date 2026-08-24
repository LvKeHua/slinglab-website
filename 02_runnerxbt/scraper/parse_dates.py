"""
Date parser using position-based interpolation between known separators.
Messages are in newest-first order.
Separators exist only up to Oct 30, 2025; newer messages interpolate to today (Jul 20, 2026).
"""
import json, re
from pathlib import Path
from datetime import datetime, timedelta

BASE_DIR = Path(__file__).parent.parent
TODAY = datetime(2026, 7, 20)

def find_separators(msgs):
    """Find date separators (messages that are ONLY a date string)."""
    separators = []
    for i, m in enumerate(msgs):
        text = m.get('text', '').strip()
        clean = re.sub(r'[\U00010000-\U0010ffff]', '', text)
        clean = re.sub(r'[0-9.,]+\s*K', '', clean).strip()
        
        pattern = r'^((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})$'
        match = re.match(pattern, clean, re.IGNORECASE)
        if match:
            try:
                dt = datetime.strptime(match.group(1).replace(',', ''), '%B %d %Y')
                separators.append((i, dt))
            except:
                pass
    return separators

def interpolate_date(i, total_msgs, separators):
    """Assign a date to message at index i using interpolation."""
    if not separators:
        # No separators at all - just spread across the whole range
        return TODAY - timedelta(days=i * (365 + 180) // total_msgs)
    
    newest_sep_idx = separators[0][0]
    newest_sep_date = separators[0][1]
    oldest_sep_idx = separators[-1][0]
    oldest_sep_date = separators[-1][1]
    
    # Messages NEWER than newest separator: interpolate from TODAY to newest_sep_date
    if i <= newest_sep_idx:
        ratio = i / newest_sep_idx if newest_sep_idx > 0 else 0
        total_delta = (TODAY - newest_sep_date).days
        return TODAY - timedelta(days=int(ratio * total_delta))
    
    # Messages OLDER than oldest separator: interpolate from oldest_sep_date backward
    if i >= oldest_sep_idx:
        extra = i - oldest_sep_idx
        return oldest_sep_date - timedelta(days=extra * 7)  # approx 1 week per msg (conservative)
    
    # Messages between two separators: linear interpolation
    for j in range(len(separators) - 1):
        curr_idx = separators[j][0]
        next_idx = separators[j+1][0]
        
        if curr_idx < i <= next_idx:
            curr_dt = separators[j][1]
            next_dt = separators[j+1][1]
            
            if curr_idx == next_idx:
                return curr_dt
            
            ratio = (i - curr_idx) / (next_idx - curr_idx) if next_idx > curr_idx else 0
            delta_days = (next_dt - curr_dt).days
            return curr_dt + timedelta(days=int(ratio * delta_days))
    
    return oldest_sep_date

def main():
    msgs = json.loads((BASE_DIR / "posts.json").read_text(encoding='utf-8'))
    print(f"Loaded {len(msgs)} messages (newest-first)", flush=True)
    
    separators = find_separators(msgs)
    print(f"\nDate separators found: {len(separators)}", flush=True)
    print(f"  Newest separator: idx={separators[0][0]}, date={separators[0][1].strftime('%Y-%m-%d')}", flush=True)
    print(f"  Oldest separator: idx={separators[-1][0]}, date={separators[-1][1].strftime('%Y-%m-%d')}", flush=True)
    
    # Assign interpolated dates
    daily = {}
    for i in range(len(msgs)):
        dt = interpolate_date(i, len(msgs), separators)
        key = dt.strftime('%Y-%m-%d')
        if key not in daily:
            daily[key] = []
        daily[key].append({
            'text': msgs[i].get('text', ''),
            'timestamp': msgs[i].get('timestamp', ''),
            'images': msgs[i].get('images', []),
            'links': msgs[i].get('links', []),
            'videos': msgs[i].get('videos', []),
        })
    
    print(f"\nDays with messages: {len(daily)}", flush=True)
    print(f"Date range: {min(daily.keys())} ~ {max(daily.keys())}", flush=True)
    
    # Save enriched (newest-first order with dates)
    enriched = []
    for i in range(len(msgs)):
        dt = interpolate_date(i, len(msgs), separators)
        enriched.append({
            'id': i,
            'date': dt.strftime('%Y-%m-%d'),
            'text': msgs[i].get('text', ''),
            'timestamp': msgs[i].get('timestamp', ''),
            'images': msgs[i].get('images', []),
            'links': msgs[i].get('links', []),
            'videos': msgs[i].get('videos', []),
        })
    
    enriched_path = BASE_DIR / "data" / "messages_enriched.json"
    enriched_path.write_text(json.dumps(enriched, ensure_ascii=False), encoding='utf-8')
    print(f"Saved enriched: {enriched_path}", flush=True)
    
    daily_path = BASE_DIR / "data" / "messages_daily.json"
    daily_path.write_text(json.dumps(daily, ensure_ascii=False), encoding='utf-8')
    print(f"Saved daily: {daily_path}", flush=True)
    
    # Stats
    msg_dates = [interpolate_date(i, len(msgs), separators) for i in range(len(msgs))]
    if msg_dates:
        print(f"\nStats:", flush=True)
        print(f"  Newest msg: {msg_dates[0].strftime('%Y-%m-%d')}", flush=True)
        print(f"  Oldest msg: {msg_dates[-1].strftime('%Y-%m-%d')}", flush=True)
        print(f"  Avg msgs/day: {len(msg_dates) / max(1, (msg_dates[0] - msg_dates[-1]).days):.1f}", flush=True)
    
    print("\nSample:", flush=True)
    for m in enriched[:3]:
        print(f"  [{m['id']:4d}] {m['date']}: {m['text'][:60]}", flush=True)
    print("  ...", flush=True)
    for m in enriched[-3:]:
        print(f"  [{m['id']:4d}] {m['date']}: {m['text'][:60]}", flush=True)

if __name__ == "__main__":
    main()

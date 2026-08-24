# merge_messages.py - 合并 telethon 新消息到 messages_final.json (Actions 用)
import json
from pathlib import Path

BASE = Path('.')
final_p = BASE / 'data' / 'messages_final.json'
tele_p = BASE / 'data' / 'messages_telethon.json'

final = json.loads(final_p.read_text('utf-8')) if final_p.exists() else []
by_id = {m['id']: m for m in final}
added = 0
if tele_p.exists():
    tele = json.loads(tele_p.read_text('utf-8'))
    for m in tele:
        if m['id'] not in by_id:
            by_id[m['id']] = m
            added += 1
merged = sorted(by_id.values(), key=lambda x: x['id'])
final_p.write_text(json.dumps(merged, ensure_ascii=False), 'utf-8')
print(f'Total messages: {len(merged)}, new: {added}')

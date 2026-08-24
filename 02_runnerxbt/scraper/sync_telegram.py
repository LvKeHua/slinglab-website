"""
Incremental Telegram scraper for @RunnerXBT_Insights.
Fetches only NEW messages since the last sync, downloads new media,
merges into messages_telethon.json (source of truth for merged build).
VPS 版: 日本VPS直连 Telegram，无需代理（环境变量 RUNNER_PROXY 可选覆盖）
"""
import asyncio, os, sys, json
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).parent.parent
SESSION_PATH = str(BASE_DIR / 'scraper' / 'tg_session')
MEDIA_DIR = BASE_DIR / 'data' / 'media'
OUT_FILE = BASE_DIR / 'data' / 'messages_telethon.json'
LOG_FILE = BASE_DIR / 'sync.log'

API_ID = 32862414
API_HASH = 'ef44e2d6868e8614646abb59c58aaa05'
# VPS 直连无需代理；如需代理设 RUNNER_PROXY='socks5://127.0.0.1:7897'
PROXY = None
_px = os.environ.get('RUNNER_PROXY', '')
if _px:
    # 支持 socks5://host:port 或 http://host:port 格式
    scheme, _, rest = _px.partition('://')
    host, _, port = rest.rpartition(':')
    PROXY = (scheme, host, int(port))
CHANNEL = '@RunnerXBT_Insights'

def log(msg):
    line = f'[{__import__("datetime").datetime.now().isoformat(timespec="seconds")}] {msg}'
    print(line)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line + '\n')

async def main():
    from telethon import TelegramClient, errors

    # Load existing messages
    existing = {}
    if OUT_FILE.exists():
        try:
            for m in json.loads(OUT_FILE.read_text('utf-8')):
                existing[m['id']] = m
        except Exception as e:
            log(f'WARN: could not read existing data ({e}), starting fresh')

    # Find max existing id (highest message id = newest in Telegram)
    max_id = max(existing.keys()) if existing else 0
    log(f'Existing messages: {len(existing)}, last id: {max_id}')

    # VPS直连无代理：proxy=None 时直接连；有代理才传
    client = TelegramClient(SESSION_PATH, API_ID, API_HASH, proxy=PROXY) if PROXY else TelegramClient(SESSION_PATH, API_ID, API_HASH)
    await client.connect()

    if not await client.is_user_authorized():
        log('ERROR: session not authorized - run v11_telethon.py QR login first')
        await client.disconnect()
        return 1

    me = await client.get_me()
    log(f'Auth OK: {me.first_name}')

    # Get channel
    try:
        channel = await client.get_entity(CHANNEL)
        log(f'Channel: {channel.title}')
    except Exception as e:
        log(f'ERROR: channel fetch failed: {e}')
        await client.disconnect()
        return 1

    # Iterate only messages newer than max_id
    new_msgs = []
    new_media = 0
    try:
        # reverse=False gives oldest-first within the offset range
        async for msg in client.iter_messages(channel, min_id=max_id, reverse=True):
            entry = {
                'id': msg.id,
                'date': msg.date.isoformat() if msg.date else None,
                'text': msg.text or '',
                'has_media': msg.media is not None,
            }
            if msg.media:
                fname = f"msg_{msg.id}.jpg"
                fpath = MEDIA_DIR / fname
                if not fpath.exists():
                    try:
                        await client.download_media(msg, file=str(fpath))
                        new_media += 1
                    except Exception as e:
                        log(f'  WARN media {msg.id}: {e}')
                entry['media_path'] = f"/media/{fname}"
            new_msgs.append(entry)
            existing[msg.id] = entry
            if len(new_msgs) % 200 == 0:
                # Progress save so interrupted runs can resume
                merged = sorted(existing.values(), key=lambda x: x['id'])
                OUT_FILE.write_text(json.dumps(merged, ensure_ascii=False, indent=2), 'utf-8')
                log(f'  ... {len(new_msgs)} new msgs fetched (progress saved)')
    except Exception as e:
        log(f'ERROR during iteration: {e}')

    # Save merged
    merged = sorted(existing.values(), key=lambda x: x['id'])
    OUT_FILE.write_text(json.dumps(merged, ensure_ascii=False, indent=2), 'utf-8')
    log(f'Done: {len(new_msgs)} new messages, {new_media} new media files. Total: {len(merged)}')
    await client.disconnect()
    return 0

if __name__ == '__main__':
    sys.exit(asyncio.run(main()))

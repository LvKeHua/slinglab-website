"""
Scraper v9 — Use Telethon (MTProto API) to download all messages + media from @RunnerXBT_Insights

Telegram Web uses public credentials:
  api_id = 2496
  api_hash = "8da85b0d0675be02224ac1a1e0c5cef0"
  
These are embedded in web.telegram.org's source code and are the standard public creds.
"""
import asyncio, json, os, re, shutil, sys, time
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from telethon import TelegramClient
from telethon.tl.functions.messages import GetHistoryRequest
from telethon.tl.types import MessageMediaPhoto, MessageMediaDocument, Message

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA_DIR = os.path.join(BASE_DIR, "media")
DATA_DIR = os.path.join(BASE_DIR, "data")
RUNNER_TG_DIR = os.path.join(BASE_DIR, "runner tg")
SESSION_FILE = os.path.join(BASE_DIR, "scraper", "_telethon_session")

API_ID = 2496
API_HASH = "8da85b0d0675be02224ac1a1e0c5cef0"
CHANNEL = "@RunnerXBT_Insights"

os.makedirs(MEDIA_DIR, exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, "media"), exist_ok=True)


def classify_post(text: str) -> str:
    t = text.lower()
    emoji_count = sum(1 for ch in t if ord(ch) > 0x1F000)
    emoji_ratio = emoji_count / max(len(t), 1)
    dollar_kw = ['$', 'usd', 'btc', 'eth', 'sol', 'price', 'entry', 'target', 'tp', 'sl']
    dollar_count = sum(1 for kw in dollar_kw if kw in t)
    if emoji_ratio > 0.06:
        return "red"
    elif dollar_count > 0:
        return "blue"
    else:
        return "yellow"


def clean_text(text: str) -> str:
    text = re.sub(r'[\u200b\u200c\u200d\ufeff\u{e951}\u{e950}]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


async def main():
    print(f"\n{'='*60}")
    print(f"SCRAPER v9 — Telethon API")
    print(f"Channel: {CHANNEL}")
    print(f"{'='*60}\n")

    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
    await client.start()
    print("Connected to Telegram!")

    # Get the channel entity
    channel = await client.get_entity(CHANNEL)
    print(f"Channel: {channel.title} (ID: {channel.id})")
    
    # Get the messages
    all_msgs = []
    offset_id = 0
    total = None
    start_time = time.time()
    
    while True:
        history = await client(GetHistoryRequest(
            peer=channel,
            offset_id=offset_id,
            offset_date=None,
            add_offset=0,
            limit=100,
            max_id=0,
            min_id=0,
            hash=0,
        ))
        
        msgs = history.messages
        if total is None:
            total = history.count if history.count > 0 else 0
            print(f"Total messages in channel: {total}")
        
        if not msgs:
            break
        
        for msg in msgs:
            if not msg.message and not msg.media:
                continue
            
            # Extract text
            text = msg.message or ''
            
            # Extract media
            images = []
            videos = []
            local_files = []
            
            if msg.media:
                # Determine file extension and type
                if isinstance(msg.media, MessageMediaPhoto):
                    # Photo
                    ext = '.jpg'
                    fname = f"photo_{msg.id}{ext}"
                    save_path = os.path.join(MEDIA_DIR, fname)
                    try:
                        await client.download_media(msg, save_path)
                        if os.path.exists(save_path) and os.path.getsize(save_path) > 0:
                            rel = os.path.relpath(save_path, DATA_DIR)
                            images.append(rel)
                            local_files.append(save_path)
                            print(f"    Downloaded photo: {fname}")
                    except Exception as e:
                        print(f"    Error downloading photo msg {msg.id}: {e}")
                
                elif isinstance(msg.media, MessageMediaDocument):
                    doc = msg.media.document
                    mime = doc.mime_type or ''
                    is_video = mime.startswith('video/')
                    is_image = mime.startswith('image/') or mime == 'image/jpeg'
                    is_gif = mime == 'image/gif'
                    
                    if is_video or is_gif:
                        ext = '.mp4' if is_video else '.gif'
                        fname = f"video_{msg.id}{ext}"
                        save_path = os.path.join(MEDIA_DIR, fname)
                        try:
                            await client.download_media(msg, save_path)
                            if os.path.exists(save_path) and os.path.getsize(save_path) > 0:
                                rel = os.path.relpath(save_path, DATA_DIR)
                                videos.append(rel)
                                local_files.append(save_path)
                                print(f"    Downloaded video: {fname}")
                        except Exception as e:
                            print(f"    Error downloading video msg {msg.id}: {e}")
                    
                    elif is_image or any(attr.mime_type and attr.mime_type.startswith('image/') for attr in doc.attributes if hasattr(attr, 'mime_type')):
                        ext = '.jpg'
                        fname = f"doc_img_{msg.id}{ext}"
                        save_path = os.path.join(MEDIA_DIR, fname)
                        try:
                            await client.download_media(msg, save_path)
                            if os.path.exists(save_path) and os.path.getsize(save_path) > 0:
                                rel = os.path.relpath(save_path, DATA_DIR)
                                images.append(rel)
                                local_files.append(save_path)
                                print(f"    Downloaded doc image: {fname}")
                        except Exception as e:
                            print(f"    Error downloading doc img msg {msg.id}: {e}")

            # Links in text
            links = re.findall(r'https?://t\.me/\S+|https?://[^\s]+', text)
            
            msg_out = {
                "id": msg.id,
                "date": (msg.date.astimezone(timezone(timedelta(hours=8))).isoformat() if msg.date else ''),
                "timestamp": int(msg.date.timestamp()) if msg.date else 0,
                "text": clean_text(text),
                "images": images,
                "videos": videos,
                "links": links,
                "level": classify_post(text),
            }
            all_msgs.append(msg_out)
        
        offset_id = msgs[-1].id
        elapsed = time.time() - start_time
        print(f"  Fetched: {len(all_msgs):4d}/{total or '?'} | offset: {offset_id} | {elapsed:.0f}s")
        
        # Progress indicator: are we running low?
        if len(all_msgs) >= (total or 999999) - 10:
            break
    
    print(f"\nFetched {len(all_msgs)} messages total")
    
    # Sort by timestamp
    all_msgs.sort(key=lambda x: x['timestamp'])
    
    # Reassign sequential IDs
    for i, m in enumerate(all_msgs):
        m['id'] = i
    
    # Save
    clean_path = os.path.join(DATA_DIR, "messages_telethon.json")
    with open(clean_path, 'w', encoding='utf-8') as f:
        json.dump(all_msgs, f, ensure_ascii=False, indent=1)
    print(f"Saved: {clean_path}")
    
    # Daily index
    daily = defaultdict(list)
    for m in all_msgs:
        day = m['date'][:10] if m['date'] else 'unknown'
        daily[day].append(m['id'])
    daily_path = os.path.join(DATA_DIR, "messages_daily_telethon.json")
    with open(daily_path, 'w', encoding='utf-8') as f:
        json.dump(dict(daily), f, ensure_ascii=False, indent=1)
    
    # Copy media
    data_media = os.path.join(DATA_DIR, "media")
    for fname in os.listdir(MEDIA_DIR):
        src = os.path.join(MEDIA_DIR, fname)
        if os.path.isfile(src):
            shutil.copy2(src, os.path.join(data_media, fname))
    
    # Copy to runner tg/
    os.makedirs(RUNNER_TG_DIR, exist_ok=True)
    runner_media = os.path.join(RUNNER_TG_DIR, "media")
    os.makedirs(runner_media, exist_ok=True)
    for fname in os.listdir(MEDIA_DIR):
        src = os.path.join(MEDIA_DIR, fname)
        if os.path.isfile(src):
            shutil.copy2(src, os.path.join(runner_media, fname))
    shutil.copy2(clean_path, os.path.join(RUNNER_TG_DIR, "messages_telethon.json"))
    shutil.copy2(daily_path, os.path.join(RUNNER_TG_DIR, "messages_daily_telethon.json"))
    
    # Stats
    with_img = sum(1 for m in all_msgs if m['images'])
    with_vid = sum(1 for m in all_msgs if m['videos'])
    media_count = sum(1 for f in os.listdir(MEDIA_DIR) if os.path.isfile(os.path.join(MEDIA_DIR, f)))
    
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"  Messages: {len(all_msgs)}")
    print(f"  With images: {with_img}")
    print(f"  With videos: {with_vid}")
    print(f"  Media files: {media_count}")
    print(f"{'='*60}")
    
    await client.disconnect()

asyncio.run(main())

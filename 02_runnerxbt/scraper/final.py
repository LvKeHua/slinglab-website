"""Download @RunnerXBT_Insights all messages + media"""
import asyncio, os, sys, json
sys.stdout.reconfigure(encoding='utf-8')

BASE = r'D:\Vibe Coding 项目合集\runnerxbt'
MEDIA = os.path.join(BASE, 'data', 'media')
SESSION = os.path.join(BASE, 'scraper', 'tg_session')
os.makedirs(MEDIA, exist_ok=True)

API_ID = 32862414
API_HASH = 'ef44e2d6868e8614646abb59c58aaa05'

async def main():
    from telethon import TelegramClient, errors
    from telethon.sessions import MemorySession
    from telethon.network.connection import ConnectionTcpFull
    
    # Clean old session files
    for f in os.listdir(os.path.join(BASE, 'scraper')):
        if f.endswith('.session') or f.startswith('_test'):
            try: os.remove(os.path.join(BASE, 'scraper', f))
            except: pass
    
    client = TelegramClient(SESSION, API_ID, API_HASH, connection=ConnectionTcpFull)
    # Force port 80 for initial connection (443 was getting blocked)
    client.session.set_dc(2, '149.154.175.50', 80)
    await client.connect()
    print('✅ Connected')
    
    if not await client.is_user_authorized():
        print('🔑 QR Login')
        qr = await client.qr_login()
        
        html = f'''<!DOCTYPE html><html><head><meta charset="utf-8"><title>Telegram QR</title>
<style>body{{display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1a1a2e;font-family:sans-serif}}
.card{{background:#16213e;padding:40px;border-radius:16px;text-align:center}}
img{{width:280px;background:white;padding:8px;border-radius:8px}}
p{{color:#888;margin-top:16px}}</style></head>
<body><div class="card"><img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={qr.url}"><p>Scan QR with Telegram mobile</p></div></body></html>'''
        path = os.path.join(BASE, 'scraper', 'qr.html')
        with open(path, 'w', encoding='utf-8') as f: f.write(html)
        import webbrowser
        webbrowser.open('file:///' + path.replace('\\', '/'))
        print('✅ QR in browser — scan with Telegram mobile (Settings > Devices > Scan QR)')
        print('⏳ Waiting 5 min...')
        
        try:
            await asyncio.wait_for(qr.wait(), timeout=300)
        except errors.SessionPasswordNeededError:
            pw = input('🔒 2FA password (invisible): ')
            await client.sign_in(password=pw)
        
        me = await client.get_me()
        print(f'✅ Logged in: {me.first_name} @{me.username or ""}')
    
    # Get channel
    channel = await client.get_entity('@RunnerXBT_Insights')
    print(f'📢 {channel.title}')
    
    # Load existing messages
    out_path = os.path.join(BASE, 'data', 'messages_final.json')
    existing_ids = set()
    if os.path.exists(out_path):
        with open(out_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
        existing_ids = {m['id'] for m in existing}
        print(f'📁 Existing: {len(existing)} messages')
    
    info = await client.get_messages(channel, limit=1)
    print(f'📊 Total: {info.total} messages')
    
    # Download all messages
    msgs = []
    media_count = 0
    
    async for msg in client.iter_messages(channel, limit=10000):
        if msg.id in existing_ids:
            continue
        
        entry = {
            'id': msg.id,
            'date': msg.date.isoformat() if msg.date else None,
            'text': msg.text or '',
            'has_media': msg.media is not None,
        }
        
        if msg.media:
            fname = f'msg_{msg.id}.jpg'
            fpath = os.path.join(MEDIA, fname)
            if not os.path.exists(fpath):
                try:
                    dl = await client.download_media(msg, file=fpath)
                    if dl: media_count += 1
                except Exception as e:
                    print(f'  ⚠️ msg {msg.id}: {type(e).__name__}')
            entry['media_path'] = f'/media/{fname}'
        
        msgs.append(entry)
        if len(msgs) % 300 == 0:
            print(f'  ... {len(msgs)} new, {media_count} media')
    
    # Merge and save
    all_msgs = existing + msgs if existing_ids else msgs
    all_msgs.sort(key=lambda m: m['id'], reverse=True)
    
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(all_msgs, f, ensure_ascii=False, indent=2)
    
    print(f'\n✅ Done! {len(all_msgs)} total (+{len(msgs)} new, {media_count} media DLed)')
    await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())

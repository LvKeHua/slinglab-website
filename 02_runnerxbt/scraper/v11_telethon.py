"""Telethon: download @RunnerXBT_Insights messages + media"""
import asyncio, os, sys, json
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r'D:\Vibe Coding 项目合集\runnerxbt'
SESSION_PATH = os.path.join(BASE_DIR, 'scraper', 'telegram_session')
MEDIA_DIR = os.path.join(BASE_DIR, 'data', 'media')
os.makedirs(MEDIA_DIR, exist_ok=True)

API_ID = 32862414
API_HASH = 'ef44e2d6868e8614646abb59c58aaa05'

async def main():
    from telethon import TelegramClient, errors
    
    client = TelegramClient(SESSION_PATH, API_ID, API_HASH)
    await client.connect()
    
    if not await client.is_user_authorized():
        print("🔄 Starting QR login...")
        qr = await client.qr_login()
        url = qr.url
        
        # Save QR HTML
        html = f'''<!DOCTYPE html><html><head><meta charset="utf-8"><title>Telegram QR</title>
<style>body{{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#1a1a2e;font-family:sans-serif}}
.card{{background:#16213e;padding:40px;border-radius:16px;text-align:center}}
img{{width:280px;background:white;padding:8px;border-radius:8px}}
p{{color:#888;margin-top:16px}}</style></head>
<body><div class="card"><img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={url}" alt="QR">
<p>Scan with Telegram mobile</p></div></body></html>'''
        html_path = os.path.join(BASE_DIR, 'scraper', 'qr.html')
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
        
        import webbrowser
        webbrowser.open(f'file://{html_path}')
        print("✅ QR code opened in browser — scan with Telegram mobile phone app")
        
        try:
            await asyncio.wait_for(qr.wait(), timeout=120)
        except asyncio.TimeoutError:
            print("⏰ Timed out. Please scan next time.")
            await client.disconnect()
            return
        except errors.SessionPasswordNeededError:
            print("🔒 2FA required — enter your Telegram password (invisible typing):")
            import getpass
            pw = getpass.getpass("Password: ")
            await client.sign_in(password=pw)
        
        me = await client.get_me()
        print(f"✅ Logged in as: {me.first_name}")
    
    # Download channel
    channel = await client.get_entity('@RunnerXBT_Insights')
    print(f"📢 Channel: {channel.title}")
    
    all_msgs = []
    media_count = 0
    
    async for msg in client.iter_messages(channel, limit=10000):
        entry = {
            'id': msg.id,
            'date': msg.date.isoformat() if msg.date else None,
            'text': msg.text or '',
            'has_media': msg.media is not None,
        }
        
        if msg.media:
            fname = f"msg_{msg.id}.jpg"
            fpath = os.path.join(MEDIA_DIR, fname)
            if not os.path.exists(fpath):
                try:
                    await client.download_media(msg, file=fpath)
                    media_count += 1
                except Exception as e:
                    print(f"  ⚠️ msg {msg.id} media failed: {e}")
            entry['media_path'] = f"/media/{fname}"
        
        all_msgs.append(entry)
        
        if len(all_msgs) % 500 == 0:
            print(f"  ... {len(all_msgs)} msgs, {media_count} media files")
    
    # Save
    out = os.path.join(BASE_DIR, 'data', 'messages_telethon.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(all_msgs, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Done: {len(all_msgs)} messages, {media_count} new media files")
    await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())

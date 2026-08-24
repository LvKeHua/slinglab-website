"""Telethon QR Login - scan QR code from Telegram mobile app"""
import asyncio, os, sys, json, time
import telethon
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r'D:\Vibe Coding 项目合集\runnerxbt'
SESSION_PATH = os.path.join(BASE_DIR, 'scraper', 'runner_session')
MEDIA_DIR = os.path.join(BASE_DIR, 'data', 'media')
os.makedirs(MEDIA_DIR, exist_ok=True)

async def qr_login():
    from telethon import TelegramClient
    
    API_ID = 32862414
    API_HASH = 'ef44e2d6868e8614646abb59c58aaa05'
    
    client = TelegramClient(SESSION_PATH, API_ID, API_HASH)
    await client.connect()
    
    if await client.is_user_authorized():
        me = await client.get_me()
        print(f"✅ Already authorized as: {me.first_name} (@{me.username or 'N/A'})")
        return client
    
    print("🔄 Starting QR login...")
    qr_login = await client.qr_login()
    
    print(f"\n📱 Scan the QR code with your Telegram mobile app!")
    print(f"   (Go to Settings > Devices > Scan QR)")
    
    # Generate QR code as HTML and open in browser
    url = qr_login.url
    print(f"\n   TG Login URL: {url}")
    
    # Create HTML file with QR code using Google Charts API
    qr_html = f'''<!DOCTYPE html><html><head><meta charset="utf-8"><title>Telegram QR Login</title>
<style>body{{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#1a1a2e;font-family:Arial,sans-serif}}
.card{{background:#16213e;padding:40px;border-radius:16px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3)}}
h2{{color:#e0e0e0;margin-bottom:24px}}
img{{width:280px;height:280px;border-radius:8px;background:white;padding:8px}}
p{{color:#888;margin-top:16px;font-size:14px}}</style></head>
<body><div class="card"><h2>📱 Telegram Login</h2>
<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={url}" alt="QR Code">
<p>Scan with Telegram mobile app</p></div></body></html>'''
    
    html_path = os.path.join(BASE_DIR, 'scraper', 'telegram_qr_login.html')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(qr_html)
    
    # Open in browser
    import webbrowser
    webbrowser.open(f'file://{html_path}')
    print(f"   QR code opened in browser: {html_path}")
    
    print(f"\n⏳ Waiting for scan (timeout: 120 seconds)...")
    
    try:
        # Wait for login with timeout
        await asyncio.wait_for(qr_login.wait(), timeout=120)
        me = await client.get_me()
        print(f"\n✅ Login successful! Logged in as: {me.first_name} (@{me.username or 'N/A'})")
        return client
    except asyncio.TimeoutError:
        print("\n❌ QR login timed out")
        # Try once more
        print("🔄 Retrying QR login once...")
        try:
            qr_login2 = await client.qr_login()
            url2 = qr_login2.url
            qr_html2 = f'''<!DOCTYPE html><html><head><meta charset="utf-8"><title>Telegram QR Login</title>
<style>body{{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#1a1a2e;font-family:Arial,sans-serif}}
.card{{background:#16213e;padding:40px;border-radius:16px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3)}}
h2{{color:#e0e0e0;margin-bottom:24px}}
img{{width:280px;height:280px;border-radius:8px;background:white;padding:8px}}
p{{color:#888;margin-top:16px;font-size:14px}}</style></head>
<body><div class="card"><h2>📱 Telegram Login</h2>
<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={url2}" alt="QR Code">
<p>Scan with Telegram mobile app</p></div></body></html>'''
            html_path2 = os.path.join(BASE_DIR, 'scraper', 'telegram_qr_login.html')
            with open(html_path2, 'w', encoding='utf-8') as f:
                f.write(qr_html2)
            webbrowser.open(f'file://{html_path2}')
            print("   QR code refreshed in browser - please scan again")
            await asyncio.wait_for(qr_login2.wait(), timeout=120)
            me = await client.get_me()
            print(f"\n✅ Login successful! Logged in as: {me.first_name} (@{me.username or 'N/A'})")
            return client
        except asyncio.TimeoutError:
            print("\n❌ QR login timed out again")
            await client.disconnect()
            return None
        except telethon.errors.rpcerrorlist.SessionPasswordNeededError:
            return await handle_2fa(client)
    except telethon.errors.rpcerrorlist.SessionPasswordNeededError:
        return await handle_2fa(client)

async def handle_2fa(client):
    """Handle two-step verification password"""
    print("\n🔐 Two-step verification is enabled!")
    print("Please enter your Telegram 2FA password (will not be shown on screen).")
    from getpass import getpass
    password = getpass("2FA Password: ")
    try:
        await client.sign_in(password=password)
        me = await client.get_me()
        print(f"\n✅ Login successful! Logged in as: {me.first_name} (@{me.username or 'N/A'})")
        return client
    except telethon.errors.rpcerrorlist.PasswordHashInvalidError:
        print("\n❌ Wrong password!")
        password = getpass("Try again: ")
        await client.sign_in(password=password)
        me = await client.get_me()
        print(f"\n✅ Login successful! Logged in as: {me.first_name} (@{me.username or 'N/A'})")
        return client

async def download_channel_media(client, channel_username):
    """Download all media from channel messages"""
    from telethon.tl.types import MessageMediaPhoto, MessageMediaDocument
    
    try:
        channel = await client.get_entity(channel_username)
        print(f"\n📢 Channel: {channel.title} (ID: {channel.id})")
    except Exception as e:
        print(f"❌ Could not find channel: {e}")
        return
    
    # Count messages first
    total = await client.get_messages(channel, limit=1)
    total_count = total.total
    print(f"📊 Total messages: {total_count}")
    
    # Load existing messages_final to know which messages need media
    mf_path = os.path.join(BASE_DIR, 'data', 'messages_final.json')
    if os.path.exists(mf_path):
        with open(mf_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
        print(f"📁 Loaded existing messages_final.json: {len(existing)} messages")
        
        # Find messages with dead blob URLs that need media
        need_media = [m for m in existing if m.get('image_url', '').startswith('blob:')]
        print(f"🔴 Messages with dead blob URLs needing media: {len(need_media)}")
    else:
        existing = None
        need_media = []
        print("⚠️ No existing messages_final.json found")
    
    # Download all messages from the channel
    print(f"\n⏳ Downloading up to {total_count} messages from channel...")
    all_messages = []
    media_count = 0
    
    async for msg in client.iter_messages(channel, limit=total_count):
        msg_data = {
            'id': msg.id,
            'date': msg.date.isoformat() if msg.date else None,
            'text': msg.text or '',
            'has_media': msg.media is not None,
        }
        
        # Download media if present
        if msg.media:
            media_path = None
            if isinstance(msg.media, (MessageMediaPhoto, MessageMediaDocument)):
                ext = '.jpg'
                if hasattr(msg.media, 'document') and msg.media.document:
                    # Check for actual file extension
                    attrs = msg.media.document.attributes
                    for attr in attrs:
                        if hasattr(attr, 'file_name') and attr.file_name:
                            ext = os.path.splitext(attr.file_name)[1] or '.bin'
                            break
                
                media_filename = f"channel_{channel.id}_msg_{msg.id}{ext}"
                media_filepath = os.path.join(MEDIA_DIR, media_filename)
                
                if not os.path.exists(media_filepath):
                    try:
                        await client.download_media(msg, file=media_filepath)
                        media_count += 1
                        print(f"  📥 Downloaded media for msg {msg.id} -> {media_filename}")
                    except Exception as e:
                        print(f"  ⚠️ Failed to download msg {msg.id} media: {e}")
                else:
                    print(f"  ✅ Media for msg {msg.id} already exists")
                
                media_path = f"/media/{media_filename}"
            
            msg_data['media_path'] = media_path
            msg_data['media_filename'] = media_filename if media_path else None
        
        all_messages.append(msg_data)
        
        if len(all_messages) % 500 == 0:
            print(f"  ... {len(all_messages)} messages processed ({media_count} media files downloaded)")
    
    print(f"\n✅ Done! {len(all_messages)} messages, {media_count} new media files downloaded")
    
    # Save all messages
    all_path = os.path.join(BASE_DIR, 'data', 'messages_telethon.json')
    with open(all_path, 'w', encoding='utf-8') as f:
        json.dump(all_messages, f, ensure_ascii=False, indent=2)
    print(f"💾 Saved all messages to {all_path}")
    
    await client.disconnect()
    return all_messages

async def main():
    # Step 1: QR Login
    client = await qr_login()
    if not client:
        print("❌ Could not authenticate")
        return
    
    try:
        # Step 2: Download @RunnerXBT_Insights messages and media
        await download_channel_media(client, '@RunnerXBT_Insights')
    except KeyboardInterrupt:
        print("\n⏹️ Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())

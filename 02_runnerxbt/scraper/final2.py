"""Complete 2FA login and download @RunnerXBT_Insights"""
import asyncio, os, sys, json
sys.stdout.reconfigure(encoding='utf-8')

BASE = r'D:\Vibe Coding 项目合集\runnerxbt'
MEDIA = os.path.join(BASE, 'data', 'media')
SESSION = os.path.join(BASE, 'scraper', 'tg_session')
os.makedirs(MEDIA, exist_ok=True)

API_ID = 32862414
API_HASH = 'ef44e2d6868e8614646abb59c58aaa05'
PASSWORD = '24681357lxy'

async def main():
    from telethon import TelegramClient, errors
    
    client = TelegramClient(SESSION, API_ID, API_HASH)
    await client.connect()
    print('✅ Connected')
    
    if not await client.is_user_authorized():
        print('🔑 Need 2FA password...')
        try:
            await client.sign_in(password=PASSWORD)
            print('✅ 2FA passed!')
        except errors.PasswordHashInvalidError:
            print('❌ Wrong password!')
            await client.disconnect()
            return
        except Exception as e:
            print(f'❌ Error: {type(e).__name__}: {e}')
            await client.disconnect()
            return
    
    # Get channel
    channel = await client.get_entity('@RunnerXBT_Insights')
    print(f'📢 {channel.title}')
    
    # Load existing
    out_path = os.path.join(BASE, 'data', 'messages_final.json')
    existing_ids = set()
    if os.path.exists(out_path):
        with open(out_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
        existing_ids = {m['id'] for m in existing}
        print(f'📁 Existing: {len(existing)} messages')
    
    info = await client.get_messages(channel, limit=1)
    print(f'📊 Total: {info.total} messages')
    
    # Download
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
    
    # Merge
    all_msgs = existing + msgs if existing_ids else msgs
    all_msgs.sort(key=lambda m: m['id'], reverse=True)
    
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(all_msgs, f, ensure_ascii=False, indent=2)
    
    print(f'\n✅ Done! {len(all_msgs)} total (+{len(msgs)} new, {media_count} media DLed)')
    me = await client.get_me()
    print(f'👤 Logged in as: {me.first_name}')
    await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())

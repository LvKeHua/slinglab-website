"""Use Telethon to read Telegram Desktop local session"""
import asyncio, json, os, sys
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r'D:\Vibe Coding 项目合集\runnerxbt'
TDATA_DIR = r'D:\Telegram\Telegram Desktop\tdata'
ACCOUNT_HASH = 'D877F783D5D3EF8C'

async def main():
    # Check account directory
    acct_dir = os.path.join(TDATA_DIR, ACCOUNT_HASH)
    print(f"Account directory: {acct_dir}")
    if os.path.exists(acct_dir):
        files = os.listdir(acct_dir)
        print(f"  Files ({len(files)}):")
        for f in sorted(files)[:30]:
            fpath = os.path.join(acct_dir, f)
            size = os.path.getsize(fpath) if os.path.isfile(fpath) else '(dir)'
            print(f"    {f}: {size}")
    else:
        print("  NOT FOUND")

    # Check auth/key files
    auth_file = os.path.join(TDATA_DIR, f'{ACCOUNT_HASH}s')
    key_file = os.path.join(TDATA_DIR, 'key_datas')
    print(f"\nAuth file ({auth_file}): {os.path.getsize(auth_file) if os.path.exists(auth_file) else 'NOT FOUND'} bytes")
    print(f"Key file ({key_file}): {os.path.getsize(key_file) if os.path.exists(key_file) else 'NOT FOUND'} bytes")

    # Check user_data
    udir = os.path.join(TDATA_DIR, 'user_data')
    if os.path.exists(udir):
        udir_items = os.listdir(udir)
        print(f"\nuser_data items: {len(udir_items)}")
        if udir_items:
            sub = os.path.join(udir, udir_items[0])
            if os.path.isdir(sub):
                print(f"  First subdir '{udir_items[0]}': {len(os.listdir(sub))} items")

    # Try Telethon
    print(f"\n\nTrying Telethon with TDesktop...")
    from telethon import TelegramClient
    from telethon.sessions import TDesktopSession
    
    api_id = 2496
    api_hash = '8da85b0d0675be02224ac1a1e0c5cef0'
    session_path = os.path.join(BASE_DIR, 'scraper', '_td_session')
    
    # Try to create a client using TDesktop's tdata
    try:
        # Method: Use TDesktopSession directly
        tdata_session = TDesktopSession(TDATA_DIR)
        print(f"TDesktopSession created: {type(tdata_session).__name__}")
        
        client = TelegramClient(tdata_session, api_id, api_hash)
        await client.connect()
        
        if await client.is_user_authorized():
            me = await client.get_me()
            print(f"  ✅ Authorized! Logged in as: {me.first_name} {me.last_name or ''} (@{me.username or 'no username'})")
            
            # Get the channel
            channel = await client.get_entity('@RunnerXBT_Insights')
            print(f"  Channel: {channel.title} (ID: {channel.id})")
            
            # Get message count
            from telethon.tl.functions.messages import GetHistoryRequest
            history = await client(GetHistoryRequest(
                peer=channel,
                offset_id=0,
                offset_date=None,
                add_offset=0,
                limit=1,
                max_id=0,
                min_id=0,
                hash=0,
            ))
            total = history.count if history.count else 0
            print(f"  Total messages: {total}")
            
            await client.disconnect()
        else:
            print("  ❌ Not authorized via TDesktopSession")
    except Exception as e:
        print(f"  ❌ Error: {type(e).__name__}: {e}")
    
    # Fallback: try regular session file
    print(f"\n\nTrying regular session file...")
    try:
        client2 = TelegramClient(session_path, api_id, api_hash)
        await client2.connect()
        if await client2.is_user_authorized():
            print("  ✅ Session file works!")
            me = await client2.get_me()
            print(f"  User: {me.first_name}")
        else:
            print("  ❌ Session file not authorized")
        await client2.disconnect()
    except Exception as e:
        print(f"  ❌ Error: {type(e).__name__}: {e}")

if __name__ == '__main__':
    asyncio.run(main())

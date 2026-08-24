"""Quick QR login test"""
import asyncio, sys, os, webbrowser
sys.stdout.reconfigure(encoding='utf-8')

async def main():
    from telethon import TelegramClient, errors
    
    client = TelegramClient('test_session3', 32862414, 'ef44e2d6868e8614646abb59c58aaa05')
    await client.connect()
    print('connected, requesting QR...')
    
    qr = await client.qr_login()
    print('QR URL:', qr.url)
    
    # Save HTML
    html = f'''<!DOCTYPE html><html><head><meta charset="utf-8"><title>Telegram QR</title>
<style>body{{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#1a1a2e;font-family:sans-serif}}
.card{{background:#16213e;padding:40px;border-radius:16px;text-align:center}}
img{{width:280px;background:white;padding:8px;border-radius:8px}}
p{{color:#888}}</style></head>
<body><div class="card"><img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={qr.url}"><p>Scan with Telegram mobile</p></div></body></html>'''
    
    path = r'D:\Vibe Coding 项目合集\runnerxbt\scraper\qr.html'
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    
    webbrowser.open('file:///' + path.replace('\\', '/'))
    print('✅ QR code opened in browser')
    print('⏳ Waiting for scan (5 min)...')
    
    try:
        await asyncio.wait_for(qr.wait(), timeout=300)
        print('✅ Scanned!')
    except asyncio.TimeoutError:
        print('❌ Timed out')
        await client.disconnect()
        return
    except errors.SessionPasswordNeededError:
        print('🔒 2FA required')
        from getpass import getpass
        pw = getpass('🔒 2FA password: ')
        await client.sign_in(password=pw)
        print('✅ 2FA passed!')
    
    me = await client.get_me()
    print(f'✅ Logged in as: {me.first_name}')
    
    await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())

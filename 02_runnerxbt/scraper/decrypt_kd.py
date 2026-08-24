"""Try WinRT DataProtection to decrypt key_datas"""
import asyncio, sys
sys.stdout.reconfigure(encoding='utf-8')

async def main():
    from winsdk.windows.security.cryptography import CryptographicBuffer
    from winsdk.windows.security.cryptography.dataprotection import DataProtectionProvider
    
    with open(r'D:\Telegram\Telegram Desktop\tdata\key_datas', 'rb') as f:
        raw = f.read()
    
    data = raw[8:]  # skip TDF header
    buf = CryptographicBuffer.create_from_byte_array(bytes(data))
    
    for desc in ['', 'LOCAL=user', 'LOCAL=machine']:
        try:
            if desc:
                prov = DataProtectionProvider(desc)
            else:
                prov = DataProtectionProvider()
            r = await prov.unprotect_async(buf)
            b = bytes(CryptographicBuffer.copy_to_byte_array(r))
            print(f'SUCCESS desc="{desc}": {len(b)} bytes: {b[:64].hex()}')
            return
        except Exception as e:
            msg = str(e).splitlines()[0][:100]
            print(f'FAIL desc="{desc}": {msg}')
    
    # Also try with specific entropy - maybe the data is not DPAPI at all
    print('\nChecking if key_datas is plaintext/other format...')
    print(f'data[0:4] = {data[0:4].hex()} (int: {int.from_bytes(data[0:4], "little")})')
    print(f'data[4:8] = {data[4:8].hex()}')
    print(f'data[8:12] = {data[8:12].hex()}')
    print(f'data[12:44] (32 bytes) = {data[12:44].hex()}')
    print(f'data[44:48] = {data[44:48].hex()}')

asyncio.run(main())

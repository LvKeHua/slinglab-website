"""Extract Telegram Desktop auth key via DPAPI & decrypt database"""
import os, struct, hashlib, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
sys.stdout.reconfigure(encoding='utf-8')

TDATA = r'D:\Telegram\Telegram Desktop\tdata'
ACCT = 'D877F783D5D3EF8C'

def tdf_parse(data):
    assert data[:4] == b'TDF$', f'Bad magic: {data[:4]}'
    ver = struct.unpack('<I', data[4:8])[0]
    rest = data[8:]
    return ver, rest

# Read key_datas
with open(os.path.join(TDATA, 'key_datas'), 'rb') as f:
    kd = f.read()
ver, kd_data = tdf_parse(kd)
print(f'key_datas version: {ver:#x}, remaining: {len(kd_data)} bytes')
print(f'  First 64 bytes hex: {kd_data[:64].hex()}')

# The key_datas might not use DPAPI directly in newer versions.
# Let me look at the raw structure.
# On Windows, TDesktop derives the key differently.

# Try the approach from tdata-tool: read kd directly,
# the format might be: records of [type(4) + len(4) + data(len)]
pos = 0
records = []
while pos < len(kd_data) - 8:
    rec_type = struct.unpack('<I', kd_data[pos:pos+4])[0]
    rec_len = struct.unpack('<I', kd_data[pos+4:pos+8])[0]
    if rec_len > 1024 or rec_len == 0:
        break
    rec_data = kd_data[pos+8:pos+8+rec_len]
    records.append((rec_type, rec_len, rec_data))
    print(f'  Record: type={rec_type:#x}, len={rec_len}')
    pos += 8 + rec_len

# Read auth *s file
with open(os.path.join(TDATA, f'{ACCT}s'), 'rb') as f:
    sf = f.read()
ver_s, sf_data = tdf_parse(sf)
print(f'\nAuth *s file version: {ver_s:#x}, remaining: {len(sf_data)} bytes')
print(f'  First 64 bytes: {sf_data[:64].hex()}')

# Parse records in *s file  
pos = 0
s_records = []
while pos < len(sf_data) - 8:
    rec_type = struct.unpack('<I', sf_data[pos:pos+4])[0]
    rec_len = struct.unpack('<I', sf_data[pos+4:pos+8])[0]
    if rec_len > 4096 or rec_len == 0:
        break
    rec_data = sf_data[pos+8:pos+8+rec_len]
    s_records.append((rec_type, rec_len, rec_data))
    print(f'  Record: type={rec_type:#x}, len={rec_len}')
    pos += 8 + rec_len
    if len(s_records) >= 10:
        break

# If we found a key in kd records, try to decrypt s records
if records:
    for rtype, rlen, rdata in records:
        print(f'\nTrying record type {rtype:#x} len {rlen} as AES key...')
        if rlen >= 32:
            key = rdata[:32]
        else:
            key = hashlib.sha256(rdata).digest()
        
        # Try to decrypt s records with this key
        for stype, slen, sdata in s_records:
            # sdata might be: [nonce(12) + ciphertext]
            if len(sdata) < 12:
                continue
            nonce = sdata[:12]
            ct = sdata[12:]
            try:
                aes = AESGCM(key)
                dec = aes.decrypt(nonce, ct, None)
                print(f'  ✅ DECRYPTED! type={stype:#x}')
                print(f'  Decrypted ({len(dec)} bytes): {dec.hex()[:200]}')
                # Extract auth key from decrypted data
                # Format: DC ID (4) + auth_key (256) ...
                if len(dec) >= 260:
                    dc = struct.unpack('<I', dec[:4])[0]
                    auth_key = dec[4:260]
                    print(f'  DC: {dc}')
                    print(f'  Auth key: {auth_key.hex()[:64]}...')
                    print(f'\n🎉 SUCCESS! Auth key extracted!')
            except Exception as e:
                pass

print('\nDone.')

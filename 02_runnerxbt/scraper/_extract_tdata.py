"""Extract authorization data from Telegram Desktop tdata files"""
import asyncio, os, struct, hashlib, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
sys.stdout.reconfigure(encoding='utf-8')

TDATA_DIR = r'D:\Telegram\Telegram Desktop\tdata'
ACCT_HASH = 'D877F783D5D3EF8C'

def read_tdf_header(data):
    """Read TDF$ prefixed file header"""
    assert data[:4] == b'TDF$', f"Not a TDF file: {data[:4]}"
    data_len = struct.unpack('<I', data[4:8])[0]
    rest = data[8:]
    return data_len, rest

def decrypt_key_datas():
    """Decrypt key_datas using Windows DPAPI"""
    import win32crypt
    
    path = os.path.join(TDATA_DIR, 'key_datas')
    with open(path, 'rb') as f:
        raw = f.read()
    
    data_len, enc_data = read_tdf_header(raw)
    print(f"key_datas: data_len={data_len}, enc_size={len(enc_data)}")
    print(f"  enc_data[:32]: {enc_data[:32].hex()}")
    
    # Decrypt using DPAPI
    try:
        import ctypes
        from ctypes import wintypes
        
        # CRYPTPROTECT_UI_FORBIDDEN = 0x01
        class DATA_BLOB(ctypes.Structure):
            _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_byte))]
        
        crypt32 = ctypes.windll.crypt32
        LocalFree = ctypes.windll.kernel32.LocalFree
        
        # Prepare input blob
        pData = ctypes.c_char_p(enc_data)
        pBlob = DATA_BLOB(len(enc_data), ctypes.cast(pData, ctypes.POINTER(ctypes.c_byte)))
        pBlobOut = DATA_BLOB(0, None)
        
        # CryptUnprotectData
        result = crypt32.CryptUnprotectData(
            ctypes.byref(pBlob),
            None,  # pDataDescr
            None,  # pOptionalEntropy
            None,  # pvReserved
            None,  # pPromptStruct
            0x01,  # CRYPTPROTECT_UI_FORBIDDEN
            ctypes.byref(pBlobOut)
        )
        
        if not result:
            error = ctypes.GetLastError()
            print(f"DPAPI decrypt failed with error: {error}")
            # Try alternate: maybe need to prepend entropy
            print("Trying alternate approach...")
            return None
        
        # Extract decrypted data
        out_size = pBlobOut.cbData
        out_ptr = ctypes.cast(pBlobOut.pbData, ctypes.POINTER(ctypes.c_byte))
        decrypted = bytes(bytearray(out_ptr[i] for i in range(out_size)))
        LocalFree(pBlobOut.pbData)
        
        print(f"DPAPI decrypted: {len(decrypted)} bytes")
        print(f"  hex: {decrypted.hex()[:100]}")
        return decrypted
    
    except Exception as e:
        print(f"DPAPI error: {e}")
        return None

def try_aesgcm_decrypt(enc_data, key, nonce):
    """Try AES-GCM decryption"""
    try:
        aesgcm = AESGCM(key)
        result = aesgcm.decrypt(nonce, enc_data, None)
        return result
    except Exception as e:
        print(f"  AES-GCM failed: {e}")
        return None

def analyze_sfile():
    """Analyze the *s auth file"""
    path = os.path.join(TDATA_DIR, f'{ACCT_HASH}s')
    with open(path, 'rb') as f:
        raw = f.read()
    
    data_len, rest = read_tdf_header(raw)
    print(f"\nAuth file ({ACCT_HASH}s): data_len={data_len}, rest_size={len(rest)}")
    
    # The rest contains the encrypted data. First 4 bytes might be version/count
    version = struct.unpack('<I', rest[:4])[0]
    encrypted = rest[4:]
    print(f"  version_field={version}, encrypted_size={len(encrypted)}")
    print(f"  encrypted[:32]: {encrypted[:32].hex()}")
    
    return encrypted, version

def extract_tdata():
    """Main extraction"""
    print("=== Analyzing key_datas ===")
    decrypted_key = decrypt_key_datas()
    
    print("\n=== Analyzing auth file ===")
    encrypted, version = analyze_sfile()
    
    # Try to find the key from various sources
    if decrypted_key:
        print(f"\nTrying with DPAPI-decrypted key ({len(decrypted_key)} bytes)...")
        # The key format depends on the version
        # In newer versions: the decrypted key_datas contains the AES key directly
        if len(decrypted_key) >= 32:
            aes_key = decrypted_key[:32]
            print(f"  Using first 32 bytes as AES key")
        else:
            aes_key = hashlib.sha256(decrypted_key).digest()
            print(f"  Using SHA256 of key as AES key")
        
        # For AES-GCM, nonce is typically first 12/16 bytes of encrypted data
        # Version might tell us the nonce size
        nonce_size = 12 if version == 0 else 16 if version >= 1 else 12
        nonce = encrypted[:nonce_size]
        ciphertext = encrypted[nonce_size:]
        
        print(f"  nonce ({nonce_size}): {nonce.hex()}")
        result = try_aesgcm_decrypt(ciphertext, aes_key, nonce)
        if result:
            print(f"  ✅ DECRYPTED! ({len(result)} bytes)")
            print(f"  Content hex: {result.hex()[:200]}")
            print(f"  Content repr: {result[:50]}")
            # Parse the decrypted data (MTProto format)
            return result
    
    print("\n❌ Could not decrypt. Trying known methods...")
    return None

if __name__ == '__main__':
    extract_tdata()

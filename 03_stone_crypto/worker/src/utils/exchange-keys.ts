const LEGACY_KEY = "stone-deploy-2024"

function xorDecode(enc: string, key: string): string {
  const str = atob(enc)
  let r = ""
  for (let i = 0; i < str.length; i++)
    r += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  return r
}

export interface ExchangeKeyPair {
  apiKey: string
  secretKey: string
}

export interface ExchangeKeys {
  binance: ExchangeKeyPair | null
  bybit: ExchangeKeyPair | null
}

/**
 * Read XOR-encoded exchange API keys from KV storage and decode them with the
 * encryption key from the STONE_ENC_KEY secret binding (falling back to the
 * legacy hardcoded key so previously stored settings survive migration).
 * Returns null for any exchange that hasn't been configured.
 */
export async function getExchangeKeys(kv: KVNamespace, encKey?: string): Promise<ExchangeKeys> {
  const raw = await kv.get("settings_keys", "text")
  if (!raw) return { binance: null, bybit: null }
  try {
    const s = JSON.parse(raw) as Record<string, unknown>
    const result: ExchangeKeys = { binance: null, bybit: null }

    // XOR with the wrong key never throws — it silently produces garbage.
    // Only accept decryptions that are printable ASCII (real API keys/secret
    // keys are), otherwise fall back to the legacy key.
    const isPrintable = (v: string) => /^[\x20-\x7E]*$/.test(v)
    const decode = (enc: string): string | null => {
      if (encKey) {
        const v = xorDecode(enc, encKey)
        if (isPrintable(v)) return v
      }
      const legacy = xorDecode(enc, LEGACY_KEY)
      return isPrintable(legacy) ? legacy : null
    }

    if (s.binance && typeof s.binance === "object") {
      const b = s.binance as Record<string, string>
      const apiKey = decode(b.apiKey)
      const secretKey = decode(b.secretKey)
      if (apiKey && secretKey) {
        result.binance = { apiKey, secretKey }
      }
    }
    if (s.bybit && typeof s.bybit === "object") {
      const b = s.bybit as Record<string, string>
      const apiKey = decode(b.apiKey)
      const secretKey = decode(b.secretKey)
      if (apiKey && secretKey) {
        result.bybit = { apiKey, secretKey }
      }
    }
    return result
  } catch {
    return { binance: null, bybit: null }
  }
}

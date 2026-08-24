"""Insert demon (OI) relay support into relay.mjs."""
import io

SRC = 'relay_base.mjs'
DST = 'relay.mjs'

code = io.open(SRC, encoding='utf-8').read()

# 1) add consts after AUTH_KEY line
anchor_consts = "const AUTH_KEY = process.env.RELAY_AUTH_KEY;"
assert anchor_consts in code, 'consts anchor missing'
add_consts = (
    anchor_consts + "\n"
    "const DEMON_URL = process.env.DEMON_URL || 'https://app.slinglab.xyz/screener/api/relay-demon';\n"
    "const DEMON_RELAY_KEY = process.env.DEMON_RELAY_KEY || '0eb3f463c85e160bbedbec6b3131bb862bdd0c82ccf9f390';\n"
    "const DEMON_MIN_VOL = 300000;\n"
    "const DEMON_MAX_SYMBOLS = 300;\n"
    "const OI_CONCURRENCY = 20;"
)
code = code.replace(anchor_consts, add_consts, 1)

# 2) insert demon functions before main()
anchor_main = "async function main() {"
assert anchor_main in code, 'main anchor missing'
funcs = '''
// ─── 妖币扫描: Binance OI ──────────────────────────────────
async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

async function fetchOpenInterest(symbols) {
  const results = new Map();
  let idx = 0;
  async function worker() {
    while (idx < symbols.length) {
      const sym = symbols[idx++];
      try {
        const d = await fetchWithTimeout(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${sym}`);
        const oi = parseFloat(d.openInterest);
        if (!isNaN(oi)) results.set(sym, oi);
      } catch (e) {
        if (process.env.DEBUG) console.log(`OI ${sym}: FAILED ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(OI_CONCURRENCY, symbols.length) }, worker));
  return results;
}

async function relayDemon(binanceRows) {
  if (!Array.isArray(binanceRows) || binanceRows.length === 0) {
    console.log('Demon: no binance rows, skip');
    return;
  }
  const sorted = binanceRows.slice().sort((a, b) => (b.volume_24h_usdt || 0) - (a.volume_24h_usdt || 0));
  const candidates = sorted.filter(r => (r.volume_24h_usdt || 0) >= DEMON_MIN_VOL).slice(0, DEMON_MAX_SYMBOLS);
  if (candidates.length === 0) { console.log('Demon: no candidates, skip'); return; }
  console.log(`Demon: fetching OI for ${candidates.length} symbols...`);
  const oiMap = await fetchOpenInterest(candidates.map(r => r.symbol));
  console.log(`Demon: got ${oiMap.size} OI values`);
  const payload = [];
  for (const r of sorted) {
    const oi = oiMap.get(r.symbol);
    if (oi == null) continue;
    const oiValue = oi * r.price;
    payload.push({
      symbol: r.symbol,
      base_asset: r.base_asset,
      price: r.price,
      change_24h_pct: r.change_24h_pct,
      amplitude_24h_pct: r.amplitude_24h_pct,
      volume_24h_usdt: r.volume_24h_usdt,
      trade_count: r.trade_count || 0,
      oi_value: Math.round(oiValue * 100) / 100,
      oi_contracts: oi,
      volume_oi_ratio: oiValue > 0 ? Math.round((r.volume_24h_usdt / oiValue) * 10000) / 10000 : 0,
    });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const resp = await fetch(DEMON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Key': DEMON_RELAY_KEY },
      body: JSON.stringify({ data: payload }),
      signal: controller.signal,
    });
    const result = await resp.json();
    if (resp.ok && result.ok) {
      console.log(`Demon relay OK: ${result.coins} coins — updated ${result.updated}`);
    } else {
      console.error(`Demon relay error (HTTP ${resp.status}):`, JSON.stringify(result));
    }
  } catch (e) {
    console.error('Demon relay failed:', e.message);
  } finally { clearTimeout(timer); }
}

'''
code = code.replace(anchor_main, funcs + anchor_main, 1)

# 3) call relayDemon in main() after ticker relay
anchor_call = "  } finally { clearTimeout(timer); }\n}\n\nmain().catch(err => {"
assert anchor_call in code, 'call anchor missing'
add_call = (
    "  } finally { clearTimeout(timer); }\n\n"
    "  // 妖币扫描数据（基于本次 Binance ticker）\n"
    "  if (payload.binance) {\n"
    "    await relayDemon(payload.binance);\n"
    "  }\n"
    "}\n\nmain().catch(err => {"
)
code = code.replace(anchor_call, add_call, 1)

io.open(DST, 'w', encoding='utf-8').write(code)
print('relay.mjs built:', len(code), 'bytes')
for a in ['DEMON_URL', 'DEMON_RELAY_KEY', 'fetchOpenInterest', 'relayDemon', 'payload.binance']:
    assert a in code, 'missing ' + a
print('anchors OK')

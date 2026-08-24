import json, os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ACCOUNT = "1ab09277ed038add4925d28a343c9dc5"
KV_ID = "6d56b8307fd04814892f9c2b15723c02"

with open(os.path.join(BASE_DIR, "__fresh_data.json"), "r", encoding="utf-8") as f:
    coins = json.load(f)

with open(os.path.join(BASE_DIR, "__fresh_meta.json"), "r", encoding="utf-8") as f:
    meta = json.load(f)

def safe_round(v, digits=4):
    if v is None:
        return 0
    return round(float(v), digits)

compact = []
for c in coins:
    compact.append({
        's': c.get('symbol', ''),
        'n': c.get('name', ''),
        'p': c.get('price', 0),
        'mc': c.get('market_cap', 0),
        'cs': c.get('circulating_supply', 0),
        'ts': c.get('total_supply', 0),
        'ms': c.get('max_supply'),
        'v': c.get('volume_24h_usdt', 0),
        'p7': safe_round(c.get('percent_change_7d')),
        'c24': safe_round(c.get('change_24h_pct')),
        'a24': safe_round(c.get('amplitude_24h_pct')),
        'st': c.get('star_rating', 2),
        'ur': c.get('unlock_risk', '\U0001f7e2 \u4f4e\u98ce\u9669'),
        'ma': c.get('momentum_alert', False),
        'ba': c.get('base_asset', ''),
    })

data_str = json.dumps(compact, ensure_ascii=False)
print(f"Compact data size: {len(data_str)} chars")
print(f"Original data size: {len(json.dumps(coins, ensure_ascii=False))} chars")

# Escape for JavaScript string using json.dumps
data_escaped = json.dumps(data_str)

code = f'''async () => {{
  const data = {data_escaped};
  const updated = "{meta['last_updated']}";
  const count = "{meta['count']}";

  const r1 = await cloudflare.request({{
    method: "PUT",
    path: "/accounts/{ACCOUNT}/storage/kv/namespaces/{KV_ID}/values/data",
    body: data,
    contentType: "application/json",
  }});
  const r2 = await cloudflare.request({{
    method: "PUT",
    path: "/accounts/{ACCOUNT}/storage/kv/namespaces/{KV_ID}/values/last_updated",
    body: updated,
    contentType: "text/plain",
  }});
  const r3 = await cloudflare.request({{
    method: "PUT",
    path: "/accounts/{ACCOUNT}/storage/kv/namespaces/{KV_ID}/values/count",
    body: count,
    contentType: "text/plain",
  }});

  return {{
    data: {{ success: r1.success, size: data.length }},
    updated: {{ success: r2.success }},
    count: {{ success: r3.success }},
  }};
}}'''

out = os.path.join(BASE_DIR, "__cf_kv_upload_compact.txt")
with open(out, "w", encoding="utf-8") as f:
    f.write(code)

print(f"Total script size: {len(code)} chars")
print(f"Saved to: {out}")

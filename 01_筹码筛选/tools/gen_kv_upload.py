"""
Generate cloudflare_execute script to upload fresh data to KV.
"""
import json, os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ACCOUNT = "1ab09277ed038add4925d28a343c9dc5"
KV_ID = "6d56b8307fd04814892f9c2b15723c02"

# Read fresh data
with open(os.path.join(BASE_DIR, "__fresh_data.json"), "r", encoding="utf-8") as f:
    data = f.read()

with open(os.path.join(BASE_DIR, "__fresh_meta.json"), "r", encoding="utf-8") as f:
    meta = json.load(f)

# Escape for JavaScript string (JSON-encode)
data_json_escaped = json.dumps(data)

code = f'''async () => {{
  const data = {data_json_escaped};
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

out = os.path.join(BASE_DIR, "__cf_kv_upload.txt")
with open(out, "w", encoding="utf-8") as f:
    f.write(code)

print(f"Script: {len(code)} chars")
print(f"Data JSON: {len(data)} chars")
print(f"Saved to: {out}")

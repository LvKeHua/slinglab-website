import json, os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ACCOUNT = "1ab09277ed038add4925d28a343c9dc5"
KV_ID = "6d56b8307fd04814892f9c2b15723c02"

# Load fresh data
with open(os.path.join(BASE_DIR, "__fresh_data.json"), "r", encoding="utf-8") as f:
    fresh_data = f.read()
with open(os.path.join(BASE_DIR, "__fresh_meta.json"), "r", encoding="utf-8") as f:
    meta = json.load(f)

# Generate the upload script: upload data in one shot
data_escaped = json.dumps(fresh_data)  # JSON-escaped for JS string

code = f"""async () => {{
  const data = {data_escaped};
  const updated = "{meta['last_updated']}";
  const count = "{meta['count']}";

  const r1 = await cloudflare.request({{
    method: "PUT",
    path: "/accounts/{ACCOUNT}/storage/kv/namespaces/{KV_ID}/values/data",
    body: data,
    contentType: "application/json",
  }});
  if (!r1.success) return {{ error: "data write failed", detail: r1 }};

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

  return {{ ok: true, coins: {meta['count']}, updated: "{meta['last_updated']}", data_size: data.length }};
}}"""

out = os.path.join(BASE_DIR, "__cf_upload_final.txt")
with open(out, "w", encoding="utf-8") as f:
    f.write(code)
print(f"Script size: {len(code)} chars")
print(f"Saved to: {out}")

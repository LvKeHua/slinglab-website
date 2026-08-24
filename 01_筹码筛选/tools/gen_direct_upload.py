import json, os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Read the fresh data
with open(os.path.join(BASE_DIR, "__fresh_data.json"), "r", encoding="utf-8") as f:
    fresh_data = f.read()

with open(os.path.join(BASE_DIR, "__fresh_meta.json"), "r", encoding="utf-8") as f:
    meta = json.load(f)

# Generate the JS code for cloudflare_execute
js_code = '''async () => {
  const KV_ID = "6d56b8307fd04814892f9c2b15723c02";
  const ACCOUNT = "1ab09277ed038add4925d28a343c9dc5";

  // Upload all 3 KV keys
  const updateResult = await cloudflare.request({
    method: "GET",
    path: "/accounts/" + ACCOUNT + "/storage/kv/namespaces/" + KV_ID + "/values/updated",
  });

  // Upload fresh data
  const data = ''' + json.dumps(fresh_data) + ''';

  // Count coins
  const parsed = JSON.parse(data);
  const count = String(parsed.length);
  const updated = "''' + meta["last_updated"] + '''";

  console.log("Uploading " + count + " coins, data size: " + data.length + " chars");

  // Write data as a big string
  const r1 = await cloudflare.request({
    method: "PUT",
    path: "/accounts/" + ACCOUNT + "/storage/kv/namespaces/" + KV_ID + "/values/data",
    body: data,
    contentType: "application/json",
  });

  console.log("Data write: " + (r1.success ? "OK" : "FAIL"));

  const r2 = await cloudflare.request({
    method: "PUT",
    path: "/accounts/" + ACCOUNT + "/storage/kv/namespaces/" + KV_ID + "/values/last_updated",
    body: updated,
    contentType: "text/plain",
  });

  const r3 = await cloudflare.request({
    method: "PUT",
    path: "/accounts/" + ACCOUNT + "/storage/kv/namespaces/" + KV_ID + "/values/count",
    body: count,
    contentType: "text/plain",
  });

  if (r1.success && r2.success && r3.success) {
    return { ok: true, coins: count, updated: updated, data_size: data.length };
  }
  return { ok: false, data: r1, updated: r2, count: r3 };
}'''

out = os.path.join(BASE_DIR, "__cf_direct_upload.txt")
with open(out, "w", encoding="utf-8") as f:
    f.write(js_code)

print(f"Script size: {len(js_code)} chars")
print(f"Saved to: {out}")

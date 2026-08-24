import json, os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ACCOUNT = "1ab09277ed038add4925d28a343c9dc5"
KV_ID = "6d56b8307fd04814892f9c2b15723c02"

with open(os.path.join(BASE_DIR, "__fresh_data.json"), "r", encoding="utf-8") as f:
    coins = json.load(f)

with open(os.path.join(BASE_DIR, "__fresh_meta.json"), "r", encoding="utf-8") as f:
    meta = json.load(f)

BATCH_SIZE = 50
batches = [coins[i:i+BATCH_SIZE] for i in range(0, len(coins), BATCH_SIZE)]

print(f"Total coins: {len(coins)}, Batches: {len(batches)}")

out_dir = os.path.join(BASE_DIR, "__cf_batches")
os.makedirs(out_dir, exist_ok=True)

# Generate each batch upload script
for idx, batch in enumerate(batches):
    data_str = json.dumps(batch, ensure_ascii=False)
    data_escaped = json.dumps(data_str)
    key = f"data_p{idx}"
    
    code = f'''async () => {{
  const data = {data_escaped};
  const r = await cloudflare.request({{
    method: "PUT",
    path: "/accounts/{ACCOUNT}/storage/kv/namespaces/{KV_ID}/values/{key}",
    body: data,
    contentType: "application/json",
  }});
  return {{ key: "{key}", success: r.success, size: data.length }};
}}'''
    
    out_path = os.path.join(out_dir, f"batch_{idx}.txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(code)
    print(f"  Batch {idx}: {len(code)} chars -> {out_path}")

# Generate merge script
merge_lines = []
merge_lines.append("async () => {")
merge_lines.append("  const parts = [];")
for idx in range(len(batches)):
    merge_lines.append(f'  const r{idx} = await cloudflare.request({{')
    merge_lines.append(f'    method: "GET",')
    merge_lines.append(f'    path: "/accounts/{ACCOUNT}/storage/kv/namespaces/{KV_ID}/values/data_p{idx}",')
    merge_lines.append("  });")
    merge_lines.append(f"  parts.push(JSON.parse(r{idx}.result));")
merge_lines.append("")
merge_lines.append("  const merged = JSON.stringify(parts.flat());")
merge_lines.append('  const updated = "' + meta['last_updated'] + '";')
merge_lines.append('  const count = "' + meta['count'] + '";')
merge_lines.append("")
merge_lines.append("  const w1 = await cloudflare.request({")
merge_lines.append('    method: "PUT",')
merge_lines.append(f'    path: "/accounts/{ACCOUNT}/storage/kv/namespaces/{KV_ID}/values/data",')
merge_lines.append("    body: merged,")
merge_lines.append('    contentType: "application/json",')
merge_lines.append("  });")
merge_lines.append("  const w2 = await cloudflare.request({")
merge_lines.append('    method: "PUT",')
merge_lines.append(f'    path: "/accounts/{ACCOUNT}/storage/kv/namespaces/{KV_ID}/values/last_updated",')
merge_lines.append("    body: updated,")
merge_lines.append('    contentType: "text/plain",')
merge_lines.append("  });")
merge_lines.append("  const w3 = await cloudflare.request({")
merge_lines.append('    method: "PUT",')
merge_lines.append(f'    path: "/accounts/{ACCOUNT}/storage/kv/namespaces/{KV_ID}/values/count",')
merge_lines.append("    body: count,")
merge_lines.append('    contentType: "text/plain",')
merge_lines.append("  });")
merge_lines.append("")
merge_lines.append("  // Clean up temp keys")
for idx in range(len(batches)):
    merge_lines.append(f"  await cloudflare.request({{")
    merge_lines.append(f'    method: "DELETE",')
    merge_lines.append(f'    path: "/accounts/{ACCOUNT}/storage/kv/namespaces/{KV_ID}/values/data_p{idx}",')
    merge_lines.append("  });")
merge_lines.append("")
merge_lines.append("  return { success: w1.success && w2.success && w3.success, size: merged.length };")
merge_lines.append("}")

merge_code = "\n".join(merge_lines)
merge_path = os.path.join(out_dir, "merge.txt")
with open(merge_path, "w", encoding="utf-8") as f:
    f.write(merge_code)
print(f"  Merge script: {len(merge_code)} chars -> {merge_path}")
print("\nUpload order: batch_0.txt -> batch_1.txt -> ... -> merge.txt")

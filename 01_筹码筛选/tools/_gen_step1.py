import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE_DIR, "frontend", "index.html"), "r", encoding="utf-8") as f:
    html = f.read()

# Escape for JS template literal: \ -> \\, ` -> \`, ${ -> \${, $ -> $$ (template literals only interpret ${)
escaped = html.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

KV_ID = "6d56b8307fd04814892f9c2b15723c02"
ACCOUNT_ID = "1ab09277ed038add4925d28a343c9dc5"

code = f'''async () => {{
  const html = `{escaped}`;
  const r = await cloudflare.request({{
    method: "PUT",
    path: `/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{KV_ID}/values/dashboard_html`,
    body: html,
    contentType: "text/html; charset=utf-8",
  }});
  return r;
}}'''

out = os.path.join(BASE_DIR, "__cf_step1.txt")
with open(out, "w", encoding="utf-8") as f:
    f.write(code)
print(f"Step 1 script: {len(code)} chars")
print(f"Saved to: {out}")

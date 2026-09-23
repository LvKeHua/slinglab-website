"""Deploy: update dashboard_html KV with new frontend (Coinalyze columns)."""
import json
import os
import urllib.request

ACCOUNT_ID = "REDACTED_CF_ACCOUNT_ID"
KV_ID = "6d56b8307fd04814892f9c2b15723c02"
TOKEN = "REDACTED_CF_API_TOKEN"
BASE = os.path.dirname(os.path.abspath(__file__))

def kv_put(key, value):
    headers = {"Authorization": "Bearer " + TOKEN, "User-Agent": "Mozilla/5.0 screener-deploy", "Content-Type": "text/plain"}
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({"https": "http://127.0.0.1:7897"}))
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{KV_ID}/values/{key}",
        data=value.encode("utf-8"), headers=headers, method="PUT")
    try:
        with opener.open(req, timeout=60) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

html_path = os.path.join(BASE, "frontend", "index.html")
html = open(html_path, encoding="utf-8").read()
print(f"HTML size: {len(html)} bytes")

st, body = kv_put("dashboard_html", html)
print(f"KV put dashboard_html: HTTP {st} {body[:200]}")

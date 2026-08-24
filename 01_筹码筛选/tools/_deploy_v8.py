"""Deploy screener v8: create DEMON_RELAY_KEY secret, upload worker v8, update dashboard_html KV."""
import json
import os
import time
import urllib.request
import urllib.error

ACCOUNT_ID = "1ab09277ed038add4925d28a343c9dc5"
KV_ID = "6d56b8307fd04814892f9c2b15723c02"
WORKER_NAME = "tokenomics-screener"
DEMON_RELAY_KEY = "0eb3f463c85e160bbedbec6b3131bb862bdd0c82ccf9f390"
CMC_API_KEY = "7b857f20da3b4a2ea1194ec94646fa68"
RELAY_AUTH_KEY = "55e313c395c3c93a212754423b53ffff0396cfa98f32c4c9fe5b45000f803a99"
UPLOAD_AUTH_KEY = "b7f2e9d4c8a14b3f9e6d2c5a8b1f4e7d9a3c6b0f1"
TOKEN = "cfoat_QfERLaNBJyVKoZeguumJrHufXQa65umyQEqk6FSxO-I.0_N2iggNGrM2KBzsblkx6lcHHU44MF2XIK7HP9pP1SE"
BASE = os.path.dirname(os.path.abspath(__file__))


def api(method, path, body=None, ctype=None, raw_body=False):
    headers = {"Authorization": "Bearer " + TOKEN, "User-Agent": "Mozilla/5.0 screener-deploy"}
    data = None
    if body is not None:
        if raw_body:
            data = body
        else:
            data = json.dumps(body).encode()
        headers["Content-Type"] = ctype or "application/json"
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({"https": "http://127.0.0.1:7897"}))
    req = urllib.request.Request("https://api.cloudflare.com/client/v4" + path, data=data, headers=headers, method=method)
    try:
        with opener.open(req, timeout=120) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def main():
    # 1) ensure secrets exist (idempotent)
    print("[1/4] Ensuring secrets...")
    for name, val in [("DEMON_RELAY_KEY", DEMON_RELAY_KEY), ("CMC_API_KEY", CMC_API_KEY),
                      ("RELAY_AUTH_KEY", RELAY_AUTH_KEY), ("UPLOAD_AUTH_KEY", UPLOAD_AUTH_KEY)]:
        st, body = api("PUT", f"/accounts/{ACCOUNT_ID}/workers/scripts/{WORKER_NAME}/secrets",
                       {"name": name, "text": val, "type": "secret_text"})
        print("  ", name, "->", st, str(body)[:80])

    # 2) deploy worker v8 (multipart)
    print("[2/4] Deploying worker v8...")
    code = open(os.path.join(BASE, "cf-worker", "worker.mjs"), encoding="utf-8").read()
    metadata = {
        "body_part": "script",
        "compatibility_date": "2026-07-01",
        "bindings": [
            {"type": "kv_namespace", "name": "MARKET_DATA", "namespace_id": KV_ID},
            {"type": "secret_text", "name": "CMC_API_KEY", "text": CMC_API_KEY},
            {"type": "secret_text", "name": "RELAY_AUTH_KEY", "text": RELAY_AUTH_KEY},
            {"type": "secret_text", "name": "UPLOAD_AUTH_KEY", "text": UPLOAD_AUTH_KEY},
            {"type": "secret_text", "name": "DEMON_RELAY_KEY", "text": DEMON_RELAY_KEY},
        ],
    }
    boundary = f"----ScreenerDeploy{int(time.time() * 1000)}"
    parts = []
    parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"metadata\"\r\nContent-Type: application/json\r\n\r\n{json.dumps(metadata)}\r\n".encode())
    parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"script\"\r\nContent-Type: application/javascript\r\n\r\n".encode())
    parts.append(code.encode())
    parts.append(f"\r\n--{boundary}--\r\n".encode())
    body_bytes = b"".join(parts)
    st, body = api("PUT", f"/accounts/{ACCOUNT_ID}/workers/scripts/{WORKER_NAME}", body_bytes,
                   ctype=f"multipart/form-data; boundary={boundary}", raw_body=True)
    ok = body.get("success") if isinstance(body, dict) else False
    print("  status", st, "success", ok, (str(body)[:300] if not ok else ""))
    if not ok:
        raise SystemExit("worker deploy failed")

    # 3) upload new dashboard_html
    print("[3/4] Uploading new dashboard_html to KV...")
    html = open(os.path.join(BASE, "frontend", "index.html"), encoding="utf-8").read()
    st, body = api("PUT", f"/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{KV_ID}/values/dashboard_html",
                   html.encode(), ctype="text/html; charset=utf-8", raw_body=True)
    print("  status", st, "len", len(html), "->", body if not isinstance(body, dict) else body.get("success"))

    # 4) seed demon KV (empty placeholder so /api/demon returns clean empty until first relay)
    print("[4/4] Seeding demon KV placeholder...")
    st, body = api("PUT", f"/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{KV_ID}/values/demon_data",
                   json.dumps([]).encode(), ctype="application/json", raw_body=True)
    st2, body2 = api("PUT", f"/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{KV_ID}/values/demon_updated",
                     json.dumps(None).encode(), ctype="application/json", raw_body=True)
    st3, body3 = api("PUT", f"/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{KV_ID}/values/demon_count",
                     b"0", ctype="text/plain", raw_body=True)
    print("  statuses", st, st2, st3)
    print("DONE")


if __name__ == "__main__":
    main()

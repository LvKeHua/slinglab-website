#!/usr/bin/env python3
"""生成 wrangler kv key put 用的种子 JSON 文件（--path 模式）。"""
import json, subprocess, os, sys

DAILY = json.load(open("daily_candidates_week.json", encoding="utf-8"))
FWD = json.load(open("forward_live.json", encoding="utf-8"))

KV_ID = "6d56b8307fd04814892f9c2b15723c02"
WORKDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cf-worker")
os.makedirs("_seed_files", exist_ok=True)

files = []
for day, cands in DAILY.items():
    key = "fwd_hist_" + day.replace("-", "")
    payload = {
        "date": day,
        "candidates": [
            {"symbol": c["symbol"], "base_asset": c["base_asset"],
             "forward_score": c["forward_score"],
             "first_seen": day + "T00:00:00.000Z",
             "last_seen": day + "T23:59:00.000Z"}
            for c in cands if c["signal"] == "acc_candidate"
        ],
        "updated": day + "T23:59:00.000Z",
        "seed": True,
    }
    fp = f"_seed_files/{key}.json"
    with open(fp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    files.append((key, fp))

# 08-11 线上真实候选池
day11 = "2026-08-11"
key11 = "fwd_hist_20260811"
c11 = [x for x in FWD["data"] if x["signal"] == "acc_candidate"]
payload11 = {
    "date": day11,
    "candidates": [
        {"symbol": x["symbol"], "base_asset": x["base_asset"],
         "forward_score": x["forward_score"],
         "first_seen": FWD["updated"], "last_seen": FWD["updated"]}
        for x in c11
    ],
    "updated": FWD["updated"],
    "seed": True,
}
fp11 = "_seed_files/fwd_hist_20260811.json"
with open(fp11, "w", encoding="utf-8") as f:
    json.dump(payload11, f, ensure_ascii=False)
files.append((key11, fp11))

env = dict(os.environ)
env.update({"HTTPS_PROXY": "http://127.0.0.1:7897", "HTTP_PROXY": "http://127.0.0.1:7897"})
for key, fp in files:
    print(f"putting {key} ({os.path.getsize(fp)}B) ...", flush=True)
    r = subprocess.run(
        ["npx.cmd", "wrangler", "kv", "key", "put", key, "--path", os.path.abspath(fp),
         "--namespace-id", KV_ID],
        cwd=WORKDIR, env=env, capture_output=True, text=True, timeout=120,
    )
    out = (r.stdout + r.stderr).strip()
    ok = "success" in out.lower() or "written" in out.lower() or "already" in out.lower()
    print(f"  {'OK' if ok else 'FAIL'}: {out[-200:]}")
    if not ok:
        sys.exit(1)
print("全部种子写入完成")

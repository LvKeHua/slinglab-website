#!/usr/bin/env python3
"""生成 wrangler kv bulk 批量种子 JSON。"""
import json, os

DAILY = json.load(open("daily_candidates_week.json", encoding="utf-8"))
FWD = json.load(open("forward_live.json", encoding="utf-8"))

os.makedirs("_seed_files", exist_ok=True)
bulk = []
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
    bulk.append({"key": key, "value": json.dumps(payload, ensure_ascii=False)})

day11 = "2026-08-11"
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
bulk.append({"key": "fwd_hist_20260811", "value": json.dumps(payload11, ensure_ascii=False)})

with open("_seed_files/bulk.json", "w", encoding="utf-8") as f:
    json.dump(bulk, f, ensure_ascii=False)
print(f"bulk.json: {len(bulk)} keys, {os.path.getsize('_seed_files/bulk.json')}B")

import json, os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE_DIR, "__fresh_data.json"), "r", encoding="utf-8") as f:
    coins = json.load(f)

BATCH_SIZE = 50
batches = [coins[i:i+BATCH_SIZE] for i in range(0, len(coins), BATCH_SIZE)]

out_dir = os.path.join(BASE_DIR, "__cf_batches_raw")
os.makedirs(out_dir, exist_ok=True)

for idx, batch in enumerate(batches):
    key = f"data_p{idx}"
    path = os.path.join(out_dir, f"batch_{idx}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(batch, f, ensure_ascii=False)
    print(f"Batch {idx}: {len(batch)} coins, saved to {path}")

print("Done!")

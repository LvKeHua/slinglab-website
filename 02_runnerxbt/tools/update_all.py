"""
One-click sync pipeline for RunnerXBT (VPS 版):
1. Incremental Telegram scrape (new messages + media)
2. Merge new telethon messages into messages_final.json
3. Update BTC/ETH K-lines from OKX (VPS 可直连，Binance 在VPS不可靠)
4. Build self-contained HTML (build_v2.py)
5. Inject frontend features (inject_ux4.py)
6. Deploy to Cloudflare Pages

Run: python update_all.py
"""
import asyncio, os, sys, json, subprocess, time
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

# VPS 路径自动适配：优先环境变量 RUNNERXBT_DIR，否则用脚本所在目录（VPS 上是 /opt/runnerxbt）
BASE_DIR = Path(os.environ.get('RUNNERXBT_DIR', Path(__file__).parent))
DATA_DIR = BASE_DIR / 'data'
LOG_FILE = BASE_DIR / 'sync.log'

def log(msg):
    line = f'[{time.strftime("%Y-%m-%d %H:%M:%S")}] {msg}'
    print(line)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line + '\n')

def merge_messages():
    """Merge messages_telethon.json (new, full datetime) into messages_final.json (old enriched)."""
    final_path = DATA_DIR / 'messages_final.json'
    telethon_path = DATA_DIR / 'messages_telethon.json'

    final = json.loads(final_path.read_text('utf-8')) if final_path.exists() else []
    by_id = {m['id']: m for m in final}

    if telethon_path.exists():
        tele = json.loads(telethon_path.read_text('utf-8'))
        added = 0
        for m in tele:
            if m['id'] not in by_id:
                by_id[m['id']] = m
                added += 1
        if added:
            log(f'Merged {added} new telethon messages')
        else:
            log(f'No new telethon messages (total {len(by_id)})')

    merged = sorted(by_id.values(), key=lambda x: x['id'])
    final_path.write_text(json.dumps(merged, ensure_ascii=False), 'utf-8')
    return merged

def run(cmd, cwd=None):
    log(f'RUN: {cmd}')
    r = subprocess.run(cmd, cwd=cwd or str(BASE_DIR), shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.stdout: log('  ' + r.stdout.strip()[:600])
    if r.stderr: log('  ERR: ' + r.stderr.strip()[:600])
    return r.returncode

def main():
    log('═══════ RunnerXBT SYNC START ═══════')

    # 1. Telegram incremental scrape
    log('── Step 1/4: Telegram scrape ──')
    rc = run(f'python -u "{BASE_DIR / "scraper" / "sync_telegram.py"}"')
    if rc != 0:
        log('WARN: telegram scrape failed, continuing with existing data')

    # 2. Merge
    log('── Step 2/4: Merge messages ──')
    msgs = merge_messages()
    log(f'Total messages after merge: {len(msgs)}')

    # 3. K-lines (OKX 版: VPS 直连可用，无代理依赖)
    log('── Step 3/4: K-line update (OKX) ──')
    rc = run(f'python -u "{BASE_DIR / "scraper" / "sync_klines_okx.py"}"')
    if rc != 0:
        log('WARN: kline update failed, continuing with existing data')

    # 4. Build + inject + deploy
    log('── Step 4/4: Build & deploy ──')
    rc1 = run(f'python -u "{BASE_DIR / "build_v2.py"}"')
    if rc1 != 0:
        log('ERROR: build failed')
        return 1
    rc2 = run(f'python -u "{BASE_DIR / "inject_v2.py"}"')
    if rc2 != 0:
        log('ERROR: inject failed')
        return 1
    rc2b = run(f'python -u "{BASE_DIR / "inject_ux2.py"}"')
    if rc2b != 0:
        log('ERROR: ux inject failed')
        return 1
    rc2c = run(f'python -u "{BASE_DIR / "inject_ux3.py"}"')
    if rc2c != 0:
        log('ERROR: ux3 inject failed')
        return 1
    rc2d = run(f'python -u "{BASE_DIR / "inject_ux4.py"}"')
    if rc2d != 0:
        log('ERROR: ux4 inject failed')
        return 1
    rc3 = run(f'npx wrangler pages deploy deploy_v2 --project-name runnerxbt --branch main --commit-dirty=true')
    if rc3 != 0:
        log('ERROR: deploy failed')
        return 1

    log('═══════ SYNC COMPLETE ═══════')
    return 0

if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""
筹码筛选 · 美国 VPS 存储节点同步器
====================================
从 Cloudflare Worker 公开接口拉取每日归档 → 本地 SQLite（存储层）
不修改任何现有系统（relay/worker/前端/KV 零改动）。
"""
import json
import sqlite3
import sys
import time
import urllib.request
from datetime import datetime, timedelta

BASE = "https://app.slinglab.xyz/screener/api"
DB_PATH = "/opt/screener-store/screener.db"
DAYS_BACK = 45  # 每次同步覆盖最近 45 天（KV 无 TTL，可扩）

def http_get(url, retries=4):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "screener-store-sync/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())
        except Exception as e:
            print(f"  GET {url} attempt {attempt+1} failed: {str(e)[:80]}")
            time.sleep(5 * (attempt + 1))
    return None

def init_db(conn):
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS candidates(
        date TEXT, symbol TEXT, base_asset TEXT, forward_score REAL,
        first_seen TEXT, last_seen TEXT,
        PRIMARY KEY(date, symbol))""")
    c.execute("""CREATE TABLE IF NOT EXISTS gainers(
        date TEXT, symbol TEXT, base_asset TEXT, change_24h_pct REAL,
        volume_24h_usdt REAL, last_price REAL, rank INTEGER,
        PRIMARY KEY(date, symbol))""")
    c.execute("""CREATE TABLE IF NOT EXISTS events(
        date TEXT, base_asset TEXT, change_24h_pct REAL, rank INTEGER,
        trigger TEXT, is_candidate INTEGER, ever_candidate INTEGER,
        lead_days INTEGER, forward_score REAL, entry_price REAL,
        gain_price REAL, entry_gain_pct REAL,
        PRIMARY KEY(date, base_asset, trigger))""")
    c.execute("""CREATE TABLE IF NOT EXISTS perf(
        date TEXT PRIMARY KEY, n_candidates INTEGER, scored INTEGER,
        f1_mean REAL, f3_mean REAL, f5_mean REAL,
        f3_win REAL, btc_3 REAL, excess_f3 REAL)""")
    c.execute("""CREATE TABLE IF NOT EXISTS sync_meta(
        key TEXT PRIMARY KEY, value TEXT)""")
    conn.commit()

def upsert_candidates(conn, date, cands):
    c = conn.cursor()
    for x in cands or []:
        c.execute("""INSERT OR REPLACE INTO candidates(date,symbol,base_asset,forward_score,first_seen,last_seen)
                     VALUES(?,?,?,?,?,?)""",
                  (date, x.get("symbol"), x.get("base_asset"),
                   x.get("forward_score"), x.get("first_seen"), x.get("last_seen")))
    conn.commit()

def upsert_gainers(conn, date, gainers):
    c = conn.cursor()
    for i, g in enumerate(gainers or []):
        c.execute("""INSERT OR REPLACE INTO gainers(date,symbol,base_asset,change_24h_pct,volume_24h_usdt,last_price,rank)
                     VALUES(?,?,?,?,?,?,?)""",
                  (date, g.get("symbol"), g.get("base_asset"),
                   g.get("change_24h_pct"), g.get("volume_24h_usdt"),
                   g.get("last_price"), i + 1))
    conn.commit()

def upsert_events(conn, events):
    c = conn.cursor()
    for e in events or []:
        c.execute("""INSERT OR REPLACE INTO events(date,base_asset,change_24h_pct,rank,trigger,
                     is_candidate,ever_candidate,lead_days,forward_score,entry_price,gain_price,entry_gain_pct)
                     VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
                  (e.get("date"), e.get("base_asset"), e.get("change_24h_pct"), e.get("rank"),
                   e.get("trigger"), 1 if e.get("is_candidate") else 0,
                   1 if e.get("ever_candidate") else 0, e.get("lead_days"),
                   e.get("forward_score"), e.get("entry_price"), e.get("gain_price"),
                   e.get("entry_gain_pct")))
    conn.commit()

def upsert_perf(conn, daily):
    c = conn.cursor()
    for d in daily or []:
        c.execute("""INSERT OR REPLACE INTO perf(date,n_candidates,scored,f1_mean,f3_mean,f5_mean,f3_win,btc_3,excess_f3)
                     VALUES(?,?,?,?,?,?,?,?,?)""",
                  (d.get("date"), d.get("n_candidates"), d.get("scored"),
                   d.get("f1_mean"), d.get("f3_mean"), d.get("f5_mean"),
                   d.get("f3_win"), d.get("btc_3"), d.get("excess_f3")))
    conn.commit()

def main():
    t0 = time.time()
    print(f"[{datetime.utcnow().isoformat()}] sync start")
    conn = sqlite3.connect(DB_PATH)
    init_db(conn)

    # 1) 候选池归档（近 DAYS_BACK 天）
    print("1/4 forward-history ...", flush=True)
    d = http_get(f"{BASE}/forward-history?days={DAYS_BACK}")
    if d and d.get("history"):
        for date, h in d["history"].items():
            upsert_candidates(conn, date, h.get("candidates"))
        print(f"  candidates: {len(d['history'])} 天")

    # 2) 每日涨幅榜（对每个有归档的日期拉 day-gainers）
    print("2/4 day-gainers ...", flush=True)
    days = [(datetime.utcnow() + timedelta(hours=8) - timedelta(days=i)).strftime("%Y-%m-%d")
            for i in range(DAYS_BACK)]
    got = 0
    for ds in days:
        g = http_get(f"{BASE}/day-gainers?date={ds}&topn=100&window=45")
        if g and g.get("gainers"):
            upsert_gainers(conn, ds, g["gainers"])
            got += 1
    print(f"  gainers: {got} 天")

    # 3) 事件雷达
    print("3/4 events ...", flush=True)
    d = http_get(f"{BASE}/events?days={DAYS_BACK}&topn=100&big=20")
    if d and d.get("events") is not None:
        upsert_events(conn, d["events"])
        print(f"  events: {len(d['events'])} 条")

    # 4) 候选池表现
    print("4/4 perf ...", flush=True)
    d = http_get(f"{BASE}/perf?days={DAYS_BACK}")
    if d and d.get("daily") is not None:
        upsert_perf(conn, d["daily"])
        print(f"  perf: {len(d['daily'])} 天")

    # meta
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO sync_meta(key,value) VALUES('last_sync',?)",
              (datetime.utcnow().isoformat(),))
    conn.commit()
    # 统计
    c.execute("SELECT COUNT(*) FROM candidates"); nc = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM gainers"); ng = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM events"); ne = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM perf"); np_ = c.fetchone()[0]
    conn.close()
    print(f"done in {time.time()-t0:.1f}s | candidates={nc} gainers={ng} events={ne} perf={np_}")

if __name__ == "__main__":
    main()

# SlingLab · 统一工作区

> **最后更新**：2026-08-12
> 本目录聚合 SlingLab 旗下全部项目，按模块分类管理。每个模块有独立日志，新对话先读本文件 + 对应模块日志。

---

## 📌 新对话入口（直接复制这段给 AI）

> 我的项目都在 `D:\Vibe Coding 项目合集\SlingLab\`。先读根目录 `README.md`（总入口：4 个模块 + 双 VPS 架构 + 凭证索引），再按需读对应模块的 README：
> - `00_平台/README.md`（SlingLab 平台：Worker/路由/Tunnel）
> - `01_筹码筛选/README.md`（筹码筛选器：主日志在 `01_筹码筛选/筛选器完整系统日志.md`）
> - `02_runnerxbt/README.md`（RunnerXBT：Telegram 爬虫 + K线）
> - `03_stone_crypto/README.md`（Stone Crypto：本地交易日志）
> 改代码时：代码在对应模块内，部署/运维见模块 README 的「运维」节；凭证在总 README 第四节。**原项目目录（`D:\Vibe Coding 项目合集\筹码筛选` 等）是权威源，本目录是工作副本——改副本后如需上线，按模块 README 的部署流程执行。**

---

## 一、目录总览

| 目录 | 项目 | 一句话 | 线上地址 |
|------|------|--------|----------|
| `00_平台/` | SlingLab 平台 | 域名入口 + 登录页 + 共享 KV 数据管道 | https://app.slinglab.xyz |
| `01_筹码筛选/` | 筹码筛选器 | 小币永续吸筹筛选（6-tab 前端 + 每日归档回测） | https://app.slinglab.xyz/screener/ |
| `02_runnerxbt/` | RunnerXBT | Telegram 交易信号爬取 + K线可视化（已迁移 Pages） | https://runnerxbt.pages.dev |
| `03_stone_crypto/` | Stone Crypto | 本地自托管交易日志 + 多交易所账户追踪（Next.js + Fastify） | 本地 http://localhost:3000 |

**来源说明**：01/02/03 是从原独立目录**复制**整理而来（原目录未改动），各自保留独立 git 仓库。

---

## 二、架构关系（重要）

```
┌─ 数据抓取 ──────────────────────────────────────────┐
│ 日本 VPS (Evoxt 东京 23.27.52.165)                  │
│   └─ 唯一能抓 Binance 的节点（美国 IP 被 451 封锁）   │
│   └─ cron 每 15 分钟: git pull + node relay.mjs     │
└──────────────────┬──────────────────────────────────┘
                   │ POST /api/relay-*
┌──────────────────▼──────────────────────────────────┐
│ Cloudflare Worker (tokenomics-screener)             │
│   KV namespace 6d56b8307fd04814892f9c2b15723c02     │
│   ├─ exchange_proxy / demon_data / coinfilter_data  │
│   ├─ forward_data（吸筹评分，每 5 分钟覆盖）          │
│   ├─ fwd_hist_YYYYMMDD（候选池每日归档，北京日界）    │
│   ├─ gainer_hist_YYYYMMDD（涨幅榜+收盘价每日归档）    │
│   └─ dashboard_html（前端，KV 优先）                 │
└──────────────────┬──────────────────────────────────┘
                   │ GET 公开接口（30 分钟 cron 拉取）
┌──────────────────▼──────────────────────────────────┐
│ 美国 VPS (RackNerd 192.255.193.128)                 │
│   ├─ /opt/screener-store/ SQLite（存储层，4 表）     │
│   ├─ runnerxbt 后端 :8000 + nginx :8080             │
│   └─ 后续：回测/计算引擎                             │
└─────────────────────────────────────────────────────┘
```

**关键约束**：美国 IP（GitHub Actions / 美国 VPS）被 Binance HTTP 451 永久封锁；只有日本 VPS 能抓交易所数据。GitHub Actions relay 已停用（2026-08-12）。

---

## 三、模块速查

### 00_平台（SlingLab 平台）
- `homepage-worker/src/index.js`：线上主页 worker（登录页 + 路由）
- `src/`：旧版 worker 源码（worker.js = 筹码筛选前身，homepage-worker.js = 主页）
- `data/`：CMC/CoinGecko 采集器（collector/validator/reporter）
- `wrangler.toml`：slinglab-homepage worker 配置（绑定 SITE_DATA/STONE_DATA）
- `Stone/`：stone-journal（Vue 前端）｜`Dashboard/`：trade-dashboard（React 前端）
- 日志：`SlingLab_完整日志.md`、`HANDOFF.md`

### 01_筹码筛选（主项目，最活跃）
- `relay.mjs`：数据管道 + 吸筹评分（Binance/Bybit/OKX 聚合，推送到 worker）
- `cf-worker/worker_v10_inline.mjs`：Cloudflare Worker（API + 归档 + 前端内嵌）
- `frontend/index.html`：6-tab 前端（🧲筹码/👺妖币/🪙小币/🧭前导/🧭工作台/🎯日榜回看）
- `backend/server.py`：备用本地后端
- `筛选器完整系统日志.md`：**主日志，含全部方法论/评分逻辑/归档机制/运维**
- `概述/`：8 份历史项目日志
- `tools/`：分析/部署/回测脚本 ｜ `data_hist/`：历史数据快照
- git：`LvKeHua/tokenomics-screener`（main）

### 02_runnerxbt（RunnerXBT）
- `scraper/`：Telethon 爬虫（Telegram 信号）
- `backend/server.py`：FastAPI（messages/btc/eth 接口）
- `frontend/`：SPA（Lightweight Charts K线）
- `token-data/` `token-dashboard/`：子项目
- GA 每 10 分钟自动同步（Telegram+OKX，美国 IP 可用）
- git：`LvKeHua/runnerxbt-insights`（master）

### 03_stone_crypto（Stone Crypto）
- `server/`：Fastify 后端（:8766，SQLite，AES-256 加密凭据）
- `src/`：Next.js 前端（:3000）
- `local-proxy/`：交易所代理
- 启动：`start-local.ps1`（后端+前端同时拉起）
- 功能：交易日志 FIFO 配对、9 种交易所账户追踪

---

## 四、关键凭证索引（不要外泄）

| 项 | 位置/值 |
|----|---------|
| CF OAuth token | `~/.wrangler/config/default.toml`（wrangler whoami 自动刷新） |
| KV Namespace | `6d56b8307fd04814892f9c2b15723c02` |
| CF Account | `1ab09277ed038add4925d28a343c9dc5` |
| 美国 VPS | `192.255.193.128` root / `7Jj6Mz80BcArGxE3m7`（SSH 22，可能直连或代理） |
| 日本 VPS | `23.27.52.165`（凭证不在项目内，需向用户索取） |
| relay 认证 | `RELAY_AUTH_KEY=55e313c395c3c93a212754423b53ffff0396cfa98f32c4c9fe5b45000f803a99`、`DEMON_RELAY_KEY=0eb3f463c85e160bbedbec6b3131bb862bdd0c82ccf9f390`（也见 setup2.sh） |
| GitHub | tokenomics-screener / runnerxbt-insights / slinglab-website |

---

## 五、常用操作

```bash
# 部署筹码筛选 worker（在 01_筹码筛选/cf-worker）
cd "D:/Vibe Coding 项目合集/SlingLab/01_筹码筛选/cf-worker"
npx wrangler deploy worker_v10_inline.mjs --name tokenomics-screener

# 更新前端 KV（dashboard_html = frontend/index.html）
# 用 CF API 直传更稳（wrangler bulk 对 160KB 上传不稳定）：
python - <<'EOF'
import urllib.request, json, re, os
html = open('../frontend/index.html', encoding='utf-8').read()
tok = open(os.path.expanduser('~/.wrangler/config/default.toml'), encoding='utf-8').read()
TOKEN = re.search(r'oauth_token\s*=\s*"([^"]+)"', tok).group(1)
proxy = urllib.request.ProxyHandler({'http': 'http://127.0.0.1:7897', 'https': 'http://127.0.0.1:7897'})
opener = urllib.request.build_opener(proxy)
url = 'https://api.cloudflare.com/client/v4/accounts/1ab09277ed038add4925d28a343c9dc5/storage/kv/namespaces/6d56b8307fd04814892f9c2b15723c02/values/dashboard_html'
req = urllib.request.Request(url, data=html.encode('utf-8'), method='PUT', headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'text/html; charset=utf-8'})
print(json.loads(opener.open(req, timeout=90).read())['success'])
EOF

# 回测数据接口（公开，无需认证）
curl "https://app.slinglab.xyz/screener/api/forward-history?days=14"   # 每日候选池
curl "https://app.slinglab.xyz/screener/api/day-gainers?date=2026-08-11&topn=30"  # 单日涨幅榜+候选标注
curl "https://app.slinglab.xyz/screener/api/perf?days=14"              # 候选池 fwd 收益
curl "https://app.slinglab.xyz/screener/api/events?days=14&topn=20&big=20"        # 事件雷达
```

---

## 六、维护纪律

1. **原项目目录不动**（`D:\Vibe Coding 项目合集\筹码筛选`、`runnerxbt` 是权威源，本目录是工作副本）
2. 每个模块改动后**同步更新对应日志**（模块根目录的 `*日志.md`）
3. 新对话：先读本 README → 再读对应模块日志 → 再动手
4. 凭证只放本 README 与 setup 脚本（.env 不入 git）

# Stone v2 · 模块化交易追踪平台

> 基于 coinmarketman.com / tracker.mazino.io / crypto-portfolio-tracker-oss 三个参考源逆向整合重构。
> 双 VPS 架构：**日本 VPS = 数据抓钩**，**美国 VPS = 计算 + 存储**。

## 一、架构

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  web (Next) │ ───▶ │ server (Fastify) │ ───▶ │ fetcher (日本VPS) │──▶ 交易所 API
│  前端       │ /api │ 计算+存储 SQLite  │  │   │ 数据抓钩 :8780    │──▶ 公开行情
│ 任意位置    │      │ 美国 VPS :8766    │  └──▶ │（直连，限制少）    │──▶ DeBank/CoinStats
└─────────────┘      └──────────────────┘      └──────────────────┘
```

- **fetcher**（日本 VPS）：所有出网请求在这里执行——交易所余额/头寸/成交、Binance/OKX 公开行情、链上钱包。30s 缓存，不受本地网络限制。
- **server**（美国 VPS）：SQLite 存储（账户/快照/头寸/配对成交/日志/评分/便签）+ 全部计算（FIFO 配对、杠杆聚合、分析派生）。`STONE_FETCHER_URL` 指向日本 VPS；fetcher 不可达时自动回退直连。
- **web**：Next.js 静态导出，`STONE_API_TARGET` 指向 server。

## 二、模块结构

```
04_stone_v2/
├── packages/exchange/     # 共享交易所客户端（7 所头寸/余额/成交 + 公开行情 + FIFO 配对）
│   └── src/
│       ├── balances.ts    # 8 所余额客户端
│       ├── positions.ts   # 7 所头寸客户端 + 统一杠杆引擎
│       ├── trades.ts      # Binance 全交易对 + CrossEx 成交拉取
│       ├── pairing.ts     # 数量感知 FIFO 配对引擎
│       ├── market.ts      # Market Radar + Funding Heatmap
│       └── crossex.ts     # Gate CrossEx 客户端
├── fetcher/               # 日本 VPS 数据抓钩（Fastify :8780）
├── server/                # 美国 VPS 计算+存储（Fastify :8766）
│   └── src/
│       ├── main.ts        # 入口
│       ├── index.ts       # 组合根（注册 9 个路由模块）
│       ├── db.ts          # SQLite schema（13 张表）
│       ├── crypto.ts      # AES-256-GCM 密钥加密
│       ├── routes/        # 模块化路由：accounts/sync/portfolio/market/trades/wallets/journal/settings/dashboard
│       └── services/      # accounts/sync/analytics/uploads/wallets
└── web/                   # Next.js 前端（20 页）
```

## 三、功能矩阵

| 模块 | 来源 | 说明 |
|---|---|---|
| Portfolio | OSS | 7 所头寸聚合 + 统一杠杆率（Σ\|notional\|/Σmargin）+ 按所/按币分解 |
| Wallets | OSS | DeBank EVM（代币+DeFi 头寸）+ CoinStats Solana/Sui/Cosmos |
| Scorecards | Mazino | checklist + 1-10 评分 + R 倍数 |
| Strategies | Mazino | 交易手册 + 规则列表 |
| Calendar | Mazino/CMM | PnL 日历 + 月导航 + 日详情 |
| Market Radar | CMM Hypertracker | 涨跌幅/资金费率/爆仓实时扫描 |
| Funding Heatmap | CMM Hypertracker | 24h 资金费率热力图 |
| Intelligence | CMM | 规则化交易洞察（连胜/期望值/时段/方向） |
| Journal | CMM | 笔记 + 标签 + 截图上传 |
| Sticky Notes | Mazino | 全局拖拽便签 |
| Performance/Analytics/Reporting | CMM | 12 指标 + 15 分析组件 + CSV/JSON 导出 |
| Trades 手动录入 | CMM Add Transaction | 手工成交入账 |
| Accounts | CMM API Manager | 9 所账户 + 分组 + 加密密钥 |

## 四、双 VPS 部署

```bash
# 日本 VPS — 数据抓钩
cd fetcher && npm install
STONE_FETCHER_URL 无需设置；FETCHER_PORT=8780 node node_modules/tsx/dist/cli.mjs src/index.ts
# 建议 systemd：Restart=always，暴露 8780（防火墙白名单美国 VPS IP）

# 美国 VPS — 计算+存储
cd server && npm install
STONE_FETCHER_URL=http://<日本VPS-IP>:8780 STONE_PORT=8766 \
node node_modules/tsx/dist/cli.mjs src/main.ts
# SQLite 落在 server/data/，备份即拷 stone.db

# 前端（本地或美国 VPS）
cd web && npm install
STONE_API_TARGET=http://<美国VPS-IP>:8766 npm run dev
```

## 五、环境变量

| 变量 | 位置 | 默认 | 说明 |
|---|---|---|---|
| `STONE_FETCHER_URL` | server | 空=直连 | 日本 VPS 抓钩地址，不可达自动回退 |
| `FETCHER_PORT/HOST` | fetcher | 8780/0.0.0.0 | 抓钩监听 |
| `FETCHER_CACHE_TTL_MS` | fetcher | 30000 | 公开数据缓存 |
| `STONE_API_TARGET` | web dev | 127.0.0.1:8766 | 后端地址 |
| `STONE_DATA_DIR` | server | server/data | SQLite 位置 |
| `STONE_ENC_KEY` | server | 无 | 密钥加密密钥（必设） |
| `HTTP(S)_PROXY` + `NODE_USE_ENV_PROXY=1` | 直连模式 | 无 | 本机出网代理（Clash） |

## 六、本地开发

```powershell
# 1. 启动 fetcher（可选；不启动则 server 直连）
cd fetcher; npm run start

# 2. 启动 server
cd server; npm run dev

# 3. 启动 web
cd web; npm run dev   # :3000 → 代理 /api/* → :8766
```

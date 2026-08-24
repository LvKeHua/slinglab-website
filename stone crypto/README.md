# Stone Crypto — 本地自托管交易日志 + 多交易所账户追踪

CMM 风格的自动化交易日志 + 统一账户金额追踪。前端 Next.js，后端本地 Fastify + SQLite。

## 功能

- **交易日志**（CMM 风格）：Binance 全交易对 + CrossEx 7 所（Gate/Binance/OKX/Bybit/Kraken/Hyperliquid/Deribit）历史成交自动配对（FIFO），Dashboard / Analytics / Performance / Reporting / Journal 页面
- **统一账户追踪**：Binance / Bybit / Gate / OKX / Bitget / Hyperliquid / Derive / Extended / CrossEx 9 种接入方式，账户分组，余额历史时间序列（每次同步自动快照）
- **凭据安全**：API Key AES-256-GCM 加密存储，永不返回客户端

## 快速开始

```powershell
# 1. 安装后端依赖（首次）
cd server
npm install

# 2. 启动（后端 :8766 + 前端 :3000）
.\start-local.ps1
```

打开 http://localhost:3000 → Accounts 页面添加交易所账户 → Sync All。

## 架构

```
Next.js 前端 (:3000)  →  /api/* 代理  →  Fastify 后端 (:8766)  →  交易所 API
                                              ↓
                                        SQLite (data/stone.db)
                                        ├─ accounts / groups
                                        ├─ account_snapshots（余额历史）
                                        ├─ total_snapshots（总资产历史）
                                        └─ closed_trades（配对后的交易日志）
```

### 后端模块（server/src）

| 模块 | 说明 |
|------|------|
| `services/exchanges/crossex.ts` | Gate CrossEx 客户端（移植自 gate-crossex，只读子集） |
| `services/exchanges/balances.ts` | 8 所独立余额客户端（移植自 crypto-portfolio-tracker-oss） |
| `services/pairing.ts` | 数量感知 FIFO 配对引擎（移植自 stone worker） |
| `services/trades.ts` | Binance 全交易对 + CrossEx 历史成交拉取 |
| `services/sync.ts` | 同步编排：余额快照 + 交易落库 |
| `services/analytics.ts` | 从 closedTrades 派生前端 MockData 结构 |
| `services/accounts.ts` | 账户/分组 CRUD + 凭据加解密 |

### 交易所接入

| 方式 | 覆盖 | 配置 |
|------|------|------|
| CrossEx | Gate/Binance/OKX/Bybit/Kraken/HL/Deribit 7 所（一个 Gate key） | 一个账户 |
| 独立 key | Binance/Bybit/Gate/OKX/Bitget | 各所单独账户 |
| 钱包地址 | Hyperliquid（公开 API） | 地址即可 |
| 手动 | Derive/Extended | 占位 |

## 开发

```bash
# 后端
cd server && npm run dev        # tsx watch

# 前端
npm run dev                     # 代理 /api → 127.0.0.1:8766
```

## 与旧架构的关系

- 原 Cloudflare Worker（`worker/`）保留未动，可作为只读备份
- 前端 API 客户端已指向本地后端；`next.config.ts` 的 dev 代理指向 `127.0.0.1:8766`
- 生产部署：`npm run build` 后由后端静态托管 `out/`（或任意静态服务器 + 反向代理 /api）

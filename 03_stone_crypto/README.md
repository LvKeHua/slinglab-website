# 03_stone_crypto · Stone Crypto 模块日志

> 最后更新：2026-08-24（CMM/Mazino 复刻 + 组合杠杆重构）
> 项目：本地自托管交易日志 + 多交易所账户追踪（Next.js + Fastify + SQLite）
> 启动：`start-local.ps1`（后端 :8766 + 前端 :3000）
> git：`LvKeHua/stone-crypto`（main）——独立仓库，本目录含 node_modules 完整副本

---

## 一、项目定位

CMM 风格的自动化交易日志 + 统一账户金额追踪，**纯本地运行**（数据不出本机，API Key AES-256-GCM 加密存储）。

### 核心功能
- **交易日志**：Binance 全交易对 + CrossEx 7 所（Gate/Binance/OKX/Bybit/Kraken/Hyperliquid/Deribit）历史成交自动 FIFO 配对
- **统一账户追踪**：9 种接入方式（Binance/Bybit/Gate/OKX/Bitget/Hyperliquid/Derive/Extended/CrossEx），余额历史时间序列快照
- **组合头寸与统一杠杆率**（crypto-portfolio-tracker-oss 移植）：7 所开仓头寸实时抓取，Σ|notional|/Σmargin 统一杠杆、按所/按币聚合、uPnL/ROI/强平价
- **链上钱包追踪**（OSS 移植）：EVM 走 DeBank Cloud API（代币+DeFi 头寸），Solana/Sui/Cosmos 走 CoinStats，余额快照历史
- **Mazino 复刻**：Scorecards（checklist+1-10 评分）、Strategies（交易手册）、Calendar（PnL 日历+月导航）、Sticky Notes（全局浮窗便签）、Journal 截图上传
- **CMM Hypertracker 复刻**：Market Radar（涨跌幅/资金费率/爆仓）、Funding Heatmap（24h 资金费率热力图），服务端代理拉取
- **页面**：Dashboard / Portfolio / Accounts / Wallets / Performance / Calendar / Market Radar / Funding Heatmap / Analytics / Reporting / Trades / Positions / Scorecards / Strategies / Journal

## 二、架构

```
Next.js 前端 (:3000)  →  /api/* 代理  →  Fastify 后端 (:8766)  →  交易所 API
                                              ↓
                                        SQLite (server/data/stone.db)
                                        ├─ accounts / groups
                                        ├─ account_snapshots（余额历史）
                                        ├─ total_snapshots（总资产历史）
                                        ├─ positions（各所开仓头寸快照）
                                        ├─ wallets / wallet_snapshots（链上钱包）
                                        └─ scorecards / strategies / sticky_notes
```

## 三、目录结构

```
03_stone_crypto/
├── README.md                 # 官方 README（完整功能/配置说明，必读）
├── full-trade-coverage-plan.md  # 全交易对覆盖计划
├── package.json              # 前端 Next.js（dev/build/start）
├── start-local.ps1           # 一键启动（后端+前端）
├── start-proxy.ps1           # 代理启动
├── server/                   # Fastify 后端
│   ├── src/services/exchanges/crossex.ts   # Gate CrossEx 客户端
│   ├── src/services/exchanges/balances.ts  # 8 所余额客户端
│   ├── src/services/pairing.ts             # FIFO 配对引擎
│   ├── src/services/trades.ts              # Binance 全交易对拉取
│   ├── src/services/sync.ts                # 同步编排（余额+头寸+成交）
│   ├── src/services/positions.ts           # 7 所头寸客户端 + 统一杠杆引擎
│   ├── src/services/market.ts              # Market Radar 公开数据拉取
│   ├── src/services/analytics.ts           # 分析派生
│   ├── src/services/accounts.ts            # 账户 CRUD + 加密
│   └── data/stone.db                       # SQLite（本地数据）
├── src/                      # Next.js 前端（app/components/hooks/stores）
├── local-proxy/              # 交易所本地代理
├── public/  out/  .next/     # 构建产物
└── deploy-upload.cjs         # 部署上传脚本
```

## 四、快速开始

```powershell
# 首次
cd server && npm install
cd .. && npm install

# 启动（后端 :8766 + 前端 :3000）
.\start-local.ps1
```

打开 http://localhost:3000 → Accounts 添加交易所账户 → Sync All。

## 五、与平台的关系

- **独立本地应用**，不占 app.slinglab.xyz 路由
- 平台侧有 stone-journal Worker（/stone/*、/dashboard/*）——早期版本，Stone/ 目录（Vue3）是它的前端源码（已归档到 00_平台/Stone）
- `Dashboard/`（React）是 trade-dashboard 前端（00_平台/Dashboard）
- ⚠️ **交易数据在本地 SQLite（server/data/stone.db）**——如需备份/迁移，拷这个文件即可

## 六、维护注意

- 凭据加密密钥在本地配置（STONE_ENC_KEY），勿删除 `server/data/` 否则账户/历史全丢
- 交易所 API Key 添加后即时加密存储，日志/数据库均不出现明文
- **Market Radar 需要出网**：后端启动时设 `NODE_USE_ENV_PROXY=1` + `HTTP(S)_PROXY=http://127.0.0.1:7897`（Clash 端口），否则公开行情拉取失败
- **链上钱包需要 Provider Key**：Settings → Data Providers 填 DeBank AccessKey（EVM）和 CoinStats API Key（Solana/Sui/Cosmos），未配置时 Wallets 页会提示
- **截图上传**：Journal 页上传的图表存 `server/data/uploads/`，通过 `/api/uploads/:file` 提供
- 前端 dev 若遇 Turbopack rayon panic（Windows 资源不足），用 `next dev --webpack` 启动

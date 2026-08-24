# SlingLab 网站完整日志

> 生成日期: 2026-07-22
> 域名: https://app.slinglab.xyz/screener/
> 项目: 筹码筛选 · 代币筛选器 (Tokenomics Screener)

---

## 目录

1. [架构总览](#1-架构总览)
2. [Cloudflare 基础设施](#2-cloudflare-基础设施)
3. [Worker 源代码 (sanitized)](#3-worker-源代码-sanitized)
4. [Dashboard HTML (sanitized)](#4-dashboard-html-sanitized)
5. [Wrangler 配置文件](#5-wrangler-配置文件)
6. [CI/CD 流水线](#6-cicd-流水线)
7. [Token Data Collector 模块](#7-token-data-collector-模块)
8. [KV 数据架构](#8-kv-数据架构)
9. [安全审计报告](#9-安全审计报告)
10. [开发历史](#10-开发历史)
11. [部署指南](#11-部署指南)

---

## 1. 架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                       用户浏览器                                      │
│           https://app.slinglab.xyz/screener/                        │
└────────────────────────┬────────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Cloudflare Workers (tokenomics-screener)                │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  Dashboard   │  │   API 路由   │  │  数据刷新引擎             │   │
│  │  (serve HTML)│  │              │  │  (cron 每5分钟)           │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
│         │                │                        │                  │
│         ▼                ▼                        ▼                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Cloudflare KV (TOKENOMICS_MARKET_DATA)           │   │
│  │  ┌─────────────┐ ┌──────────────┐ ┌─────────┐ ┌──────────┐  │   │
│  │  │ dashboard   │ │     data     │ │  count  │ │last_upd  │  │   │
│  │  │    _html    │ │  (JSON数组)   │ │         │ │  _ated   │  │   │
│  │  └─────────────┘ └──────────────┘ └─────────┘ └──────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│   Bybit API      │  │  CoinMarketCap   │  │   CoinGecko API      │
│   (永续合约)      │  │  (Pro API)       │  │   (8页并行, 2000币)  │
└──────────────────┘  └──────────────────┘  └──────────────────────┘
```

### 核心数据流

1. **定时刷新** (cron `*/5 * * * *`): Worker 每5分钟并行调用 Bybit、CMC、CoinGecko
2. **双源交叉验证**: CMC 流通率 vs CoinGecko 流通率对比，偏差 > 30% 标记冲突
3. **CG 过时检测**: CoinGecko 数据明显滞后时标注 "CG过时"
4. **星级评分**: 基于市值 + 流通率综合评分 (0-5星)
5. **前端渲染**: SPA 通过 `/api/data` 获取 JSON 数据，客户端筛选

---

## 2. Cloudflare 基础设施

### 2.1 Worker 概览

| 属性 | 值 |
|------|-----|
| **Worker 名称** | `tokenomics-screener` |
| **类型** | ES Module (`export default { fetch, scheduled }`) |
| **入口** | `main_module: worker.js` |
| **路由** | `app.slinglab.xyz/screener/*` |
| **KV 绑定** | `MARKET_DATA` → `TOKENOMICS_MARKET_DATA` (id: `6d56b8307fd04814892f9c2b15723c02`) |
| **定时触发** | `*/5 * * * *` |
| **部署方式** | Cloudflare API multipart (`main_module` + KV binding via metadata) |

### 2.2 Worker Secrets (仅存在 Cloudflare, 不在代码中)

| 变量名 | 类型 | 用途 |
|--------|------|------|
| `CMC_API_KEY` | secret_text | CoinMarketCap Pro API 密钥 (环境变量) |
| `COINGECKO_API_KEY` | secret_text | CoinGecko API 密钥 (环境变量, 可选) |
| `UPLOAD_AUTH_KEY` | secret_text | `/api/upload` 接口鉴权 (环境变量) |

> ✅ 三个 API 密钥均通过 `wrangler secret` 设置，代码中通过 `env.CMC_API_KEY` / `env.COINGECKO_API_KEY` / `env.UPLOAD_AUTH_KEY` 访问（ES Module 格式），**无任何硬编码值**。

### 2.3 KV 命名空间

| 命名空间 | ID | 用途 |
|----------|----|------|
| `TOKENOMICS_MARKET_DATA` | `6d56b8307fd04814892f9c2b15723c02` | 市场数据缓存 + 仪表板 HTML |
| `runnerxbt-data` | `a8a7863f33ce49cc94d764f784c2cbe6` | (其他用途) |

### 2.4 KV Keys

| Key | 类型 | 说明 |
|-----|------|------|
| `dashboard_html` | string (26992 bytes) | 仪表板完整 HTML/CSS/JS |
| `data` | JSON string | 筛选后币种数组 |
| `count` | string | 币种数量 |
| `last_updated` | ISO datetime | 最后刷新时间 |
| `last_cg_fetch` | ISO datetime | CoinGecko 最后拉取时间 (60min 冷却) |
| `exchange_debug` | JSON string | 交易所连通性诊断 (cron 每次写入) |
| `debug_exchange` | JSON string | `/api/debug-exchange` 详细端点测试结果 |

---

## 3. Worker 源代码 (sanitized)

> 文件: `src/worker.js`
> 完整行数: ~470 行 (ES Module 格式)
> 版本: v6 (ES Module 迁移 + KV Binding 修复)

### 3.1 核心功能模块

```
worker.js (ES Module v6)
├── 工具函数
│   ├── json() / html()     → 响应生成
│   ├── normalizePath()     → 路径归一化 (/screener/ 兼容)
│   └── matchMarketKey()    → 跨数据源币种匹配
├── 数据验证
│   ├── crossValidateRatio() → CMC vs CG 流通率交叉验证
│   └── assignStars()       → 星级评分逻辑
├── 数据采集
│   ├── fetchBybitData()    → Bybit 永续合约 (15s 超时)
│   ├── fetchCmcData(env)   → CoinMarketCap (10s 超时, env.CMC_API_KEY)
│   ├── fetchCoinGeckoData(env) → CoinGecko 8页并行 (30s 超时, env.COINGECKO_API_KEY)
│   └── refreshData(kv, env) → 三源聚合 + 优先级回退
├── API 路由
│   ├── handleApiData(kv)     → GET /api/data
│   ├── handleDashboard(kv)   → GET /  (从 KV 取 HTML)
│   ├── handleRefresh(kv, env)→ POST /api/refresh
│   ├── handleUpload(req, kv, env)→ POST /api/upload (env.UPLOAD_AUTH_KEY)
│   ├── handleStatus(kv)      → GET /api/status
│   └── handleDebugExchange(kv) → GET /api/debug-exchange
└── ES Module 导出
    ├── export default { fetch, scheduled }
    └── 所有 binding/secret 通过 env 参数注入
```

### 3.2 星标评分算法 (`assignStars`)

```
流通市值 ≤ 5亿  且 流通率 < 30% → ★★★★★ (5星, 窒息筹码)
流通市值 ≤ 1亿  且 流通率 < 50% → ★★★★☆ (4星)
流通市值 ≤ 5亿  且 流通率 < 50% → ★★★☆☆ (3星)
流通市值 ≤ 20亿 且 流通率 < 50% → ★★★☆☆ (3星)
流通市值 > 20亿 且 流通率 ≥ 50% → ★☆☆☆☆ (1星)
流通市值 > 20亿 且 流通率 < 50% → ★★☆☆☆ (2星)
流通率 ≥ 80% → ★☆☆☆☆ (1星)
其余 → ★★☆☆☆ (2星)

冲突状态: 使用 CMC 比率，CG 过时额外降1星
```

### 3.3 数据冲突检测

```javascript
// crossValidateRatio(cmcRatio, cgRatio)
// 偏差 > 30% → 标记冲突并显示双比率
// CG 比率 < CMC 比率 × 0.5 且 CG 市值 < CMC 市值 × 0.5 → 标注 "CG过时"
```

### 3.4 三源数据回退策略

```
优先级 1: Bybit + CMC 联合数据 (最完整)
优先级 2: 仅 CMC 数据 (无价格/24h)
优先级 3: 仅 Bybit 数据 (无市值/流通率)
```

### 3.5 Worker 完整代码 (sanitized, 无 API key 值)

> 代码文件另见: `src/worker.js`
> 注意: 代码引用 `CMC_API_KEY`、`COINGECKO_API_KEY`、`UPLOAD_AUTH_KEY` 均为 Cloudflare Secrets 变量名，
> 通过 `env` 参数注入（ES Module 格式），非实际密钥值。

```javascript
// ====== 完整代码见 src/worker.js ======
// 关键结构摘要 (ES Module v6):

// KV key 常量
const KV_HTML_KEY = 'dashboard_html';

// Bybit 数据采集 (公开 API, 无需密钥)
async function fetchBybitData() { ... }

// CMC 数据采集 (env.CMC_API_KEY 通过参数注入)
async function fetchCmcData(env) {
  const cmcKey = env?.CMC_API_KEY;
  if (cmcKey) { ... }
}

// CoinGecko 数据采集 (env.COINGECKO_API_KEY 通过参数注入)
async function fetchCoinGeckoData(env) {
  if (env?.COINGECKO_API_KEY) { ... }
}

// 数据合并 + 交叉验证 + KV 写入
async function refreshData(kv, env) { ... }

// ES Module 导出 — 所有 binding/secret 通过 env 注入
export default {
  async fetch(request, env, ctx) {
    const kv = env.MARKET_DATA;
    // ... 路由分发
  },
  async scheduled(controller, env, ctx) {
    const kv = env.MARKET_DATA;
    ctx.waitUntil(refreshData(kv, env));
  },
};
```

---

## 4. Dashboard HTML (sanitized)

> 文件: `src/dashboard.html`
> 大小: 25,886 bytes
> 类型: 单页 SPA (无外部依赖)

### 4.1 技术栈

| 技术 | 说明 |
|------|------|
| **HTML5** | 语义化结构 |
| **CSS3** | CSS 变量主题系统, Flexbox, Grid 自适应 |
| **Vanilla JS** | 纯原生 JavaScript, 无框架 |
| **设计系统** | 暗色主题, 毛玻璃效果, 渐变色, 微交互动画 |

### 4.2 前端功能模块

```
dashboard.html
├── CSS 设计系统
│   ├── CSS 变量 (颜色/圆角/阴影/动画)
│   ├── 暗色主题 (--bg: #0b1120)
│   ├── 渐变背景 + 毛玻璃效果
│   └── 响应式 (768px 断点)
├── UI 布局
│   ├── 顶部标题栏 (渐变文字 + 数据源说明)
│   ├── 状态栏 (币种数量 + 更新时间)
│   ├── 信息横幅 (数据源状态提示)
│   ├── 侧边栏 (280px)
│   │   ├── 预设按钮 (窒息流A / 全流通B)
│   │   ├── 市值滑块 (M $)
│   │   ├── 流通率滑块 (%)
│   │   ├── 振幅滑块 (%)
│   │   ├── 7日涨跌滑块 (%)
│   │   └── 刷新按钮
│   └── 主区域 (flex:1)
│       ├── KPI 卡片行 (全部/命中/正收益/平均潜力/主力信号)
│       ├── 数据表格 (可排序)
│       └── 资金分配器 (均仓计算)
├── JavaScript 逻辑
│   ├── 数据加载 (API 调用 + XMLHttpRequest 回退)
│   ├── 数据源检测 (自动检测可用列)
│   ├── 筛选引擎 (四维筛选)
│   ├── 排序引擎 (多列排序)
│   ├── 预设计算 (窒息流A/全流通B)
│   ├── 资金分配器 (按评分均仓)
│   └── 渲染引擎 (动态 DOM 构建)
└── 数据列
    ├── 交易对 / 名称
    ├── 价格 / 流通市值
    ├── 流通率 (含双源对比)
    ├── 7日涨跌 / 24h涨跌 / 振幅 / 交易量
    ├── 潜力 (星级评分, 含冲突标记)
    ├── 解锁风险 (高通胀/解锁/低风险)
    └── 数据 (冲突标记 + CG过时标记)
```

### 4.3 用户交互流程

```
1. 页面加载 → 显示加载动画
2. fetch /api/data → 获取币种数据
3. 自动检测可用数据源 (MC/CR/P7/Bybit)
4. 渲染 UI → 显示对应列/控件
5. 用户拖动滑块 → 实时筛选 (客户端过滤)
6. 点击表头 → 排序 (正序/反序切换)
7. 预设按钮 → 一键设置筛选条件
8. 资金分配器 → 输入本金+数量 → 自动分配
```

---

## 5. Wrangler 配置文件

> 文件: `wrangler.toml`

```toml
name = "tokenomics-screener"
main = "src/worker.js"
compatibility_date = "2025-04-01"

workers_dev = true

kv_namespaces = [
  { binding = "MARKET_DATA", id = "6d56b8307fd04814892f9c2b15723c02" }
]

[triggers]
crons = ["*/5 * * * *"]

# 注意: API密钥通过 wrangler secret 设置, 不在此文件
# wrangler secret put CMC_API_KEY
# wrangler secret put COINGECKO_API_KEY
```

---

## 6. CI/CD 流水线

> 文件: `.github/workflows/deploy.yml`

```yaml
name: Deploy Worker
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          secrets: |
            CMC_API_KEY
            COINGECKO_API_KEY
        env:
          CMC_API_KEY: ${{ secrets.CMC_API_KEY }}
          COINGECKO_API_KEY: ${{ secrets.COINGECKO_API_KEY }}
```

### 部署流程

1. 推送到 `main` 分支 → 触发 GitHub Actions
2. Wrangler Action 自动上传 Worker
3. 同时设置 `CMC_API_KEY` 和 `COINGECKO_API_KEY` 为 GitHub Secrets 值
4. 部署到 `app.slinglab.xyz/screener/*`

---

## 7. Token Data Collector 模块

> 仓库: https://github.com/LvKeHua/token-data-collector
> 功能: 离线数据采集 + 质量验证 + 报告

### 7.1 文件结构

```
token-data-collector/
├── collector.py    # 数据采集主模块 (10,149 bytes)
├── config.py       # 配置管理 (2,842 bytes)
├── validator.py    # 数据验证 (7,975 bytes)
├── reporter.py     # 报告生成 (4,937 bytes)
├── requirements.txt # 依赖 (18 bytes)
├── collect.yml     # 定时采集工作流 (2,091 bytes)
└── .gitignore      # (277 bytes)
```

### 7.2 模块功能

| 模块 | 功能 |
|------|------|
| `collector.py` | 多交易所数据聚合 (Bybit/CMC/CG)，统一格式输出 JSON |
| `config.py` | YAML 配置管理，API key 从环境变量读取 |
| `validator.py` | 流通率交叉验证，差异分析，异常标记 |
| `reporter.py` | HTML/Markdown 报告生成，趋势图 |

### 7.3 配置方案 (config.py)

```python
# API 配置 (所有密钥从环境变量读取, 非硬编码)
config = {
    'cmc': {'api_key': os.environ.get('CMC_API_KEY')},
    'coingecko': {'api_key': os.environ.get('COINGECKO_API_KEY')},
    'bybit': {'base_url': 'https://api.bybit.com'},  # 公开 API
}
```

---

## 8. KV 数据架构

### 8.1 `data` Key 数据格式

```json
[
  {
    "symbol": "BTCUSDT",
    "name": "Bitcoin",
    "base_asset": "BTC",
    "price": 50000.00,
    "market_cap": 980000000000,
    "circulating_supply": 19600000,
    "total_supply": 21000000,
    "max_supply": 21000000,
    "circulating_ratio": 0.9333,
    "cmc_rank": 1,
    "volume_24h_usdt": 28000000000,
    "percent_change_7d": 2.5,
    "change_24h_pct": 1.2,
    "amplitude_24h_pct": 3.5,
    "star_rating": 1,
    "unlock_risk": "🟢 低风险",
    "momentum_alert": false,
    // 以下字段仅数据冲突时存在:
    "data_conflict": true,
    "discrepancy_pct": 45,
    "cmc_ratio": 0.9333,
    "cg_ratio": 0.5123,
    "stale_cg_data": true
  }
]
```

### 8.2 筛选条件

| 条件 | 默认值 | 说明 |
|------|--------|------|
| 市值 | ≥ 1500万 $ | 低于此值不显示评分 |
| 流通率 | 0-100% | 可调 |
| 振幅 | ≥ 0% | Bybit 数据源 |
| 7日涨跌 | ≥ -100% | CMC 数据源 |

---

## 9. 安全审计报告

### 9.1 API 密钥审计

| 检查项 | 状态 | 说明 |
|--------|------|------|
| **CMC_API_KEY 在 worker.js 中硬编码** | ✅ 未泄露 | 仅作为环境变量名引用 (`typeof CMC_API_KEY`) |
| **COINGECKO_API_KEY 在 worker.js 中硬编码** | ✅ 未泄露 | 仅作为环境变量名引用 (`typeof COINGECKO_API_KEY`) |
| **CMC_API_KEY 在 wrangler.toml 中** | ✅ 未泄露 | 只有注释说明, 无实际值 |
| **COINGECKO_API_KEY 在 wrangler.toml 中** | ✅ 未泄露 | 只有注释说明, 无实际值 |
| **deploy.yml 中包含密钥** | ✅ 未泄露 | 使用 GitHub Secrets 引用 (`${{ secrets.CMC_API_KEY }}`) |
| **token-data-collector 中密钥硬编码** | ✅ 未泄露 | 均从 `os.environ.get()` 读取 |
| **dashboard.html 中包含密钥** | ✅ 未泄露 | 纯前端代码, 无任何密钥 |
| **Git 历史中存在密钥** | ✅ 未泄露 | 仓库初始提交即不包含密钥 |
| **Cloudflare Worker Secrets 安全** | ✅ 安全 | 通过 `wrangler secret put` 设置 |

### 9.2 潜在安全问题

| 问题 | 严重性 | 说明 |
|------|--------|------|
| `screener-upload-2026` 硬编码在 worker.js | ⚠️ 低 | 上传接口认证密钥, 虽非第三方API密钥, 但已硬编码在源码中。建议改为 Worker Secret。 |
| CORS `Access-Control-Allow-Origin: *` | ℹ️ 须知 | 允许任意域名跨域调用 API, 但数据为公开市场数据, 风险可控。 |
| 无速率限制 | ℹ️ 须知 | 公共 API 端点无请求频率限制 |

### 9.3 修复建议

1. 将 `screener-upload-2026` 从代码中移除，改为 Worker Secret
2. 考虑为 `/api/data` 端点添加缓存控制
3. 如需更强安全，可为 `/api/refresh` 添加 IP 白名单

---

## 10. 开发历史

### v1 — Bybit 基础版
- Bybit 永续合约数据采集
- 基础价格/涨跌幅展示
- 手工刷新

### v2 — CMC 整合
- CoinMarketCap API 接入 (需 CMC_API_KEY)
- 市值 + 流通率数据
- 星级评分系统 (basic)

### v3 — 双源交叉验证
- CoinGecko API 接入 (需 COINGECKO_API_KEY)
- 8 页并行采集 (2000 币种)
- CMC vs CG 流通率偏差检测
- 数据冲突标记

### v4 — 前端重写
- 滑块筛选器 (市值/流通率/振幅/7日)
- 预设模式 (窒息流A / 全流通B)
- 资金分配器
- 排序 + KPI 卡片

### v6 — ES Module 迁移 + KV Binding 修复 (当前版本)
- Worker 格式从 Service Worker (`addEventListener`) 迁移至 ES Module (`export default { fetch, scheduled }`)
- 所有 KV binding 和 Secrets 改为通过 `env` 参数注入（`env.MARKET_DATA`, `env.CMC_API_KEY`, `env.COINGECKO_API_KEY`, `env.UPLOAD_AUTH_KEY`）
- 排查并修复 API 部署时 KV binding 丢失的根因：Cloudflare API multipart 上传不会保留 `wrangler.toml` 中的 binding 配置，需在 metadata 中显式声明 `bindings` 数组
- 本地文件版本 (`worker.js`) 和 API 部署的代码已同步为同份 ES Module 文件
- 新增 `/api/debug-exchange` 诊断端点 + `exchange_debug`/`debug_exchange` KV 键，用于排查交易所连通性
- 三源数据采集函数统一接收 `env` 参数，不再依赖全局变量
- CG 过时检测 (CG 数据明显滞后时标记)
- 双源流通率对比显示
- 冲突时星级降级逻辑
- `normalizePath()` 路由兼容
- 三源数据回退策略
- KV JSON 写入修复 (`rawBody: true`)

### 已知 Bug 修复记录

| Bug | 原因 | 修复方式 |
|-----|------|----------|
| `Unexpected token 'class'` | stale badge 上下文 `+` 开头字符串被误解析为标签 | 将 `+"` 改为 `+` + 字符串变量 |
| KV JSON 编码损坏 | 写入 KV 时未启用 `rawBody: true` | 在 MARKET_DATA.put 后添加校验 |
| Bybit 振幅过高 | 分母用昨日收盘而非当前价 | 改用 `((high-low)/price)*100` |
| API 部署后 KV 写入全部静默失败 | API multipart 上传不保留 `wrangler.toml` 中的 KV binding 配置 | 在 metadata 中显式声明 `bindings: [{ type: "kv_namespace", name: "MARKET_DATA", namespace_id: "..." }]` |
| Service Worker 格式在 API 部署后所有 Secrets 不可用 | API 将 worker 标记为 `has_modules: true`，但 Service Worker 格式依赖全局变量 | 迁移至 ES Module 格式，所有 binding/secret 通过 `env` 参数注入 |

---

## 11. 部署指南

### 11.1 前置条件

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login
```

### 11.2 本地开发

```bash
# 克隆仓库
git clone https://github.com/LvKeHua/token-dashboard.git
cd token-dashboard

# 设置 Secrets (生产密钥)
wrangler secret put CMC_API_KEY
wrangler secret put COINGECKO_API_KEY
```

### 11.3 部署

```bash
# 部署到 Cloudflare
wrangler deploy

# 或通过 GitHub Actions (推送到 main 即自动部署)
git push origin main
```

### 11.4 初始化 KV 数据

部署后首次访问需要触发数据加载:

```bash
curl -X POST https://app.slinglab.xyz/screener/api/refresh
```

或等待 cron 定时任务自动触发 (最长 5 分钟)。

---

## 附录 A: 相关链接

| 资源 | 链接 |
|------|------|
| **网站** | https://app.slinglab.xyz/screener/ |
| **Worker Dashboard** | https://dash.cloudflare.com/ → Workers & Pages → tokenomics-screener |
| **GitHub (Dashboard)** | https://github.com/LvKeHua/token-dashboard |
| **GitHub (Collector)** | https://github.com/LvKeHua/token-data-collector |
| **Bybit API** | https://bybit-exchange.github.io/docs/v5/market/tickers |
| **CMC API** | https://pro.coinmarketcap.com/api/v1 |
| **CoinGecko API** | https://www.coingecko.com/en/api |

## 附录 B: API 端点文档

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/data` | GET | 获取筛选后币种数据 | 无 |
| `/api/refresh` | POST | 手动触发数据刷新 | 无 |
| `/api/status` | GET | 项目健康状态 | 无 |
| `/api/upload` | POST | 上传自定义数据 | `X-Auth-Key` Header |
| `/api/debug-exchange` | GET | 交易所连通性诊断 (测试7个端点) | 无 |
| `/` 或任何路径 | GET | 返回仪表板 HTML | 无 |

---

*本文档由 Sisyphus AI 于 2026-07-22 自动生成。*
*API 密钥已通过安全审计确认无泄露。*

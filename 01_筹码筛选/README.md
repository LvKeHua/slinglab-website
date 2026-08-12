# 01_筹码筛选 · 筹码筛选器模块日志

> 最后更新：2026-08-12（模块化整理）
> 项目：基于 @derrrrrrrq 方法论的全市场小币永续吸筹筛选器
> 线上：https://app.slinglab.xyz/screener/
> git：`LvKeHua/tokenomics-screener`（main）
> 数据管道：日本 VPS（Evoxt 东京）每 15 分钟抓取推送 + Cloudflare Worker 归档
> 完整日志：`筛选器完整系统日志.md`（44KB，**必读**）

---

## 一、模块定位

从 682 个 Binance USDT 永续合约中识别**吸筹/拉升早期**的币（吸筹结构评分 ≥4 进候选池），排除负 EV 陷阱。2026-08-11 起每日自动归档候选池/涨幅榜，支持回测。

## 二、架构

```
日本 VPS（23.27.52.165，唯一抓取节点）每 15 分钟
  └─ git pull + node relay.mjs
      ├─ Binance fAPI（ticker/24hr、OI、klines 100天、资费、深度、上线日期）
      ├─ Bybit / OKX tickers（三所聚合 OI+量）
      └─ POST /api/relay-* → Cloudflare Worker
                                  │
Cloudflare Worker（tokenomics-screener）
  ├─ KV: forward_data / demon_data / coinfilter_data / exchange_proxy / dashboard_html
  ├─ 每日归档: fwd_hist_YYYYMMDD（候选池） + gainer_hist_YYYYMMDD（涨幅榜+收盘价）
  ├─ 接口: /api/forward /api/forward-history /api/overlap-stats /api/events
  │        /api/day-gainers /api/perf /api/status /api/gainer-backfill
  ├─ 自愈: 涨幅榜归档空 → worker scheduled 从 exchange_proxy 回填
  │        + relay 每次运行日线回填最近 3 天缺失（/api/gainer-backfill）
  └─ 前端: 6-tab HTML（KV 优先）
                                  │
美国 VPS（192.255.193.128）每 30 分钟
  └─ sync.py → SQLite /opt/screener-store/（candidates/gainers/events/perf 4 表）
```

## 三、目录结构

```
01_筹码筛选/
├── 筛选器完整系统日志.md     # ★ 主日志：方法论/评分/验证/归档/运维/部署
├── 概述/                     # 8 份历史项目日志（方法论溯源）
├── relay.mjs                 # 数据管道 + 吸筹评分（核心！）
├── cf-worker/
│   ├── worker_v10_inline.mjs # Cloudflare Worker（API + 归档 + 前端内嵌，核心！）
│   └── wrangler.toml         # worker 配置
├── frontend/index.html       # 6-tab 前端（🧲👺🪙🧭🧭🎯）
├── backend/server.py         # 备用本地后端
├── backtest_newfactors.py    # 新因子回测
├── tools/                    # 分析/部署/回测/归档脚本
├── data_hist/                # 历史数据快照（backtest/kline/候选池 JSON）
├── deploy/  deploy.sh  deploy_remote.py  setup.sh  setup2.sh  run.sh
└── .github/workflows/relay.yml  # 已停用定时（美国 IP 被 Binance 451 封锁）
```

## 四、6 个 Tab

| Tab | 功能 |
|-----|------|
| 🧲 筹码筛选 | 三所行情 + 市值/流通率筛选 + 星级评分 |
| 👺 妖币扫描 | 额/OI 比挤压信号 |
| 🪙 小币筛选 | 9 类信号标签 + 5 步检查清单 |
| 🧭 前导筛选 | 吸筹结构评分 + 📅 历史候选面板 |
| 🧭 筛币工作台 | L0-L5 完整流程（环境闸门→候选→排除→告警） |
| 🎯 涨幅榜重合 | 📅 日榜回看（候选标注+入选价/埋伏收益）+ 📊 候选表现（fwd vs BTC） |

## 五、核心评分逻辑（摘要，详见主日志）

- 硬门槛五要素：回撤≥40% + 横盘<30% + 缩量<20% + 不创新低 + 无大波动
- 强度分 ≥4 进候选池（OI 甜蜜区 2-8M +2、大阳线后盘整 +1、缓涨 +1 等）
- 事件回避：额/OI≥5 → -3 分（fwd5 -1.7% 验证）
- 信号：acc_candidate / avoid_event / watch / noise

## 六、每日归档（2026-08-11 起）

| key | 内容 | 日界 |
|-----|------|------|
| fwd_hist_YYYYMMDD | 当日候选池（币/评分/首末入选时间） | 北京 UTC+8 |
| gainer_hist_YYYYMMDD | 当日涨幅榜（涨幅/成交额/收盘价） | 北京 UTC+8 |

- 种子回填 08-04~08-10（seed: true，口径略偏宽松）
- 08-11 起实时精确记录
- 回测数据入口：/api/forward-history、/api/day-gainers、/api/perf、/api/events

## 七、运维

```bash
# 部署 worker
cd cf-worker && npx wrangler deploy worker_v10_inline.mjs --name tokenomics-screener

# 更新前端 KV（dashboard_html = frontend/index.html）——用 CF API 直传更稳
# 见外层 README 第五节脚本

# 美国 VPS 存储同步（已自动，cron 30 分钟）
ssh root@192.255.193.128 "cd /opt/screener-store && python3 sync.py"
```

## 八、坑位速查（全部踩过）

- 只改 index.html 不传 KV = 线上没变化
- wrangler bulk 对 160KB 上传不稳定 → 用 CF API 直传
- 旧 API token（cfut_ 开头）已失效 401 → 用 wrangler OAuth（default.toml 自动刷新）
- 美国 IP（GA/VPS）被 Binance 451 → 只有日本 VPS 能抓
- **relay 推送字段与 worker 归档字段必须一致**（08-13 事故：涨幅榜归档静默变空 2 天）——改 relay 字段名时同步改 worker `hRL`/`healGainerArchive`
- 涨幅榜归档有自愈：worker scheduled + relay 日线回填，归档空等 15 分钟自动恢复
- KV 免费版写入配额 1000 次/日，当前 ~720 次/日（归档 288 + 原管线 432）
- 日本 VPS SSH 凭证不在项目内（向用户索取）

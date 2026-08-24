# 00_平台 · SlingLab 平台模块日志

> 最后更新：2026-08-12（模块化整理）
> 权威架构文档：`HANDOFF.md`（929 行，完整保留）；本日志为提炼速查版
> 域名：https://app.slinglab.xyz

---

## 一、平台架构

```
app.slinglab.xyz
├── /            → slinglab-homepage Worker（登录页/导航）
├── /screener/*  → tokenomics-screener Worker（筹码筛选，01 模块）
├── /stone/*     → stone-journal Worker（交易日志前端）
├── /dashboard/* → stone-journal Worker（同上）
└── 其他路径      → 回源 → Cloudflare Tunnel → 本地/VPS :8000
```

### Cloudflare 账户

| 项 | 值 |
|----|-----|
| Account ID | `1ab09277ed038add4925d28a343c9dc5` |
| Zone ID | `3b21d2fc8d5e020709d21d74f95753c2` |
| 根域名 | slinglab.xyz（NS: aarav/jacqueline.cloudflare.com） |
| Workers.dev | cmm-trading-journal.workers.dev |

### Worker 清单

| Worker | 路由 | 状态 |
|--------|------|------|
| slinglab-homepage | `app.slinglab.xyz/` | ✅ 在用 |
| tokenomics-screener | `app.slinglab.xyz/screener/*` | ✅ 在用（详见 01_筹码筛选 日志） |
| stone-journal | `/stone/*` `/dashboard/*` | ✅ 在用 |
| cmm-trading-journal | workers.dev 子域 | 🟡 保留 |
| bear-market-therapy / hello-test-3 / temp-proxy3 | 无路由 | 🔴 可清理 |

### Cloudflare Tunnel

| 项 | 值 |
|----|-----|
| Tunnel ID | `f8ea2e9d-3c9b-499e-8422-60e377e915a7`（runnerxbt-tunnel） |
| 当前目标 | `http://127.0.0.1:8000`（本机，需本地启动 cloudflared 才可达） |
| 配置 | `C:\Users\admin\.cloudflared\config.yml` |
| 启动 | `cloudflared tunnel --config $env:USERPROFILE\.cloudflared\config.yml run` |

---

## 二、目录结构

```
00_平台/
├── HANDOFF.md              # 权威架构文档（完整，勿删）
├── SlingLab_完整日志.md     # 历史日志（2026-07-22）
├── wrangler.toml           # slinglab-homepage worker 配置
├── homepage-worker/        # 主页 worker 源码（src/index.js）
├── src/                    # 旧 worker 源码
│   ├── worker.js           # 筹码筛选前身（ES Module v6，470 行）
│   ├── homepage-worker.js  # 主页 worker（Service Worker 版）
│   └── dashboard.html      # 筹码筛选 SPA 早期版（25KB）
├── data/                   # CMC/CoinGecko 采集器
│   ├── collector.py        # 采集（CMC top200 + CG 8页并行）
│   ├── validator.py        # 验证
│   ├── reporter.py         # 推 KV + 生成摘要
│   └── requirements.txt
├── Stone/                  # stone-journal（Vue3 + Vite 前端）
├── Dashboard/              # trade-dashboard（React + Tailwind 前端）
└── .github/workflows/      # collect.yml（CMC 采集，每小时）+ deploy.yml
```

---

## 三、关键逻辑

### 主页 worker（slinglab-homepage）
- `GET /`：KV `SITE_DATA.get("homepage_html")` → 无则硬编码 fallback
- 其他路径：`fetch(event.request)` 回源 tunnel
- 绑定 `SITE_DATA` → 与筹码筛选**共享** KV namespace（设计耦合，勿拆）

### 采集器（data/）
- CMC API（X-CMC_PRO_API_KEY）Top N 币种
- CoinGecko 8 页并行（每页 250，共 2000 币）
- 双源交叉验证流通率（偏差 >30% 标记冲突）+ CG 过时检测
- 星级评分：市值 + 流通率 → 0-5 星（窒息流 A / 全流通 B 预设）

---

## 四、部署

```bash
# 主页 worker
cd homepage-worker
npx wrangler deploy

# 采集器（GA 每小时自动跑，也可手动）
# 见 .github/workflows/collect.yml（需 CMC_API_KEY / CF_API_TOKEN secrets）
```

### 已知问题
- GA collect 从 2026-07-22 起失败（3 次运行全挂）——原因未查清（secrets 或 API key 失效），**但不影响线上**：共享 KV 由筹码筛选 relay 持续写入
- Tunnel 指向本机 8000：本机关机则 `/runnerxbt/` 等回源路径不可达

---

## 五、维护建议
1. HANDOFF.md 是黄金文档：新对话必读（含全部 worker 历史、坑位、token 清单）
2. 平台改动（路由/worker/tunnel）→ 更新 HANDOFF.md + 本日志
3. GA collect 修复优先级低（数据由 01 模块 relay 兜底），但若要 SlingLab 独立数据源需排查 secrets

# 02_runnerxbt · RunnerXBT 模块日志

> 最后更新：2026-08-12（模块化整理）
> 项目：Telegram 交易信号爬取 + BTC/ETH K线可视化
> 线上：https://runnerxbt.pages.dev（Cloudflare Pages，GA 每 10 分钟自动部署）
> git：`LvKeHua/runnerxbt-insights`（master）
> 完整历史：`PROJECT_LOG.md`、`完整开发日志.md`

---

## 一、项目定位

从 Telegram 频道爬取交易信号/市场分析消息，结合 BTC/ETH K线数据可视化展示。

### 数据规模（截至 2026-07-21）
- 消息 3,783 条（483 天，Telegram 多个频道）
- 媒体 145 个（图片/视频）
- BTC 1D 900 根 / ETH 1D 900 根 / BTC 4H 1,440 根

## 二、架构

```
GitHub Actions（每 10 分钟，美国 IP 可用✅——数据源是 Telegram+OKX，不依赖 Binance）
  ├─ scraper/sync_telegram.py     → Telethon 拉取频道消息
  ├─ scraper/sync_klines_okx.py   → OKX K线（1D/4H）
  ├─ merge_messages.py            → 合并去重
  ├─ build_v2.py                  → 构建自包含 HTML（deploy_v2/）
  ├─ inject_v2/ux2/ux3/ux4.py     → 前端功能注入
  └─ wrangler pages deploy        → Cloudflare Pages（runnerxbt）
      └─ git push 数据回传         → data/*.json + media/
```

**美国 VPS（192.255.193.128）**：`/opt/runnerxbt/` 部署 FastAPI 后端（:8000）+ nginx（:8080），数据为 7-21 静态快照；现由 Pages 承担线上，VPS 后端仅作历史/备用。

## 三、目录结构

```
02_runnerxbt/
├── PROJECT_LOG.md            # 项目完整会话日志（必读）
├── 完整开发日志.md            # 历史开发日志
├── scraper/                  # Telegram 爬虫（Telethon）
├── backend/                  # FastAPI（messages/btc/eth 接口 + classifier）
├── frontend/                 # SPA 前端（Lightweight Charts K线）
├── cf-worker/                # Worker 构建/部署脚本
├── data/                     # 消息 + K线 JSON
├── media/                    # 下载的 Telegram 媒体
├── data_hist/                # 归档（pages.json/posts.json/archive.html）
├── tools/                    # 构建/注入/合并脚本（build_v2/inject_*/merge）
├── deploy_v2/                # Pages 部署产物（构建输出）
├── deploy_fixed/             # 备用部署目录
├── token-data/               # 子项目：币价采集（collector/reporter/validator）
├── token-dashboard/          # 子项目：币价仪表盘（wrangler worker）
└── docs/                     # GitHub Pages 静态输出
```

## 四、关键凭证

| 项 | 值 |
|----|-----|
| Telegram API ID | `11830965` |
| Telegram API Hash | `a18c4928951c653248430c0d51cb23c3` |
| Telegram Phone | `+1 205 462 6980`（2FA 密码由用户持有） |
| Telegram Session | `scraper/tg_session.session`（GA secret `TG_SESSION_B64` 存 base64） |
| CF Token（Pages） | secret `CF_API_TOKEN` |

## 五、维护

- **数据更新**：GA auto-sync.yml 每 10 分钟全自动（成功率高，2026-08-11 实测 12 步全绿）
- **本地跑爬虫**：`python scraper/sync_telegram.py`（需 session 有效）
- **后端本地跑**：`cd backend && uvicorn server:app --port 8000`
- ⚠️ `_chrome_profile`（380M）/`_lw421`（3.2M）为爬虫调试残留，**未复制**（原目录有）
- ⚠️ `.session` 文件（Telegram 登录态）**未复制**，如需恢复从原目录拷贝

## 六、与平台的关系

- Pages 线上独立（runnerxbt.pages.dev），不占 app.slinglab.xyz 路由
- 历史：曾通过 app.slinglab.xyz/runnerxbt/ → Tunnel → VPS :8000 提供（HANDOFF.md 3.1 有记录）

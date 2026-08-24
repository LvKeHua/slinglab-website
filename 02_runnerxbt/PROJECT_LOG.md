# RunnerXBT 项目完整会话日志

**日期**: 2026-07-21
**项目路径**: D:\Vibe Coding 项目合集\runnerxbt
**参与内容**: 全功能版部署 → 域名购买 → Tunnel 配置 → 上线 → 迁移到 RackNerd VPS
**本地状态**: 已关闭（所有服务已迁移到 VPS，本机可随时关机）

---

## 一、项目背景

RunnerXBT 是一个从 Telegram 频道爬取交易信号/市场分析消息，结合 BTC/ETH K线数据进行可视化展示的项目。

### 数据规模
- **消息总数**: 3,783 条（来自多个 Telegram 频道）
- **时间跨度**: 483 天
- **媒体文件**: 145 个（图片/视频，从 Telegram 下载）
- **BTC 1D K线**: 900 根
- **ETH 1D K线**: 900 根
- **BTC 4H K线**: 1,440 根

### 项目结构
```
D:\Vibe Coding 项目合集\runnerxbt\
├── frontend/index.html          # 前端 SPA（Lightweight Charts K线图）
├── backend/server.py            # FastAPI 后端服务
├── data/
│   ├── messages_final.json      # 合并后的消息数据 (3783条)
│   ├── btc_ohlcv_1d.json        # BTC 日线数据
│   ├── eth_ohlcv_1d.json        # ETH 日线数据
│   ├── btc_ohlcv_4h.json        # BTC 4小时线数据
│   └── media/                   # 下载的媒体文件 (145个)
├── scraper/
│   ├── final.py / final2.py     # Telethon 爬虫脚本
│   └── tg_session.session       # 已登录的 Telegram session
├── cf-worker/
│   ├── build-selfcontained.js   # 静态站点构建脚本(Node.js)
│   ├── deploy.js                # Cloudflare Workers 部署脚本
│   └── src/                     # Worker 源码目录
├── docs/                        # GitHub Pages 静态站点输出
├── build_static.py              # Python 静态构建脚本(本次创建)
├── archive.html                 # 归档页面
└── posts.json                   # 帖子数据
```

---

## 二、数据获取过程

### Telethon 登录流程
1. **发现 Telegram Desktop** 安装在 `D:\Telegram\Telegram Desktop\Telegram.exe`
2. **Telegram API 初始化**：
   - API ID: `11830965`
   - API Hash: `a18c4928951c653248430c0d51cb23c3`
   - Phone: `+1 205 462 6980`
4. **QR 扫码登录**（多次失败后成功）：
   - 首次尝试因 `ipv4` 参数错误失败
   - 修正后因代理/Cloudflare 验证失败
   - 最终成功创建 session 并建立连接
5. **2FA 密码**：用户提供后成功通过
6. **数据下载结果**：488 条新消息 + 111 个新媒体文件
7. **数据合并**：新消息与原有 `messages_enriched.json`（3295条）合并为 `messages_final.json`（3783条）

### 数据格式
```json
// 老格式（3295条 enriched）
{ id, date, text, timestamp, images[], links[], videos[] }

// 新格式（488条 新下载）
{ id, date, text, has_media, media_path }
```

### 本地服务
- **框架**: FastAPI (Python)
- **端口**: 8000
- **API 端点**:
  - `GET /api/messages` — 消息数据
  - `GET /api/daily` — 按日统计
  - `GET /api/btc` — BTC K线数据
  - `GET /api/eth` — ETH K线数据
  - `GET /api/btc4h` — BTC 4H K线数据
  - `GET /api/status` — 状态概览
  - `GET /` — 前端 HTML
- **启动命令**: `python backend/server.py`

---

## 三、部署过程

### 第一次尝试：Cloudflare Quick Tunnel（失败）
- 命令: `cloudflared tunnel --url http://127.0.0.1:8000`
- 获得 URL: `https://vitamins-cultures-projection-entrance.trycloudflare.com`
- 结果: Error 1033（Tunnel 断开）
- 原因: tunnel 进程未能持久运行

### 第二次尝试：GitHub Pages 静态站点（成功，但不满足需求）
- 问题: 纯文字版，不支持 145 个媒体文件
- 构建工具: `build_static.py`（本次创建）
- 输出: `docs/index.html`（1.46MB 自包含 HTML）
- 部署: 推送到 `https://github.com/LvKeHua/runnerxbt-insights.git` master 分支
- 静态站点 URL: `https://lvkehua.github.io/runnerxbt-insights/`

### 第三次尝试：Cloudflare Tunnel 持久化（成功）
- 命令: `Start-Process cloudflared tunnel --url http://127.0.0.1:8000`
- 获得 URL: `https://recovered-copying-meals-vendors.trycloudflare.com`
- 状态: HTTP 200，可正常访问
- 局限: 电脑关机后失效，URL 不固定

### 第四次尝试：购买域名 + 命名 Tunnel（最终方案）

#### 域名注册
- 选定域名: `slinglab.xyz`
- 注册商: Spaceship
- 首年价格: $0.98
- 续费价格: ~$12.72/年

#### Cloudflare 域名接入
- 第一步: 创建 API Token（Zone Write + DNS Write 权限）
  - Token 1 (sisyphus-zone-mgmt): `cfut_G7qVdtoYCESmyWr8enA90KWGfAC3YLMgax2uhv8Hfb2bf262`
  - Token 2 (sisyphus-zone-create): `cfut_zvtVfyuXhaznq8ncyAKz60G5lK2dxd9dVrjprpr0120cebaf`
- 第二步: 用户通过 Cloudflare Dashboard 添加域名（API Token 权限不足）
- 第三步: 在 Spaceship 修改 Nameservers
  - 从: `launch1.spaceship.net` / `launch2.spaceship.net`
  - 改为: `aarav.ns.cloudflare.com` / `jacqueline.ns.cloudflare.com`
- 第四步: DNS 生效，Zone 状态变为 `active`

#### 命名 Tunnel 配置
- Tunnel ID: `f8ea2e9d-3c9b-499e-8422-60e377e915a7`
- Tunnel 名称: `runnerxbt-tunnel`
- 凭证文件: `C:\Users\admin\.cloudflared\f8ea2e9d-3c9b-499e-8422-60e377e915a7.json`
- 配置文件: `C:\Users\admin\.cloudflared\config.yml`
- Token 3 (sisyphus-tunnel-mgmt): `cfut_Oo3RjBt3nfdi3PrmFTfbAgnUaqCYFIzUL1lbUt3h8689a0a3`
- Cloudflare Account ID: `1ab09277ed038add4925d28a343c9dc5`

#### DNS 记录
| 类型 | 名称 | 目标 |
|---|---|---|
| CNAME (代理) | app.slinglab.xyz | f8ea2e9d-3c9b-499e-8422-60e377e915a7.cfargotunnel.com |

#### 最终上线
- **URL**: `https://app.slinglab.xyz/`
- **状态**: HTTP 200，全功能可用
- **API 验证**: 3783 messages, 483 days, 145 media files
- **Tunnel 进程**: 后台运行（Start-Process）
- **日志文件**: `%TEMP%\cft-named.log`

---

## 四、配置详情

### Cloudflare API Token 清单

| 名称 | Token 值 | 权限 | 用途 |
|---|---|---|---|
| sisyphus-zone-mgmt | cfut_G7qVdtoYCESmyWr8enA90KWGfAC3YLMgax2uhv8Hfb2bf262 | Zone Write + DNS Write | DNS 管理 |
| sisyphus-zone-create | cfut_zvtVfyuXhaznq8ncyAKz60G5lK2dxd9dVrjprpr0120cebaf | Account Settings Write + Zone Write + DNS Write | 域名管理 |
| sisyphus-tunnel-mgmt | cfut_Oo3RjBt3nfdi3PrmFTfbAgnUaqCYFIzUL1lbUt3h8689a0a3 | Cloudflare Tunnel Write | Tunnel 管理 |

### Tunnel 配置文件 (config.yml)
```yaml
tunnel: f8ea2e9d-3c9b-499e-8422-60e377e915a7
credentials-file: C:\Users\admin\.cloudflared\f8ea2e9d-3c9b-499e-8422-60e377e915a7.json
ingress:
  - hostname: app.slinglab.xyz
    service: http://127.0.0.1:8000
  - service: http_status:404
```

### Tunnel 启动命令
```powershell
Start-Process -NoNewWindow -FilePath "cloudflared" -ArgumentList "tunnel --config $env:USERPROFILE\.cloudflared\config.yml --logfile $env:TEMP\cft-named.log run"
```

---

## 五、构建脚本

### build_static.py（本次创建）
- **用途**: 将消息数据嵌入 HTML，生成自包含静态站点
- **功能**:
  - 从 `messages_final.json` 加载 3783 条消息
  - 标准化日期格式（ISO → YYYY-MM-DD）
  - 提取时间戳
  - 加载 OHLCV 数据
  - 计算每日消息统计
  - 替换 HTML 中的 `loadAll()` 函数为嵌入式数据版
  - 输出到 `docs/index.html`

---

## 六、当前运行状态（会话结束时）

| 组件 | 状态 | 说明 |
|---|---|---|
| FastAPI Server | ✅ 运行中 | `http://127.0.0.1:8000`（后台进程） |
| Cloudflare Tunnel | ✅ 运行中 | 命名 Tunnel `runnerxbt-tunnel`，2 条 QUIC 连接 |
| 域名 | ✅ 已激活 | `slinglab.xyz`，Cloudflare 托管 |
| 网站 | ✅ 可访问 | `https://app.slinglab.xyz/` (HTTP 200) |
| GitHub Pages 静态站 | ✅ 可用 | `https://lvkehua.github.io/runnerxbt-insights/` |
| Telethon Session | ✅ 有效 | `scraper/tg_session.session`，无需重新登录 |

### 局限
1. 电脑关机后 `app.slinglab.xyz` 不可访问（依赖本地服务器）
2. GitHub Pages 版本无媒体文件（纯文字）
3. Quick Tunnel URL 已失效（`recovered-copying-meals-vendors.trycloudflare.com`）
4. 当前 API Token 为一次性生成，安全性需注意（Token 值已记录在此日志）

---

## 七、后续计划（讨论中）

1. **购买云服务器** — 讨论中，倾向 RackNerd 2GB 方案 ($21.99/年)
   - 用途: RunnerXBT 网站 24/7 在线 + 未来交易日志网站
2. **交易日志网站** — 用户计划后续搭建
   - 需求: 记录每日每笔交易，做数据分析
   - 需要数据库支持（预计 SQLite/PostgreSQL）

---

## 八、环境依赖

### 本地环境
- OS: Windows (PowerShell)
- Python: 3.12
- Node.js: 可用
- Git: 已配置
- cloudflared: v2026.5.2
- GitHub CLI (gh): 已认证

### Python 包
- `fastapi`
- `uvicorn`
- `telethon`（数据爬取用）

### 数据仓库
- **GitHub**: `https://github.com/LvKeHua/runnerxbt-insights.git`
- **分支**: `master`
- **Pages 源**: master 分支 /docs 目录

---

## 🖥️ 服务器信息（下次可直接提供给 Agent 部署）

### ① RackNerd VPS
| 项目 | 值 |
|------|-----|
| IP | `192.255.193.128` |
| 用户 | `root` |
| 密码 | `7Jj6Mz80BcArGxE3m7` |
| SSH 端口 | `22` |
| 规格 | 1 vCPU, 1GB RAM, 20GB SSD |
| 系统 | Ubuntu 24.04 |
| 价格 | $15.39/年（使用优惠码 `INTENSEINVESTOR` 后 30% 永久折扣） |
| 控制面板 | https://nerdvm.racknerd.com (用户: vmuser352875, 密码: DCqPKommgV6m5LJ) |

### ② Cloudflare 域名管理
| 项目 | 值 |
|------|-----|
| 域名 | `slinglab.xyz` |
| 子域名 | `app.slinglab.xyz` → RunnerXBT |
| 账户邮箱 | `lukehua815@gmail.com` |
| Account ID | `1ab09277ed038add4925d28a343c9dc5` |
| NS 服务器 | `aarav.ns.cloudflare.com`, `jacqueline.ns.cloudflare.com` |

### ③ Cloudflare Tunnel（免开放服务器端口）
| 项目 | 值 |
|------|-----|
| Tunnel ID | `f8ea2e9d-3c9b-499e-8422-60e377e915a7` |
| Tunnel 名称 | `runnerxbt-tunnel` |
| 凭证文件 | `/root/.cloudflared/f8ea2e9d-3c9b-499e-8422-60e377e915a7.json` |
| 配置路径 | `/root/.cloudflared/config.yml` |

### ④ VPS 系统架构（模块化设计）

```
用户 → https://app.slinglab.xyz/
         │
         ▼
    Cloudflare Tunnel (runnerxbt-tunnel)
         │
         ▼
    nginx (127.0.0.1:8080)  ← 统一入口，按路径分发
         │
         ├── /                          → 项目导航页（/opt/runnerxbt/landing/）
         ├── /runnerxbt/                → FastAPI :8000（RunnerXBT，已锁定不改）
         ├── /runnerxbt/api/*           → FastAPI :8000（API 接口）
         ├── /runnerxbt/media/*         → FastAPI :8000（媒体文件）
         │
         ├── /新项目A/                  → 服务 A（新端口）
         ├── /新项目B/                  → 服务 B（新端口）
         └── ...
```

**路由原理**: nginx 把路径前缀 `/runnerxbt/` 剥离后转发给对应后端，对后端服务透明。

---

### ⑤ 添加新项目的标准流程

每个项目独立部署，互不干扰：

| 步骤 | 操作 | 示例 |
|------|------|------|
| 1 | VPS 上部署项目代码到 `/opt/项目名/` | 后端端口 `8001` |
| 2 | 创建 systemd 服务 `/etc/systemd/system/项目名.service` | `systemctl start journal` |
| 3 | nginx 加 location 块 `/etc/nginx/sites-available/runnerxbt` | `location /journal/ { proxy_pass :8001; }` |
| 4 | 刷新 nginx | `systemctl reload nginx` |
| 5 | 更新首页导航链接 | 修改 `/opt/runnerxbt/landing/index.html` |

**nginx 配置模板**（加到 `/etc/nginx/sites-available/runnerxbt` 的 server 块内）：
```nginx
location /新项目名/ {
    proxy_pass http://127.0.0.1:新端口/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

---

### ⑥ 各项目目录规范

```
/opt/
├── runnerxbt/              # 项目 1: RunnerXBT（已锁定）
│   ├── backend/server.py   # FastAPI 服务
│   ├── frontend/           # 前端静态文件
│   │   └── index.html      # (含 <base href="/runnerxbt/">)
│   └── data/               # 数据文件 + media/
├── landing/                # 项目导航首页
│   └── index.html
├── journal/                # 项目 2: 交易日志（未来）
│   ├── backend/
│   └── frontend/
└── 项目N/                  # 项目 N: ...
    ├── backend/
    └── frontend/
```

---

### ⑦ 已有服务清单

| 服务 | 类型 | 监听地址 | 管理命令 | 模块路径 |
|------|------|---------|---------|---------|
| **Nginx** | 反向代理 | `127.0.0.1:8080` | `systemctl {status\|reload\|restart} nginx` | — |
| **RunnerXBT** | FastAPI (Python) | `127.0.0.1:8000` | `systemctl {status\|restart} runnerxbt` | `/runnerxbt/` |
| **Cloudflare Tunnel** | cloudflared | — | `systemctl {status\|restart} cloudflared-tunnel` | — |

访问地址：**https://app.slinglab.xyz/**

---

### 📌 重要：下次用 Agent 部署新项目时

直接把这三段信息发给 Agent：

> **① RackNerd VPS**
> IP: 192.255.193.128, 用户: root, 密码: 7Jj6Mz80BcArGxE3m7, 端口: 22
>
> **② Cloudflare**
> 域名: slinglab.xyz, 账户: lukehua815@gmail.com
> Account ID: 1ab09277ed038add4925d28a343c9dc5
>
> **③ Tunnel**
> ID: f8ea2e9d-3c9b-499e-8422-60e377e915a7, 名: runnerxbt-tunnel

然后说清楚新项目是做什么的、用什么技术栈。Agent 会自动 SSH 上去部署并加到 nginx 路由里。

**注意**: RunnerXBT 模块已锁定，任何新项目部署都不得修改 `/opt/runnerxbt/` 下的任何文件。

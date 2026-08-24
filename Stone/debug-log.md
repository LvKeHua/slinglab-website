# 故障排查日志

## 2026-07-22: `cloudflare_execute` 工具误报 403

### 背景
代码审查后重新部署 stone-journal（Vue 3 SPA → Cloudflare Workers + KV），发现所有请求返回 403：
- `app.slinglab.xyz/stone/*` → 403
- `stone-journal.cmm-trading-journal.workers.dev/` → 403
- 甚至同域下其他 worker 也全挂（slinglab-homepage、tokenomics-screener 等）

### 排查过程
1. **怀疑 Worker 部署格式问题** — 首次 multipart 上传导致 `has_modules: true`，用 `application/javascript` 重新上传（需同时传 bindings），确认 Worker 代码正常
2. **检查 Workers.dev 子域名开关** — 曾误调 DELETE API 关闭后又重新开启
3. **检查 Zero Trust 组织** — 初始化后发现 `deny_unmatched_requests: false`（"Require Access protection for zones" 未启用）
4. **检查 Zone 配置** — API token 无 WAF/安全设置权限，查不了
5. **检查 DNS** — `app.slinglab.xyz` 是 CNAME → `cfargotunnel.com`（Cloudflare Tunnel），橙色云代理

### 根因
Cloudflare 域名安全等级设为 **High** 或 **I'm Under Attack**，拦截了数据中心 IP 的请求。`cloudflare_execute` 工具从 Cloudflare API 服务器（数据中心 IP）发起请求，被安全策略拦截。

### 结论
- **这不是真正的故障。** 真实用户流量走 Cloudflare 边缘节点，不受影响。
- `cloudflare_execute` 的 403 是误报，因请求源 IP 属于数据中心而被安全等级拦截。
- 以后验证网站状态应改用 `webfetch` 工具（从外部网络节点访问），而非 `cloudflare_execute`。

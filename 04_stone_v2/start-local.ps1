# Stone v2 — 双 VPS 一键启动脚本（本地开发模式）
# fetcher (日本VPS角色) :8780 → server (美国VPS角色) :8766 → web :3000
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Fetcher（数据抓钩）——本地跑，模拟日本 VPS
Write-Host "Starting fetcher (:8780)..." -ForegroundColor Cyan
$fetcherEnv = @{ NODE_USE_ENV_PROXY = "1"; HTTP_PROXY = "http://127.0.0.1:7897"; HTTPS_PROXY = "http://127.0.0.1:7897" }
Start-Process -FilePath "node" -ArgumentList "../node_modules/tsx/dist/cli.mjs", "src/index.ts" -WorkingDirectory "$root\fetcher" -WindowStyle Hidden -Environment $fetcherEnv

# 2. Server（计算+存储）——通过 fetcher 拿数据
Write-Host "Starting server (:8766)..." -ForegroundColor Cyan
$serverEnv = @{
  NODE_USE_ENV_PROXY = "1"
  HTTP_PROXY = "http://127.0.0.1:7897"
  HTTPS_PROXY = "http://127.0.0.1:7897"
  STONE_FETCHER_URL = "http://127.0.0.1:8780"
  STONE_DATA_DIR = "$root\server\data"
}
Start-Process -FilePath "node" -ArgumentList "node_modules/tsx/dist/cli.mjs", "src/main.ts" -WorkingDirectory "$root\server" -WindowStyle Hidden -Environment $serverEnv

# 3. Web 前端
Write-Host "Starting web (:3000)..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "../node_modules/next/dist/bin/next", "dev", "-p", "3000", "--webpack" -WorkingDirectory "$root\web" -WindowStyle Hidden

Write-Host ""
Write-Host "Stone v2 running:" -ForegroundColor Green
Write-Host "  Web:      http://localhost:3000" -ForegroundColor Green
Write-Host "  Server:   http://127.0.0.1:8766" -ForegroundColor Green
Write-Host "  Fetcher:  http://127.0.0.1:8780" -ForegroundColor Green

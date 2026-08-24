# Stone Crypto — 本地自托管后端启动脚本
# 启动后端 (Fastify :8766) + 前端 (Next.js :3000)
# 后端带 Clash 代理环境变量（Market Radar 公开行情需要出网）

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting Stone backend (Fastify :8766)..." -ForegroundColor Cyan
$backendEnv = @{
  NODE_USE_ENV_PROXY = "1"
  HTTP_PROXY = "http://127.0.0.1:7897"
  HTTPS_PROXY = "http://127.0.0.1:7897"
}
Start-Process -FilePath "node" -ArgumentList "node_modules/tsx/dist/cli.mjs", "src/main.ts" -WorkingDirectory "$root\server" -WindowStyle Hidden -Environment $backendEnv

Write-Host "Starting Stone frontend (Next.js :3000, webpack)..." -ForegroundColor Cyan
# --webpack: Turbopack 在部分 Windows 机器上会 rayon panic（资源不足）
Start-Process -FilePath "node" -ArgumentList "node_modules/next/dist/bin/next", "dev", "-p", "3000", "--webpack" -WorkingDirectory $root -WindowStyle Hidden

Write-Host ""
Write-Host "Stone is running:" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "  Backend:  http://127.0.0.1:8766" -ForegroundColor Green
Write-Host ""
Write-Host "To stop: close the two Node windows, or run:"
Write-Host "  Get-Process node | Where-Object { $_.Path -like '*node*' } | Stop-Process"

# Stone Crypto — 本地自托管后端启动脚本
# 启动后端 (Fastify :8766) + 前端 (Next.js :3000)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting Stone backend (Fastify :8766)..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "node_modules/tsx/dist/cli.mjs", "src/main.ts" -WorkingDirectory "$root\server" -WindowStyle Hidden

Write-Host "Starting Stone frontend (Next.js :3000)..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "node_modules/next/dist/bin/next", "dev", "-p", "3000" -WorkingDirectory $root -WindowStyle Hidden

Write-Host ""
Write-Host "Stone is running:" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "  Backend:  http://127.0.0.1:8766" -ForegroundColor Green
Write-Host ""
Write-Host "To stop: close the two Node windows, or run:"
Write-Host "  Get-Process node | Where-Object { $_.Path -like '*node*' } | Stop-Process"

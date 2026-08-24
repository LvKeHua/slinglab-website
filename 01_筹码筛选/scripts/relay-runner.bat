@echo off
REM relay-runner.bat - Run relay.mjs every 5 min via Windows Task Scheduler
REM Uses local HTTP proxy to reach Binance/Bybit (Actions IPs are blocked by exchanges)
setlocal
cd /d "D:\Vibe Coding 项目合集\筹码筛选"

set HTTPS_PROXY=http://127.0.0.1:7897
set HTTP_PROXY=http://127.0.0.1:7897
set WORKER_URL=https://app.slinglab.xyz/screener/api/relay-tickers
set RELAY_AUTH_KEY=55e313c395c3c93a212754423b53ffff0396cfa98f32c4c9fe5b45000f803a99
set DEMON_URL=https://app.slinglab.xyz/screener/api/relay-demon
set DEMON_RELAY_KEY=0eb3f463c85e160bbedbec6b3131bb862bdd0c82ccf9f390

node relay.mjs >> relay.log 2>&1
exit /b %errorlevel%

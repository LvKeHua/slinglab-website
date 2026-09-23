@echo off
REM relay-runner.bat - Run relay.mjs every 5 min via Windows Task Scheduler
REM Uses local HTTP proxy to reach Binance/Bybit (Actions IPs are blocked by exchanges)
setlocal
cd /d "D:\Vibe Coding 项目合集\筹码筛选"

set HTTPS_PROXY=http://127.0.0.1:7897
set HTTP_PROXY=http://127.0.0.1:7897
set WORKER_URL=https://app.slinglab.xyz/screener/api/relay-tickers
set RELAY_AUTH_KEY=REDACTED_RELAY_AUTH_KEY
set DEMON_URL=https://app.slinglab.xyz/screener/api/relay-demon
set DEMON_RELAY_KEY=REDACTED_DEMON_RELAY_KEY

node relay.mjs >> relay.log 2>&1
exit /b %errorlevel%

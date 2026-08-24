@echo off
chcp 65001 >nul
cd /d "D:\crypto\tokenomics-local"

echo === Tokenomics Screener ===
echo.

echo [1/3] Fetching live data from CoinGecko...
powershell -NoProfile -ExecutionPolicy Bypass -File fetch-data.ps1
if %errorlevel% neq 0 (
    echo WARNING: Data fetch failed, using existing data.json
)

echo [2/3] Starting local server...
start /min python server.py
timeout /t 2 /nobreak >nul

echo [3/3] Opening browser...
start http://localhost:3000

echo.
echo Dashboard opened in your browser.
echo Close this window to stop the server.
pause

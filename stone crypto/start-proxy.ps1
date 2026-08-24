$env:PROXY_SECRET = "X958kROc4Tb7IE0k1NdAEMykGuxqd0fv"
$env:PORT = "8765"
$env:PROXY_URL = "http://127.0.0.1:7897"

# Start Node.js proxy
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "C:\Users\admin\stone\local-proxy" -NoNewWindow -PassThru | Out-Null

# Start Cloudflare Tunnel
Start-Process -FilePath "C:\Program Files (x86)\cloudflared\cloudflared.exe" -ArgumentList "tunnel","--config","C:\Users\admin\.cloudflared\config.yml","run" -NoNewWindow -PassThru | Out-Null

Write-Host "Stone Proxy services started."

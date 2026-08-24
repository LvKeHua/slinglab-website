# Tokenomics Screener - 数据抓取脚本
# 用法: powershell -NoProfile -ExecutionPolicy Bypass -File fetch-data.ps1

$url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=7d"

Write-Host "Fetching from CoinGecko..."
$r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
$coins = $r.Content | ConvertFrom-Json
Write-Host "Got $($coins.Count) coins"

$transformed = $coins | ForEach-Object {
    $cr = $null
    if ($_.circulating_supply -and $_.total_supply -gt 0) {
        $cr = [double]$_.circulating_supply / [double]$_.total_supply
    }
    $star = if ($_.market_cap_rank) { [Math]::Max(1, 11 - [Math]::Min(10, $_.market_cap_rank)) } else { 0 }
    [PSCustomObject]@{
        symbol            = $_.symbol.ToUpper() + "USDT"
        name              = $_.name
        price             = if ($_.current_price) { [double]$_.current_price } else { 0 }
        market_cap        = if ($_.market_cap) { [double]$_.market_cap } else { $null }
        circulating_supply = if ($_.circulating_supply) { [double]$_.circulating_supply } else { $null }
        total_supply      = if ($_.total_supply) { [double]$_.total_supply } else { $null }
        circulating_ratio = $cr
        volume_24h_usdt   = if ($_.total_volume) { [double]$_.total_volume } else { 0 }
        percent_change_7d = if ($_.price_change_percentage_7d_in_currency) { [double]$_.price_change_percentage_7d_in_currency } else { $null }
        change_24h_pct    = if ($_.price_change_percentage_24h) { [double]$_.price_change_percentage_24h } else { $null }
        amplitude_24h_pct = if ($_.price_change_percentage_24h) { [double]$_.price_change_percentage_24h } else { $null }
        star_rating       = $star
        unlock_risk       = "Unknown"
        momentum_alert    = $false
    }
}

$ts = [long](Get-Date -UFormat %s) * 1000
$json = @{ ok = $true; data = $transformed; updated = $ts } | ConvertTo-Json -Depth 5 -Compress
[System.IO.File]::WriteAllText("$PSScriptRoot\data.json", $json)
Write-Host "Saved data.json"

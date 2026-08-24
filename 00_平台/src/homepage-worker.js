// slinglab-homepage Worker (Service Worker)
// Source of Truth: Cloudflare deployed copy (saved locally 2026-07-22)
// KV Binding: SITE_DATA → TOKENOMICS_MARKET_DATA (6d56b8307fd04814892f9c2b15723c02)
// KV Key Read: 'homepage_html' (shared namespace with tokenomics-screener)

addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname === '/' || url.pathname === '') {
    event.respondWith((async () => {
      try {
        const kvHtml = await SITE_DATA.get('homepage_html');
        if (kvHtml) {
          return new Response(kvHtml, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
              'Pragma': 'no-cache',
              'Expires': '0',
              'CDN-Cache-Control': 'no-cache'
            }
          });
        }
      } catch(e) {
        console.error('KV error:', e);
      }
      // Fallback HTML (hardcoded)
      const fallback = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="SLINGLAB — CRYPTO TRADING INTELLIGENCE">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<title>SLINGLAB // INTELLIGENCE</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --cyan:#22d3ee;
  --blue:#3b82f6;
  --green:#34d399;
  --amber:#fbbf24;
  --red:#f87171;
  --violet:#a78bfa;
  --text:#e2e8f0;
  --dim:#64748b;
  --bg:#030712;
}
html,body{height:100%}
body{
  font-family:'Segoe UI','PingFang SC','Microsoft YaHei',-apple-system,BlinkMacSystemFont,sans-serif;
  background:var(--bg);
  color:var(--text);
  overflow-x:hidden;
  cursor:default;
}
::selection{background:rgba(34,211,238,.3)}

/* ═══ 全屏 3D 星空背景 ═══ */
#stars3d{position:fixed;inset:0;z-index:0;pointer-events:none}

/* ═══ 合成波网格地平线 ═══ */
.horizon{
  position:fixed;left:0;right:0;bottom:0;height:38vh;z-index:1;pointer-events:none;
  perspective:300px;perspective-origin:50% 0%;
  overflow:hidden;
}
.horizon::before{
  content:'';position:absolute;inset:0;
  background:
    linear-gradient(90deg,rgba(34,211,238,.14) 1px,transparent 1px),
    linear-gradient(rgba(34,211,238,.14) 1px,transparent 1px);
  background-size:44px 44px;
  transform:rotateX(62deg) scale(2.2);
  transform-origin:50% 0%;
  animation:gridMove 2.4s linear infinite;
}
.horizon::after{
  content:'';position:absolute;left:0;right:0;bottom:0;height:70%;
  background:linear-gradient(180deg,transparent,rgba(3,7,18,.95) 85%);
}
@keyframes gridMove{from{background-position:0 0}to{background-position:0 44px}}
.horizon-glow{
  position:fixed;left:50%;bottom:-80px;transform:translateX(-50%);
  width:720px;height:200px;z-index:1;pointer-events:none;
  background:radial-gradient(ellipse,rgba(34,211,238,.18),transparent 70%);
  filter:blur(20px);
  animation:glowPulse 4s ease-in-out infinite;
}
@keyframes glowPulse{0%,100%{opacity:.7}50%{opacity:1}}

/* ═══ 扫描线 + 噪点 ═══ */
.scanlines{
  position:fixed;inset:0;z-index:2;pointer-events:none;mix-blend-mode:overlay;
  background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 3px);
}
.vignette{
  position:fixed;inset:0;z-index:2;pointer-events:none;
  background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.5) 100%);
}

/* ═══ 角落 HUD 角标 ═══ */
.hud-corner{position:fixed;width:26px;height:26px;z-index:5;pointer-events:none;opacity:.6}
.hud-corner.tl{top:14px;left:14px;border-top:2px solid var(--cyan);border-left:2px solid var(--cyan)}
.hud-corner.tr{top:14px;right:14px;border-top:2px solid var(--cyan);border-right:2px solid var(--cyan)}
.hud-corner.bl{bottom:14px;left:14px;border-bottom:2px solid var(--cyan);border-left:2px solid var(--cyan)}
.hud-corner.br{bottom:14px;right:14px;border-bottom:2px solid var(--cyan);border-right:2px solid var(--cyan)}

/* ═══ 顶部状态条 ═══ */
.topbar{
  position:fixed;top:0;left:0;right:0;z-index:10;
  display:flex;align-items:center;justify-content:space-between;
  padding:10px 26px;
  background:rgba(3,7,18,.55);backdrop-filter:blur(10px);
  border-bottom:1px solid rgba(34,211,238,.14);
  font-family:Consolas,'Courier New',monospace;
  font-size:11px;letter-spacing:2px;color:var(--dim);
}
.topbar .brand{display:flex;align-items:center;gap:9px;color:var(--cyan);font-weight:700}
.topbar .brand .blink{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:blink 1.2s steps(2) infinite}
@keyframes blink{50%{opacity:.25}}
.topbar .sys{margin-left:16px;color:#475569}
.topbar .right{display:flex;align-items:center;gap:18px}
.topbar .status-item{display:flex;align-items:center;gap:6px}
.topbar .status-item .led{width:6px;height:6px;border-radius:50%}
.led-green{background:var(--green);box-shadow:0 0 6px var(--green);animation:blink 2s infinite}
.led-cyan{background:var(--cyan);box-shadow:0 0 6px var(--cyan);animation:blink 2s infinite .7s}
.led-amber{background:var(--amber);box-shadow:0 0 6px var(--amber);animation:blink 2s infinite 1.4s}
.topbar .clock{color:var(--cyan)}

/* ═══ 主容器 ═══ */
main{position:relative;z-index:4;min-height:100vh;display:flex;flex-direction:column;padding:76px 24px 0;max-width:980px;margin:0 auto}

/* ═══ HERO 区 ═══ */
.hero{text-align:center;padding:44px 0 38px}
.hero-kicker{
  display:inline-flex;align-items:center;gap:10px;
  font-family:Consolas,'Courier New',monospace;font-size:11px;letter-spacing:5px;color:var(--dim);
  border:1px solid rgba(34,211,238,.25);border-radius:3px;
  padding:6px 16px;margin-bottom:24px;
  background:rgba(34,211,238,.05);
}
.hero-kicker::before{content:'▸';color:var(--cyan);animation:blink 1.4s steps(2) infinite}
.hero h1{
  font-size:clamp(44px,9vw,84px);font-weight:900;letter-spacing:6px;line-height:1.05;
  font-family:Consolas,'Courier New',monospace;
  color:transparent;
  background:linear-gradient(100deg,#22d3ee 0%,#3b82f6 35%,#a78bfa 65%,#22d3ee 100%);
  background-size:200% 100%;
  -webkit-background-clip:text;background-clip:text;
  animation:gradShift 5s linear infinite;
  text-shadow:0 0 40px rgba(34,211,238,.35);
  filter:drop-shadow(0 0 24px rgba(34,211,238,.25));
}
@keyframes gradShift{0%{background-position:0% 50%}100%{background-position:200% 50%}}
.hero .type-line{
  margin-top:18px;font-family:Consolas,'Courier New',monospace;
  font-size:13px;letter-spacing:2.5px;color:var(--dim);
  min-height:20px;
}
.hero .type-line .cursor-bar{display:inline-block;width:9px;height:15px;background:var(--cyan);vertical-align:-2px;margin-left:3px;animation:blink .9s steps(2) infinite;box-shadow:0 0 8px var(--cyan)}

/* 指标条 */
.metrics{
  display:flex;justify-content:center;gap:14px;margin-top:30px;flex-wrap:wrap;
  font-family:Consolas,'Courier New',monospace;
}
.metric{
  border:1px solid rgba(34,211,238,.2);border-radius:4px;
  padding:10px 18px;background:rgba(3,7,18,.6);backdrop-filter:blur(6px);
  text-align:center;min-width:118px;position:relative;overflow:hidden;
}
.metric::before{
  content:'';position:absolute;top:0;left:-100%;width:100%;height:1px;
  background:linear-gradient(90deg,transparent,var(--cyan),transparent);
  animation:sweep 3s ease-in-out infinite;
}
@keyframes sweep{0%,100%{left:-100%}50%{left:100%}}
.metric .num{
  font-size:20px;font-weight:700;color:var(--cyan);
  text-shadow:0 0 12px rgba(34,211,238,.5);
  font-variant-numeric:tabular-nums;
}
.metric .lbl{font-size:9px;letter-spacing:2px;color:var(--dim);margin-top:4px}
.metric .unit{font-size:11px;color:var(--green)}

/* ═══ 项目区标题 ═══ */
.section-label{
  display:flex;align-items:center;gap:14px;margin:10px 0 20px;
  font-family:Consolas,'Courier New',monospace;font-size:11px;letter-spacing:4px;color:var(--dim);
}
.section-label::before{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(34,211,238,.35))}
.section-label::after{content:'';flex:1;height:1px;background:linear-gradient(270deg,transparent,rgba(34,211,238,.35))}
.section-label .tag{color:var(--cyan)}

/* ═══ 项目卡片（HUD 全息）═══ */
.projects{display:flex;flex-direction:column;gap:18px}
.card{
  position:relative;
  border:1px solid rgba(34,211,238,.22);
  background:linear-gradient(135deg,rgba(13,25,45,.7),rgba(3,7,18,.85));
  backdrop-filter:blur(12px);
  border-radius:6px;
  padding:26px 28px;
  display:flex;align-items:center;gap:24px;
  text-decoration:none;color:var(--text);
  transform-style:preserve-3d;
  transition:border-color .25s,box-shadow .25s;
  overflow:hidden;
}
/* 四角 L 角标 */
.card .corner{position:absolute;width:14px;height:14px;opacity:.8;transition:opacity .2s}
.card .corner.c-tl{top:7px;left:7px;border-top:2px solid var(--cyan);border-left:2px solid var(--cyan)}
.card .corner.c-tr{top:7px;right:7px;border-top:2px solid var(--cyan);border-right:2px solid var(--cyan)}
.card .corner.c-bl{bottom:7px;left:7px;border-bottom:2px solid var(--cyan);border-left:2px solid var(--cyan)}
.card .corner.c-br{bottom:7px;right:7px;border-bottom:2px solid var(--cyan);border-right:2px solid var(--cyan)}
/* 扫描光带 */
.card .scanline{
  position:absolute;left:0;right:0;height:2px;top:-2px;
  background:linear-gradient(90deg,transparent,var(--cyan),transparent);
  opacity:0;transition:opacity .3s;
}
.card:hover .scanline{opacity:1;animation:scanDown 1.6s ease-in-out infinite}
@keyframes scanDown{0%{top:-2px}100%{top:calc(100% - 2px)}}
/* hover 外发光 */
.card:hover{
  border-color:rgba(34,211,238,.55);
  box-shadow:0 0 32px rgba(34,211,238,.15),0 14px 44px rgba(0,0,0,.55),inset 0 0 30px rgba(34,211,238,.04);
}
/* 编号 */
.card .no{
  position:absolute;top:10px;right:16px;
  font-family:Consolas,'Courier New',monospace;
  font-size:11px;letter-spacing:2px;color:rgba(34,211,238,.4);
}
/* 图标 */
.card .icon{
  width:62px;height:62px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:27px;
  border-radius:6px;position:relative;
  background:rgba(34,211,238,.07);
  border:1px solid rgba(34,211,238,.25);
  transform:translateZ(30px);
  transition:transform .3s;
}
.card .icon::after{
  content:'';position:absolute;inset:0;border-radius:6px;
  background:linear-gradient(135deg,rgba(34,211,238,.25),transparent 55%);
  opacity:0;transition:opacity .3s;
}
.card:hover .icon{transform:translateZ(44px) scale(1.08)}
.card:hover .icon::after{opacity:1}
.card:nth-child(2) .icon{background:rgba(52,211,153,.07);border-color:rgba(52,211,153,.3)}
.card:nth-child(2):hover{border-color:rgba(52,211,153,.55);box-shadow:0 0 32px rgba(52,211,153,.15),0 14px 44px rgba(0,0,0,.55),inset 0 0 30px rgba(52,211,153,.04)}
.card:nth-child(2) .no{color:rgba(52,211,153,.4)}
.card:nth-child(2) .scanline{background:linear-gradient(90deg,transparent,var(--green),transparent)}
.card:nth-child(3) .icon{background:rgba(251,191,36,.07);border-color:rgba(251,191,36,.3)}
.card:nth-child(3):hover{border-color:rgba(251,191,36,.55);box-shadow:0 0 32px rgba(251,191,36,.13),0 14px 44px rgba(0,0,0,.55),inset 0 0 30px rgba(251,191,36,.04)}
.card:nth-child(3) .no{color:rgba(251,191,36,.4)}
.card:nth-child(3) .scanline{background:linear-gradient(90deg,transparent,var(--amber),transparent)}
/* 信息 */
.card .info{flex:1;min-width:0;transform:translateZ(18px)}
.card .name{font-size:17px;font-weight:700;letter-spacing:.5px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.card .desc{font-size:12.5px;color:#8ea0b8;margin-top:6px;line-height:1.65}
/* 标签 */
.tags{display:flex;gap:8px;margin-top:11px;flex-wrap:wrap}
.tag{
  font-family:Consolas,'Courier New',monospace;font-size:9.5px;letter-spacing:1px;
  color:#7dd3fc;background:rgba(34,211,238,.07);
  border:1px solid rgba(34,211,238,.22);border-radius:2px;
  padding:2.5px 9px;
}
.card:nth-child(2) .tag{color:#6ee7b7;background:rgba(52,211,153,.07);border-color:rgba(52,211,153,.22)}
.card:nth-child(3) .tag{color:#fcd34d;background:rgba(251,191,36,.07);border-color:rgba(251,191,36,.22)}
.badge-demo,.badge-live{
  font-size:9px;font-weight:700;letter-spacing:1.5px;padding:2px 7px;border-radius:2px;
  font-family:Consolas,'Courier New',monospace;
}
.badge-live{color:#34d399;border:1px solid rgba(52,211,153,.4);background:rgba(52,211,153,.1)}
.badge-demo{color:#fbbf24;border:1px solid rgba(251,191,36,.4);background:rgba(251,191,36,.1)}
/* 状态灯 + 箭头 */
.card .status-arrow{display:flex;flex-direction:column;align-items:center;gap:9px;flex-shrink:0;transform:translateZ(26px)}
.card .s-led{width:8px;height:8px;border-radius:50%}
.card:nth-child(1) .s-led{background:var(--green);box-shadow:0 0 10px var(--green);animation:blink 1.8s infinite}
.card:nth-child(2) .s-led{background:var(--amber);box-shadow:0 0 10px var(--amber);animation:blink 1.8s infinite .5s}
.card:nth-child(3) .s-led{background:var(--cyan);box-shadow:0 0 10px var(--cyan);animation:blink 1.8s infinite 1s}
.card .arrow{
  font-family:Consolas,'Courier New',monospace;font-size:15px;color:var(--dim);
  transition:all .25s;
}
.card:hover .arrow{color:var(--cyan);transform:translateX(5px);text-shadow:0 0 10px var(--cyan)}
.card .sys-status{font-size:8.5px;letter-spacing:1px;color:#475569;font-family:Consolas,'Courier New',monospace}

/* ═══ 底部终端 ═══ */
footer{
  margin-top:52px;padding-bottom:34px;
  font-family:Consolas,'Courier New',monospace;
}
.terminal{
  border:1px solid rgba(34,211,238,.18);border-radius:6px;
  background:rgba(3,7,18,.85);overflow:hidden;
}
.term-bar{
  display:flex;align-items:center;gap:8px;padding:9px 14px;
  border-bottom:1px solid rgba(34,211,238,.14);
  background:rgba(13,25,45,.5);
}
.term-bar .t-dot{width:9px;height:9px;border-radius:50%}
.term-bar .t-dot:nth-child(1){background:#f87171}
.term-bar .t-dot:nth-child(2){background:#fbbf24}
.term-bar .t-dot:nth-child(3){background:#34d399}
.term-bar .t-title{margin-left:10px;font-size:10px;letter-spacing:2px;color:var(--dim)}
.term-body{padding:14px 16px;font-size:11px;line-height:2;color:#7dd3fc}
.term-body .ln{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.term-body .prompt{color:var(--green)}
.term-body .dim{color:var(--dim)}
.term-body .cy{color:var(--cyan)}
.term-body .am{color:var(--amber)}
.term-cursor{display:inline-block;width:8px;height:13px;background:var(--green);vertical-align:-2px;animation:blink 1s steps(2) infinite;margin-left:4px}
.copyright{
  text-align:center;margin-top:20px;font-size:10px;letter-spacing:2px;color:#334155;
}

/* ═══ 鼠标追踪光圈 ═══ */
#cursorGlow{
  position:fixed;width:340px;height:340px;border-radius:50%;z-index:3;pointer-events:none;
  background:radial-gradient(circle,rgba(34,211,238,.07),transparent 65%);
  transform:translate(-50%,-50%);
  transition:opacity .4s;
}

/* ═══ 移动端 ═══ */
@media (max-width:640px){
  main{padding:66px 14px 0}
  .hero{padding:30px 0 26px}
  .topbar .sys{display:none}
  .topbar .status-item .lbl-t{display:none}
  .card{padding:20px 18px;gap:15px;flex-wrap:wrap}
  .card .icon{width:50px;height:50px;font-size:22px}
  .card .status-arrow{position:absolute;top:18px;right:14px}
  .card .no{display:none}
  .metric{min-width:100px;padding:8px 12px}
  .metric .num{font-size:17px}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation:none!important;transition:none!important}
}
</style>
</head>
<body>

<canvas id="stars3d"></canvas>
<div class="horizon"></div>
<div class="horizon-glow"></div>
<div class="scanlines"></div>
<div class="vignette"></div>
<div id="cursorGlow"></div>
<div class="hud-corner tl"></div><div class="hud-corner tr"></div>
<div class="hud-corner bl"></div><div class="hud-corner br"></div>

<div class="topbar">
  <div class="brand"><span class="blink"></span>SLINGLAB <span class="sys">// TRADING INTELLIGENCE SYSTEM</span></div>
  <div class="right">
    <span class="status-item"><span class="led led-green"></span><span class="lbl-t">RELAY</span></span>
    <span class="status-item"><span class="led led-cyan"></span><span class="lbl-t">EDGE</span></span>
    <span class="status-item"><span class="led led-amber"></span><span class="lbl-t">API</span></span>
    <span class="clock" id="clock">--:--:--</span>
  </div>
</div>

<main>
  <section class="hero">
    <div class="hero-kicker">SYSTEM ONLINE · V2.0</div>
    <h1>SLINGLAB</h1>
    <div class="type-line" id="typeLine"></div>
    <div class="metrics">
      <div class="metric"><div class="num"><span id="mExch">0</span></div><div class="lbl">EXCHANGES</div></div>
      <div class="metric"><div class="num"><span id="mTicker">0</span></div><div class="lbl">TICKERS</div></div>
      <div class="metric"><div class="num"><span id="mContract">0</span></div><div class="lbl">CONTRACTS</div></div>
      <div class="metric"><div class="num"><span id="mScan">0</span></div><div class="lbl">SCAN ENGINES</div></div>
    </div>
  </section>

  <div class="section-label"><span class="tag">// PROJECTS</span></div>

  <div class="projects">
    <a href="/screener/" class="card" data-tilt>
      <span class="corner c-tl"></span><span class="corner c-tr"></span>
      <span class="corner c-bl"></span><span class="corner c-br"></span>
      <span class="scanline"></span>
      <span class="no">NO.01</span>
      <div class="icon">🔍</div>
      <div class="info">
        <div class="name">筹码真空 · 代币筛选器 <span class="badge-live">LIVE</span></div>
        <div class="desc">小市值代币低流通率筛选 · 筹码分布 + 妖币扫描 + 小币筛选</div>
        <div class="tags"><span class="tag">BINANCE</span><span class="tag">BYBIT</span><span class="tag">OKX</span><span class="tag">15MIN REFRESH</span></div>
      </div>
      <div class="status-arrow">
        <span class="s-led"></span>
        <span class="arrow">→</span>
        <span class="sys-status">ACTIVE</span>
      </div>
    </a>

    <a href="/stone/" class="card" data-tilt>
      <span class="corner c-tl"></span><span class="corner c-tr"></span>
      <span class="corner c-bl"></span><span class="corner c-br"></span>
      <span class="scanline"></span>
      <span class="no">NO.02</span>
      <div class="icon">📊</div>
      <div class="info">
        <div class="name">Stone · Trading Journal <span class="badge-demo">DEMO</span></div>
        <div class="desc">加密货币交易日志分析 · 盈亏统计与持仓管理</div>
        <div class="tags"><span class="tag">JOURNAL</span><span class="tag">PNL TRACKING</span><span class="tag">PORTFOLIO</span></div>
      </div>
      <div class="status-arrow">
        <span class="s-led"></span>
        <span class="arrow">→</span>
        <span class="sys-status">BETA</span>
      </div>
    </a>

    <a href="/runnerxbt/" class="card" data-tilt>
      <span class="corner c-tl"></span><span class="corner c-tr"></span>
      <span class="corner c-bl"></span><span class="corner c-br"></span>
      <span class="scanline"></span>
      <span class="no">NO.03</span>
      <div class="icon">📈</div>
      <div class="info">
        <div class="name">RunnerXBT Insights</div>
        <div class="desc">Telegram trading signal tracker & analytics</div>
        <div class="tags"><span class="tag">SIGNALS</span><span class="tag">TELEGRAM</span><span class="tag">ANALYTICS</span></div>
      </div>
      <div class="status-arrow">
        <span class="s-led"></span>
        <span class="arrow">→</span>
        <span class="sys-status">LINKED</span>
      </div>
    </a>
  </div>

  <footer>
    <div class="terminal">
      <div class="term-bar">
        <span class="t-dot"></span><span class="t-dot"></span><span class="t-dot"></span>
        <span class="t-title">SLINGLAB://RELAY-CONSOLE</span>
      </div>
      <div class="term-body">
        <div class="ln"><span class="prompt">root@slinglab:~$</span> init --edge=cloudflare --kv=synced</div>
        <div class="ln"><span class="prompt">root@slinglab:~$</span> boot pipeline <span class="dim">...</span> <span class="cy">[ OK ]</span> 3 engines loaded</div>
        <div class="ln"><span class="prompt">root@slinglab:~$</span> sync exchanges <span class="dim">...</span> <span class="am">binance:680</span> <span class="am">bybit:436</span> <span class="am">okx:421</span></div>
        <div class="ln"><span class="prompt">root@slinglab:~$</span> status <span class="dim">...</span> <span class="cy">ALL SYSTEMS NOMINAL</span><span class="term-cursor"></span></div>
      </div>
    </div>
    <div class="copyright">SLINGLAB © 2026 · CRYPTO TRADING INTELLIGENCE · <span id="uptime">BOOT</span></div>
  </footer>
</main>

<script>
/* ═══ 3D 星空 ═══ */
(function(){
  var canvas=document.getElementById('stars3d'),ctx=canvas.getContext('2d');
  var W,H,stars=[],R=Math.min(window.innerWidth,window.innerHeight)*0.9,rotY=0;
  var DPR=Math.min(window.devicePixelRatio||1,2);
  var reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  function resize(){
    W=canvas.width=window.innerWidth*DPR;
    H=canvas.height=window.innerHeight*DPR;
    canvas.style.width=window.innerWidth+'px';
    canvas.style.height=window.innerHeight+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    R=Math.min(W/DPR,H/DPR)*0.95;
    var count=reduced?40:Math.min(340,Math.floor(window.innerWidth*window.innerHeight/3200));
    stars=[];
    for(var i=0;i<count;i++){
      var theta=Math.random()*Math.PI*2,phi=Math.acos(Math.random()*2-1);
      stars.push({
        r:R*(0.35+Math.random()*0.65),
        theta:theta,phi:phi,
        s:Math.random()*1.7+0.4,
        tw:Math.random()*Math.PI*2,
        c:['34,211,238','59,130,246','148,163,184','167,139,250'][Math.floor(Math.random()*4)]
      });
    }
  }
  function tick(t){
    ctx.clearRect(0,0,W/DPR,H/DPR);
    rotY+=reduced?0:0.0009;
    var cx=W/DPR/2,cy=H/DPR*0.42;
    for(var i=0;i<stars.length;i++){
      var st=stars[i];
      // 球坐标 → 3D
      var x3=st.r*Math.sin(st.phi)*Math.cos(st.theta);
      var y3=st.r*Math.cos(st.phi);
      var z3=st.r*Math.sin(st.phi)*Math.sin(st.theta);
      // 绕 Y 轴旋转
      var cr=Math.cos(rotY),sr=Math.sin(rotY);
      var xr=x3*cr+z3*sr, zr=-x3*sr+z3*cr;
      if(zr>0){
        var scale=600/(600+zr);
        var px=cx+xr*scale, py=cy+y3*scale*0.75;
        var a=(1-zr/(R*1.5))*0.9*Math.abs(Math.sin(t*0.001+st.tw));
        ctx.beginPath();
        ctx.arc(px,py,st.s*scale,0,Math.PI*2);
        ctx.fillStyle='rgba('+st.c+','+Math.max(0.08,a)+')';
        ctx.fill();
      }
    }
    requestAnimationFrame(tick);
  }
  window.addEventListener('resize',resize);
  resize();requestAnimationFrame(tick);
})();

/* ═══ 打字机 ═══ */
(function(){
  var phrases=[
    '> INITIALIZING TRADING INTELLIGENCE PIPELINE_',
    '> DEPLOYED ON CLOUDFLARE EDGE · 3 ENGINES',
    '> SELECT TARGET MODULE TO BEGIN_',
    '> CHIP ANALYZER / DEMON SCANNER / COINFILTER',
    '> ALL SYSTEMS NOMINAL · AWAITING INPUT_'
  ];
  var el=document.getElementById('typeLine');
  var pi=0,ci=0,deleting=false;
  function tick(){
    var full=phrases[pi];
    if(!deleting){
      ci++;
      el.textContent=full.slice(0,ci);
      if(ci>=full.length){deleting=true;setTimeout(tick,1800);return;}
      setTimeout(tick,38);
    }else{
      ci--;
      el.textContent=full.slice(0,ci);
      if(ci<=0){deleting=false;pi=(pi+1)%phrases.length;setTimeout(tick,400);return;}
      setTimeout(tick,16);
    }
  }
  setTimeout(tick,800);
})();

/* ═══ 数字滚动 ═══ */
(function(){
  function animate(id,target,dur){
    var el=document.getElementById(id),start=0,t0=Date.now();
    if(!el)return;
    function step(){
      var p=Math.min(1,(Date.now()-t0)/dur);
      var eased=1-Math.pow(1-p,3);
      el.textContent=Math.round(start+(target-start)*eased);
      if(p<1)requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  setTimeout(function(){
    animate('mExch',3,900);
    animate('mTicker',1536,1400);
    animate('mContract',680,1500);
    animate('mScan',3,700);
  },600);
})();

/* ═══ 卡片 3D 倾斜 ═══ */
(function(){
  if(matchMedia('(hover:none)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  var cards=document.querySelectorAll('.card[data-tilt]');
  cards.forEach(function(card){
    var raf=null;
    card.addEventListener('mousemove',function(e){
      var r=card.getBoundingClientRect();
      var x=(e.clientX-r.left)/r.width-0.5;
      var y=(e.clientY-r.top)/r.height-0.5;
      if(raf)cancelAnimationFrame(raf);
      raf=requestAnimationFrame(function(){
        card.style.transform='perspective(700px) rotateX('+(-y*7)+'deg) rotateY('+(x*9)+'deg) translateY(-2px)';
      });
    });
    card.addEventListener('mouseleave',function(){
      if(raf)cancelAnimationFrame(raf);
      card.style.transform='perspective(700px) rotateX(0) rotateY(0)';
    });
  });
})();

/* ═══ 鼠标光圈 ═══ */
(function(){
  var glow=document.getElementById('cursorGlow');
  var tx=window.innerWidth/2,ty=window.innerHeight/2,x=tx,y=ty;
  window.addEventListener('mousemove',function(e){tx=e.clientX;ty=e.clientY;glow.style.opacity=1;});
  (function loop(){
    x+=(tx-x)*0.08;y+=(ty-y)*0.08;
    glow.style.left=x+'px';glow.style.top=y+'px';
    requestAnimationFrame(loop);
  })();
})();

/* ═══ 时钟 + 运行时长 ═══ */
(function(){
  var clock=document.getElementById('clock');
  function t(){
    var d=new Date();
    clock.textContent=[d.getHours(),d.getMinutes(),d.getSeconds()].map(function(n){return String(n).padStart(2,'0')}).join(':');
  }
  t();setInterval(t,1000);
  var up=document.getElementById('uptime'),s0=Date.now();
  setInterval(function(){
    var s=Math.floor((Date.now()-s0)/1000);
    var h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;
    up.textContent='UPTIME '+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
  },1000);
})();
</script>
</body>
</html>
`;
      return new Response(fallback, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'CDN-Cache-Control': 'no-cache'
        }
      });
    })());
  } else {
    event.respondWith(fetch(event.request));
  }
});

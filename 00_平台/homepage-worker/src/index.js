/**
 * slinglab-homepage — serves the landing page behind the same password auth
 * as the Stone journal. Shares the auth state (KV site_auth + secrets) and the
 * stone_auth cookie (Path=/) with stone-journal, so one login covers the site.
 *
 * Routes (zone): app.slinglab.xyz/*  (stone/* and screener/* are more specific
 * and go to their own workers). Non-homepage paths pass through to the origin
 * unchanged.
 */
const AUTH_COOKIE = "stone_auth"
const AUTH_TTL_MS = 7 * 24 * 3600 * 1000
const MAX_FAILED_ATTEMPTS = 3
const RESET_TTL_MS = 30 * 60 * 1000
const RESEND_MIN_INTERVAL_MS = 60 * 1000

// ── crypto helpers ──────────────────────────────────────────────────────────

async function hmacSha256(data, key) {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function sha256Hex(data) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

function xorEncode(str, key) {
  let r = ""
  for (let i = 0; i < str.length; i++) r += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  return btoa(r)
}

function xorDecode(enc, key) {
  const str = atob(enc)
  let r = ""
  for (let i = 0; i < str.length; i++) r += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  return r
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const eq = part.indexOf("=")
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
  }
  return null
}

function timingSafeEqualStr(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function randomToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

// ── auth state (shared KV with stone-journal) ──────────────────────────────

async function getSiteAuth(kv, env) {
  const raw = await kv.get("site_auth", "json")
  if (raw && raw.password) {
    try {
      if (env.STONE_ENC_KEY) {
        return {
          password: xorDecode(raw.password, env.STONE_ENC_KEY),
          failedAttempts: raw.failedAttempts ?? 0,
          locked: raw.locked ?? false,
          lastResetSentAt: raw.lastResetSentAt ?? 0,
        }
      }
    } catch { /* fall through */ }
  }
  if (env.SITE_PASSWORD) {
    return { password: env.SITE_PASSWORD, failedAttempts: 0, locked: false, lastResetSentAt: 0 }
  }
  return null
}

async function saveSiteAuth(kv, env, auth) {
  if (!env.STONE_ENC_KEY) return
  await kv.put("site_auth", JSON.stringify({
    password: xorEncode(auth.password, env.STONE_ENC_KEY),
    failedAttempts: auth.failedAttempts,
    locked: auth.locked,
    lastResetSentAt: auth.lastResetSentAt,
  }))
}

async function checkAuth(request, env) {
  const auth = await getSiteAuth(env.STONE_DATA, env)
  const password = auth?.password
  if (!password) return true
  const token = readCookie(request, AUTH_COOKIE)
  if (!token) return false
  const dot = token.lastIndexOf(".")
  if (dot <= 0 || dot === token.length - 1) return false
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = await hmacSha256(payload, password)
  if (!timingSafeEqualStr(sig, expected)) return false
  try {
    const data = JSON.parse(atob(payload))
    return typeof data.exp === "number" && data.exp > Date.now()
  } catch {
    return false
  }
}

function authCookie(payloadSig, maxAgeSec) {
  return `${AUTH_COOKIE}=${payloadSig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`
}

async function sendResetEmail(env, resetLink) {
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM || !env.RECOVERY_EMAIL) {
    throw new Error("邮件服务未配置 (需要 EMAIL_API_KEY / EMAIL_FROM / RECOVERY_EMAIL)")
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [env.RECOVERY_EMAIL],
      subject: "Stone · 密码重置",
      html: `<p>你请求了 Stone 密码重置。</p><p>点击下面的链接设置新密码（30 分钟内有效）：</p><p><a href="${resetLink}">${resetLink}</a></p><p>如果不是你本人操作，请忽略此邮件。</p>`,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`邮件发送失败 (${res.status}): ${body.slice(0, 200)}`)
  }
}

// Lockout auto-email: mint a reset token and send the link immediately.
// No-op when email isn't configured — the manual /recover flow still works.
async function sendLockoutResetEmail(env, kv) {
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM || !env.RECOVERY_EMAIL) return
  try {
    const token = randomToken()
    const hash = await sha256Hex(token)
    await kv.put("reset_token", JSON.stringify({ hash, exp: Date.now() + RESET_TTL_MS }))
    await sendResetEmail(env, `https://app.slinglab.xyz/reset?token=${token}`)
  } catch (err) {
    await kv.delete("reset_token").catch(() => {})
    console.error("[Auth] lockout reset email failed:", err instanceof Error ? err.message : err)
  }
}

// ── auth pages (API base is the root; redirect target is the homepage) ─────

const AUTH_STYLE = `<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #000;
    background-image:
      radial-gradient(ellipse 60% 40% at 50% -10%, rgba(59,130,246,.14), transparent 70%),
      radial-gradient(ellipse 40% 30% at 85% 20%, rgba(16,185,129,.07), transparent 70%);
    font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    color: #f5f5f7; }
  .card { width: 380px; padding: 40px; border-radius: 24px; border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.05); backdrop-filter: blur(20px) saturate(160%);
    box-shadow: 0 20px 60px rgba(0,0,0,.5); }
  .logo { width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg,#3b82f6,#10b981);
    color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 26px;
    margin-bottom: 24px; box-shadow: 0 8px 24px rgba(59,130,246,.35); position: relative; }
  .logo::after { content: ''; position: absolute; inset: 0; border-radius: 16px;
    background: linear-gradient(135deg, rgba(255,255,255,.25), transparent 50%); pointer-events: none; }
  h1 { font-size: 22px; margin: 0 0 6px; font-weight: 800; letter-spacing: -.3px; }
  p { font-size: 13.5px; color: #86868b; margin: 0 0 24px; }
  input { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,.12);
    background: rgba(0,0,0,.4); color: #fff; font-size: 14px; outline: none; font-family: inherit;
    transition: border-color .2s, box-shadow .2s; }
  input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.15); }
  button { width: 100%; margin-top: 14px; padding: 12px; border: 0; border-radius: 12px;
    background: linear-gradient(135deg,#3b82f6,#2563eb); color: #fff; font-size: 14px; font-weight: 700;
    cursor: pointer; font-family: inherit; transition: all .2s; box-shadow: 0 8px 24px rgba(59,130,246,.3); }
  button:hover { filter: brightness(1.1); transform: translateY(-1px); }
  button:disabled { opacity: .6; cursor: default; transform: none; }
  .msg { color: #f87171; font-size: 12px; margin-top: 12px; min-height: 16px; text-align: center; }
  .msg.ok { color: #34d399; }
  .link { text-align: center; font-size: 13px; margin-top: 16px; }
  .link a { color: #60a5fa; text-decoration: none; }
  .link a:hover { text-decoration: underline; }
</style>`

const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SlingLab · 登录</title>
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#0a0a0f">

<meta name="theme-color" content="#0a0a0f">
${AUTH_STYLE}
</head>
<body>
  <form class="card" id="f">
    <div class="logo">S</div>
    <h1>SlingLab</h1>
    <p>请输入访问密码</p>
    <input type="password" id="p" placeholder="访问密码" autocomplete="current-password" autofocus/>
    <button type="submit" id="btn">登录</button>
    <p class="msg" id="msg"></p>
    <div class="link"><a href="/recover">忘记密码？</a></div>
  </form>
  <script>
    const f = document.getElementById('f'), p = document.getElementById('p'), m = document.getElementById('msg'), btn = document.getElementById('btn');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      m.textContent = ''; btn.disabled = true;
      try {
        const r = await fetch('/api/v1/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: p.value }),
        });
        if (r.ok) { location.href = '/'; return; }
        const j = await r.json().catch(() => ({}));
        if (j.locked) {
          m.textContent = '连续失败次数过多，账号已锁定。请通过邮箱重置密码。';
          p.disabled = true; btn.disabled = true;
        } else {
          m.textContent = (j.remaining != null ? '密码错误，还可尝试 ' + j.remaining + ' 次' : '密码错误');
          p.select();
        }
      } catch { m.textContent = '网络错误，请重试'; }
      btn.disabled = false;
    });
  </script>
</body>
</html>`

const RECOVER_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SlingLab · 找回密码</title>


${AUTH_STYLE}
</head>
<body>
  <form class="card" id="f">
    <div class="logo">S</div>
    <h1>找回密码</h1>
    <p>输入你的邮箱，重置链接将发送到该邮箱</p>
    <input type="email" id="e" placeholder="you@example.com" autocomplete="email" autofocus/>
    <button type="submit" id="btn">发送重置链接</button>
    <p class="msg" id="msg"></p>
    <div class="link"><a href="/">返回登录</a></div>
  </form>
  <script>
    const f = document.getElementById('f'), e = document.getElementById('e'), m = document.getElementById('msg'), btn = document.getElementById('btn');
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      m.textContent = ''; btn.disabled = true;
      try {
        const r = await fetch('/api/v1/recover', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: e.value }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok) { m.className = 'msg ok'; m.textContent = j.message || '如果邮箱匹配，重置链接已发送'; }
        else { m.className = 'msg'; m.textContent = j.error || '请求失败'; }
      } catch { m.className = 'msg'; m.textContent = '网络错误，请重试'; }
      btn.disabled = false;
    });
  </script>
</body>
</html>`

const RESET_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SlingLab · 设置新密码</title>


${AUTH_STYLE}
</head>
<body>
  <form class="card" id="f">
    <div class="logo">S</div>
    <h1>设置新密码</h1>
    <p>新密码至少 6 位</p>
    <input type="password" id="p1" placeholder="新密码" autocomplete="new-password" autofocus/>
    <input type="password" id="p2" placeholder="确认新密码" autocomplete="new-password" style="margin-top:10px"/>
    <button type="submit" id="btn">确认重置</button>
    <p class="msg" id="msg"></p>
    <div class="link"><a href="/">返回登录</a></div>
  </form>
  <script>
    const f = document.getElementById('f'), p1 = document.getElementById('p1'), p2 = document.getElementById('p2'), m = document.getElementById('msg'), btn = document.getElementById('btn');
    const token = new URLSearchParams(location.search).get('token') || '';
    if (!token) { m.textContent = '重置链接无效'; p1.disabled = p2.disabled = true; }
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      m.textContent = '';
      if (p1.value !== p2.value) { m.textContent = '两次输入的密码不一致'; return; }
      if (p1.value.length < 6) { m.textContent = '新密码至少 6 位'; return; }
      btn.disabled = true;
      try {
        const r = await fetch('/api/v1/reset-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password: p1.value }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok) { m.className = 'msg ok'; m.textContent = '密码已重置，正在跳转登录…'; setTimeout(() => { location.href = '/'; }, 1200); }
        else { m.className = 'msg'; m.textContent = j.error || '重置失败，链接可能已过期'; }
      } catch { m.className = 'msg'; m.textContent = '网络错误，请重试'; }
      btn.disabled = false;
    });
  </script>
</body>
</html>`

const FALLBACK_HOMEPAGE = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>SlingLab</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0c100e;color:#c8d8c8;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:40px 20px}h1{font-size:32px;font-weight:300;letter-spacing:4px;text-transform:uppercase;color:#33cc66;margin-bottom:8px}.subtitle{color:#4a604a;font-size:14px;margin-bottom:40px;letter-spacing:2px}</style></head><body><h1>SlingLab</h1><p class="subtitle">Projects &amp; Experiments</p></body></html>`

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json;charset=utf-8", "Cache-Control": "no-store", ...headers },
  })
}

function htmlPage(page) {
  return new Response(page, { status: 200, headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store" } })
}

// ── worker ──────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } })
    }

    const authOk = await checkAuth(request, env)
    const isAuthEndpoint =
      path === "/api/v1/login" || path === "/api/v1/logout" ||
      path === "/api/v1/recover" || path === "/api/v1/reset-password"

    // ── auth endpoints (root-level) ──
    if (path === "/api/v1/login" && method === "POST") {
      const auth = await getSiteAuth(env.STONE_DATA, env)
      if (!auth) return json({ ok: false, error: "Auth not configured" }, 500)
      const body = await request.json().catch(() => null)
      const provided = body?.password ?? ""
      if (auth.locked) {
        return json({ ok: false, error: "账号已锁定，请通过邮箱重置密码", locked: true }, 423)
      }
      if (!timingSafeEqualStr(provided, auth.password)) {
        auth.failedAttempts++
        if (auth.failedAttempts >= MAX_FAILED_ATTEMPTS) {
          auth.locked = true
          await saveSiteAuth(env.STONE_DATA, env, auth)
          // Auto-send the reset link the moment the account locks
          await sendLockoutResetEmail(env, env.STONE_DATA)
          return json({ ok: false, error: "连续失败次数过多，账号已锁定，请通过邮箱重置密码", locked: true }, 423)
        }
        await saveSiteAuth(env.STONE_DATA, env, auth)
        return json({ ok: false, error: "密码错误", remaining: MAX_FAILED_ATTEMPTS - auth.failedAttempts }, 401)
      }
      if (auth.failedAttempts > 0 || auth.locked) {
        auth.failedAttempts = 0
        auth.locked = false
        await saveSiteAuth(env.STONE_DATA, env, auth)
      }
      const payload = btoa(JSON.stringify({ exp: Date.now() + AUTH_TTL_MS }))
      const sig = await hmacSha256(payload, auth.password)
      return json({ ok: true }, 200, { "Set-Cookie": authCookie(`${payload}.${sig}`, Math.floor(AUTH_TTL_MS / 1000)) })
    }

    if (path === "/api/v1/logout" && method === "POST") {
      return json({ ok: true }, 200, { "Set-Cookie": authCookie("", 0) })
    }

    if (path === "/api/v1/recover" && method === "POST") {
      const body = await request.json().catch(() => null)
      const target = (env.RECOVERY_EMAIL ?? "").trim().toLowerCase()
      const generic = { ok: true, message: "如果邮箱匹配，重置链接已发送" }
      if ((body?.email ?? "").trim().toLowerCase() !== target) return json(generic, 200)

      const auth = await getSiteAuth(env.STONE_DATA, env)
      const now = Date.now()
      if (auth && auth.lastResetSentAt && now - auth.lastResetSentAt < RESEND_MIN_INTERVAL_MS) return json(generic, 200)

      const token = randomToken()
      const hash = await sha256Hex(token)
      await env.STONE_DATA.put("reset_token", JSON.stringify({ hash, exp: now + RESET_TTL_MS }))
      try {
        await sendResetEmail(env, `https://app.slinglab.xyz/reset?token=${token}`)
      } catch (err) {
        await env.STONE_DATA.delete("reset_token")
        return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500)
      }
      if (auth) {
        auth.lastResetSentAt = now
        await saveSiteAuth(env.STONE_DATA, env, auth)
      }
      return json(generic, 200)
    }

    if (path === "/api/v1/reset-password" && method === "POST") {
      const body = await request.json().catch(() => null)
      const token = body?.token ?? ""
      const password = body?.password ?? ""
      if (password.length < 6) return json({ ok: false, error: "新密码至少 6 位" }, 400)
      const stored = await env.STONE_DATA.get("reset_token", "json")
      const hash = await sha256Hex(token)
      if (!stored?.hash || stored.hash !== hash || !stored.exp || stored.exp < Date.now()) {
        return json({ ok: false, error: "重置链接无效或已过期" }, 400)
      }
      const auth = await getSiteAuth(env.STONE_DATA, env)
      if (!auth) return json({ ok: false, error: "Auth not configured" }, 500)
      auth.password = password
      auth.failedAttempts = 0
      auth.locked = false
      auth.lastResetSentAt = 0
      await saveSiteAuth(env.STONE_DATA, env, auth)
      await env.STONE_DATA.delete("reset_token")
      return json({ ok: true }, 200, { "Set-Cookie": authCookie("", 0) })
    }

    // ── favicon.png (PNG 全兼容) ──
    if (path === "/favicon.png") {
      return new Response(Uint8Array.from(atob("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"), (c) => c.charCodeAt(0)), {
        status: 200,
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
      })
    }
    // ── apple-touch-icon.png (180px, 手机主屏幕) ──
    if (path === "/apple-touch-icon.png") {
      return new Response(Uint8Array.from(atob("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"), (c) => c.charCodeAt(0)), {
        status: 200,
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
      })
    }

    // ── favicon-v2 (X 风格, 新 URL 绕过浏览器缓存) ──
    if (path === "/favicon-v2.svg") {
      return new Response("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\">\n  <defs>\n    <linearGradient id=\"bg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#3b82f6\"/>\n      <stop offset=\"100%\" stop-color=\"#10b981\"/>\n    </linearGradient>\n  </defs>\n  <!-- 渐变背景占满整个画布 -->\n  <rect x=\"0\" y=\"0\" width=\"64\" height=\"64\" rx=\"14\" fill=\"url(#bg)\"/>\n  <!-- 白色粗 S 占满 (X 风格: 字母撑满, 笔画粗, 高对比) -->\n  <path d=\"M45 16 C45 10 39 8 32 8 C24 8 18 11 18 17 C18 23 24 26 32 29 C40 32 46 35 46 42 C46 49 40 53 32 53 C24 53 18 50 18 44\"\n        fill=\"none\" stroke=\"#ffffff\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n</svg>\n", {
        status: 200,
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
      })
    }

    // ── favicon ──
    if (path === "/favicon.svg") {
      return new Response("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\">\n  <defs>\n    <linearGradient id=\"bg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#3b82f6\"/>\n      <stop offset=\"100%\" stop-color=\"#10b981\"/>\n    </linearGradient>\n  </defs>\n  <!-- 渐变背景占满整个画布 -->\n  <rect x=\"0\" y=\"0\" width=\"64\" height=\"64\" rx=\"14\" fill=\"url(#bg)\"/>\n  <!-- 白色粗 S 占满 (X 风格: 字母撑满, 笔画粗, 高对比) -->\n  <path d=\"M45 16 C45 10 39 8 32 8 C24 8 18 11 18 17 C18 23 24 26 32 29 C40 32 46 35 46 42 C46 49 40 53 32 53 C24 53 18 50 18 44\"\n        fill=\"none\" stroke=\"#ffffff\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n</svg>\n", {
        status: 200,
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
      })
    }

    // ── favicon ──
    if (path === "/favicon.svg") {
      return new Response("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\">\n  <defs>\n    <linearGradient id=\"bg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#3b82f6\"/>\n      <stop offset=\"100%\" stop-color=\"#10b981\"/>\n    </linearGradient>\n  </defs>\n  <!-- 渐变背景占满整个画布 -->\n  <rect x=\"0\" y=\"0\" width=\"64\" height=\"64\" rx=\"14\" fill=\"url(#bg)\"/>\n  <!-- 白色粗 S 占满 (X 风格: 字母撑满, 笔画粗, 高对比) -->\n  <path d=\"M45 16 C45 10 39 8 32 8 C24 8 18 11 18 17 C18 23 24 26 32 29 C40 32 46 35 46 42 C46 49 40 53 32 53 C24 53 18 50 18 44\"\n        fill=\"none\" stroke=\"#ffffff\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n</svg>\n", {
        status: 200,
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
      })
    }

    // ── auth pages ──
    if (path === "/reset") return htmlPage(RESET_PAGE)
    if (path === "/recover") return htmlPage(RECOVER_PAGE)

    // ── homepage (root) behind the gate ──
    if (path === "/" || path === "") {
      if (!authOk) return htmlPage(LOGIN_PAGE)
      try {
        const kvHtml = await env.SITE_DATA.get("homepage_html")
        if (kvHtml) {
          return new Response(kvHtml, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", "Pragma": "no-cache", "Expires": "0" } })
        }
      } catch (e) {
        console.error("SITE_DATA read error:", e)
      }
      return new Response(FALLBACK_HOMEPAGE, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } })
    }

    // ── runnerxbt: proxy to Cloudflare Pages (latest build) ──
    if (path === "/runnerxbt" || path.startsWith("/runnerxbt/")) {
      const targetPath = path === "/runnerxbt" ? "/" : path.slice("/runnerxbt".length)
      const target = new URL(targetPath, "https://runnerxbt.pages.dev")
      const upstream = await fetch(target, { method: request.method, headers: request.headers, redirect: "follow" })
      const contentType = upstream.headers.get("Content-Type") ?? ""
      let body = upstream.body
      if (contentType.includes("text/html")) {
        const text = await upstream.text()
        body = text.replaceAll('"/media/', '"/runnerxbt/media/').replaceAll("'/media/", "'/runnerxbt/media/")
        return new Response(body, { status: upstream.status, headers: { "Content-Type": contentType, "Cache-Control": "no-store" } })
      }
      return new Response(body, { status: upstream.status, headers: { "Content-Type": contentType, "Cache-Control": "no-store" } })
    }

    // ── everything else passes through to the origin unchanged ──
    return fetch(request)
  },
}

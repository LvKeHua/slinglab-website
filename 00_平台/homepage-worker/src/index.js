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
    background: radial-gradient(1200px 600px at 50% -10%, #1b2440 0%, #0a0a0f 60%);
    font-family: system-ui, -apple-system, sans-serif; color: #e5e5e5; }
  .card { width: 340px; padding: 32px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03); backdrop-filter: blur(8px); }
  .logo { width: 40px; height: 40px; border-radius: 10px; background: #6366f1; color: #fff;
    display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; margin-bottom: 16px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { font-size: 13px; color: #9ca3af; margin: 0 0 20px; }
  input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.3); color: #fff; font-size: 14px; outline: none; }
  input:focus { border-color: #6366f1; }
  button { width: 100%; margin-top: 12px; padding: 10px; border: 0; border-radius: 8px;
    background: #6366f1; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
  button:hover { background: #5459dd; }
  button:disabled { opacity: 0.6; cursor: default; }
  .msg { color: #f87171; font-size: 12px; margin-top: 10px; min-height: 16px; text-align: center; }
  .msg.ok { color: #34d399; }
  .link { text-align: center; font-size: 13px; margin-top: 14px; }
  .link a { color: #818cf8; text-decoration: none; }
  .link a:hover { text-decoration: underline; }
</style>`

const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SlingLab · 登录</title>
${AUTH_STYLE}
</head>
<body>
  <form class="card" id="f">
    <div class="logo">S</div>
    <h1>SlingLab</h1>
    <p>请输入访问密码</p>
    <input type="password" id="p" placeholder="Password" autocomplete="current-password" autofocus/>
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

    // ── everything else passes through to the origin unchanged ──
    return fetch(request)
  },
}

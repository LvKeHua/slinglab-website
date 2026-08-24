import { handleDashboardRequest } from "./handlers/dashboard.handler"
import { handleCalendarRequest } from "./handlers/calendar.handler"
import { fetchAccountBalancesDetailed, type ProxyConfig } from "./services/binance.service"
import { testBybitConnection } from "./services/bybit.service"
import { getExchangeKeys } from "./utils/exchange-keys"
import { runSyncEngine } from "./services/sync.service"

export interface Env {
  STONE_DATA: KVNamespace
  BINANCE_PROXY_URL?: string
  // Secret bindings (wrangler secret put …) — no hardcoded keys anymore
  BINANCE_PROXY_SECRET?: string
  STONE_ENC_KEY?: string
  DEPLOY_KEY?: string
  SITE_PASSWORD?: string
  BINANCE_API_KEY?: string
  BINANCE_SECRET_KEY?: string
  // Email recovery (Resend): owner address + sending identity
  RECOVERY_EMAIL?: string
  EMAIL_API_KEY?: string
  EMAIL_FROM?: string
}

// ===== Static file serving =====

const EXT_MAP: Record<string, string> = {
  ".html": "text/html;charset=utf-8",
  ".js": "application/javascript;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".json": "application/json;charset=utf-8",
  ".txt": "text/plain;charset=utf-8",
}

function getContentType(path: string): string {
  for (const [ext, mime] of Object.entries(EXT_MAP)) {
    if (path.endsWith(ext)) return mime
  }
  return "application/octet-stream"
}

const PAGE_ROUTES: Record<string, string> = {
  "/": "/index.html",
  "/settings": "/settings.html",
  "/analytics": "/analytics.html",
  "/trades": "/trades.html",
  "/positions": "/positions.html",
  "/journal": "/journal.html",
  "/performance": "/performance.html",
  "/reporting": "/reporting.html",
  "/_not-found": "/_not-found.html",
  "/404": "/404.html",
}

function routePath(path: string): string {
  if (path.startsWith("/api/")) return path
  if (path.includes(".")) return path
  return PAGE_ROUTES[path] || "/index.html"
}

function normalizePath(p: string): string {
  if (p === "/stone" || p === "/stone/") return "/"
  if (p.startsWith("/stone/")) return p.slice(6)
  return p
}

// ===== Response helpers =====

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || ""
  // Allow both production and local development origins
  const allowed = ["https://app.slinglab.xyz", "http://localhost:3000", "http://localhost:3456"]
  const allowOrigin = allowed.includes(origin) ? origin : "https://app.slinglab.xyz"
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }
}

function jsonResp(data: unknown, status = 200, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      "Cache-Control": "no-cache,no-store,must-revalidate",
      ...corsHeaders,
    },
  })
}

async function serveStatic(path: string, kv: KVNamespace): Promise<Response | null> {
  const kvKey = routePath(path)
  const buf = await kv.get(kvKey, "arrayBuffer")
  if (buf) {
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": getContentType(kvKey),
        "Cache-Control": "no-cache,no-store,must-revalidate",
      },
    })
  }
  // SPA fallback: serve index.html for unknown page routes
  if (!path.startsWith("/api/")) {
    const index = await kv.get("/index.html", "arrayBuffer")
    if (index) {
      return new Response(index, {
        status: 200,
        headers: { "Content-Type": "text/html;charset=utf-8" },
      })
    }
  }
  return null
}

// ===== Settings helpers =====

// Allowed browser origins for mutating endpoints (CSRF-style protection).
const ALLOWED_ORIGINS = [
  "https://app.slinglab.xyz",
  "http://localhost:3000",
  "http://localhost:3456",
]

/** Non-browser clients send no Origin and are not blocked. */
function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin")
  return !origin || ALLOWED_ORIGINS.includes(origin)
}

function xorEncode(str: string, key: string): string {
  let r = ""
  for (let i = 0; i < str.length; i++)
    r += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  return btoa(r)
}

function xorDecode(enc: string, key: string): string {
  const str = atob(enc)
  let r = ""
  for (let i = 0; i < str.length; i++)
    r += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  return r
}

async function getSettings(kv: KVNamespace): Promise<Record<string, unknown>> {
  const val = await kv.get("settings_keys", "text")
  return val ? JSON.parse(val) : {}
}

async function putSettings(kv: KVNamespace, s: Record<string, unknown>): Promise<void> {
  await kv.put("settings_keys", JSON.stringify(s))
}

// ===== Password auth (SITE_PASSWORD secret binding) =====

const AUTH_COOKIE = "stone_auth"
const AUTH_TTL_MS = 7 * 24 * 3600 * 1000 // 7 days

async function hmacSha256(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const eq = part.indexOf("=")
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
  }
  return null
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** True when auth is disabled (no password configured) or the token is valid. */
async function checkAuth(request: Request, env: Env): Promise<boolean> {
  const password = await getAuthPassword(env.STONE_DATA, env)
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
    const data = JSON.parse(atob(payload)) as { exp?: number }
    return typeof data.exp === "number" && data.exp > Date.now()
  } catch {
    return false
  }
}

function authCookie(payloadSig: string, maxAgeSec: number): string {
  // Path=/ so the homepage worker (root) and stone worker (/stone) share one login
  return `${AUTH_COOKIE}=${payloadSig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`
}

// --- Lockout + email recovery ---------------------------------------------

const MAX_FAILED_ATTEMPTS = 3
const RESET_TTL_MS = 30 * 60 * 1000        // reset link valid 30 min
const RESEND_MIN_INTERVAL_MS = 60 * 1000   // at most one reset email per minute

interface SiteAuth {
  password: string
  failedAttempts: number
  locked: boolean
  lastResetSentAt: number
}

/**
 * Read the effective site password + lockout state. The password lives in KV
 * (encrypted with STONE_ENC_KEY) so it can be changed at runtime via the
 * email-reset flow; env.SITE_PASSWORD is only the bootstrap fallback.
 */
async function getSiteAuth(kv: KVNamespace, env: Env): Promise<SiteAuth | null> {
  const raw = (await kv.get("site_auth", "json")) as
    | { password?: string; failedAttempts?: number; locked?: boolean; lastResetSentAt?: number }
    | null
  if (raw?.password) {
    try {
      if (env.STONE_ENC_KEY) {
        return {
          password: xorDecode(raw.password, env.STONE_ENC_KEY),
          failedAttempts: raw.failedAttempts ?? 0,
          locked: raw.locked ?? false,
          lastResetSentAt: raw.lastResetSentAt ?? 0,
        }
      }
    } catch {
      // corrupt entry — fall through to bootstrap
    }
  }
  if (env.SITE_PASSWORD) {
    return { password: env.SITE_PASSWORD, failedAttempts: 0, locked: false, lastResetSentAt: 0 }
  }
  return null
}

async function saveSiteAuth(kv: KVNamespace, env: Env, auth: SiteAuth): Promise<void> {
  if (!env.STONE_ENC_KEY) return
  await kv.put(
    "site_auth",
    JSON.stringify({
      password: xorEncode(auth.password, env.STONE_ENC_KEY),
      failedAttempts: auth.failedAttempts,
      locked: auth.locked,
      lastResetSentAt: auth.lastResetSentAt,
    })
  )
}

/** The password that signs/verifies session tokens (KV-first, env fallback). */
async function getAuthPassword(kv: KVNamespace, env: Env): Promise<string | null> {
  const auth = await getSiteAuth(kv, env)
  return auth?.password ?? null
}

async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function randomToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function sendResetEmail(env: Env, resetLink: string): Promise<void> {
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

/**
 * Lockout auto-email: mint a reset token and send the link immediately.
 * No-op when email isn't configured — the manual /recover flow still works.
 */
async function sendLockoutResetEmail(env: Env, kv: KVNamespace): Promise<void> {
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM || !env.RECOVERY_EMAIL) return
  try {
    const token = randomToken()
    const hash = await sha256Hex(token)
    await kv.put("reset_token", JSON.stringify({ hash, exp: Date.now() + RESET_TTL_MS }))
    await sendResetEmail(env, `https://app.slinglab.xyz/stone/reset?token=${token}`)
  } catch (err) {
    await kv.delete("reset_token").catch(() => {})
    console.error("[Auth] lockout reset email failed:", err instanceof Error ? err.message : err)
  }
}

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
<title>Stone · 登录</title>
${AUTH_STYLE}
</head>
<body>
  <form class="card" id="f">
    <div class="logo">S</div>
    <h1>Stone · Trading Journal</h1>
    <p>请输入访问密码</p>
    <input type="password" id="p" placeholder="Password" autocomplete="current-password" autofocus/>
    <button type="submit" id="btn">登录</button>
    <p class="msg" id="msg"></p>
    <div class="link"><a href="/stone/recover">忘记密码？</a></div>
  </form>
  <script>
    const f = document.getElementById('f'), p = document.getElementById('p'), m = document.getElementById('msg'), btn = document.getElementById('btn');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      m.textContent = ''; btn.disabled = true;
      try {
        const r = await fetch('/stone/api/v1/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: p.value }),
        });
        if (r.ok) { location.href = '/stone/'; return; }
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
<title>Stone · 找回密码</title>
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
    <div class="link"><a href="/stone/">返回登录</a></div>
  </form>
  <script>
    const f = document.getElementById('f'), e = document.getElementById('e'), m = document.getElementById('msg'), btn = document.getElementById('btn');
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      m.textContent = ''; btn.disabled = true;
      try {
        const r = await fetch('/stone/api/v1/recover', {
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
<title>Stone · 设置新密码</title>
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
    <div class="link"><a href="/stone/">返回登录</a></div>
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
        const r = await fetch('/stone/api/v1/reset-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password: p1.value }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok) { m.className = 'msg ok'; m.textContent = '密码已重置，正在跳转登录…'; setTimeout(() => { location.href = '/stone/'; }, 1200); }
        else { m.className = 'msg'; m.textContent = j.error || '重置失败，链接可能已过期'; }
      } catch { m.className = 'msg'; m.textContent = '网络错误，请重试'; }
      btn.disabled = false;
    });
  </script>
</body>
</html>`

// ===== Main handler =====

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = normalizePath(url.pathname)
    const method = request.method
    const corsHeaders = getCorsHeaders(request)

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders })
    }

    // ----- Password gate (enabled when a site password is configured) -----
    const authOk = await checkAuth(request, env)
    const isAuthExempt =
      path === "/api/v1/login" ||
      path === "/api/v1/logout" ||
      path === "/api/v1/recover" ||
      path === "/api/v1/reset-password" ||
      path === "/api/upload" // upload is already key-protected (deployment channel)
    if (!authOk && !isAuthExempt) {
      if (path.startsWith("/api/")) {
        return jsonResp({ error: "Unauthorized" }, 401, corsHeaders)
      }
      const page = path === "/reset" ? RESET_PAGE : path === "/recover" ? RECOVER_PAGE : LOGIN_PAGE
      return new Response(page, {
        status: 200,
        headers: {
          "Content-Type": "text/html;charset=utf-8",
          "Cache-Control": "no-store",
        },
      })
    }

    try {
      // ----- Login (with lockout) / logout / recover / reset -----
      if (path === "/api/v1/login" && method === "POST") {
        const auth = await getSiteAuth(env.STONE_DATA, env)
        if (!auth) {
          return jsonResp({ ok: false, error: "Auth not configured" }, 500, corsHeaders)
        }
        const body = (await request.json().catch(() => null)) as { password?: string } | null
        const provided = body?.password ?? ""

        if (auth.locked) {
          return jsonResp({ ok: false, error: "账号已锁定，请通过邮箱重置密码", locked: true }, 423, corsHeaders)
        }
        if (!timingSafeEqualStr(provided, auth.password)) {
          auth.failedAttempts++
          if (auth.failedAttempts >= MAX_FAILED_ATTEMPTS) {
            auth.locked = true
            await saveSiteAuth(env.STONE_DATA, env, auth)
            // Auto-send the reset link the moment the account locks
            await sendLockoutResetEmail(env, env.STONE_DATA)
            return jsonResp({ ok: false, error: "连续失败次数过多，账号已锁定，请通过邮箱重置密码", locked: true }, 423, corsHeaders)
          }
          await saveSiteAuth(env.STONE_DATA, env, auth)
          return jsonResp(
            { ok: false, error: "密码错误", remaining: MAX_FAILED_ATTEMPTS - auth.failedAttempts },
            401,
            corsHeaders
          )
        }

        // Success: clear lockout state
        if (auth.failedAttempts > 0 || auth.locked) {
          auth.failedAttempts = 0
          auth.locked = false
          await saveSiteAuth(env.STONE_DATA, env, auth)
        }
        const payload = btoa(JSON.stringify({ exp: Date.now() + AUTH_TTL_MS }))
        const sig = await hmacSha256(payload, auth.password)
        const maxAge = Math.floor(AUTH_TTL_MS / 1000)
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Set-Cookie": authCookie(`${payload}.${sig}`, maxAge) },
        })
      }

      if (path === "/api/v1/logout" && method === "POST") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Set-Cookie": authCookie("", 0) },
        })
      }

      if (path === "/api/v1/recover" && method === "POST") {
        const body = (await request.json().catch(() => null)) as { email?: string } | null
        const target = (env.RECOVERY_EMAIL ?? "").trim().toLowerCase()
        // Always answer generically — never reveal whether the address is right.
        const generic = { ok: true, message: "如果邮箱匹配，重置链接已发送" }
        if ((body?.email ?? "").trim().toLowerCase() !== target) {
          return jsonResp(generic, 200, corsHeaders)
        }

        const auth = await getSiteAuth(env.STONE_DATA, env)
        const now = Date.now()
        if (auth && auth.lastResetSentAt && now - auth.lastResetSentAt < RESEND_MIN_INTERVAL_MS) {
          return jsonResp(generic, 200, corsHeaders) // rate limit: no resend within 60s
        }

        const token = randomToken()
        const hash = await sha256Hex(token)
        await env.STONE_DATA.put("reset_token", JSON.stringify({ hash, exp: now + RESET_TTL_MS }))
        try {
          await sendResetEmail(env, `https://app.slinglab.xyz/stone/reset?token=${token}`)
        } catch (err) {
          await env.STONE_DATA.delete("reset_token")
          const msg = err instanceof Error ? err.message : String(err)
          return jsonResp({ ok: false, error: msg }, 500, corsHeaders)
        }
        if (auth) {
          auth.lastResetSentAt = now
          await saveSiteAuth(env.STONE_DATA, env, auth)
        }
        return jsonResp(generic, 200, corsHeaders)
      }

      if (path === "/api/v1/reset-password" && method === "POST") {
        const body = (await request.json().catch(() => null)) as { token?: string; password?: string } | null
        const token = body?.token ?? ""
        const password = body?.password ?? ""
        if (password.length < 6) {
          return jsonResp({ ok: false, error: "新密码至少 6 位" }, 400, corsHeaders)
        }
        const stored = (await env.STONE_DATA.get("reset_token", "json")) as { hash?: string; exp?: number } | null
        const hash = await sha256Hex(token)
        if (!stored?.hash || stored.hash !== hash || !stored.exp || stored.exp < Date.now()) {
          return jsonResp({ ok: false, error: "重置链接无效或已过期" }, 400, corsHeaders)
        }
        const auth = await getSiteAuth(env.STONE_DATA, env)
        if (!auth) {
          return jsonResp({ ok: false, error: "Auth not configured" }, 500, corsHeaders)
        }
        auth.password = password
        auth.failedAttempts = 0
        auth.locked = false
        auth.lastResetSentAt = 0
        await saveSiteAuth(env.STONE_DATA, env, auth)
        await env.STONE_DATA.delete("reset_token")
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Set-Cookie": authCookie("", 0) },
        })
      }

      // ----- Dashboard API + Full Data API (modular implementation) -----
      if (path.startsWith("/api/v1/dashboard") || path === "/api/v1/data") {
        return handleDashboardRequest(request, env)
      }

      // ----- Calendar API + Trades By Date -----
      if (path.startsWith("/api/v1/calendar") || path.startsWith("/api/v1/trades/by-date")) {
        return handleCalendarRequest(request, env)
      }

      // ----- Settings API -----
      if (path === "/api/v1/settings/keys" && method === "POST") {
        if (!isAllowedOrigin(request))
          return jsonResp({ error: "Forbidden origin" }, 403, corsHeaders)
        const encKey = env.STONE_ENC_KEY
        if (!encKey)
          return jsonResp({ success: false, error: "STONE_ENC_KEY secret not configured" }, 500, corsHeaders)
        const body = (await request.json()) as { exchange: string; apiKey: string; secretKey: string }
        if (body.exchange !== "binance" && body.exchange !== "bybit")
          return jsonResp({ success: false, error: "Invalid exchange" }, 400, corsHeaders)
        const s = await getSettings(env.STONE_DATA)
        s[body.exchange] = {
          apiKey: xorEncode(body.apiKey, encKey),
          secretKey: xorEncode(body.secretKey, encKey),
        }
        await putSettings(env.STONE_DATA, s)
        return jsonResp({ success: true }, 200, corsHeaders)
      }

      if (path === "/api/v1/settings/keys" && method === "DELETE") {
        if (!isAllowedOrigin(request))
          return jsonResp({ error: "Forbidden origin" }, 403, corsHeaders)
        const body = (await request.json()) as { exchange: string }
        const s = await getSettings(env.STONE_DATA)
        delete s[body.exchange]
        await putSettings(env.STONE_DATA, s)
        return jsonResp({ success: true }, 200, corsHeaders)
      }

      if (path === "/api/v1/settings/status" && method === "GET") {
        const s = await getSettings(env.STONE_DATA)
        return jsonResp({
          binance: s.binance
            ? { configured: true, valid: true }
            : { configured: false, valid: false },
          bybit: s.bybit
            ? { configured: true, valid: true }
            : { configured: false, valid: false },
        }, 200, corsHeaders)
      }

      // ----- Settings test (validate stored keys) -----
      if (path === "/api/v1/settings/test" && method === "POST") {
        const body = (await request.json()) as { exchange: string }
        const keys = await getExchangeKeys(env.STONE_DATA, env.STONE_ENC_KEY)
        if (body.exchange === "binance") {
          if (!keys?.binance) {
            return jsonResp({ success: false, valid: false, error: "No Binance keys configured" }, 400, corsHeaders)
          }
          const proxy: ProxyConfig | undefined =
            env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET
              ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET }
              : undefined
          try {
            await fetchAccountBalancesDetailed(keys.binance.apiKey, keys.binance.secretKey, undefined, proxy)
            return jsonResp({ success: true, valid: true }, 200, corsHeaders)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            return jsonResp({ success: false, valid: false, error: msg }, 200, corsHeaders)
          }
        }
        if (body.exchange === "bybit") {
          if (!keys?.bybit) {
            return jsonResp({ success: false, valid: false, error: "No Bybit keys configured" }, 400, corsHeaders)
          }
          try {
            const proxy: ProxyConfig | undefined =
              env.BINANCE_PROXY_URL && env.BINANCE_PROXY_SECRET
                ? { url: env.BINANCE_PROXY_URL, secret: env.BINANCE_PROXY_SECRET }
                : undefined
            await testBybitConnection(keys.bybit.apiKey, keys.bybit.secretKey, "https://api.bybit.com", proxy)
            return jsonResp({ success: true, valid: true }, 200, corsHeaders)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            return jsonResp({ success: false, valid: false, error: msg }, 200, corsHeaders)
          }
        }
        return jsonResp({ error: "Unknown exchange" }, 400, corsHeaders)
      }

      // ----- Sync API (run one sync tick + refresh the dashboard cache) -----
      if (path === "/api/v1/sync" && method === "POST") {
        const sync = await runSyncEngine(env)
        const req = new Request("https://internal/api/v1/dashboard")
        await handleDashboardRequest(req, env)
        return jsonResp({ ok: sync.ok, detail: sync.detail }, 200, corsHeaders)
      }

      // ----- Status API -----
      if (path === "/api/status") {
        return jsonResp({
          project: "Stone",
          status: "ok",
          version: "2.0",
          features: ["dashboard", "sync", "trades", "settings"],
        }, 200, corsHeaders)
      }

      // ----- Upload API (static file deployment) -----
      if (path === "/api/upload" && method === "POST") {
        const body = (await request.json()) as { key: string; path: string; data: string; contentType?: string }
        if (!env.DEPLOY_KEY || body.key !== env.DEPLOY_KEY)
          return jsonResp({ error: "unauthorized" }, 403, corsHeaders)
        const binaryStr = atob(body.data)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++)
          bytes[i] = binaryStr.charCodeAt(i)
        await env.STONE_DATA.put(body.path, bytes, {
          metadata: { contentType: body.contentType || getContentType(body.path) },
        })
        return jsonResp({ ok: true, path: body.path }, 200, corsHeaders)
      }

      // ----- Static file serving -----
      const staticRes = await serveStatic(path, env.STONE_DATA)
      if (staticRes) return staticRes

      return jsonResp({ error: "Not found" }, 404, corsHeaders)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error"
      return jsonResp({ error: message }, 500, corsHeaders)
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    // Rolling sync: one batch of symbols + Bybit refresh
    try {
      await runSyncEngine(env)
    } catch (err) {
      console.error("[Cron] sync engine failed:", err instanceof Error ? err.message : String(err))
    }
    // Warm the dashboard response cache with the fresh data
    const request = new Request("https://internal/api/v1/dashboard")
    await handleDashboardRequest(request, env)
  },
}

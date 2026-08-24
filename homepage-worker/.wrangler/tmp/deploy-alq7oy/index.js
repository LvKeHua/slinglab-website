var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var AUTH_COOKIE = "stone_auth";
var AUTH_TTL_MS = 7 * 24 * 3600 * 1e3;
var MAX_FAILED_ATTEMPTS = 3;
var RESET_TTL_MS = 30 * 60 * 1e3;
var RESEND_MIN_INTERVAL_MS = 60 * 1e3;
async function hmacSha256(data, key) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha256, "hmacSha256");
async function sha256Hex(data) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
function xorEncode(str, key) {
  let r = "";
  for (let i = 0; i < str.length; i++) r += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  return btoa(r);
}
__name(xorEncode, "xorEncode");
function xorDecode(enc, key) {
  const str = atob(enc);
  let r = "";
  for (let i = 0; i < str.length; i++) r += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  return r;
}
__name(xorDecode, "xorDecode");
function readCookie(request, name) {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}
__name(readCookie, "readCookie");
function timingSafeEqualStr(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
__name(timingSafeEqualStr, "timingSafeEqualStr");
function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(randomToken, "randomToken");
async function getSiteAuth(kv, env) {
  const raw = await kv.get("site_auth", "json");
  if (raw && raw.password) {
    try {
      if (env.STONE_ENC_KEY) {
        return {
          password: xorDecode(raw.password, env.STONE_ENC_KEY),
          failedAttempts: raw.failedAttempts ?? 0,
          locked: raw.locked ?? false,
          lastResetSentAt: raw.lastResetSentAt ?? 0
        };
      }
    } catch {
    }
  }
  if (env.SITE_PASSWORD) {
    return { password: env.SITE_PASSWORD, failedAttempts: 0, locked: false, lastResetSentAt: 0 };
  }
  return null;
}
__name(getSiteAuth, "getSiteAuth");
async function saveSiteAuth(kv, env, auth) {
  if (!env.STONE_ENC_KEY) return;
  await kv.put("site_auth", JSON.stringify({
    password: xorEncode(auth.password, env.STONE_ENC_KEY),
    failedAttempts: auth.failedAttempts,
    locked: auth.locked,
    lastResetSentAt: auth.lastResetSentAt
  }));
}
__name(saveSiteAuth, "saveSiteAuth");
async function checkAuth(request, env) {
  const auth = await getSiteAuth(env.STONE_DATA, env);
  const password = auth?.password;
  if (!password) return true;
  const token = readCookie(request, AUTH_COOKIE);
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0 || dot === token.length - 1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSha256(payload, password);
  if (!timingSafeEqualStr(sig, expected)) return false;
  try {
    const data = JSON.parse(atob(payload));
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}
__name(checkAuth, "checkAuth");
function authCookie(payloadSig, maxAgeSec) {
  return `${AUTH_COOKIE}=${payloadSig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`;
}
__name(authCookie, "authCookie");
async function sendResetEmail(env, resetLink) {
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM || !env.RECOVERY_EMAIL) {
    throw new Error("\u90AE\u4EF6\u670D\u52A1\u672A\u914D\u7F6E (\u9700\u8981 EMAIL_API_KEY / EMAIL_FROM / RECOVERY_EMAIL)");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [env.RECOVERY_EMAIL],
      subject: "Stone \xB7 \u5BC6\u7801\u91CD\u7F6E",
      html: `<p>\u4F60\u8BF7\u6C42\u4E86 Stone \u5BC6\u7801\u91CD\u7F6E\u3002</p><p>\u70B9\u51FB\u4E0B\u9762\u7684\u94FE\u63A5\u8BBE\u7F6E\u65B0\u5BC6\u7801\uFF0830 \u5206\u949F\u5185\u6709\u6548\uFF09\uFF1A</p><p><a href="${resetLink}">${resetLink}</a></p><p>\u5982\u679C\u4E0D\u662F\u4F60\u672C\u4EBA\u64CD\u4F5C\uFF0C\u8BF7\u5FFD\u7565\u6B64\u90AE\u4EF6\u3002</p>`
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`\u90AE\u4EF6\u53D1\u9001\u5931\u8D25 (${res.status}): ${body.slice(0, 200)}`);
  }
}
__name(sendResetEmail, "sendResetEmail");
async function sendLockoutResetEmail(env, kv) {
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM || !env.RECOVERY_EMAIL) return;
  try {
    const token = randomToken();
    const hash = await sha256Hex(token);
    await kv.put("reset_token", JSON.stringify({ hash, exp: Date.now() + RESET_TTL_MS }));
    await sendResetEmail(env, `https://app.slinglab.xyz/reset?token=${token}`);
  } catch (err) {
    await kv.delete("reset_token").catch(() => {
    });
    console.error("[Auth] lockout reset email failed:", err instanceof Error ? err.message : err);
  }
}
__name(sendLockoutResetEmail, "sendLockoutResetEmail");
var AUTH_STYLE = `<style>
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
</style>`;
var LOGIN_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SlingLab \xB7 \u767B\u5F55</title>
${AUTH_STYLE}
</head>
<body>
  <form class="card" id="f">
    <div class="logo">S</div>
    <h1>SlingLab</h1>
    <p>\u8BF7\u8F93\u5165\u8BBF\u95EE\u5BC6\u7801</p>
    <input type="password" id="p" placeholder="Password" autocomplete="current-password" autofocus/>
    <button type="submit" id="btn">\u767B\u5F55</button>
    <p class="msg" id="msg"></p>
    <div class="link"><a href="/recover">\u5FD8\u8BB0\u5BC6\u7801\uFF1F</a></div>
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
          m.textContent = '\u8FDE\u7EED\u5931\u8D25\u6B21\u6570\u8FC7\u591A\uFF0C\u8D26\u53F7\u5DF2\u9501\u5B9A\u3002\u8BF7\u901A\u8FC7\u90AE\u7BB1\u91CD\u7F6E\u5BC6\u7801\u3002';
          p.disabled = true; btn.disabled = true;
        } else {
          m.textContent = (j.remaining != null ? '\u5BC6\u7801\u9519\u8BEF\uFF0C\u8FD8\u53EF\u5C1D\u8BD5 ' + j.remaining + ' \u6B21' : '\u5BC6\u7801\u9519\u8BEF');
          p.select();
        }
      } catch { m.textContent = '\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u91CD\u8BD5'; }
      btn.disabled = false;
    });
  <\/script>
</body>
</html>`;
var RECOVER_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SlingLab \xB7 \u627E\u56DE\u5BC6\u7801</title>
${AUTH_STYLE}
</head>
<body>
  <form class="card" id="f">
    <div class="logo">S</div>
    <h1>\u627E\u56DE\u5BC6\u7801</h1>
    <p>\u8F93\u5165\u4F60\u7684\u90AE\u7BB1\uFF0C\u91CD\u7F6E\u94FE\u63A5\u5C06\u53D1\u9001\u5230\u8BE5\u90AE\u7BB1</p>
    <input type="email" id="e" placeholder="you@example.com" autocomplete="email" autofocus/>
    <button type="submit" id="btn">\u53D1\u9001\u91CD\u7F6E\u94FE\u63A5</button>
    <p class="msg" id="msg"></p>
    <div class="link"><a href="/">\u8FD4\u56DE\u767B\u5F55</a></div>
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
        if (r.ok) { m.className = 'msg ok'; m.textContent = j.message || '\u5982\u679C\u90AE\u7BB1\u5339\u914D\uFF0C\u91CD\u7F6E\u94FE\u63A5\u5DF2\u53D1\u9001'; }
        else { m.className = 'msg'; m.textContent = j.error || '\u8BF7\u6C42\u5931\u8D25'; }
      } catch { m.className = 'msg'; m.textContent = '\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u91CD\u8BD5'; }
      btn.disabled = false;
    });
  <\/script>
</body>
</html>`;
var RESET_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SlingLab \xB7 \u8BBE\u7F6E\u65B0\u5BC6\u7801</title>
${AUTH_STYLE}
</head>
<body>
  <form class="card" id="f">
    <div class="logo">S</div>
    <h1>\u8BBE\u7F6E\u65B0\u5BC6\u7801</h1>
    <p>\u65B0\u5BC6\u7801\u81F3\u5C11 6 \u4F4D</p>
    <input type="password" id="p1" placeholder="\u65B0\u5BC6\u7801" autocomplete="new-password" autofocus/>
    <input type="password" id="p2" placeholder="\u786E\u8BA4\u65B0\u5BC6\u7801" autocomplete="new-password" style="margin-top:10px"/>
    <button type="submit" id="btn">\u786E\u8BA4\u91CD\u7F6E</button>
    <p class="msg" id="msg"></p>
    <div class="link"><a href="/">\u8FD4\u56DE\u767B\u5F55</a></div>
  </form>
  <script>
    const f = document.getElementById('f'), p1 = document.getElementById('p1'), p2 = document.getElementById('p2'), m = document.getElementById('msg'), btn = document.getElementById('btn');
    const token = new URLSearchParams(location.search).get('token') || '';
    if (!token) { m.textContent = '\u91CD\u7F6E\u94FE\u63A5\u65E0\u6548'; p1.disabled = p2.disabled = true; }
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      m.textContent = '';
      if (p1.value !== p2.value) { m.textContent = '\u4E24\u6B21\u8F93\u5165\u7684\u5BC6\u7801\u4E0D\u4E00\u81F4'; return; }
      if (p1.value.length < 6) { m.textContent = '\u65B0\u5BC6\u7801\u81F3\u5C11 6 \u4F4D'; return; }
      btn.disabled = true;
      try {
        const r = await fetch('/api/v1/reset-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password: p1.value }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok) { m.className = 'msg ok'; m.textContent = '\u5BC6\u7801\u5DF2\u91CD\u7F6E\uFF0C\u6B63\u5728\u8DF3\u8F6C\u767B\u5F55\u2026'; setTimeout(() => { location.href = '/'; }, 1200); }
        else { m.className = 'msg'; m.textContent = j.error || '\u91CD\u7F6E\u5931\u8D25\uFF0C\u94FE\u63A5\u53EF\u80FD\u5DF2\u8FC7\u671F'; }
      } catch { m.className = 'msg'; m.textContent = '\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u91CD\u8BD5'; }
      btn.disabled = false;
    });
  <\/script>
</body>
</html>`;
var FALLBACK_HOMEPAGE = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>SlingLab</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0c100e;color:#c8d8c8;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:40px 20px}h1{font-size:32px;font-weight:300;letter-spacing:4px;text-transform:uppercase;color:#33cc66;margin-bottom:8px}.subtitle{color:#4a604a;font-size:14px;margin-bottom:40px;letter-spacing:2px}</style></head><body><h1>SlingLab</h1><p class="subtitle">Projects &amp; Experiments</p></body></html>`;
function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json;charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}
__name(json, "json");
function htmlPage(page) {
  return new Response(page, { status: 200, headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store" } });
}
__name(htmlPage, "htmlPage");
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
    }
    const authOk = await checkAuth(request, env);
    const isAuthEndpoint = path === "/api/v1/login" || path === "/api/v1/logout" || path === "/api/v1/recover" || path === "/api/v1/reset-password";
    if (path === "/api/v1/login" && method === "POST") {
      const auth = await getSiteAuth(env.STONE_DATA, env);
      if (!auth) return json({ ok: false, error: "Auth not configured" }, 500);
      const body = await request.json().catch(() => null);
      const provided = body?.password ?? "";
      if (auth.locked) {
        return json({ ok: false, error: "\u8D26\u53F7\u5DF2\u9501\u5B9A\uFF0C\u8BF7\u901A\u8FC7\u90AE\u7BB1\u91CD\u7F6E\u5BC6\u7801", locked: true }, 423);
      }
      if (!timingSafeEqualStr(provided, auth.password)) {
        auth.failedAttempts++;
        if (auth.failedAttempts >= MAX_FAILED_ATTEMPTS) {
          auth.locked = true;
          await saveSiteAuth(env.STONE_DATA, env, auth);
          await sendLockoutResetEmail(env, env.STONE_DATA);
          return json({ ok: false, error: "\u8FDE\u7EED\u5931\u8D25\u6B21\u6570\u8FC7\u591A\uFF0C\u8D26\u53F7\u5DF2\u9501\u5B9A\uFF0C\u8BF7\u901A\u8FC7\u90AE\u7BB1\u91CD\u7F6E\u5BC6\u7801", locked: true }, 423);
        }
        await saveSiteAuth(env.STONE_DATA, env, auth);
        return json({ ok: false, error: "\u5BC6\u7801\u9519\u8BEF", remaining: MAX_FAILED_ATTEMPTS - auth.failedAttempts }, 401);
      }
      if (auth.failedAttempts > 0 || auth.locked) {
        auth.failedAttempts = 0;
        auth.locked = false;
        await saveSiteAuth(env.STONE_DATA, env, auth);
      }
      const payload = btoa(JSON.stringify({ exp: Date.now() + AUTH_TTL_MS }));
      const sig = await hmacSha256(payload, auth.password);
      return json({ ok: true }, 200, { "Set-Cookie": authCookie(`${payload}.${sig}`, Math.floor(AUTH_TTL_MS / 1e3)) });
    }
    if (path === "/api/v1/logout" && method === "POST") {
      return json({ ok: true }, 200, { "Set-Cookie": authCookie("", 0) });
    }
    if (path === "/api/v1/recover" && method === "POST") {
      const body = await request.json().catch(() => null);
      const target = (env.RECOVERY_EMAIL ?? "").trim().toLowerCase();
      const generic = { ok: true, message: "\u5982\u679C\u90AE\u7BB1\u5339\u914D\uFF0C\u91CD\u7F6E\u94FE\u63A5\u5DF2\u53D1\u9001" };
      if ((body?.email ?? "").trim().toLowerCase() !== target) return json(generic, 200);
      const auth = await getSiteAuth(env.STONE_DATA, env);
      const now = Date.now();
      if (auth && auth.lastResetSentAt && now - auth.lastResetSentAt < RESEND_MIN_INTERVAL_MS) return json(generic, 200);
      const token = randomToken();
      const hash = await sha256Hex(token);
      await env.STONE_DATA.put("reset_token", JSON.stringify({ hash, exp: now + RESET_TTL_MS }));
      try {
        await sendResetEmail(env, `https://app.slinglab.xyz/reset?token=${token}`);
      } catch (err) {
        await env.STONE_DATA.delete("reset_token");
        return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
      }
      if (auth) {
        auth.lastResetSentAt = now;
        await saveSiteAuth(env.STONE_DATA, env, auth);
      }
      return json(generic, 200);
    }
    if (path === "/api/v1/reset-password" && method === "POST") {
      const body = await request.json().catch(() => null);
      const token = body?.token ?? "";
      const password = body?.password ?? "";
      if (password.length < 6) return json({ ok: false, error: "\u65B0\u5BC6\u7801\u81F3\u5C11 6 \u4F4D" }, 400);
      const stored = await env.STONE_DATA.get("reset_token", "json");
      const hash = await sha256Hex(token);
      if (!stored?.hash || stored.hash !== hash || !stored.exp || stored.exp < Date.now()) {
        return json({ ok: false, error: "\u91CD\u7F6E\u94FE\u63A5\u65E0\u6548\u6216\u5DF2\u8FC7\u671F" }, 400);
      }
      const auth = await getSiteAuth(env.STONE_DATA, env);
      if (!auth) return json({ ok: false, error: "Auth not configured" }, 500);
      auth.password = password;
      auth.failedAttempts = 0;
      auth.locked = false;
      auth.lastResetSentAt = 0;
      await saveSiteAuth(env.STONE_DATA, env, auth);
      await env.STONE_DATA.delete("reset_token");
      return json({ ok: true }, 200, { "Set-Cookie": authCookie("", 0) });
    }
    if (path === "/reset") return htmlPage(RESET_PAGE);
    if (path === "/recover") return htmlPage(RECOVER_PAGE);
    if (path === "/" || path === "") {
      if (!authOk) return htmlPage(LOGIN_PAGE);
      try {
        const kvHtml = await env.SITE_DATA.get("homepage_html");
        if (kvHtml) {
          return new Response(kvHtml, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", "Pragma": "no-cache", "Expires": "0" } });
        }
      } catch (e) {
        console.error("SITE_DATA read error:", e);
      }
      return new Response(FALLBACK_HOMEPAGE, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
    }
    return fetch(request);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map

/**
 * Upload the static frontend build (out/) to KV through the live Worker's
 * /api/upload endpoint. Uses the pre-migration deploy key, so this must run
 * BEFORE the new worker (with rotated keys) is deployed.
 */
const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "out")
const API = "https://app.slinglab.xyz/stone/api/upload"
// After the new worker deploys, set this to the DEPLOY_KEY secret value:
//   set DEPLOY_KEY=<value>  (PowerShell) or export DEPLOY_KEY=<value> (bash)
const DEPLOY_KEY = process.env.DEPLOY_KEY || "stone-deploy-2024"

const MIME = {
  ".html": "text/html;charset=utf-8",
  ".js": "application/javascript;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".json": "application/json;charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain;charset=utf-8",
}

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const files = walk(ROOT)
console.log(`Uploading ${files.length} files from out/`)

let ok = 0
let failed = 0

async function upload(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/")
  const kvKey = `/${rel}`
  const data = fs.readFileSync(file).toString("base64")
  const ext = path.extname(file).toLowerCase()
  const body = JSON.stringify({
    key: DEPLOY_KEY,
    path: kvKey,
    data,
    contentType: MIME[ext] || "application/octet-stream",
  })
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (res.ok && json.ok) {
    ok++
  } else {
    failed++
    console.error(`FAIL ${kvKey}: ${res.status} ${JSON.stringify(json).slice(0, 120)}`)
  }
}

async function main() {
  const CONCURRENCY = 10
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    await Promise.all(files.slice(i, i + CONCURRENCY).map(upload))
    if (i % 50 === 0) console.log(`progress ${Math.min(i + CONCURRENCY, files.length)}/${files.length}`)
  }
  console.log(`DONE ok=${ok} failed=${failed}`)
  process.exit(failed === 0 ? 0 : 1)
}

main()

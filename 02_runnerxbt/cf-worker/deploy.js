/**
 * 部署脚本：上传 KV 数据 + 部署 Worker
 * 使用 Cloudflare API 直接操作（基于 wrangler OAuth token）
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ───
const CF_API = 'https://api.cloudflare.com/client/v4';
const ACCOUNT_ID = '1ab09277ed038add4925d28a343c9dc5';
const API_TOKEN = 'd7ca80c814708d4015dd782b3e327789:wx1sLSdRcMdddK5d:9uuLTQtM07QjVpuGlXe66nmCOLxnVxtP';
const KV_NAMESPACE_ID = 'a8a7863f33ce49cc94d764f784c2cbe6';
const WORKER_NAME = 'runnerxbt';

const PROJECT_ROOT = resolve(__dirname, '..');

// ─── Helpers ───
async function cf(method, path, body, contentType) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
    },
  };
  if (body) {
    opts.headers['Content-Type'] = contentType || 'application/json';
    opts.body = body;
  }
  const res = await fetch(`${CF_API}${path}`, opts);
  const json = await res.json();
  if (!json.success) {
    throw new Error(`API error [${method} ${path}]: ${JSON.stringify(json.errors)}`);
  }
  return json.result;
}

// ─── Step 1: Upload data to KV ───
async function uploadToKV(key, filePath) {
  const content = readFileSync(filePath, 'utf-8');
  console.log(`Uploading ${key} (${(content.length / 1024).toFixed(1)}KB)...`);
  await cf(
    'PUT',
    `/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/${key}`,
    content,
    'application/json; charset=utf-8'
  );
  console.log(`  ✓ ${key} uploaded`);
}

// ─── Step 2: Deploy Worker ───
async function deployWorker() {
  // Read frontend HTML
  const frontendHTML = readFileSync(resolve(PROJECT_ROOT, 'frontend', 'index.html'), 'utf-8');

  // Read data files for embedding
  const messagesData = readFileSync(resolve(PROJECT_ROOT, 'data', 'messages_enriched.json'), 'utf-8');
  const btcData = readFileSync(resolve(PROJECT_ROOT, 'data', 'btc_ohlcv_1d.json'), 'utf-8');
  const ethData = readFileSync(resolve(PROJECT_ROOT, 'data', 'eth_ohlcv_1d.json'), 'utf-8');
  const btc4hData = readFileSync(resolve(PROJECT_ROOT, 'data', 'btc_ohlcv_4h.json'), 'utf-8');

  // Write the worker JS with data embedded + KV fallback
  const workerJS = buildWorkerScript(frontendHTML, messagesData, btcData, ethData, btc4hData);
  const workerPath = resolve(__dirname, 'src', 'worker.js');
  writeFileSync(workerPath, workerJS, 'utf-8');
  console.log(`Worker script written (${(workerJS.length / 1024).toFixed(1)}KB)`);

  // Build multipart upload
  const metadata = {
    main_module: 'worker.js',
    compatibility_date: '2025-03-07',
    compatibility_flags: ['nodejs_compat'],
    bindings: [
      {
        type: 'kv_namespace',
        name: 'DATA',
        namespace_id: KV_NAMESPACE_ID,
      },
    ],
  };

  const boundary = `----WorkerDeploy${Date.now()}`;
  const encoder = new TextEncoder();
  const parts = [];

  // Metadata part
  parts.push(encoder.encode(
    `--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n`
  ));

  // Script part - read the compiled JS
  const scriptBytes = readFileSync(workerPath);
  parts.push(encoder.encode(
    `--${boundary}\r\nContent-Disposition: form-data; name="worker.js"\r\nContent-Type: application/javascript+module\r\n\r\n`
  ));
  parts.push(scriptBytes);
  parts.push(encoder.encode(`\r\n--${boundary}--\r\n`));

  // Combine parts
  const totalLength = parts.reduce((sum, p) => sum + p.byteLength, 0);
  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const p of parts) {
    body.set(p, offset);
    offset += p.byteLength;
  }

  console.log('Deploying Worker...');
  const result = await cf(
    'PUT',
    `/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}`,
    body,
    `multipart/form-data; boundary=${boundary}`
  );
  console.log(`  ✓ Worker ${result.id || result.script_name || 'deployed'}`);

  // Enable workers.dev subdomain route
  try {
    await cf(
      'POST',
      `/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}/subdomain`,
      { enabled: true, previews_enabled: true }
    );
    console.log('  ✓ workers.dev subdomain enabled');
  } catch (e) {
    console.log('  Note: subdomain may already be enabled');
  }

  return result;
}

function buildWorkerScript(html, messagesJson, btcJson, ethJson, btc4hJson) {
  // Sanitize HTML for embedding - escape backticks and ${}
  const escapedHtml = html.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

  return `
// Auto-generated Worker - RunnerXBT Terminal
// Embedded data + KV fallback

// Env type definition
// DATA: KVNamespace (kv_namespace binding)

// ─── Embedded Data ───
const EMBEDDED_DATA = {
  messages: JSON.parse(${JSON.stringify(messagesJson)}),
  btc: JSON.parse(${JSON.stringify(btcJson)}),
  eth: JSON.parse(${JSON.stringify(ethJson)}),
  btc4h: JSON.parse(${JSON.stringify(btc4hJson)}),
};

const FRONTEND_HTML = \`${escapedHtml}\`;

// ─── CORS Headers ───
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

// ─── Daily counts computation ───
function computeDaily(msgs) {
  const map = {};
  for (const m of msgs) {
    if (m.date) map[m.date] = (map[m.date] || 0) + 1;
  }
  return { data: map, total_days: Object.keys(map).length };
}

// ─── Request Handler ───
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    try {
      // Try KV first, fall back to embedded data
      async function getData(key, embedded) {
        if (env.DATA) {
          try {
            const val = await env.DATA.get(key, 'json');
            if (val) return val;
          } catch (e) {
            // KV not available, fall through
          }
        }
        return embedded;
      }

      if (path === '/api/messages') {
        const msgs = await getData('messages_enriched', EMBEDDED_DATA.messages);
        return json({ data: msgs, total: msgs.length });
      }

      if (path === '/api/daily') {
        const msgs = await getData('messages_enriched', EMBEDDED_DATA.messages);
        return json(computeDaily(msgs));
      }

      if (path === '/api/btc') {
        const data = await getData('btc_ohlcv_1d', EMBEDDED_DATA.btc);
        return json({ data });
      }

      if (path === '/api/eth') {
        const data = await getData('eth_ohlcv_1d', EMBEDDED_DATA.eth);
        return json({ data });
      }

      if (path === '/api/btc4h') {
        const data = await getData('btc_ohlcv_4h', EMBEDDED_DATA.btc4h);
        return json({ data });
      }

      // Serve frontend
      return new Response(FRONTEND_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS },
      });

    } catch (error) {
      console.error('Worker error:', error);
      return json({ error: 'Internal server error', message: error.message }, 500);
    }
  },
};
`.trim();
}

// ─── Main ───
async function main() {
  console.log('=== RunnerXBT Cloudflare Deployment ===\n');

  // Step 1: Upload data to KV
  console.log('--- Uploading data to KV ---');
  // Messages data is large, use embedded approach instead of KV
  // Only upload BTC and ETH to KV as backup
  await uploadToKV('btc_ohlcv_1d', resolve(PROJECT_ROOT, 'data', 'btc_ohlcv_1d.json'));
  await uploadToKV('eth_ohlcv_1d', resolve(PROJECT_ROOT, 'data', 'eth_ohlcv_1d.json'));
  await uploadToKV('btc_ohlcv_4h', resolve(PROJECT_ROOT, 'data', 'btc_ohlcv_4h.json'));
  console.log('');

  // Step 2: Deploy Worker
  console.log('--- Deploying Worker ---');
  await deployWorker();
  console.log('');

  console.log('=== Deployment Complete ===');
  console.log(`URL: https://${WORKER_NAME}.lh-06102003-dot-99.workers.dev`);
}

main().catch(err => {
  console.error('\nDeployment failed:', err);
  process.exit(1);
});

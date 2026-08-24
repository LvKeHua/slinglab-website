const http = require('http');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const PROXY_SECRET = process.env.PROXY_SECRET;
if (!PROXY_SECRET) {
  console.error('[Stone Proxy] PROXY_SECRET env var is required. Set it via start-proxy.ps1');
  process.exit(1);
}
const PORT = parseInt(process.env.PORT || '8765', 10);
const PROXY_URL = process.env.PROXY_URL || 'http://127.0.0.1:7897';

const ALLOWED_HOSTS = ['api1.binance.com', 'api2.binance.com', 'api3.binance.com', 'api.binance.me', 'api.bybit.com'];
const agent = new HttpsProxyAgent(PROXY_URL);

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Proxy-Secret, X-Target-Host, X-MBX-APIKEY',
    });
    return res.end();
  }

  // Health check
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', proxy: 'clash-hk' }));
  }

  // Auth
  if (PROXY_SECRET && req.headers['x-proxy-secret'] !== PROXY_SECRET) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Forbidden' }));
  }

  // Only GET
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  // Must start with /proxy/
  if (!req.url.startsWith('/proxy/')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Not found' }));
  }

  const targetHost = req.headers['x-target-host'] || 'api1.binance.com';
  if (!ALLOWED_HOSTS.includes(targetHost)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Host not allowed' }));
  }

  const proxyPath = req.url.replace('/proxy', '');
  const targetUrl = `https://${targetHost}${proxyPath}`;
  console.log(`[Proxy] GET ${targetUrl}`);

  // Build headers
  const headers = { 'User-Agent': 'StoneJournal/1.0', 'Accept': 'application/json' };
  if (req.headers['x-mbx-apikey']) headers['X-MBX-APIKEY'] = req.headers['x-mbx-apikey'];

  try {
    const response = await fetch(targetUrl, { headers, agent, method: 'GET' });
    const data = await response.text();
    res.writeHead(response.status, {
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch (err) {
    console.error(`[Proxy] Error: ${err.message}`);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy fetch failed', detail: err.message }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Stone Proxy] Listening on 0.0.0.0:${PORT}`);
  console.log(`[Stone Proxy] Clash proxy: ${PROXY_URL}`);
  console.log(`[Stone Proxy] Allowed hosts: ${ALLOWED_HOSTS.join(', ')}`);
});

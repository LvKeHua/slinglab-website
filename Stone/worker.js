// stone-journal Worker (Service Worker)
// Source of Truth: Cloudflare deployed copy (saved locally 2026-07-22)
// KV Binding: STONE_DATA → CMM_JOURNAL_DATA (b1746befa9394cfeada28d3787f36f9c)

var EXT_MAP = {
  '.html': 'text/html;charset=utf-8',
  '.js': 'application/javascript;charset=utf-8',
  '.css': 'text/css;charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json;charset=utf-8',
  '.txt': 'text/plain;charset=utf-8'
};

function getContentType(path) {
  for (var k in EXT_MAP) { if (path.endsWith(k)) return EXT_MAP[k]; }
  return 'application/octet-stream';
}

function routePath(path) {
  if (path.startsWith('/api/')) return path;
  if (path.includes('.')) return path;
  return '/index.html';
}

var TRADES_KEY = 'trades_data';

// Strip /stone route prefix (Cloudflare passes full path with route prefix)
function normalizePath(p) {
  if (p === '/stone' || p === '/stone/') return '/';
  if (p.startsWith('/stone/')) return p.slice(6);
  return p;
}

function jsonResp(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json;charset=utf-8' }
  });
}

addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
  var path = normalizePath(url.pathname);
  var method = event.request.method;

  // GET /api/trades
  if (path === '/api/trades' && method === 'GET') {
    return event.respondWith(
      STONE_DATA.get(TRADES_KEY, 'text').then(function(val) {
        var trades = val ? JSON.parse(val) : [];
        return jsonResp(trades);
      })
    );
  }

  // DELETE /api/trades/:id
  var deleteMatch = path.match(/^\/api\/trades\/(\d+)$/);
  if (deleteMatch && method === 'DELETE') {
    var id = parseInt(deleteMatch[1], 10);
    return event.respondWith(
      STONE_DATA.get(TRADES_KEY, 'text').then(function(val) {
        var trades = val ? JSON.parse(val) : [];
        var idx = -1;
        for (var i = 0; i < trades.length; i++) {
          if (trades[i].id === id) { idx = i; break; }
        }
        if (idx === -1) return jsonResp({ error: 'not found' }, 404);
        trades.splice(idx, 1);
        return STONE_DATA.put(TRADES_KEY, JSON.stringify(trades)).then(function() {
          return jsonResp({ ok: true });
        });
      })
    );
  }

  // POST /api/upload
  if (path === '/api/upload' && method === 'POST') {
    return event.respondWith(
      event.request.json().then(function(body) {
        if (body.key !== 'stone-deploy-2024') {
          return jsonResp({ error: 'unauthorized' }, 403);
        }
        var kvKey = body.path;
        var data = body.data;
        var contentType = body.contentType || getContentType(kvKey);
        var binaryStr = atob(data);
        var bytes = new Uint8Array(binaryStr.length);
        for (var i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        return STONE_DATA.put(kvKey, bytes, { metadata: { contentType: contentType } }).then(function() {
          return jsonResp({ ok: true, path: kvKey });
        });
      })
    );
  }

  // GET /api/status
  if (path === '/api/status') {
    return event.respondWith(jsonResp({ project: 'Stone', status: 'ok' }));
  }

  // Static file serving
  var kvKey = routePath(path);
  event.respondWith(
    STONE_DATA.get(kvKey, 'arrayBuffer').then(function(buf) {
      if (buf) {
        var contentType = getContentType(kvKey);
        return new Response(buf, { status: 200, headers: { 'Content-Type': contentType } });
      }
      return STONE_DATA.get('/index.html', 'arrayBuffer').then(function(index) {
        if (index) return new Response(index, { status: 200, headers: { 'Content-Type': 'text/html;charset=utf-8' } });
        return new Response('Not Found', { status: 404 });
      });
    })
  );
});

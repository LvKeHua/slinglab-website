"""Build worker v8 from v7 backup: add demon scanner endpoints."""
import io

SRC = 'cf-worker/worker_v7_backup.mjs'
DST = 'cf-worker/worker.mjs'

code = io.open(SRC, encoding='utf-8').read()
orig_len = len(code)

# 1) add hRD + hDM before hST
anchor_hst = "async function hST(kv){"
assert anchor_hst in code, 'hST anchor missing'
add_fns = (
    "async function hRD(req,kv){const k=DEMON_RELAY_KEY,a=req.headers.get('X-Auth-Key');"
    "if(!k||a!==k)return json({ok:false,error:'Unauthorized'},401);"
    "try{const b=await req.json();if(!b||!Array.isArray(b.data))return json({ok:false,error:'Must be {data:[...]}'},400);"
    "await kv.put('demon_data',JSON.stringify(b.data));const n=new Date().toISOString();"
    "await kv.put('demon_updated',n);await kv.put('demon_count',String(b.data.length));"
    "return json({ok:true,coins:b.data.length,updated:n})}catch(e){return json({ok:false,error:e.message},400)}}\n"
    "async function hDM(kv){const r=await kv.get('demon_data'),u=await kv.get('demon_updated');"
    "if(!r)return json({ok:false,error:'no demon data',data:[],updated:null});const p=JSON.parse(r);"
    "return json({ok:true,updated:u,data:p,count:p.length})}\n"
)
code = code.replace(anchor_hst, add_fns + anchor_hst, 1)

# 2) routes
anchor_route = "if(path==='/api/relay-tickers'&&event.request.method==='POST')return event.respondWith(hRL(event.request,MARKET_DATA));"
assert anchor_route in code, 'route anchor missing'
add_routes = (
    anchor_route + "\n"
    "  if(path==='/api/demon')return event.respondWith(hDM(MARKET_DATA));\n"
    "  if(path==='/api/relay-demon'&&event.request.method==='POST')return event.respondWith(hRD(event.request,MARKET_DATA));"
)
code = code.replace(anchor_route, add_routes, 1)

# 3) extend hST
old_hst = r"async function hST(kv){const r=await kv.get('data'),u=await kv.get('last_updated'),c=await kv.get('count');return json({project:'\u7b79\u7801\u7b5b\u9009',ok:!!r,coins:parseInt(c||'0'),updated:u})}"
assert old_hst in code, 'hST body anchor missing'
new_hst = (
    r"async function hST(kv){const r=await kv.get('data'),u=await kv.get('last_updated'),c=await kv.get('count'),"
    r"dr=await kv.get('demon_data'),du=await kv.get('demon_updated'),dc=await kv.get('demon_count');"
    r"return json({project:'\u7b79\u7801\u7b5b\u9009',ok:!!r,coins:parseInt(c||'0'),updated:u,"
    r"demon:{ok:!!dr,coins:parseInt(dc||'0'),updated:du}})}"
)
code = code.replace(old_hst, new_hst, 1)

io.open(DST, 'w', encoding='utf-8').write(code)
print('v8 written:', len(code), 'bytes (was %d)' % orig_len)
for a in ['hRD', 'hDM', '/api/demon', '/api/relay-demon', 'DEMON_RELAY_KEY', 'demon_data', 'demon_count']:
    assert a in code, 'missing ' + a
print('all anchors present')

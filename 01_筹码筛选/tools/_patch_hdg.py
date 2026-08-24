#!/usr/bin/env python3
"""给 worker 加 hDG 日榜回看接口 + 路由。"""
import re

NEW_HDG = r'''
// 📅 日榜回看：指定日期的涨幅榜 + 候选池关联标注
async function hDG(kv,url){const u=new URL(url);const date=(u.searchParams.get('date')||'').trim();const topn=Math.min(parseInt(u.searchParams.get('topn')||'20',10)||20,100);const window=Math.min(parseInt(u.searchParams.get('window')||'30',10)||30,90);const now=new Date();const todayBJ=new Date(now.getTime()+8*3600*1000).toISOString().slice(0,10);
if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>todayBJ)return json({ok:false,error:'invalid date'},400);
const gk='gainer_hist_'+date.replace(/-/g,'');
// 读指定日涨幅榜
const gr=await kv.get(gk);if(!gr)return json({ok:true,date,topn,tz:'UTC+8',gainers:[],candidates:{},note:'no gainer archive for '+date});
let gs=[];let gSeed=false;try{const p=JSON.parse(gr);gs=(p.gainers||[]).slice();gSeed=!!p.seed;}catch(e){}
gs.sort((a,b)=>(b.change_24h_pct||0)-(a.change_24h_pct||0));gs=gs.slice(0,topn);
// 往前 window 天读候选池 → firstSeen / bestScore / 当天候选集合
const firstSeen={};const bestScore={};let dayCands=null;
for(let i=0;i<window;i++){const bj=new Date(now.getTime()+8*3600*1000-i*86400000);const ds=bj.toISOString().slice(0,10);const fk='fwd_hist_'+ds.replace(/-/g,'');const fr=await kv.get(fk);if(!fr)continue;try{const p=JSON.parse(fr);const cs=(p.candidates||[]);if(ds===date)dayCands=new Set(cs.map(c=>c.base_asset));for(const c of cs){if(!firstSeen[c.base_asset]||ds<firstSeen[c.base_asset])firstSeen[c.base_asset]=ds;if(c.forward_score!=null&&(bestScore[c.base_asset]==null||c.forward_score>bestScore[c.base_asset]))bestScore[c.base_asset]=c.forward_score;}}catch(e){}}
// 标注
const out=gs.map((g,k)=>{const ba=g.base_asset;const fs=firstSeen[ba];const ever=!!fs;const lead=(fs&&fs<date)?Math.round((Date.parse(date)-Date.parse(fs))/86400000):0;return{base_asset:ba,change_24h_pct:g.change_24h_pct,rank:k+1,volume_24h_usdt:g.volume_24h_usdt||null,is_candidate:dayCands?dayCands.has(ba):false,ever_candidate:ever,first_seen:fs||null,lead_days:lead,forward_score:bestScore[ba]!=null?bestScore[ba]:null};});
const candMeta={};Object.keys(firstSeen).forEach(ba=>{candMeta[ba]={first_seen:firstSeen[ba],forward_score:bestScore[ba]!=null?bestScore[ba]:null};});
return json({ok:true,date,topn,window,tz:'UTC+8',gainers:out,candidates:candMeta,gainer_seed:gSeed,total_archived:gs.length})}'''

src = open('cf-worker/worker_v10_inline.mjs', encoding='utf-8').read()

# 1) 插入 hDG（hEV 函数后）
anchor = "return json({ok:true,days,topn,big,tz:'UTC+8',events,by_day:byDay,by_coin:byCoin,kpi:{total_events:events.length,top_events:nTop,big_events:nBig,both_events:nBoth,ever_candidate:nEver,ever_rate:events.length?Math.round(nEver/events.length*1000)/10:0,avg_lead:leadN?Math.round(leadSum/leadN*10)/10:0,lead_by_days:leadByDays}})}"
assert anchor in src, "hEV 结尾锚点未找到"
src = src.replace(anchor, anchor + "\n" + NEW_HDG, 1)

# 2) 加路由
route = "if(path==='/api/events')return event.respondWith(hEV(MARKET_DATA,event.request.url));"
assert route in src
src = src.replace(route, route + "\n  if(path==='/api/day-gainers')return event.respondWith(hDG(MARKET_DATA,event.request.url));")

open('cf-worker/worker_v10_inline.mjs', 'w', encoding='utf-8').write(src)
print("hDG 已插入")

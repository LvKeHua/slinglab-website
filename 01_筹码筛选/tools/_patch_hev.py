#!/usr/bin/env python3
"""给 worker 加 hEV 事件聚合接口 + 路由。"""
import re

NEW_IEV = r'''
// ⚡ 事件记录：上榜(TopN) 或 单日涨幅≥20% 的币，关联候选池状态
async function hEV(kv,url){const u=new URL(url);const days=Math.min(parseInt(u.searchParams.get('days')||'14',10)||14,60);const topn=Math.min(parseInt(u.searchParams.get('topn')||'20',10)||20,100);const big=parseFloat(u.searchParams.get('big')||'20');const now=new Date();const daysArr=[];for(let i=0;i<days;i++){const bj=new Date(now.getTime()+8*3600*1000-i*86400000);daysArr.push(bj.toISOString().slice(0,10));}
// 读窗口数据
const raw={};
for(const ds of daysArr){const fk='fwd_hist_'+ds.replace(/-/g,'');const gk='gainer_hist_'+ds.replace(/-/g,'');const [fr,gr]=await Promise.all([kv.get(fk),kv.get(gk)]);raw[ds]={cands:null,gainers:null,cand_seed:false,gainer_seed:false};if(fr){try{const p=JSON.parse(fr);raw[ds].cands=(p.candidates||[]).map(c=>({symbol:c.symbol,base_asset:c.base_asset,forward_score:c.forward_score}));raw[ds].cand_seed=!!p.seed;}catch(e){}}if(gr){try{const p=JSON.parse(gr);const gs=(p.gainers||[]).slice();gs.sort((a,b)=>(b.change_24h_pct||0)-(a.change_24h_pct||0));raw[ds].gainers=gs;raw[ds].gainer_seed=!!p.seed;}catch(e){}}}
// 候选首次入选日（窗口内最早）
const firstSeen={};
for(const ds of daysArr){if(!raw[ds].cands)continue;for(const c of raw[ds].cands){if(!firstSeen[c.base_asset]||ds<firstSeen[c.base_asset])firstSeen[c.base_asset]=ds;}}
// 生成事件
const events=[];
for(const ds of daysArr){const day=raw[ds];if(!day.gainers)continue;const candSet=new Set((day.cands||[]).map(c=>c.base_asset));const scoreMap={};(day.cands||[]).forEach(c=>{scoreMap[c.base_asset]=c.forward_score;});
  for(let k=0;k<day.gainers.length;k++){const g=day.gainers[k];const rank=k+1;const chg=g.change_24h_pct||0;
    const isTop=rank<=topn;const isBig=chg>=big;
    if(!isTop&&!isBig)continue;
    const isCand=!!candSet.has(g.base_asset);
    const fs=firstSeen[g.base_asset];
    const everCand=!!fs;
    const leadDays=(fs&&fs<ds)?Math.round((Date.parse(ds)-Date.parse(fs))/86400000):0;
    const trigger=(isTop&&isBig)?'both':(isTop?'top':'big');
    events.push({date:ds,base_asset:g.base_asset,change_24h_pct:chg,rank:isTop?rank:null,trigger,is_candidate:isCand,ever_candidate:everCand,lead_days:leadDays,first_seen:fs||null,forward_score:scoreMap[g.base_asset]!=null?scoreMap[g.base_asset]:null});
  }}
// 统计
const byDay={};const byCoin={};let nTop=0,nBig=0,nBoth=0,nEver=0,leadSum=0,leadN=0;
for(const e of events){
  byDay[e.date]=byDay[e.date]||{total:0,top:0,big:0,both:0};
  byDay[e.date].total++;
  if(e.trigger==='top'){byDay[e.date].top++;nTop++;}
  else if(e.trigger==='big'){byDay[e.date].big++;nBig++;}
  else{byDay[e.date].both++;nBoth++;}
  if(e.ever_candidate){nEver++;if(e.lead_days>0){leadSum+=e.lead_days;leadN++;}}
  byCoin[e.base_asset]=byCoin[e.base_asset]||{events:0,top:0,big:0,both:0,ever_candidate:false,first_seen:null,max_chg:-999};
  const c=byCoin[e.base_asset];c.events++;c.ever_candidate=c.ever_candidate||e.ever_candidate;if(!c.first_seen||(e.first_seen&&e.first_seen<c.first_seen))c.first_seen=e.first_seen||c.first_seen;if(e.change_24h_pct>c.max_chg)c.max_chg=e.change_24h_pct;
  if(e.trigger==='top')c.top++;else if(e.trigger==='big')c.big++;else c.both++;
}
const leadByDays={};
for(const e of events){if(e.ever_candidate&&e.lead_days>0){leadByDays[e.lead_days]=(leadByDays[e.lead_days]||0)+1;}}
return json({ok:true,days,topn,big,tz:'UTC+8',events,by_day:byDay,by_coin:byCoin,kpi:{total_events:events.length,top_events:nTop,big_events:nBig,both_events:nBoth,ever_candidate:nEver,ever_rate:events.length?Math.round(nEver/events.length*1000)/10:0,avg_lead:leadN?Math.round(leadSum/leadN*10)/10:0,lead_by_days:leadByDays}})}'''

src = open('cf-worker/worker_v10_inline.mjs', encoding='utf-8').read()

# 1) 插入 hEV 函数（hOV 函数后）
anchor = "return json({ok:true,days,topn,minvol,tz:'UTC+8',history:out,lead_events:leadEvents,lead_union:leadUnion})}"
assert anchor in src
src = src.replace(anchor, anchor + "\n" + NEW_IEV, 1)

# 2) 加路由
route = "if(path==='/api/overlap-stats')return event.respondWith(hOV(MARKET_DATA,event.request.url));"
assert route in src
src = src.replace(route, route + "\n  if(path==='/api/events')return event.respondWith(hEV(MARKET_DATA,event.request.url));")

open('cf-worker/worker_v10_inline.mjs', 'w', encoding='utf-8').write(src)
print("hEV 已插入")

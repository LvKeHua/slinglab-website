#!/usr/bin/env python3
"""用新 hOV 替换旧版（python 生成 JS 文本，避免手拼错误）。"""
import re

NEW_HOV = r'''async function hOV(kv,url){const u=new URL(url);const days=Math.min(parseInt(u.searchParams.get('days')||'14',10)||14,60);const topn=Math.min(parseInt(u.searchParams.get('topn')||'20',10)||20,100);const minvol=parseFloat(u.searchParams.get('minvol')||'0');const out={};const now=new Date();
// 先读全部窗口内的候选池 + 涨幅榜
const daysArr=[];
for(let i=0;i<days;i++){const bj=new Date(now.getTime()+8*3600*1000-i*86400000);daysArr.push(bj.toISOString().slice(0,10));}
const raw={};
for(const ds of daysArr){const fk='fwd_hist_'+ds.replace(/-/g,'');const gk='gainer_hist_'+ds.replace(/-/g,'');const [fr,gr]=await Promise.all([kv.get(fk),kv.get(gk)]);raw[ds]={cands:null,gainers:null,cand_seed:false,gainer_seed:false};if(fr){try{const p=JSON.parse(fr);raw[ds].cands=(p.candidates||[]).map(c=>({symbol:c.symbol,base_asset:c.base_asset,forward_score:c.forward_score}));raw[ds].cand_seed=!!p.seed;}catch(e){}}if(gr){try{const p=JSON.parse(gr);let gs=(p.gainers||[]).slice();if(minvol>0)gs=gs.filter(g=>(g.volume_24h_usdt||0)>=minvol);gs.sort((a,b)=>(b.change_24h_pct||0)-(a.change_24h_pct||0));gs=gs.slice(0,topn);raw[ds].gainers=gs;raw[ds].gainer_seed=!!p.seed;}catch(e){}}}
// 每个候选的首次入选日（窗口内最早）
const firstSeen={};
for(const ds of daysArr){if(!raw[ds].cands)continue;for(const c of raw[ds].cands){if(!firstSeen[c.base_asset])firstSeen[c.base_asset]=ds;}}
// 同日重合 + 领先命中（预兆口径）
for(const ds of daysArr){const day={date:ds,candidates:raw[ds].cands,total_candidates:raw[ds].cands?raw[ds].cands.length:0,gainers:raw[ds].gainers,total_gainers:raw[ds].gainers?raw[ds].gainers.length:0,overlap:[],overlap_count:0,pct:null,candidate_seed:raw[ds].cand_seed,gainer_seed:raw[ds].gainer_seed};if(raw[ds].cands&&raw[ds].gainers){const candSet=new Set(raw[ds].cands.map(c=>c.base_asset));day.overlap=raw[ds].gainers.filter(g=>candSet.has(g.base_asset)).map(g=>({base_asset:g.base_asset,change_24h_pct:g.change_24h_pct,rank:raw[ds].gainers.indexOf(g)+1,first_seen:firstSeen[g.base_asset]}));day.overlap_count=day.overlap.length;day.pct=raw[ds].gainers.length>0?Math.round(day.overlap.length/raw[ds].gainers.length*1000)/10:null;}out[ds]=day;}
// 领先命中：上榜日之前就已入选候选池的币（上榜日-首次入选日>=1）
const leadEvents=[];
for(const ds of daysArr){if(!raw[ds].gainers)continue;const dsIdx=daysArr.indexOf(ds);for(let k=0;k<raw[ds].gainers.length;k++){const g=raw[ds].gainers[k];const fs=firstSeen[g.base_asset];if(!fs)continue;const fsIdx=daysArr.indexOf(fs);if(fsIdx>=0&&fsIdx<dsIdx){leadEvents.push({base_asset:g.base_asset,first_seen:fs,gain_day:ds,lead_days:dsIdx-fsIdx,change_24h_pct:g.change_24h_pct,rank:k+1});}}}
const leadUnion={};
for(const e of leadEvents){if(!leadUnion[e.base_asset])leadUnion[e.base_asset]={times:0,best_gain:null,first_seen:e.first_seen};leadUnion[e.base_asset].times++;if(leadUnion[e.base_asset].best_gain==null||e.change_24h_pct>leadUnion[e.base_asset].best_gain)leadUnion[e.base_asset].best_gain=e.change_24h_pct;}
return json({ok:true,days,topn,minvol,tz:'UTC+8',history:out,lead_events:leadEvents,lead_union:leadUnion})}'''

src = open('cf-worker/worker_v10_inline.mjs', encoding='utf-8').read()
i = src.find('async function hOV')
j = src.find('}', src.find('return json({ok:true,days,topn,minvol', i)) + 1
old = src[i:j]
assert 'async function hOV' in old and len(old) > 1500, f"定位失败 len={len(old)}"
src = src[:i] + NEW_HOV + src[j:]
open('cf-worker/worker_v10_inline.mjs', 'w', encoding='utf-8').write(src)
print(f"替换完成: 旧 {len(old)}B → 新 {len(NEW_HOV)}B")

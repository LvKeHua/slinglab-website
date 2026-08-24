#!/usr/bin/env python3
"""给 worker 加 hPA 候选表现分析接口。"""
NEW_HPA = r'''
// 📊 候选池表现分析：每日候选 → fwd1/3/5 收益 vs 市场基准
async function hPA(kv,url){const u=new URL(url);const days=Math.min(parseInt(u.searchParams.get('days')||'14',10)||14,60);const now=new Date();const daysArr=[];for(let i=0;i<days;i++){const bj=new Date(now.getTime()+8*3600*1000-i*86400000);daysArr.push(bj.toISOString().slice(0,10));}
// 读窗口：候选池 + 涨幅榜(含价格快照)
const raw={};
for(const ds of daysArr){const fk='fwd_hist_'+ds.replace(/-/g,'');const gk='gainer_hist_'+ds.replace(/-/g,'');const [fr,gr]=await Promise.all([kv.get(fk),kv.get(gk)]);raw[ds]={cands:null,gainers:null};if(fr){try{const p=JSON.parse(fr);raw[ds].cands=(p.candidates||[]).map(c=>({base_asset:c.base_asset,forward_score:c.forward_score}));}catch(e){}}if(gr){try{const p=JSON.parse(gr);raw[ds].gainers=(p.gainers||[]);}catch(e){}}}
// 每日价格图：date -> {symbol: last_price}
const priceByDay={};
for(const ds of daysArr){const gs=raw[ds].gainers;if(!gs)continue;const m={};for(const g of gs){if(g.last_price!=null)m[g.base_asset]=g.last_price;}priceByDay[ds]=m;}
// 每币时间序列（用于 fwd 计算）
const pxSeries={};
for(const ds of daysArr){const m=priceByDay[ds];if(!m)continue;for(const ba of Object.keys(m)){if(!pxSeries[ba])pxSeries[ba]={};pxSeries[ba][ds]=m[ba];}}
// BTC 基准序列
const btcSeries=pxSeries['BTC']||{};
// 计算 fwd 收益：从 ds 日入选 → ds+1/+3/+5 日价格变化（跨日）
function fwdRet(series,ds,horizon){const daysSorted=Object.keys(series).sort();const i=daysSorted.indexOf(ds);if(i<0)return null;const p0=series[ds];if(!p0)return null;const j=i+horizon;if(j>=daysSorted.length)return null;const pn=series[daysSorted[j]];if(!pn||p0<=0)return null;return pn/p0-1;}
// 每日统计
const daily=[];
for(const ds of daysArr){const cands=raw[ds].cands||[];if(!cands.length)continue;const rets={f1:[],f3:[],f5:[]};const baseRet={f1:null,f3:null,f5:null};for(const h of[1,3,5]){baseRet['f'+h]=fwdRet(btcSeries,ds,h);}
  const scored=cands.filter(c=>c.forward_score!=null&&c.forward_score>=4);
  const pool=scored.length?scored:cands;
  for(const c of pool){const s=pxSeries[c.base_asset];if(!s)continue;for(const h of[1,3,5]){const r=fwdRet(s,ds,h);if(r!=null)rets['f'+h].push(r);}}
  const stats={date:ds,n_candidates:cands.length,scored:pool.length};
  for(const h of[1,3,5]){const arr=rets['f'+h];stats['f'+h+'_mean']=arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length*10000)/10000:null;stats['f'+h+'_n']=arr.length;stats['f'+h+'_win']=arr.length?Math.round(arr.filter(x=>x>0).length/arr.length*1000)/10:null;stats['btc_'+h]=baseRet['f'+h]!=null?Math.round(baseRet['f'+h]*10000)/10000:null;}
  stats.excess_f3=stats.f3_mean!=null&&stats.btc_3!=null?Math.round((stats.f3_mean-stats.btc_3)*10000)/10000:null;
  daily.push(stats);}
// 汇总
const agg={f1:[],f3:[],f5:[],ex3:[]};let nDays=0;
for(const d of daily){if(d.f1_mean!=null){agg.f1.push(d.f1_mean);nDays++;}if(d.f3_mean!=null)agg.f3.push(d.f3_mean);if(d.f5_mean!=null)agg.f5.push(d.f5_mean);if(d.excess_f3!=null)agg.ex3.push(d.excess_f3);}
const mean=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length*10000)/10000:null;
const summary={n_days:nDays,f1_mean:mean(agg.f1),f3_mean:mean(agg.f3),f5_mean:mean(agg.f5),excess_f3_mean:mean(agg.ex3),win3:mean(daily.filter(d=>d.f3_mean!=null).map(d=>d.f3_win))};
return json({ok:true,days,tz:'UTC+8',daily,summary,note:'fwd 收益基于每日收盘价快照（last_price）；fwd 为入选日收盘到 +N 日收盘；excess=候选均值-BTC'})}'''

src = open('cf-worker/worker_v10_inline.mjs', encoding='utf-8').read()
anchor = "return json({ok:true,date,topn,window,tz:'UTC+8',gainers:out,candidates:candMeta,gainer_seed:gSeed,total_archived:gs.length})}"
assert anchor in src, "hDG 结尾锚点未找到"
src = src.replace(anchor, anchor + "\n" + NEW_HPA, 1)
route = "if(path==='/api/day-gainers')return event.respondWith(hDG(MARKET_DATA,event.request.url));"
assert route in src
src = src.replace(route, route + "\n  if(path==='/api/perf')return event.respondWith(hPA(MARKET_DATA,event.request.url));")
open('cf-worker/worker_v10_inline.mjs', 'w', encoding='utf-8').write(src)
print("hPA 已插入")

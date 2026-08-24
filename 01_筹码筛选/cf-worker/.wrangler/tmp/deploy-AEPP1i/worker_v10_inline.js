(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // worker_v10_inline.mjs
  globalThis.INLINE_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>\u7B79\u7801\u771F\u7A7A \xB7 \u4EE3\u5E01\u7B5B\u9009\u5668</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0b1120;
  --surface:#111b2e;
  --surface-alt:#0f1729;
  --surface-hover:#1a2640;
  --border:rgba(255,255,255,0.07);
  --border-active:rgba(59,130,246,0.5);
  --text:#f1f5f9;
  --text-secondary:#94a3b8;
  --text-muted:#475569;
  --accent:#3b82f6;
  --accent-hover:#2563eb;
  --accent-glow:rgba(59,130,246,0.25);
  --success:#10b981;
  --success-bg:rgba(16,185,129,0.12);
  --warning:#f59e0b;
  --warning-bg:rgba(245,158,11,0.12);
  --danger:#ef4444;
  --danger-bg:rgba(239,68,68,0.12);
  --star:#f59e0b;
  --radius:12px;
  --radius-sm:8px;
  --radius-lg:16px;
  --shadow:0 4px 24px rgba(0,0,0,0.3);
  --transition:0.25s cubic-bezier(0.4,0,0.2,1);
  --font:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;
}
html{font-size:15px}
body{
  background:var(--bg);
  color:var(--text);
  font-family:var(--font);
  padding:20px;
  min-height:100vh;
  background-image:radial-gradient(ellipse at 20% 50%,rgba(59,130,246,0.06) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(16,185,129,0.04) 0%,transparent 50%);
  background-attachment:fixed;
}
#root{animation:fadeIn .4s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 8px var(--accent-glow)}50%{box-shadow:0 0 20px var(--accent-glow)}}

/* Loading state */
.loading-root{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:16px}
.loading-root .spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-root .loading-text{color:var(--text-muted);font-size:.85rem;letter-spacing:.3px}

/* Header */
.app-header{background:linear-gradient(135deg,rgba(59,130,246,0.1),rgba(16,185,129,0.05));border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px 28px;margin-bottom:16px;position:relative;overflow:hidden}
.app-header::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:.5}
.app-header h1{font-size:1.35rem;font-weight:700;background:linear-gradient(135deg,#f1f5f9,#94a3b8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.app-header p{font-size:.8rem;color:var(--text-secondary);margin-top:6px}

/* Info banner */
.info-banner{background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:var(--radius-sm);padding:10px 14px;font-size:.75rem;color:#60a5fa;margin-bottom:12px;line-height:1.5}
.info-banner.warn{background:var(--warning-bg);border-color:rgba(245,158,11,0.25);color:var(--warning)}

/* Status bar */
.status-bar{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;font-size:.75rem;margin-bottom:14px;border-radius:var(--radius-sm);backdrop-filter:blur(12px)}
.status-bar.ok{background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.15);color:var(--success)}
.status-bar.warn{background:var(--warning-bg);border:1px solid rgba(245,158,11,0.2);color:var(--warning)}
.status-bar span{display:flex;align-items:center;gap:4px}

/* Layout */
.layout{display:flex;gap:16px;animation:slideUp .5s ease}
.sidebar{width:280px;flex-shrink:0;display:flex;flex-direction:column;gap:10px}
.main{flex:1;min-width:0}

/* Presets */
.preset-row{display:flex;gap:8px}
.preset-btn{flex:1;padding:10px 12px;border:none;border-radius:var(--radius-sm);font-weight:600;font-size:.8rem;cursor:pointer;color:#fff;transition:var(--transition);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:relative}
.preset-btn:hover{transform:translateY(-1px);filter:brightness(1.15)}
.preset-btn:active{transform:translateY(0)}
.preset-a{background:linear-gradient(135deg,#dc2626,#b91c1c);box-shadow:0 2px 12px rgba(220,38,38,0.25)}
.preset-b{background:linear-gradient(135deg,#d97706,#b45309);box-shadow:0 2px 12px rgba(217,119,6,0.25)}

/* Filter cards */
.filter-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;transition:var(--transition)}
.filter-card:hover{border-color:rgba(255,255,255,0.12)}
.filter-card .label{font-size:.65rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px}
.filter-card input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);outline:none;margin:8px 0;transition:var(--transition)}
.filter-card input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:var(--accent);border:2px solid var(--surface);cursor:pointer;box-shadow:0 0 8px var(--accent-glow);transition:var(--transition)}
.filter-card input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.15);box-shadow:0 0 12px var(--accent-glow)}
.filter-card input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--accent);border:2px solid var(--surface);cursor:pointer;box-shadow:0 0 8px var(--accent-glow)}
.filter-card .input-row{display:flex;gap:8px;align-items:center;margin-bottom:4px}
.filter-card .input-row .filter-input{flex:1;padding:6px 8px;border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);font-size:.8rem;width:0;min-width:0;text-align:center;background:var(--surface-alt);color:var(--text);transition:var(--transition);font-variant-numeric:tabular-nums}
.filter-card .input-row .filter-input:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px var(--accent-glow)}
.filter-card .input-row .range-sep{color:var(--text-muted);font-size:.8rem;flex-shrink:0}

/* KPI cards */
.kpi-row{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.kpi-card{flex:1;min-width:100px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;text-align:center;transition:var(--transition);position:relative;overflow:hidden}
.kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)}
.kpi-card:hover{border-color:rgba(255,255,255,0.15);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.2)}
.kpi-card .kpi-label{font-size:.65rem;color:var(--text-muted);font-weight:500;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px}
.kpi-card .kpi-value{font-size:1.4rem;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;letter-spacing:-.3px}

/* Table */
.table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:12px;transition:var(--transition)}
.table-wrap:hover{border-color:rgba(255,255,255,0.12)}
.table-wrap .table-title{padding:14px 18px;font-weight:600;font-size:.85rem;color:var(--text);border-bottom:1px solid var(--border)}
.table-scroll{overflow-x:auto;max-height:72vh;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.08) transparent}
.table-scroll::-webkit-scrollbar{width:6px;height:6px}
.table-scroll::-webkit-scrollbar-track{background:transparent}
.table-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:3px}
.table-scroll::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.15)}
table{width:100%;border-collapse:collapse;font-size:.78rem;white-space:nowrap}
th{background:rgba(255,255,255,0.03);color:var(--text-secondary);font-weight:600;font-size:.65rem;text-transform:uppercase;letter-spacing:.6px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;user-select:none;position:sticky;top:0;z-index:1;backdrop-filter:blur(8px);transition:var(--transition)}
th:hover{color:var(--text);background:rgba(255,255,255,0.06)}
td{padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04);color:var(--text);font-variant-numeric:tabular-nums;transition:var(--transition)}
tr{transition:var(--transition)}
tr:hover td{background:rgba(255,255,255,0.02)}
tr.momentum td{color:#34d399!important}
tr.momentum td:first-child{position:relative}
tr.momentum td:first-child::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:3px;background:linear-gradient(180deg,var(--success),#059669);border-radius:2px}
tr.star5 td{color:var(--warning)!important}
tr.star5 td:first-child{position:relative}
tr.star5 td:first-child::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:3px;background:linear-gradient(180deg,var(--warning),#d97706);border-radius:2px}
tr.conflict td{color:#fbbf24!important}
tr.conflict td:first-child{position:relative}
tr.conflict td:first-child::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:3px;background:linear-gradient(180deg,#f59e0b,#b45309);border-radius:2px}
.empty-msg{text-align:center;padding:40px 20px;color:var(--text-muted);font-size:.85rem}

/* Buttons */
.btn{padding:8px 18px;background:linear-gradient(135deg,var(--accent),var(--accent-hover));color:#fff;border:none;border-radius:var(--radius-sm);font-size:.8rem;font-weight:600;cursor:pointer;transition:var(--transition);position:relative;overflow:hidden}
.btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px var(--accent-glow)}
.btn:active{transform:translateY(0)}
.refresh-btn{width:100%;padding:10px;background:linear-gradient(135deg,var(--accent),var(--accent-hover));color:#fff;border:none;border-radius:var(--radius-sm);font-weight:600;font-size:.8rem;cursor:pointer;transition:var(--transition);position:relative;overflow:hidden}
.refresh-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px var(--accent-glow)}
.refresh-btn:active{transform:translateY(0)}

/* Calc card */
.calc-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px;margin-bottom:12px;transition:var(--transition)}
.calc-card:hover{border-color:rgba(255,255,255,0.12)}
.calc-card h3{font-size:.9rem;font-weight:600;color:var(--text);margin-bottom:4px}
.calc-row{display:flex;gap:10px;margin:10px 0}
.calc-row input{flex:1;padding:8px 12px;border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);font-size:.85rem;background:var(--surface-alt);color:var(--text);transition:var(--transition);font-variant-numeric:tabular-nums}
.calc-row input:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px var(--accent-glow)}
.calc-result{background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.15);border-radius:var(--radius-sm);padding:12px 16px;font-weight:600;color:var(--success);font-size:.85rem;margin:10px 0;line-height:1.5}


/* Source reliability badges */
.dual-ratio{display:inline-flex;align-items:center;gap:6px}
.dual-ratio .cr-cg{font-size:.6rem;color:var(--text-muted);background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:3px}
.stale-badge{display:inline-flex;align-items:center;gap:3px;background:var(--danger-bg);color:var(--danger);border:1px solid rgba(239,68,68,0.25);border-radius:4px;padding:2px 6px;font-size:.55rem;font-weight:600;cursor:help;transition:var(--transition);margin-left:4px}
.stale-badge:hover{background:rgba(239,68,68,0.18)}
/* Conflict badge */
.conflict-badge{display:inline-flex;align-items:center;gap:4px;background:var(--warning-bg);color:var(--warning);border:1px solid rgba(245,158,11,0.25);border-radius:4px;padding:2px 8px;font-size:.6rem;font-weight:600;cursor:help;transition:var(--transition)}
.conflict-badge:hover{background:rgba(245,158,11,0.18)}
.star-conflict{opacity:.55;position:relative}
.star-conflict::after{content:'?';position:absolute;top:-4px;right:-7px;font-size:.55rem;color:var(--warning);font-weight:700}
.data-source-info{font-size:.6rem;color:var(--text-muted);padding:4px 14px;text-align:right;border-top:1px solid var(--border)}

/* Footer */
.footer{text-align:center;color:var(--text-muted);font-size:.65rem;padding:16px 0;letter-spacing:.2px;line-height:1.6}

/* Responsive */
@media(max-width:768px){
  body{padding:12px}
  .layout{flex-direction:column}
  .sidebar{width:100%}
  .kpi-card{min-width:calc(50% - 5px)}
  .kpi-card .kpi-value{font-size:1.15rem}
  .app-header{padding:18px 20px}
  .app-header h1{font-size:1.15rem}
  .scatter-wrap,.cf-scatter-wrap{height:240px}
  .scatter-plot,.cf-scatter-plot{left:30px;right:20px}
  .scatter-tick-y,.cf-scatter-tick-y{font-size:.48rem}
  .scatter-tick-x,.cf-scatter-tick-x{font-size:.48rem}
  .scatter-legend,.cf-scatter-legend{font-size:.48rem;gap:4px}
}
</style><style>
/* \u2550\u2550\u2550 \u5996\u5E01\u626B\u63CF\u5668 \u89C6\u56FE\u6837\u5F0F \u2550\u2550\u2550 */
#tabbar{display:flex;gap:8px;margin-bottom:14px}
.tab-btn{flex:1;max-width:220px;padding:11px 16px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text-secondary);font-size:.85rem;font-weight:600;cursor:pointer;transition:var(--transition);letter-spacing:.5px}
.tab-btn:hover{border-color:var(--border-active);color:var(--text)}
.tab-btn.active{background:linear-gradient(135deg,rgba(59,130,246,0.18),rgba(16,185,129,0.08));border-color:var(--border-active);color:var(--text);box-shadow:0 0 16px var(--accent-glow)}
.demon-preset-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.demon-preset{flex:1;min-width:88px;padding:9px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);color:var(--text-secondary);font-size:.72rem;font-weight:600;cursor:pointer;transition:var(--transition)}
.demon-preset:hover{border-color:var(--border-active);color:var(--text)}
.demon-preset.active{background:linear-gradient(135deg,rgba(239,68,68,0.18),rgba(245,158,11,0.12));border-color:rgba(239,68,68,0.4);color:#fca5a5;box-shadow:0 0 12px rgba(239,68,68,0.15)}
.demon-filter-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:10px}
.demon-filter-card .label{font-size:.62rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
.demon-filter-card .input-row{display:flex;gap:8px;align-items:center;margin-bottom:4px}
.demon-filter-card .filter-input{flex:1;padding:6px 8px;border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);font-size:.8rem;width:0;min-width:0;text-align:center;background:var(--surface-alt);color:var(--text);transition:var(--transition);font-variant-numeric:tabular-nums}
.demon-filter-card .filter-input:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px var(--accent-glow)}
.demon-filter-card .range-sep{color:var(--text-muted);font-size:.8rem;flex-shrink:0}
.demon-filter-card input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);outline:none;margin:8px 0;transition:var(--transition)}
.demon-filter-card input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:var(--accent);border:2px solid var(--surface);cursor:pointer;box-shadow:0 0 8px var(--accent-glow)}
.demon-filter-card input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:var(--accent);border:2px solid var(--surface);cursor:pointer}
.demon-sort-row{display:flex;gap:8px;margin-top:4px}
.demon-sort-row select{flex:1;padding:6px 8px;border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);font-size:.75rem;background:var(--surface-alt);color:var(--text)}
.sig-badge{display:inline-block;font-size:.58rem;font-weight:600;padding:2px 6px;border-radius:4px;margin:1px 2px;white-space:nowrap}
.sig-squeeze{background:rgba(239,68,68,0.18);color:#fca5a5;border:1px solid rgba(239,68,68,0.3)}
.sig-pump{background:rgba(16,185,129,0.16);color:#34d399;border:1px solid rgba(16,185,129,0.3)}
.sig-dump{background:rgba(245,158,11,0.16);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)}
.sig-tag{background:rgba(139,92,246,0.16);color:#c4b5fd;border:1px solid rgba(139,92,246,0.3)}
.sig-lowoi{background:rgba(59,130,246,0.14);color:#93c5fd;border:1px solid rgba(59,130,246,0.3)}
.sig-higoi{background:rgba(239,68,68,0.24);color:#f87171;border:1px solid rgba(239,68,68,0.4)}
tr.squeeze-row td{color:#fca5a5!important}
tr.squeeze-row td:first-child{position:relative}
tr.squeeze-row td:first-child::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:3px;background:linear-gradient(180deg,#ef4444,#b91c1c);border-radius:2px}
.demon-chart-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:12px}
.demon-chart-wrap h4{font-size:.8rem;font-weight:600;color:var(--text);margin-bottom:10px}
.hbar-row{display:flex;align-items:center;gap:8px;margin:3px 0;font-size:.66rem}
.hbar-label{width:52px;text-align:right;color:var(--text-secondary);flex-shrink:0;font-variant-numeric:tabular-nums}
.hbar-track{flex:1;height:12px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden}
.hbar-fill{height:100%;background:linear-gradient(90deg,#ef4444,#f59e0b);border-radius:3px;min-width:2px}
.hbar-val{width:56px;color:var(--text-muted);flex-shrink:0;font-variant-numeric:tabular-nums}
.hist-wrap{display:flex;align-items:flex-end;gap:4px;height:110px;padding-top:4px}
.hist-bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%}
.hist-fill{background:linear-gradient(180deg,#3b82f6,#1d4ed8);border-radius:3px 3px 0 0;min-height:2px;transition:height .3s}
.hist-fill.neg{background:linear-gradient(180deg,#f59e0b,#d97706)}
.hist-label{font-size:.55rem;color:var(--text-muted);text-align:center;margin-top:4px;white-space:nowrap}
.scatter-wrap{position:relative;height:300px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:var(--radius-sm);overflow:visible}
.scatter-plot{position:absolute;top:24px;right:36px;bottom:28px;left:44px;overflow:hidden;border-radius:4px}
.scatter-dot{position:absolute;border-radius:50%;opacity:.85;cursor:pointer;transition:transform .15s,box-shadow .15s;transform:translate(-50%,-50%);z-index:2}
.scatter-dot:hover{transform:translate(-50%,-50%) scale(1.6);opacity:1;z-index:6;box-shadow:0 0 10px rgba(255,255,255,0.25)}
.scatter-grid{position:absolute;pointer-events:none;background:rgba(255,255,255,0.05);z-index:0}
.scatter-grid-v{top:0;bottom:0;width:1px}
.scatter-grid-h{left:0;right:0;height:1px}
.scatter-tick{position:absolute;font-size:.55rem;color:var(--text-muted);pointer-events:none;font-variant-numeric:tabular-nums;z-index:1;white-space:nowrap}
.scatter-tick-x{bottom:-16px;transform:translateX(-50%)}
.scatter-tick-y{left:-4px;transform:translateX(-100%) translateY(50%);text-align:right}
.scatter-axis{position:absolute;font-size:.58rem;color:var(--text-secondary);z-index:3;background:var(--surface);padding:0 4px;white-space:nowrap}
.scatter-x{left:44px;bottom:2px}
.scatter-y{top:2px;right:8px}
.scatter-tip{position:absolute;left:50%;transform:translateX(-50%);background:#111827;border:1px solid rgba(255,255,255,0.2);color:#e5e7eb;font-size:.62rem;padding:6px 10px;border-radius:8px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s;z-index:30;box-shadow:0 4px 16px rgba(0,0,0,0.5);line-height:1.5}
.scatter-tip.above{bottom:calc(100% + 6px)}
.scatter-tip.below{top:calc(100% + 6px)}
.scatter-dot:hover .scatter-tip{opacity:1}
.scatter-legend{position:absolute;left:48px;bottom:6px;display:flex;gap:8px;z-index:3;font-size:.55rem;color:var(--text-muted);background:rgba(15,23,42,0.85);padding:3px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.08)}
.scatter-legend-item{display:flex;align-items:center;gap:3px}
.scatter-legend-item i{width:8px;height:8px;border-radius:50%;display:inline-block}
.demon-note{font-size:.62rem;color:var(--text-muted);margin-top:8px;line-height:1.6}
</style><style>
/* \u2550\u2550\u2550 \u{1FA99} \u5C0F\u5E01\u7B5B\u9009\u5668 \u89C6\u56FE\u6837\u5F0F \u2550\u2550\u2550 */
/* \u2550\u2550\u2550 \u{1FA99} \u5C0F\u5E01\u7B5B\u9009\u5668 \u89C6\u56FE\u6837\u5F0F \u2550\u2550\u2550 */
/* \u4E3B\u9898\u4E0E _demon.css \u4E00\u81F4\uFF0C\u4F7F\u7528 var(--*) \u57FA\u7840\u53D8\u91CF\uFF0Ccf- \u524D\u7F00\u907F\u514D\u7C7B\u540D\u51B2\u7A81 */

/* \u7B2C\u4E09 Tab \u6FC0\u6D3B\u6001\uFF08\u91D1\u8272\u7CFB\uFF0C\u533A\u522B\u4E8E\u84DD/\u7EA2\u7684\u5176\u4ED6\u4E24 Tab\uFF09 */
.tab-btn.tab-coinfilter.active{background:linear-gradient(135deg,rgba(245,158,11,0.2),rgba(16,185,129,0.1));border-color:rgba(245,158,11,0.45);color:var(--text);box-shadow:0 0 16px rgba(245,158,11,0.18)}

/* \u2500\u2500 \u9884\u8BBE\u6309\u94AE\uFF08\u4E0E demon \u540C\u6B3E\u6837\u5F0F\uFF09\u2500\u2500 */
.cf-preset-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.cf-preset{flex:1;min-width:88px;padding:9px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);color:var(--text-secondary);font-size:.72rem;font-weight:600;cursor:pointer;transition:var(--transition)}
.cf-preset:hover{border-color:var(--border-active);color:var(--text)}
.cf-preset.active{background:linear-gradient(135deg,rgba(245,158,11,0.18),rgba(16,185,129,0.12));border-color:rgba(245,158,11,0.4);color:#fcd34d;box-shadow:0 0 12px rgba(245,158,11,0.15)}

/* \u2500\u2500 \u7B5B\u9009\u5361\u7247 \u2500\u2500 */
.cf-filter-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:10px}
.cf-filter-card .label{font-size:.62rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
.cf-filter-card .input-row{display:flex;gap:8px;align-items:center;margin-bottom:4px}
.cf-filter-card .filter-input{flex:1;padding:6px 8px;border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);font-size:.8rem;width:0;min-width:0;text-align:center;background:var(--surface-alt);color:var(--text);transition:var(--transition);font-variant-numeric:tabular-nums}
.cf-filter-card .filter-input:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px var(--accent-glow)}
.cf-filter-card .range-sep{color:var(--text-muted);font-size:.8rem;flex-shrink:0}
.cf-filter-card input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);outline:none;margin:8px 0;transition:var(--transition)}
.cf-filter-card input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:#f59e0b;border:2px solid var(--surface);cursor:pointer;box-shadow:0 0 8px rgba(245,158,11,0.4)}
.cf-filter-card input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#f59e0b;border:2px solid var(--surface);cursor:pointer}
.cf-sort-row{display:flex;gap:8px;margin-top:4px}
.cf-sort-row select{flex:1;padding:6px 8px;border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);font-size:.75rem;background:var(--surface-alt);color:var(--text)}

/* \u2500\u2500 \u4FE1\u53F7\u6807\u7B7E\u5FBD\u7AE0 \u2500\u2500 */
.cf-tag{display:inline-block;font-size:.58rem;font-weight:600;padding:2px 6px;border-radius:4px;margin:1px 2px;white-space:nowrap}
.cf-tag-squeeze{background:rgba(239,68,68,0.18);color:#fca5a5;border:1px solid rgba(239,68,68,0.3)}
.cf-tag-small_cap{background:rgba(59,130,246,0.14);color:#93c5fd;border:1px solid rgba(59,130,246,0.3)}
.cf-tag-early_pump{background:rgba(16,185,129,0.16);color:#34d399;border:1px solid rgba(16,185,129,0.3)}
.cf-tag-thin_book{background:rgba(245,158,11,0.16);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)}
.cf-tag-distribution{background:rgba(239,68,68,0.24);color:#f87171;border:1px solid rgba(239,68,68,0.4)}
.cf-tag-kill_longs{background:rgba(249,115,22,0.16);color:#fdba74;border:1px solid rgba(249,115,22,0.3)}
.cf-tag-mentioned{background:rgba(139,92,246,0.16);color:#c4b5fd;border:1px solid rgba(139,92,246,0.3)}
.cf-tag-new_listing{background:rgba(6,182,212,0.14);color:#67e8f9;border:1px solid rgba(6,182,212,0.3)}
.cf-tag-funding_anomaly{background:rgba(245,158,11,0.16);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)}

/* \u2500\u2500 OI \u9636\u6BB5\u5FBD\u7AE0 \u2500\u2500 */
.cf-stage{display:inline-block;font-size:.58rem;font-weight:600;padding:2px 6px;border-radius:4px;white-space:nowrap}
.cf-stage-accumulation{background:rgba(100,116,139,0.16);color:#94a3b8;border:1px solid rgba(100,116,139,0.3)}
.cf-stage-early_pump{background:rgba(59,130,246,0.14);color:#93c5fd;border:1px solid rgba(59,130,246,0.3)}
.cf-stage-pump{background:rgba(16,185,129,0.16);color:#34d399;border:1px solid rgba(16,185,129,0.3)}
.cf-stage-mid{background:rgba(245,158,11,0.16);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)}
.cf-stage-late_distribution{background:rgba(239,68,68,0.22);color:#f87171;border:1px solid rgba(239,68,68,0.4)}

/* \u2500\u2500 \u8D44\u8D39\u7387\u7740\u8272 \u2500\u2500 */
.cf-fund{font-variant-numeric:tabular-nums}
.cf-fund-pos{color:#34d399}
.cf-fund-neg{color:#f87171}

/* \u6324\u538B\u884C\u9AD8\u4EAE\uFF08\u540C\u5996\u5E01 squeeze-row\uFF09 */
tr.cf-squeeze-row td{color:#fca5a5!important}
tr.cf-squeeze-row td:first-child{position:relative}
tr.cf-squeeze-row td:first-child::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:3px;background:linear-gradient(180deg,#ef4444,#b91c1c);border-radius:2px}

/* \u2500\u2500 \u4FE1\u53F7\u8BA1\u6570\u7EDF\u8BA1\u6761 \u2500\u2500 */
.cf-stats{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px}
.cf-stat-chip{display:inline-flex;align-items:center;gap:4px;font-size:.66rem;font-weight:600;padding:3px 10px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:var(--text-secondary)}
.cf-stat-chip b{color:var(--text);font-variant-numeric:tabular-nums;font-weight:700}
.cf-chip-squeeze{background:rgba(239,68,68,0.12);color:#fca5a5;border-color:rgba(239,68,68,0.35)}
.cf-chip-small_cap{background:rgba(59,130,246,0.12);color:#93c5fd;border-color:rgba(59,130,246,0.35)}
.cf-chip-early_pump{background:rgba(16,185,129,0.12);color:#34d399;border-color:rgba(16,185,129,0.35)}
.cf-chip-thin_book{background:rgba(245,158,11,0.12);color:#fbbf24;border-color:rgba(245,158,11,0.35)}
.cf-chip-distribution{background:rgba(239,68,68,0.16);color:#f87171;border-color:rgba(239,68,68,0.4)}
.cf-chip-kill_longs{background:rgba(249,115,22,0.12);color:#fdba74;border-color:rgba(249,115,22,0.35)}
.cf-chip-mentioned{background:rgba(139,92,246,0.12);color:#c4b5fd;border-color:rgba(139,92,246,0.35)}
.cf-chip-new_listing{background:rgba(6,182,212,0.12);color:#67e8f9;border-color:rgba(6,182,212,0.35)}
.cf-chip-funding_anomaly{background:rgba(245,158,11,0.12);color:#fbbf24;border-color:rgba(245,158,11,0.35)}
.cf-chip-squeeze b,.cf-chip-distribution b{color:#fca5a5}
.cf-chip-small_cap b,.cf-chip-new_listing b{color:#93c5fd}
.cf-chip-early_pump b{color:#34d399}
.cf-chip-thin_book b,.cf-chip-funding_anomaly b{color:#fbbf24}
.cf-chip-kill_longs b{color:#fdba74}
.cf-chip-mentioned b{color:#c4b5fd}

/* \u2500\u2500 \u53EF\u5C55\u5F00\u8868\u683C \u2500\u2500 */
tr.cf-row-click{cursor:pointer}
tr.cf-row-click:hover td{background:rgba(255,255,255,0.035)}
.cf-expand-arrow{color:var(--text-muted);font-size:.7rem;width:20px;text-align:center;user-select:none}
.cf-detail-row td{background:rgba(255,255,255,0.02)!important;padding:12px 16px!important;border-top:none!important;cursor:default}
.cf-detail-inner{max-width:100%}

/* \u2500\u2500 5\u6B65\u68C0\u67E5\u6E05\u5355 \u2500\u2500 */
.cf-checklist{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-sm);padding:10px 12px}
.cf-checklist-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:8px}
.cf-checklist-head span:first-child{font-size:.75rem;font-weight:600;color:var(--text)}
.cf-checklist-hint{font-size:.58rem;color:var(--text-muted)}
.cf-checklist-steps{display:flex;gap:6px;flex-wrap:wrap}
.cf-check-step{flex:1;min-width:140px;display:flex;align-items:center;gap:6px;padding:7px 9px;border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-sm);background:var(--surface);cursor:pointer;transition:var(--transition)}
.cf-check-step:hover{border-color:var(--border-active)}
.cf-check-mark{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;flex-shrink:0;font-variant-numeric:tabular-nums}
.cf-check-blank{background:rgba(255,255,255,0.06);color:var(--text-muted);border:1px dashed rgba(255,255,255,0.22)}
.cf-check-ok{background:rgba(16,185,129,0.2);color:#34d399;border:1px solid rgba(16,185,129,0.4)}
.cf-check-no{background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.4)}
.cf-check-name{font-size:.68rem;font-weight:600;color:var(--text);white-space:nowrap}
.cf-check-desc{font-size:.58rem;color:var(--text-muted);line-height:1.4}

/* \u2500\u2500 \u5C55\u5F00\u8BE6\u60C5\u5143\u4FE1\u606F \u2500\u2500 */
.cf-detail-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.cf-meta-item{display:flex;gap:6px;align-items:center;font-size:.66rem;color:var(--text-secondary);background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);padding:4px 10px;border-radius:6px;font-variant-numeric:tabular-nums}
.cf-meta-label{color:var(--text-muted)}

/* \u2500\u2500 \u56FE\u8868 \u2500\u2500 */
.cf-chart-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:12px}
.cf-chart-wrap h4{font-size:.8rem;font-weight:600;color:var(--text);margin-bottom:10px}
.cf-hbar-row{display:flex;align-items:center;gap:8px;margin:3px 0;font-size:.66rem}
.cf-hbar-label{width:52px;text-align:right;color:var(--text-secondary);flex-shrink:0;font-variant-numeric:tabular-nums}
.cf-hbar-track{flex:1;height:12px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden}
.cf-hbar-fill{height:100%;background:linear-gradient(90deg,#f59e0b,#10b981);border-radius:3px;min-width:2px}
.cf-hbar-val{width:56px;color:var(--text-muted);flex-shrink:0;font-variant-numeric:tabular-nums}
.cf-hist-wrap{display:flex;align-items:flex-end;gap:4px;height:110px;padding-top:4px}
.cf-hist-bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%}
.cf-hist-fill{background:linear-gradient(180deg,#3b82f6,#1d4ed8);border-radius:3px 3px 0 0;min-height:2px;transition:height .3s}
.cf-hist-fill.neg{background:linear-gradient(180deg,#ef4444,#b91c1c)}
.cf-hist-fill.pos{background:linear-gradient(180deg,#10b981,#059669)}
.cf-hist-label{font-size:.55rem;color:var(--text-muted);text-align:center;margin-top:4px;white-space:nowrap}
.cf-scatter-wrap{position:relative;height:300px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:var(--radius-sm);overflow:visible;margin-bottom:22px}
.cf-scatter-plot{position:absolute;top:24px;right:36px;bottom:28px;left:44px;overflow:hidden;border-radius:4px}
.cf-scatter-dot{position:absolute;border-radius:50%;opacity:.85;cursor:pointer;transition:transform .15s,box-shadow .15s;transform:translate(-50%,-50%);z-index:2}
.cf-scatter-dot:hover{transform:translate(-50%,-50%) scale(1.6);opacity:1;z-index:6;box-shadow:0 0 10px rgba(255,255,255,0.25)}
.cf-scatter-grid{position:absolute;pointer-events:none;background:rgba(255,255,255,0.05);z-index:0}
.cf-scatter-grid-v{top:0;bottom:0;width:1px}
.cf-scatter-grid-h{left:0;right:0;height:1px}
.cf-scatter-tick{position:absolute;font-size:.55rem;color:var(--text-muted);pointer-events:none;font-variant-numeric:tabular-nums;z-index:1;white-space:nowrap}
.cf-scatter-tick-x{bottom:-16px;transform:translateX(-50%)}
.cf-scatter-tick-y{left:-4px;transform:translateX(-100%) translateY(50%);text-align:right}
.cf-scatter-axis{position:absolute;font-size:.58rem;color:var(--text-secondary);z-index:3;background:var(--surface);padding:0 4px;white-space:nowrap}
.cf-scatter-x{left:44px;bottom:2px}
.cf-scatter-y{top:2px;right:8px}
.cf-scatter-tip{position:absolute;left:50%;transform:translateX(-50%);background:#111827;border:1px solid rgba(255,255,255,0.2);color:#e5e7eb;font-size:.62rem;padding:6px 10px;border-radius:8px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s;z-index:30;box-shadow:0 4px 16px rgba(0,0,0,0.5);line-height:1.5}
.cf-scatter-tip.above{bottom:calc(100% + 6px)}
.cf-scatter-tip.below{top:calc(100% + 6px)}
.cf-scatter-dot:hover .cf-scatter-tip{opacity:1}
.cf-scatter-legend{position:absolute;left:48px;bottom:6px;display:flex;gap:8px;z-index:3;font-size:.55rem;color:var(--text-muted);background:rgba(15,23,42,0.85);padding:3px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.08)}
.cf-scatter-legend-item{display:flex;align-items:center;gap:3px}
.cf-scatter-legend-item i{width:8px;height:8px;border-radius:50%;display:inline-block}
.cf-note{font-size:.62rem;color:var(--text-muted);margin-top:8px;line-height:1.6}

/* \u{1F9ED} \u524D\u5BFC\u7B5B\u9009 \u89C6\u56FE\u6837\u5F0F */
.fwd-wrap{display:flex;flex-direction:column;gap:12px}
.fwd-env{padding:12px 14px;border-radius:var(--radius);font-size:13px;line-height:1.6}
.fwd-env-bull{background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.45);color:#34d399}
.fwd-env-bear{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.45);color:#f87171}
.fwd-env-na{background:rgba(148,163,184,.1);border:1px solid rgba(148,163,184,.4);color:#94a3b8}
.fwd-hint{padding:8px 14px;border-radius:var(--radius);font-size:12px;line-height:1.5;opacity:.9}
.fwd-hint-bull{background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.3);color:#34d399}
.fwd-hint-bear{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);color:#f87171}
.fwd-hint-na{background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.3);color:#94a3b8}
.fwd-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.fwd-stats{font-size:12px;color:var(--text-dim,#94a3b8)}
.fwd-tbl th{font-size:11px;padding:6px 8px;white-space:nowrap}
.fwd-tbl td{font-size:12px;padding:6px 8px;white-space:nowrap}
.fwd-acc td{background:rgba(16,185,129,.06)}
.fwd-avoid td{background:rgba(239,68,68,.08)}
.fwd-avoid .score{color:#f87171;font-weight:700}
.tag-low{background:rgba(16,185,129,.18);color:#34d399}
.tag-new{background:rgba(59,130,246,.18);color:#60a5fa}
.tag-watch{background:rgba(245,158,11,.18);color:#fbbf24}
.tag-fund{background:rgba(16,185,129,.18);color:#34d399}
.tag-danger{background:rgba(239,68,68,.25);color:#f87171}
.tag-noise{opacity:.35}
.fwd-foot{font-size:11px;padding-top:8px;border-top:1px solid var(--border,#ffffff22)}
.score{font-weight:700}
/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 UI \u589E\u5F3A\u5C42\uFF08\u7EAF\u89C6\u89C9\uFF0C\u4E0D\u52A8\u903B\u8F91\uFF09\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
body{scrollbar-width:thin;scrollbar-color:rgba(148,163,184,.3) transparent}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(148,163,184,.25);border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:rgba(148,163,184,.45)}
#tabbar{position:sticky;top:0;z-index:100;background:linear-gradient(180deg,rgba(11,17,32,.97),rgba(11,17,32,.85));backdrop-filter:blur(12px);padding:10px 0 12px;border-bottom:1px solid rgba(255,255,255,.05)}
#tabbar .tab-btn{transition:transform .2s cubic-bezier(.4,0,.2,1),box-shadow .2s,border-color .2s,background .2s}
#tabbar .tab-btn:hover{transform:translateY(-2px);box-shadow:0 4px 14px rgba(59,130,246,.25)}
#tabbar .tab-btn.active{transform:translateY(-1px)}
.tab-btn{transition:transform .2s cubic-bezier(.4,0,.2,1),box-shadow .2s,border-color .2s,background .2s}
.tab-btn:hover{transform:translateY(-2px);box-shadow:0 4px 14px rgba(59,130,246,.2)}
.tab-btn.active{box-shadow:0 0 20px rgba(59,130,246,.3)}
table{animation:fadeIn .3s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
tr{transition:background .15s}
tbody tr:hover td{background:rgba(59,130,246,.06)!important}
th{background:#141a26;user-select:none}
th.sortable:hover{color:#60a5fa}
.btn{transition:transform .15s,box-shadow .2s,border-color .2s,background .2s}
.btn:hover{transform:translateY(-1px);box-shadow:0 3px 10px rgba(59,130,246,.25)}
.btn:active{transform:translateY(0) scale(.97)}
.btn-sm{transition:transform .15s,background .15s}
.btn-sm:hover{transform:scale(1.05)}
.fwd-env,.fwd-hint{transition:opacity .3s}
.status-bar{animation:fadeIn .3s ease}
.app-header{animation:fadeIn .4s ease}
.kpi-card{transition:transform .2s,box-shadow .2s,border-color .2s}
.kpi-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.35)}
.filter-card{transition:border-color .2s,box-shadow .2s}
.filter-card:hover{border-color:rgba(59,130,246,.35);box-shadow:0 2px 12px rgba(59,130,246,.08)}
.preset-btn{transition:transform .2s,filter .2s,box-shadow .2s}
.preset-btn:hover{transform:translateY(-2px) scale(1.02);filter:brightness(1.15)}
.tag,.sig-badge,.cf-stat-chip{transition:transform .15s}
.tag:hover,.sig-badge:hover,.cf-stat-chip:hover{transform:scale(1.08)}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head><body>
<div id="tabbar"><button class="tab-btn tab-chip active" onclick="switchTab('chip')">\u{1F9F2} \u7B79\u7801\u7B5B\u9009</button><button class="tab-btn tab-demon" onclick="switchTab('demon')">\u{1F47A} \u5996\u5E01\u626B\u63CF</button><button class="tab-btn tab-coinfilter" onclick="switchTab('coinfilter')">\u{1FA99} \u5C0F\u5E01\u7B5B\u9009</button><button class="tab-btn tab-forward" onclick="switchTab('forward')">\u{1F9ED} \u524D\u5BFC\u7B5B\u9009</button><button class="tab-btn tab-watchlist" onclick="switchTab('watchlist')">\u{1F9ED} \u7B5B\u5E01\u5DE5\u4F5C\u53F0</button></div>
<div id="root"><div class="loading-root"><div class="spinner"></div><div class="loading-text">\u6B63\u5728\u52A0\u8F7D\u6570\u636E...</div></div></div>
<script>
var BASE = (window.location.pathname || "/").replace(//+$/, "");
var fd = [], fl = [], sc = "star_rating", sa = false, pa = "";
var lu = "", mcMin = null, mcMax = null, crMin = null, crMax = null, mA = null, mR = null;
var hasMC = false, hasCR = false, hasP7 = false, hasBybit = false;
function lX(){var x=new XMLHttpRequest();x.open("GET",BASE+"/api/data",true);
x.onload=function(){try{var d=JSON.parse(x.responseText);if(d.error&&!d.data)throw Error(d.error);
fd=d.data||[];lu=d.updated||"";fl=[].concat(fd);detectFlags();rD();}catch(e){sE(e.message);}};
x.onerror=function(){sE("\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25");};x.timeout=15000;x.send();}
function sE(m){document.getElementById("root").innerHTML="<div class="empty-msg">\u52A0\u8F7D\u5931\u8D25: "+m+"<br><br><button class="btn" onclick="load()">\u91CD\u8BD5</button></div>";}
function detectFlags(){hasMC=false;hasCR=false;hasP7=false;hasBybit=false;
var n=Math.min(fd.length,100);for(var i=0;i<n;i++){var r=fd[i];if(r.market_cap!=null)hasMC=true;
if(r.circulating_ratio!=null)hasCR=true;if(r.percent_change_7d!=null)hasP7=true;
if(r.price!=null||r.volume_24h_usdt!=null)hasBybit=true;if(hasMC&&hasCR&&hasP7&&hasBybit)break;}}
function gV(v,d){return v!=null?v:d;}
async function load(){try{var re=await fetch(BASE+"/api/data");var d=await re.json();
if(d.error&&!d.data)throw Error(d.error);fd=d.data||[];lu=d.updated||"";fl=[].concat(fd);detectFlags();rD();
}catch(e){console.warn(e);lX();}}
function setP(p){pa=p;if(p==="A"){mcMin=hasMC?15:null;mcMax=hasMC?100:null;crMin=0;crMax=30;mA=0;mR=null;}
else if(p==="B"){mcMin=hasMC?15:null;mcMax=hasMC?50:null;crMin=98;crMax=100;mA=0;mR=null;}sS();aF();}
function sS(){
var mcP=document.getElementById("mcap-panel"),crP=document.getElementById("cr-panel");if(mcP)mcP.style.display=hasMC?"block":"none";if(crP)crP.style.display=hasCR?"block":"none";
var mAmp=document.getElementById("amp-panel");if(mAmp)mAmp.style.display=hasBybit?"block":"none";var r7p=document.getElementById("r7-panel");if(r7p)r7p.style.display=hasP7?"block":"none";
var pA=document.getElementById("preset-a"),pB=document.getElementById("preset-b");if(pA)pA.style.display=hasMC?"":"none";if(pB)pB.style.display=(hasMC&&hasCR)?"":"none";
function g(i){return document.getElementById(i);}
if(hasMC&&g("mcap-min")){g("mcap-min").value=gV(mcMin,15);g("mcap-max").value=gV(mcMax,500000);if(g("mcap-min-i"))g("mcap-min-i").value=gV(mcMin,15);if(g("mcap-max-i"))g("mcap-max-i").value=gV(mcMax,500000);}
if(hasCR&&g("cr-min")){g("cr-min").value=gV(crMin,0);g("cr-max").value=gV(crMax,100);if(g("cr-min-i"))g("cr-min-i").value=gV(crMin,0);if(g("cr-max-i"))g("cr-max-i").value=gV(crMax,100);}
if(g("amp"))g("amp").value=gV(mA,0);if(g("r7"))g("r7").value=gV(mR,-100);if(g("amp-i"))g("amp-i").value=gV(mA,0);if(g("r7-i"))g("r7-i").value=gV(mR,-100);}
function aF(){var c1=gV(crMin,0)/100,c2=gV(crMax,100)/100;var mn=hasMC&&mcMin!=null?mcMin*1e6:0,mx=hasMC&&mcMax!=null?mcMax*1e6:5e14;var am=gV(mA,0),r7=gV(mR,-100);
fl=fd.filter(function(r){if(hasMC&&mcMin!=null&&(r.market_cap==null||r.market_cap<mn||r.market_cap>mx))return false;
if(hasCR&&crMin!=null){var cr=r.circulating_ratio!=null?r.circulating_ratio:1;if(cr<c1||cr>c2)return false;}
if(mA!=null&&(r.amplitude_24h_pct||0)<am)return false;if(mR!=null&&(r.percent_change_7d||-999)<r7)return false;return true;});
if(pa==="A"){fl.sort(function(a,b){return (a.circulating_ratio||1)-(b.circulating_ratio||1);});
}else if(pa==="B"){fl.sort(function(a,b){return (b.percent_change_7d||-999)-(a.percent_change_7d||-999);});
}else{fl.sort(function(a,b){var av=a[sc]||0,bv=b[sc]||0;return sa?av>bv?1:-1:av<bv?1:-1;});}rD();}
function ap(){function g(i){return document.getElementById(i);}
if(hasMC&&g("mcap-min")){mcMin=+g("mcap-min").value;mcMax=+g("mcap-max").value;if(g("mcap-min-i"))g("mcap-min-i").value=Math.round(mcMin);if(g("mcap-max-i"))g("mcap-max-i").value=Math.round(mcMax);}
if(hasCR&&g("cr-min")){crMin=+g("cr-min").value;crMax=+g("cr-max").value;if(g("cr-min-i"))g("cr-min-i").value=crMin;if(g("cr-max-i"))g("cr-max-i").value=crMax;}
mA=+g("amp").value;mR=+g("r7").value;if(g("amp-i"))g("amp-i").value=mA;if(g("r7-i"))g("r7-i").value=mR;aF();}
function oIC(g){function h(i){return document.getElementById(i);}
if(g==="mcap"&&hasMC){var mn=+h("mcap-min-i").value||15,mx=+h("mcap-max-i").value||5e5;if(mn>mx){var t=mn;mn=mx;mx=t;}if(mn<1)mn=1;mcMin=mn;mcMax=mx;if(h("mcap-min"))h("mcap-min").value=mn;if(h("mcap-max"))h("mcap-max").value=mx;
}else if(g==="cr"&&hasCR){var mn=+h("cr-min-i").value||0,mx=+h("cr-max-i").value||100;if(mn>mx){var t=mn;mn=mx;mx=t;}if(mn<0)mn=0;if(mx>100)mx=100;crMin=mn;crMax=mx;if(h("cr-min"))h("cr-min").value=mn;if(h("cr-max"))h("cr-max").value=mx;
}else if(g==="amp"){mA=Math.min(Math.max(+h("amp-i").value||0,0),100);if(h("amp"))h("amp").value=mA;}
else if(g==="r7"){mR=Math.max(+h("r7-i").value||-100,-100);if(mR>500)mR=500;if(h("r7"))h("r7").value=mR;}
sS();aF();}
function srt(c){if(sc===c)sa=!sa;else{sc=c;sa=false;}pa="";aF();}
function rD(){
var el=document.getElementById("root");
var p7=fl.filter(function(r){return (r.percent_change_7d||-999)>0;}).length;
var pp=fl.length>0&&hasP7?(p7/fl.length*100).toFixed(1):"--";
var as=fl.length>0&&hasMC?(fl.reduce(function(s,r){return s+(r.star_rating||0);},0)/fl.length).toFixed(2):"--";
var an=fl.filter(function(r){return r.momentum_alert;}).length;
var us=lu?new Date(lu).toLocaleString("zh-CN"):"--";
var rows="";
for(var i=0;i<fl.length;i++){var r=fl[i];
var cls=r.momentum_alert?"class="momentum"":r.star_rating>=5?"class="star5"":r.data_conflict?"class="conflict"":"";
rows+="<tr "+cls+"><td><b>"+e(r.symbol)+"</b></td><td>"+e(r.name||"")+"</td>";
if(hasBybit)rows+="<td>"+fP(r.price)+"</td>";
rows+="<td>"+fL(r.market_cap)+"</td><td>"+(r.data_conflict&&r.cg_ratio!=null?"<span class='dual-ratio'>"+fR(r.circulating_ratio)+" <span class='cr-cg'>CG:"+fR(r.cg_ratio)+"</span></span>":fR(r.circulating_ratio))+"</td><td>"+fC(r.percent_change_7d)+"</td>";
if(hasBybit){rows+="<td class="col-24h">"+fC(r.change_24h_pct)+"</td><td class="col-24h">"+fC(r.amplitude_24h_pct)+"</td><td class="col-24h">"+fL(r.volume_24h_usdt)+"</td>";}
rows+="<td>"+(r.data_conflict?"<span class="star-conflict">":"")+fS(r.star_rating)+(r.data_conflict?"</span>":"")+"</td><td>"+e(r.unlock_risk)+"</td><td>"+(r.data_conflict?"<span class="conflict-badge" title="CMC\u6D41\u901A\u7387"+fR(r.circulating_ratio)+", CoinGecko\u6D41\u901A\u7387"+fR(r.cg_ratio)+", \u504F\u5DEE"+(r.discrepancy_pct||0)+"%">\u26A0\uFE0F "+r.discrepancy_pct+"%</span>":"")+(r.stale_cg_data?"<span class="stale-badge" title="CoinGecko\u6570\u636E\u53EF\u80FD\u8FC7\u65F6(\u6D41\u901A\u7387"+fR(r.cg_ratio)+"\u660E\u663E\u4F4E\u4E8ECMC"+fR(r.circulating_ratio)+")">CG\u8FC7\u65F6</span>":"")+"</td></tr>";}
var H="<div class="app-header"><h1>\u7B79\u7801\u771F\u7A7A \xB7 \u4EE3\u5E01\u7B5B\u9009\u5668</h1>";
if(hasMC&&!hasBybit)H+="<p style="color:#60a5fa">\u6570\u636E\u6765\u6E90: CoinMarketCap \u5E02\u503C/\u6D41\u901A/\u7D20\u6750 \xB7 Bybit \u5B9E\u65F6\u4EF7\u683C\u672A\u8FDE\u63A5\uFF0C24h \u6570\u636E\u4E3A N/A</p>";
else if(hasBybit)H+="<p>\u5C0F\u8D44\u91D1\u767E\u500D\u6F5C\u529B\u6316\u6398 &mdash; \u6570\u636E\u6E90: Bybit + CoinMarketCap</p>";
else H+="<p>\u5C0F\u8D44\u91D1\u767E\u500D\u6F5C\u529B\u6316\u6398</p>";
H+="</div>";
if(hasMC&&!hasBybit)H+="<div class="info-banner">\u26A0\uFE0F Bybit API \u672A\u8FDE\u901A\uFF0C\u4EF7\u683C\u300124h\u6DA8\u8DCC\u3001\u632F\u5E45\u3001\u4EA4\u6613\u91CF\u6570\u636E\u4E0D\u53EF\u7528\u3002\u5DF2\u663E\u793A CoinMarketCap \u5E02\u503C\u3001\u6D41\u901A\u7387\u30017\u65E5\u6DA8\u8DCC\u53CA\u661F\u7EA7\u8BC4\u5206\u3002\u5C3D\u5FEB\u8FDE\u63A5 Bybit \u540E\u53EF\u83B7\u53D6\u5B8C\u6574\u6570\u636E\u3002</div>";
else if(!hasMC&&hasBybit)H+="<div class="info-banner warn">\u26A0\uFE0F CMC/CoinGecko API \u672A\u8FDE\u63A5\uFF0C\u4EC5\u663E\u793A Bybit \u4EA4\u6613\u6570\u636E\uFF0C\u65E0\u5E02\u503C\u3001\u6D41\u901A\u7387\u8BC4\u5206</div>";
var sbCls=hasMC?"ok":"warn";
H+="<div class="status-bar "+sbCls+""><span>\u5168\u90E8\u53EF\u4EA4\u6613 "+fd.length+" \xB7 \u7B5B\u9009\u547D\u4E2D "+fl.length+"</span><span>\u66F4\u65B0 "+us+"</span></div>";
H+="<div class="layout"><div class="sidebar"><div class="preset-row">";
H+="<button id="preset-a" class="preset-btn preset-a" onclick="setP('A')" style="display:none">\u7A92\u606F\u6D41 A</button>";
H+="<button id="preset-b" class="preset-btn preset-b" onclick="setP('B')" style="display:none">\u5168\u6D41\u901A B</button></div>";
H+="<button class="btn" style="width:100%;margin-bottom:6px;background:linear-gradient(135deg,#475569,#334155)" onclick="cP()">\u6E05\u9664\u7B5B\u9009</button>";
H+="<div id="mcap-panel" class="filter-card"><div class="label">\u5E02\u503C (\u767E\u4E07$)</div><div class="input-row"><input type="number" id="mcap-min-i" class="filter-input" value="15" min="1" max="500000" onchange="oIC('mcap')" step="1"><span class="range-sep">~</span><input type="number" id="mcap-max-i" class="filter-input" value="500000" min="1" onchange="oIC('mcap')" step="1"></div><input type="range" id="mcap-min" min="1" max="5000" value="15" oninput="ap()"><input type="range" id="mcap-max" min="1" max="500000" value="500000" oninput="ap()"></div>";
H+="<div id="cr-panel" class="filter-card"><div class="label">\u6D41\u901A\u7387 (%)</div><div class="input-row"><input type="number" id="cr-min-i" class="filter-input" value="0" min="0" max="100" onchange="oIC('cr')" step="1"><span class="range-sep">~</span><input type="number" id="cr-max-i" class="filter-input" value="100" min="0" max="100" onchange="oIC('cr')" step="1"></div><input type="range" id="cr-min" min="0" max="100" value="0" oninput="ap()"><input type="range" id="cr-max" min="0" max="100" value="100" oninput="ap()"></div>";
H+="<div id="amp-panel" class="filter-card"><div class="label">\u632F\u5E45</div><div style="font-size:.75rem;color:var(--text-muted)">\u6700\u4F4E 24h \u632F\u5E45 (%)</div><div class="input-row" style="margin-bottom:2px"><input type="number" id="amp-i" class="filter-input" value="0" min="0" max="100" onchange="oIC('amp')" step="1"></div><input type="range" id="amp" min="0" max="100" value="0" oninput="ap()"></div>";
H+="<div id="r7-panel" class="filter-card"><div class="label">7\u65E5\u6DA8\u8DCC</div><div style="font-size:.75rem;color:var(--text-muted)">\u6700\u4F4E 7\u65E5\u6DA8\u8DCC (%)</div><div class="input-row" style="margin-bottom:2px"><input type="number" id="r7-i" class="filter-input" value="-100" min="-100" max="500" onchange="oIC('r7')" step="1"></div><input type="range" id="r7" min="-100" max="500" value="-100" oninput="ap()"></div>";
H+="<button class="refresh-btn" onclick="rf()">\u5237\u65B0\u6570\u636E</button><div style="font-size:.6rem;color:var(--text-muted);text-align:center;margin-top:8px;letter-spacing:.2px">\u6570\u636E\u6BCF5\u5206\u949F\u81EA\u52A8\u66F4\u65B0</div></div>";
H+="<div class="main"><div class="kpi-row">";
H+="<div class="kpi-card"><div class="kpi-label">\u5168\u90E8</div><div class="kpi-value">"+fd.length+"</div></div>";
H+="<div class="kpi-card"><div class="kpi-label">\u547D\u4E2D</div><div class="kpi-value">"+fl.length+"</div></div>";
H+="<div class="kpi-card"><div class="kpi-label">7\u65E5\u6B63\u6536\u76CA</div><div class="kpi-value">"+pp+"</div></div>";
H+="<div class="kpi-card"><div class="kpi-label">\u5E73\u5747\u6F5C\u529B</div><div class="kpi-value">"+as+"</div></div>";
if(hasBybit)H+="<div class="kpi-card"><div class="kpi-label">\u4E3B\u529B\u4FE1\u53F7</div><div class="kpi-value">"+an+"</div></div>";
H+="</div>";
H+="<div class="table-wrap"><div class="table-title">\u7B5B\u9009\u7ED3\u679C <span style="font-weight:400;font-size:.7rem;color:var(--text-muted);margin-left:8px">\u70B9\u51FB\u8868\u5934\u6392\u5E8F</span></div><div class="table-scroll"><table><thead><tr>";
H+="<th onclick="srt('symbol')">\u4EA4\u6613\u5BF9</th><th onclick="srt('name')">\u540D\u79F0</th>";
if(hasBybit)H+="<th onclick="srt('price')">\u4EF7\u683C</th>";
H+="<th onclick="srt('market_cap')">\u6D41\u901A\u5E02\u503C</th><th onclick="srt('circulating_ratio')">\u6D41\u901A\u7387</th><th onclick="srt('percent_change_7d')">7\u65E5</th>";
if(hasBybit){H+="<th onclick="srt('change_24h_pct')">24h</th><th onclick="srt('amplitude_24h_pct')">\u632F\u5E45</th><th onclick="srt('volume_24h_usdt')">\u4EA4\u6613\u91CF</th>";}
H+="<th onclick="srt('star_rating')">\u6F5C\u529B</th><th>\u89E3\u9501</th><th title="CMC\u4E0ECoinGecko\u6D41\u901A\u7387\u504F\u5DEE\u8D85\u8FC730%\u6807\u7EA2">\u6570\u636E</th></tr></thead><tbody>";
var nCols=hasBybit?12:8;H+=rows||'<tr><td colspan="'+nCols+'" class="empty-msg">\u65E0\u5339\u914D\u7ED3\u679C</td></tr>';
H+="</tbody></table></div></div>";
H+="<div class="calc-card"><h3>\u8D44\u91D1\u5206\u914D\u5668</h3><p style="font-size:.75rem;color:var(--text-muted);margin-bottom:8px">\u6309\u8BC4\u5206\u5206\u914D\u672C\u91D1\u81F3\u6700\u4F73 N \u4E2A\u6807\u7684</p><div class="calc-row"><input type="number" id="capital" value="1000" min="10" oninput="cf()"><input type="number" id="npos" value="5" min="1" oninput="cf()"></div><div id="calc-result"></div></div>";
H+="</div></div><div class="footer">\u26A0\uFE0F \u4EC5\u4F9B\u7814\u7A76\u53C2\u8003\uFF0C\u4E0D\u6784\u6210\u6295\u8D44\u5EFA\u8BAE<br>\u6700\u540E\u66F4\u65B0 "+us+"</div>";
el.innerHTML=H;sS();cf();}
function cP(){pa="";mcMin=null;mcMax=null;crMin=null;crMax=null;mA=null;mR=null;sS();aF();}
async function rf(){try{await fetch(BASE+"/api/refresh",{method:"POST"});}catch(e){}load();}
function cf(){if(!hasBybit){var el=document.getElementById("calc-result");if(el)el.innerHTML="<div class="calc-result" style="color:var(--text-muted)">\u7F3A\u5C11\u4EF7\u683C\u6570\u636E\uFF0C\u8FDE\u63A5Bybit\u540E\u53EF\u542F\u7528\u8D44\u91D1\u5206\u914D\u5668</div>";return;}var el=document.getElementById("calc-result");if(!el)return;
var cap=+document.getElementById("capital").value||1000;var np=+document.getElementById("npos").value||5;
var top=fl.concat().sort(function(a,b){if(b.star_rating!==a.star_rating)return b.star_rating-a.star_rating;return (a.circulating_ratio||1)-(b.circulating_ratio||1);}).slice(0,np);
if(top.length===0){el.innerHTML="";return;}var al=cap/top.length;
var hh="<div class="calc-result">\u5747\u4ED3: $"+cap.toLocaleString()+" \u2192 "+top.length+" \u4E2A \u2192 \u6BCF\u4E2A $"+al.toFixed(2)+"</div><table><thead><tr><th>\u6807\u7684</th><th>\u4EF7\u683C</th><th>\u5206\u914D</th><th>\u6570\u91CF</th><th>\u6F5C\u529B</th></tr></thead><tbody>";
for(var i=0;i<top.length;i++){var r=top[i];var q=r.price>0?al/r.price:0;
hh+="<tr><td>"+e(r.symbol)+"</td><td>"+fP(r.price)+"</td><td>$"+al.toFixed(2)+"</td><td>"+q.toFixed(6)+"</td><td>"+fS(r.star_rating)+"</td></tr>";}
hh+="</tbody></table>";el.innerHTML=hh;}
function e(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function fP(v){if(v==null)return "N/A";if(v<0.001)return "$"+v.toFixed(8);if(v<1)return "$"+v.toFixed(4);return "$"+v.toFixed(2);}
function fL(v){if(v==null)return "N/A";return "$"+Number(v).toLocaleString("en-US",{maximumFractionDigits:0});}
function fC(v){if(v==null)return "N/A";return (v>=0?"+":"")+Number(v).toFixed(2)+"%";}
function fR(v){if(v==null)return "N/A";return (v*100).toFixed(1)+"%";}
function fS(v){return ["\u2606","\u2605\u2606\u2606\u2606\u2606","\u2605\u2605\u2606\u2606\u2606","\u2605\u2605\u2605\u2606\u2606","\u2605\u2605\u2605\u2605\u2606","\u2605\u2605\u2605\u2605\u2605"][Math.min(v||0,5)]||"\u2606";}
load();
<\/script><script>
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u5996\u5E01\u626B\u63CF\u5668 \u89C6\u56FE\uFF08\u57FA\u4E8E @derrrrrrrq \u65B9\u6CD5\u8BBA\uFF1A\u6362\u624B\u9AD8 / \u6DA8\u5E45\u5927 / OI\u4F4E\uFF09
// \u6838\u5FC3\u6307\u6807\uFF1A\u989D/OI\u6BD4 = 24h\u6210\u4EA4\u989D / OI\u4EF7\u503C\uFF08\u6324\u538B\u7A7A\u95F4\uFF09
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

// \u2500\u2500 \u4ED6\u63A8\u6587\u4E2D\u63D0\u8FC7\u7684 25 \u4E2A\u5E01 \u2500\u2500
var DEMON_MENTIONED = ['SIREN','RAVE','STO','LAB','TRADOOR','BSB','ESPORTS','BANK','IDOL','UB','BILL','RIVER','PTB','ACE','SAHARA','VELVET','ALLO','BLUAI','AGT','NOM','PIPPIN','WLFI','RESOLV','USR','INX'];
var MENTIONED_DEFAULT = DEMON_MENTIONED.slice();
// \u4ECE API \u52A8\u6001\u52A0\u8F7D\u4ED6\u63D0\u8FC7\u7684\u5E01\u5217\u8868\uFF08\u65B0\u589E\u5408\u7EA6\u81EA\u52A8\u5305\u542B\uFF09
fetch('/api/mentioned').then(function(r){return r.json()}).then(function(d){if(d.ok&&Array.isArray(d.mentioned)&&d.mentioned.length>0){DEMON_MENTIONED=d.mentioned;CF_MENTIONED=d.mentioned}}).catch(function(){});

// \u2500\u2500 \u72B6\u6001 \u2500\u2500
var curTab = 'chip';
var demonData = [], demonUpdated = null, demonLoaded = false;
var dPreset = 'default', dQuery = '', dSort = 'ratio', dAsc = false;
var dVolMin = 0, dOiMax = 100000, dRatioMin = 0, dChgMin = -100, dChgMax = 100;

// \u2500\u2500 \u6302\u63A5\uFF1A\u73B0\u6709 rD() \u5728\u5996\u5E01 Tab \u4E0B\u6539\u4E3A\u6E32\u67D3\u5996\u5E01\u89C6\u56FE \u2500\u2500
var __chipRD = rD;
rD = function () {
  if (curTab === 'demon') { renderDemon(); return; }
  __chipRD();
};

function switchTab(t) {
  curTab = t;
  var tb = document.getElementById('tabbar');
  if (tb) {
    tb.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
    var btn = t === 'demon' ? tb.querySelector('.tab-demon') : tb.querySelector('.tab-chip');
    if (btn) btn.classList.add('active');
  }
  if (t === 'demon') {
    if (!demonLoaded) demonLoad(); else renderDemon();
  } else {
    __chipRD();
  }
}


// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u{1F9ED} \u524D\u5BFC\u7B5B\u9009\u5668 \u89C6\u56FE\uFF08\u57FA\u4E8E 2026-08-06 \u6570\u636E\u9A8C\u8BC1\u7ED3\u8BBA\uFF09
// \u9A8C\u8BC1\u7ED3\u8BBA\uFF1A
//   \u2460 \u989D/OI>5 \u4E8B\u4EF6\u65E5\u8FFD\u9AD8 = \u8D1F EV\uFF08\u4E09\u4E2A\u6708 4592 \u4E8B\u4EF6\uFF0Cfwd5 -1.7%\uFF09\u2192 \u53EA\u5F53\u56DE\u907F\u4FE1\u53F7
//   \u2461 \u84C4\u6C34\u4FE1\u53F7\uFF08OI 30\u5929\u5206\u4F4D\u4F4E + 60\u5929\u56DE\u64A4\u5927\uFF09edge \u662F\u6761\u4EF6\u6027\u7684\uFF1A
//      \u73AF\u5883\u5411\u4E0A +0.8%/\u80DC\u738756%\uFF0C\u73AF\u5883\u5411\u4E0B -5.3%/\u80DC\u738731% \u2192 \u73AF\u5883\u5F00\u5173\u662F\u7B2C\u4E00\u4F18\u5148
// \u6570\u636E: GET /api/forward\uFF08relay \u63A8\u9001\uFF1AOI\u5206\u4F4D/\u56DE\u64A4/\u6CE2\u52A8\u538B\u7F29/BTC\u73AF\u5883\uFF09
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u{1F9ED} \u524D\u5BFC\u7B5B\u9009\u5668 \u89C6\u56FE\uFF08\u57FA\u4E8E 2026-08-06 \u6570\u636E\u9A8C\u8BC1\u7ED3\u8BBA\uFF09
// \u9A8C\u8BC1\u7ED3\u8BBA\uFF1A
//   \u2460 \u989D/OI>5 \u4E8B\u4EF6\u65E5\u8FFD\u9AD8 = \u8D1F EV\uFF08\u4E09\u4E2A\u6708 4592 \u4E8B\u4EF6\uFF0Cfwd5 -1.7%\uFF09\u2192 \u53EA\u5F53\u56DE\u907F\u4FE1\u53F7
//   \u2461 \u84C4\u6C34\u4FE1\u53F7\uFF08OI 30\u5929\u5206\u4F4D\u4F4E + 60\u5929\u56DE\u64A4\u5927\uFF09edge \u662F\u6761\u4EF6\u6027\u7684\uFF1A
//      \u73AF\u5883\u5411\u4E0A +0.8%/\u80DC\u738756%\uFF0C\u73AF\u5883\u5411\u4E0B -5.3%/\u80DC\u738731% \u2192 \u73AF\u5883\u5F00\u5173\u662F\u7B2C\u4E00\u4F18\u5148
// \u6570\u636E: GET /api/forward\uFF08relay \u63A8\u9001\uFF1AOI\u5206\u4F4D/\u56DE\u64A4/\u6CE2\u52A8\u538B\u7F29/BTC\u73AF\u5883\uFF09
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u{1F9ED} \u524D\u5BFC\u7B5B\u9009\u5668 \u89C6\u56FE\uFF08\u57FA\u4E8E 2026-08-06 \u6570\u636E\u9A8C\u8BC1\u7ED3\u8BBA\uFF09
// \u9A8C\u8BC1\u7ED3\u8BBA\uFF1A
//   \u2460 \u989D/OI>5 \u4E8B\u4EF6\u65E5\u8FFD\u9AD8 = \u8D1F EV\uFF08\u4E09\u4E2A\u6708 4592 \u4E8B\u4EF6\uFF0Cfwd5 -1.7%\uFF09\u2192 \u53EA\u5F53\u56DE\u907F\u4FE1\u53F7
//   \u2461 \u84C4\u6C34\u4FE1\u53F7\uFF08OI 30\u5929\u5206\u4F4D\u4F4E + 60\u5929\u56DE\u64A4\u5927\uFF09edge \u662F\u6761\u4EF6\u6027\u7684\uFF1A
//      \u73AF\u5883\u5411\u4E0A +0.8%/\u80DC\u738756%\uFF0C\u73AF\u5883\u5411\u4E0B -5.3%/\u80DC\u738731% \u2192 \u73AF\u5883\u5F00\u5173\u662F\u7B2C\u4E00\u4F18\u5148
// \u6570\u636E: GET /api/forward\uFF08relay \u63A8\u9001\uFF1A\u5438\u7B79\u7ED3\u6784\u56E0\u5B50/BTC\u73AF\u5883\uFF09
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u{1F9ED} \u524D\u5BFC\u7B5B\u9009\u5668 \u89C6\u56FE\uFF08\u57FA\u4E8E 2026-08-06 \u6570\u636E\u9A8C\u8BC1\u7ED3\u8BBA\uFF09
// \u9A8C\u8BC1\u7ED3\u8BBA\uFF1A
//   \u2460 \u989D/OI>5 \u4E8B\u4EF6\u65E5\u8FFD\u9AD8 = \u8D1F EV\uFF08\u4E09\u4E2A\u6708 4592 \u4E8B\u4EF6\uFF0Cfwd5 -1.7%\uFF09\u2192 \u53EA\u5F53\u56DE\u907F\u4FE1\u53F7
//   \u2461 \u84C4\u6C34\u4FE1\u53F7\uFF08OI 30\u5929\u5206\u4F4D\u4F4E + 60\u5929\u56DE\u64A4\u5927\uFF09edge \u662F\u6761\u4EF6\u6027\u7684\uFF1A
//      \u73AF\u5883\u5411\u4E0A +0.8%/\u80DC\u738756%\uFF0C\u73AF\u5883\u5411\u4E0B -5.3%/\u80DC\u738731% \u2192 \u73AF\u5883\u5F00\u5173\u662F\u7B2C\u4E00\u4F18\u5148
// \u6570\u636E: GET /api/forward\uFF08relay \u63A8\u9001\uFF1A\u5438\u7B79\u7ED3\u6784\u56E0\u5B50/BTC\u73AF\u5883\uFF09
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u{1F9ED} \u524D\u5BFC\u7B5B\u9009\u5668 \u89C6\u56FE\uFF08\u57FA\u4E8E 2026-08-06 \u6570\u636E\u9A8C\u8BC1\u7ED3\u8BBA\uFF09
// \u9A8C\u8BC1\u7ED3\u8BBA\uFF1A
//   \u2460 \u989D/OI>5 \u4E8B\u4EF6\u65E5\u8FFD\u9AD8 = \u8D1F EV\uFF08\u4E09\u4E2A\u6708 4592 \u4E8B\u4EF6\uFF0Cfwd5 -1.7%\uFF09\u2192 \u53EA\u5F53\u56DE\u907F\u4FE1\u53F7
//   \u2461 \u84C4\u6C34\u4FE1\u53F7\uFF08OI 30\u5929\u5206\u4F4D\u4F4E + 60\u5929\u56DE\u64A4\u5927\uFF09edge \u662F\u6761\u4EF6\u6027\u7684\uFF1A
//      \u73AF\u5883\u5411\u4E0A +0.8%/\u80DC\u738756%\uFF0C\u73AF\u5883\u5411\u4E0B -5.3%/\u80DC\u738731% \u2192 \u73AF\u5883\u5F00\u5173\u662F\u7B2C\u4E00\u4F18\u5148
// \u6570\u636E: GET /api/forward\uFF08relay \u63A8\u9001\uFF1A\u5438\u7B79\u7ED3\u6784\u56E0\u5B50/BTC\u73AF\u5883\uFF09
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u{1F9ED} \u524D\u5BFC\u7B5B\u9009\u5668 \u89C6\u56FE\uFF08\u57FA\u4E8E 2026-08-06 \u6570\u636E\u9A8C\u8BC1\u7ED3\u8BBA\uFF09
// \u9A8C\u8BC1\u7ED3\u8BBA\uFF1A
//   \u2460 \u989D/OI>5 \u4E8B\u4EF6\u65E5\u8FFD\u9AD8 = \u8D1F EV\uFF08\u4E09\u4E2A\u6708 4592 \u4E8B\u4EF6\uFF0Cfwd5 -1.7%\uFF09\u2192 \u53EA\u5F53\u56DE\u907F\u4FE1\u53F7
//   \u2461 \u84C4\u6C34\u4FE1\u53F7\uFF08OI 30\u5929\u5206\u4F4D\u4F4E + 60\u5929\u56DE\u64A4\u5927\uFF09edge \u662F\u6761\u4EF6\u6027\u7684\uFF1A
//      \u73AF\u5883\u5411\u4E0A +0.8%/\u80DC\u738756%\uFF0C\u73AF\u5883\u5411\u4E0B -5.3%/\u80DC\u738731% \u2192 \u73AF\u5883\u5F00\u5173\u662F\u7B2C\u4E00\u4F18\u5148
// \u6570\u636E: GET /api/forward\uFF08relay \u63A8\u9001\uFF1A\u5438\u7B79\u7ED3\u6784\u56E0\u5B50/BTC\u73AF\u5883\uFF09
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u{1F9ED} \u524D\u5BFC\u7B5B\u9009\u5668 \u89C6\u56FE\uFF08\u57FA\u4E8E 2026-08-06 \u6570\u636E\u9A8C\u8BC1\u7ED3\u8BBA\uFF09
// \u9A8C\u8BC1\u7ED3\u8BBA\uFF1A
//   \u2460 \u989D/OI>5 \u4E8B\u4EF6\u65E5\u8FFD\u9AD8 = \u8D1F EV\uFF08\u4E09\u4E2A\u6708 4592 \u4E8B\u4EF6\uFF0Cfwd5 -1.7%\uFF09\u2192 \u53EA\u5F53\u56DE\u907F\u4FE1\u53F7
//   \u2461 \u84C4\u6C34\u4FE1\u53F7\uFF08OI 30\u5929\u5206\u4F4D\u4F4E + 60\u5929\u56DE\u64A4\u5927\uFF09edge \u662F\u6761\u4EF6\u6027\u7684\uFF1A
//      \u73AF\u5883\u5411\u4E0A +0.8%/\u80DC\u738756%\uFF0C\u73AF\u5883\u5411\u4E0B -5.3%/\u80DC\u738731% \u2192 \u73AF\u5883\u5F00\u5173\u662F\u7B2C\u4E00\u4F18\u5148
// \u6570\u636E: GET /api/forward\uFF08relay \u63A8\u9001\uFF1A\u5438\u7B79\u7ED3\u6784\u56E0\u5B50/BTC\u73AF\u5883\uFF09
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u{1F9ED} \u524D\u5BFC\u7B5B\u9009\u5668 \u89C6\u56FE\uFF08\u57FA\u4E8E 2026-08-06 \u6570\u636E\u9A8C\u8BC1\u7ED3\u8BBA\uFF09
// \u9A8C\u8BC1\u7ED3\u8BBA\uFF1A
//   \u2460 \u989D/OI>5 \u4E8B\u4EF6\u65E5\u8FFD\u9AD8 = \u8D1F EV\uFF08\u4E09\u4E2A\u6708 4592 \u4E8B\u4EF6\uFF0Cfwd5 -1.7%\uFF09\u2192 \u53EA\u5F53\u56DE\u907F\u4FE1\u53F7
//   \u2461 \u84C4\u6C34\u4FE1\u53F7\uFF08OI 30\u5929\u5206\u4F4D\u4F4E + 60\u5929\u56DE\u64A4\u5927\uFF09edge \u662F\u6761\u4EF6\u6027\u7684\uFF1A
//      \u73AF\u5883\u5411\u4E0A +0.8%/\u80DC\u738756%\uFF0C\u73AF\u5883\u5411\u4E0B -5.3%/\u80DC\u738731% \u2192 \u73AF\u5883\u5F00\u5173\u662F\u7B2C\u4E00\u4F18\u5148
// \u6570\u636E: GET /api/forward\uFF08relay \u63A8\u9001\uFF1A\u5438\u7B79\u7ED3\u6784\u56E0\u5B50/BTC\u73AF\u5883\uFF09
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u{1F9ED} \u524D\u5BFC\u7B5B\u9009\u5668 \u89C6\u56FE\uFF08\u57FA\u4E8E 2026-08-06 \u6570\u636E\u9A8C\u8BC1\u7ED3\u8BBA\uFF09
// \u9A8C\u8BC1\u7ED3\u8BBA\uFF1A
//   \u2460 \u989D/OI>5 \u4E8B\u4EF6\u65E5\u8FFD\u9AD8 = \u8D1F EV\uFF08\u4E09\u4E2A\u6708 4592 \u4E8B\u4EF6\uFF0Cfwd5 -1.7%\uFF09\u2192 \u53EA\u5F53\u56DE\u907F\u4FE1\u53F7
//   \u2461 \u84C4\u6C34\u4FE1\u53F7\uFF08OI 30\u5929\u5206\u4F4D\u4F4E + 60\u5929\u56DE\u64A4\u5927\uFF09edge \u662F\u6761\u4EF6\u6027\u7684\uFF1A
//      \u73AF\u5883\u5411\u4E0A +0.8%/\u80DC\u738756%\uFF0C\u73AF\u5883\u5411\u4E0B -5.3%/\u80DC\u738731% \u2192 \u73AF\u5883\u5F00\u5173\u662F\u7B2C\u4E00\u4F18\u5148
// \u6570\u636E: GET /api/forward\uFF08relay \u63A8\u9001\uFF1A\u5438\u7B79\u7ED3\u6784\u56E0\u5B50/BTC\u73AF\u5883\uFF09
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

if (typeof curTab === 'undefined') var curTab = 'chip';
var forwardData = [], forwardUpdated = null, forwardEnv = null, forwardLoaded = false;
var fwdAutoTimer = null;

// \u2500\u2500 \u81EA\u52A8\u5237\u65B0\uFF1A\u6BCF 5 \u5206\u949F\u91CD\u65B0\u62C9\u53D6\u6570\u636E\u5E76\u91CD\u6E32\u67D3\uFF08VPS cron \u6BCF 15 \u5206\u949F\u66F4\u65B0\u6570\u636E\uFF09\u2500\u2500
function fwdStartAutoRefresh() {
  if (fwdAutoTimer) return;
  fwdAutoTimer = setInterval(function () {
    if (curTab !== 'forward') return; // \u4E0D\u5728\u524D\u5BFC tab \u65F6\u8DF3\u8FC7
    fetch(BASE + '/api/forward').then(function (r) { return r.json(); }).then(function (d) {
      var coins = d.data || [];
      if (!coins.length) return;
      forwardData = coins;
      forwardUpdated = d.updated || forwardUpdated;
      if (curTab === 'forward') renderForward();
    }).catch(function () { /* \u9759\u9ED8\u5931\u8D25\uFF0C\u4E0B\u6B21\u518D\u8BD5 */ });
  }, 300000); // 5 \u5206\u949F
}
var fSort = 'forward_score', fAsc = false, fTag = '', fMinScore = 0;
// OI \u8303\u56F4\u81EA\u5B9A\u4E49\uFF08\u5BA2\u6237\u7AEF\u8FC7\u6EE4\uFF0C\u9ED8\u8BA4\u4E0D\u8BBE\u9650 = \u5168\u5E02\u573A\uFF0C\u903B\u8F91\u4E0D\u53D8\uFF09
var fwdOiMin = null, fwdOiMax = null;

// \u2500\u2500 \u6302\u63A5 Tab \u5207\u6362\uFF08\u4E0E _coinfilter.js \u540C\u6A21\u5F0F\uFF0C\u94FE\u5F0F\u8C03\u7528\uFF09\u2500\u2500
var __fwdSwitchTab = (typeof switchTab === 'function') ? switchTab : null;
switchTab = function (t) {
  if (t === 'forward') {
    curTab = t;
    var tb = document.getElementById('tabbar');
    if (tb) {
      tb.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      var btn = tb.querySelector('.tab-forward');
      if (btn) btn.classList.add('active');
    }
    if (!forwardLoaded) forwardLoad(); else renderForward();
    return;
  }
  if (__fwdSwitchTab) { __fwdSwitchTab(t); return; }
  if (t === 'demon' && typeof renderDemon === 'function') { renderDemon(); return; }
  if (typeof rD === 'function') rD();
};

var __fwdRD = (typeof rD === 'function') ? rD : null;
rD = function () {
  if (curTab === 'forward') { renderForward(); return; }
  if (__fwdRD) __fwdRD();
};

// \u2500\u2500 \u6570\u636E\u52A0\u8F7D \u2500\u2500
function forwardLoad() {
  var root = document.getElementById('root');
  root.innerHTML = '<div class="empty-msg">\u{1F9ED} \u6B63\u5728\u52A0\u8F7D\u524D\u5BFC\u7B5B\u9009\u6570\u636E\uFF08\u5438\u7B79\u7ED3\u6784/BTC\u73AF\u5883\uFF09...</div>';
  fetch(BASE + '/api/forward').then(function (r) { return r.json(); }).then(function (d) {
    var coins = d.data || [];
    if (d.error && !coins.length) throw new Error(d.error);
    if (!coins.length) throw new Error('forward \u6682\u65E0\u6570\u636E\uFF08relay \u53EF\u80FD\u672A\u914D\u7F6E /api/relay-forward\uFF09');
    forwardData = coins;
    forwardUpdated = d.updated || null;
    forwardEnv = d.env || null;
    forwardLoaded = true;
    fwdStartAutoRefresh();
    renderForward();
  }).catch(function (err) {
    root.innerHTML = '<div class="empty-msg">\u{1F9ED} \u524D\u5BFC\u6570\u636E\u52A0\u8F7D\u5931\u8D25: ' + e(err.message) + '<br><br><button class="btn" onclick="forwardLoad()">\u91CD\u8BD5</button></div>';
  });
}

function fwdReload() { forwardLoaded = false; forwardLoad(); }


// \u2500\u2500 \u7B5B\u9009/\u6392\u5E8F \u2500\u2500
function fwdFiltered() {
  var rows = forwardData.slice();
  if (fTag === 'acc') rows = rows.filter(function (r) { return r.signal === 'acc_candidate'; });
  else if (fTag === 'avoid') rows = rows.filter(function (r) { return r.volume_oi_ratio >= 5; });
  else if (fTag === 'watch') rows = rows.filter(function (r) { return r.signal === 'watch'; });
  // OI \u8303\u56F4\u8FC7\u6EE4\uFF08\u9ED8\u8BA4\u4E0D\u8BBE\u9650 = \u5168\u5E02\u573A\uFF09
  if (fwdOiMin != null) rows = rows.filter(function (r) { return (r.oi_value || 0) >= fwdOiMin; });
  if (fwdOiMax != null) rows = rows.filter(function (r) { return (r.oi_value || 0) <= fwdOiMax; });
  rows = rows.filter(function (r) { return (r.forward_score || 0) >= fMinScore; });
  rows.sort(function (a, b) {
    var va = a[fSort] || 0, vb = b[fSort] || 0;
    return fAsc ? va - vb : vb - va;
  });
  return rows;
}

// OI \u8303\u56F4\u63A7\u4EF6\uFF08\u4E0E\u7B5B\u5E01\u5DE5\u4F5C\u53F0\u540C\u6B3E\uFF09
function fwdSetOiRange() {
  var minEl = document.getElementById('fwd-oi-min');
  var maxEl = document.getElementById('fwd-oi-max');
  var minV = minEl ? parseFloat(minEl.value) : NaN;
  var maxV = maxEl ? parseFloat(maxEl.value) : NaN;
  fwdOiMin = !isNaN(minV) && minV > 0 ? minV * 1e6 : null;
  fwdOiMax = !isNaN(maxV) && maxV > 0 ? maxV * 1e6 : null;
  renderForward();
}
function fwdClearOiRange() {
  fwdOiMin = null; fwdOiMax = null;
  var minEl = document.getElementById('fwd-oi-min');
  var maxEl = document.getElementById('fwd-oi-max');
  if (minEl) minEl.value = '';
  if (maxEl) maxEl.value = '';
  renderForward();
}

function fwdSetPreset(tag) {
  fTag = tag;
  fMinScore = (tag === 'acc') ? 3 : 0;
  renderForward();
}

function fwdSortBy(k) {
  if (fSort === k) fAsc = !fAsc; else { fSort = k; fAsc = false; }
  renderForward();
}

function fwdTagHtml(r) {
  var tags = [];
  if (r.signal === 'acc_candidate') tags.push('<span class="tag tag-acc">\u{1F9ED}\u84C4\u6C34\u5019\u9009</span>');
  else if (r.signal === 'avoid_event') tags.push('<span class="tag tag-danger">\u26D4\u4E8B\u4EF6\u56DE\u907F</span>');
  else if (r.signal === 'watch') tags.push('<span class="tag tag-watch">\u{1F441}\u89C2\u5BDF</span>');
  else tags.push('<span class="tag tag-noise">\xB7</span>');
  if (r.drawdown_60d != null && r.drawdown_60d >= 0.40) tags.push('<span class="tag tag-low">\u6DF1\u5E95</span>');
  if (r.range_20d != null && r.range_20d < 0.30) tags.push('<span class="tag tag-low">\u6A2A\u76D8</span>');
  if (r.vol_shrink_20d != null && r.vol_shrink_20d < 0.20) tags.push('<span class="tag tag-low">\u7F29\u91CF</span>');
  if (r.breakout_consolidation) tags.push('<span class="tag tag-new">\u5927\u9633\u7EBF\u540E\u76D8\u6574</span>');
  if (r.spring_test) tags.push('<span class="tag tag-new">Spring\u6D4B\u8BD5</span>');
  if (r.funding_rate_pct != null && r.funding_rate_pct > 0.05) tags.push('<span class="tag tag-fund">\u{1F4B0}\u6B63\u8D39\u7387</span>');
  if (r.funding_rate_pct != null && r.funding_rate_pct < -0.05 && r.change_24h_pct > 0) tags.push('<span class="tag tag-danger">\u26D4\u8D1F\u8D39\u7387\u62C9\u76D8</span>');
  if (r.ret_10d != null && r.ret_10d >= -0.05 && r.ret_10d <= 0.15) tags.push('<span class="tag tag-watch">\u7F13\u6DA8</span>');
  if (r.vol_compress_5d != null && r.vol_compress_5d < 0.05) tags.push('<span class="tag tag-low">\u7F29\u6CE2</span>');
  if (r.days_since_listing != null && r.days_since_listing <= 180) tags.push('<span class="tag tag-new">\u65B0\u4E0A</span>');
  return tags.join(' ');
}

// \u2500\u2500 \u89C2\u5BDF\u6C60\u6807\u8BB0\uFF08localStorage\uFF09\u2500\u2500
function fwdWatchKey() { return 'fwd_watchlist'; }
function fwdGetWatch() {
  try { return JSON.parse(localStorage.getItem(fwdWatchKey()) || '{}'); } catch (e) { return {}; }
}
function fwdToggleWatch(sym) {
  var w = fwdGetWatch();
  if (w[sym]) delete w[sym]; else w[sym] = Date.now();
  try { localStorage.setItem(fwdWatchKey(), JSON.stringify(w)); } catch (e) {}
  renderForward();
}

// \u2500\u2500 BTC \u65B9\u5411\u63D0\u793A\uFF08\u4EC5\u5C55\u793A\uFF0C\u4E0D\u53C2\u4E0E\u8BC4\u5206/\u7B5B\u9009\uFF09\u2500\u2500
function fwdEnvHint() {
  var env = forwardEnv;
  if (!env || env.up == null) {
    return '<div class="fwd-hint fwd-hint-na">BTC \u65B9\u5411\uFF1A\u672A\u77E5\uFF08\u4EC5\u4F9B\u53C2\u8003\uFF0C\u4E0D\u5F71\u54CD\u7B5B\u9009\uFF09</div>';
  }
  if (env.up === true) {
    return '<div class="fwd-hint fwd-hint-bull">BTC \u65B9\u5411\uFF1A\u5411\u4E0A\uFF08BTC ' + fP(env.close) + ' &gt; SMA20 ' + fP(env.sma20) + '\uFF09\u2014 \u4EC5\u4F9B\u53C2\u8003\uFF0C\u4E0D\u53C2\u4E0E\u7B5B\u9009</div>';
  }
  return '<div class="fwd-hint fwd-hint-bear">BTC \u65B9\u5411\uFF1A\u5411\u4E0B\uFF08BTC ' + fP(env.close) + ' &lt; SMA20 ' + fP(env.sma20) + '\uFF09\u2014 \u4EC5\u4F9B\u53C2\u8003\uFF0C\u4E0D\u53C2\u4E0E\u7B5B\u9009</div>';
}

// \u2500\u2500 \u4E3B\u6E32\u67D3 \u2500\u2500
function renderForward() {
  var root = document.getElementById('root');
  var rows = fwdFiltered();
  var watch = fwdGetWatch();
  var accN = forwardData.filter(function (r) { return r.signal === 'acc_candidate'; }).length;
  var avoidN = forwardData.filter(function (r) { return r.volume_oi_ratio >= 5; }).length;
  var watchN = Object.keys(watch).length;

  var H = '<div class="fwd-wrap">';
  H += fwdEnvHint();
  H += '<div class="fwd-bar">';
  H += '<button class="btn' + (fTag === '' ? ' btn-active' : '') + '" onclick="fwdSetPreset('')">\u{1F3AF} \u5168\u90E8 (' + rows.length + ')</button>';
  H += '<button class="btn' + (fTag === 'acc' ? ' btn-active' : '') + '" onclick="fwdSetPreset('acc')">\u{1F9ED} \u84C4\u6C34\u5019\u9009 (' + accN + ')</button>';
  H += '<button class="btn' + (fTag === 'avoid' ? ' btn-active' : '') + '" onclick="fwdSetPreset('avoid')">\u26D4 \u56DE\u907F\u540D\u5355 (' + avoidN + ')</button>';
  H += '<button class="btn' + (fTag === 'watch' ? ' btn-active' : '') + '" onclick="fwdSetPreset('watch')">\u{1F441} \u89C2\u5BDF\u6C60 (' + watchN + ')</button>';
  H += '<span class="dim" style="margin-left:auto">\u66F4\u65B0: ' + (forwardUpdated ? new Date(forwardUpdated).toLocaleString() : '\u2014') + '</span>';
  H += '</div>';
  H += '<div class="fwd-bar" style="flex-wrap:wrap;gap:6px;align-items:center">';
  H += '<span class="dim">OI \u8303\u56F4 (USDT):</span>';
  H += '<input id="fwd-oi-min" type="number" placeholder="\u6700\u5C0F M" style="width:90px;padding:4px 6px;background:var(--surface-alt);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px" value="' + (fwdOiMin != null ? (fwdOiMin / 1e6) : '') + '" onkeydown="if(event.key===' + "'Enter'" + ')fwdSetOiRange()">';
  H += '<span class="dim">\u2014</span>';
  H += '<input id="fwd-oi-max" type="number" placeholder="\u6700\u5927 M" style="width:90px;padding:4px 6px;background:var(--surface-alt);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px" value="' + (fwdOiMax != null ? (fwdOiMax / 1e6) : '') + '" onkeydown="if(event.key===' + "'Enter'" + ')fwdSetOiRange()">';
  H += '<button class="btn btn-sm" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-weight:700" onclick="fwdSetOiRange()">\u2713 \u786E\u5B9A</button>';
  H += '<button class="btn btn-sm" onclick="fwdClearOiRange()">\u6E05\u9664</button>';
  H += '<span class="dim" id="fwd-oi-status">' + (fwdOiMin != null || fwdOiMax != null ? '\u{1F50D} \u5DF2\u8FC7\u6EE4 OI ' + (fwdOiMin != null ? (fwdOiMin/1e6) : '0') + 'M ~ ' + (fwdOiMax != null ? (fwdOiMax/1e6) : '\u221E') + 'M' : '\u672A\u8FC7\u6EE4\uFF08\u5168\u5E02\u573A\uFF09') + '</span>';
  H += '</div>';
  H += '<div class="fwd-stats">\u{1F9ED}\u5019\u9009 ' + accN + ' \xB7 \u26D4\u56DE\u907F ' + avoidN + ' \xB7 \u{1F441}\u5DF2\u6807\u8BB0 ' + watchN + '</div>';

  if (rows.length === 0) {
    H += '<div class="empty-msg">\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u5E01\u3002</div>';
  } else {
    H += '<div class="table-wrap"><table class="tbl fwd-tbl"><thead><tr>';
    H += '<th></th><th class="sortable" onclick="fwdSortBy('symbol')">\u5E01\u79CD</th>';
    H += '<th class="sortable" onclick="fwdSortBy('price')">\u4EF7\u683C</th>';
    H += '<th class="sortable" onclick="fwdSortBy('change_24h_pct')">24h%</th>';
    H += '<th class="sortable" onclick="fwdSortBy('oi_value')">OI($M)</th>';
    H += '<th class="sortable" onclick="fwdSortBy('volume_oi_ratio')">\u989D/OI</th>';
    H += '<th class="sortable" onclick="fwdSortBy('drawdown_60d')">\u56DE\u64A460d</th>';
    H += '<th class="sortable" onclick="fwdSortBy('range_20d')">\u6A2A\u76D820d</th>';
    H += '<th class="sortable" onclick="fwdSortBy('vol_shrink_20d')">\u7F29\u91CF</th>';
    H += '<th class="sortable" onclick="fwdSortBy('near_low_20d')">\u8DDD\u4F4E\u70B9</th>';
    H += '<th class="sortable" onclick="fwdSortBy('funding_rate_pct')">\u8D44\u8D39%</th>';
    H += '<th class="sortable" onclick="fwdSortBy('days_since_listing')">\u4E0A\u7EBF</th>';
    H += '<th class="sortable" onclick="fwdSortBy('forward_score')">\u8BC4\u5206</th>';
    H += '<th>\u4FE1\u53F7</th><th></th>';
    H += '</tr></thead><tbody>';
    rows.slice(0, 200).forEach(function (r) {
      var isAvoid = r.volume_oi_ratio >= 5;
      var rowCls = isAvoid ? 'fwd-avoid' : (r.signal === 'acc_candidate' ? 'fwd-acc' : '');
      var marked = !!watch[r.symbol];
      H += '<tr class="' + rowCls + '">';
      H += '<td>' + (marked ? '\u2705' : '') + '</td>';
      H += '<td class="mono">' + r.symbol.replace('USDT', '') + '</td>';
      H += '<td class="mono">' + fP(r.price) + '</td>';
      H += '<td class="' + (r.change_24h_pct >= 0 ? 'up' : 'down') + '">' + fC(r.change_24h_pct) + '</td>';
      H += '<td class="mono">' + (r.oi_value != null ? (r.oi_value / 1e6).toFixed(1) : '\u2014') + '</td>';
      H += '<td class="mono">' + (r.volume_oi_ratio != null ? r.volume_oi_ratio.toFixed(1) + 'x' : '\u2014') + '</td>';
      H += '<td class="mono">' + (r.drawdown_60d != null ? (r.drawdown_60d * 100).toFixed(0) + '%' : '\u2014') + '</td>';
      H += '<td class="mono">' + (r.range_20d != null ? (r.range_20d * 100).toFixed(0) + '%' : '\u2014') + '</td>';
      H += '<td class="mono">' + (r.vol_shrink_20d != null ? (r.vol_shrink_20d * 100).toFixed(0) + '%' : '\u2014') + '</td>';
      H += '<td class="mono">' + (r.near_low_20d != null ? r.near_low_20d.toFixed(2) : '\u2014') + '</td>';
      H += '<td class="mono">' + (r.funding_rate_pct != null ? r.funding_rate_pct.toFixed(3) + '%' : '\u2014') + '</td>';
      H += '<td class="mono">' + (r.days_since_listing != null ? r.days_since_listing + 'd' : '\u2014') + '</td>';
      H += '<td class="mono score">' + (r.forward_score != null ? r.forward_score : '\u2014') + '</td>';
      H += '<td>' + fwdTagHtml(r) + '</td>';
      H += '<td><button class="btn btn-sm" onclick="fwdToggleWatch('' + r.symbol + '')">' + (marked ? '\u53D6\u6D88' : '\u6807\u8BB0') + '</button></td>';
      H += '</tr>';
    });
    H += '</tbody></table></div>';
  }
  H += '<div class="fwd-foot dim">\u89C4\u5219\u6765\u6E90\uFF1A@derrrrrrrq \u63A8\u6587\u6821\u51C6\uFF082026-08-07\uFF09\u2014 \u2460\u989D/OI\u22655 \u662F\u56DE\u907F\u4FE1\u53F7\u4E0D\u662F\u5165\u573A\u4FE1\u53F7\uFF08\u9A8C\u8BC1 fwd5 -1.7%\uFF09\uFF1B\u2461\u5438\u7B79\u7ED3\u6784=\u6DF1\u5E95+\u6A2A\u76D8+\u7F29\u91CF+\u65E0\u65B0\u4F4E\uFF08dn10 3.3% vs \u5168\u5E02\u573A 9.7%\uFF09\uFF1B\u2462\u63A8\u6587\u7EF4\u5EA6\uFF1A\u8D77\u52BF\u524D\u6709\u5927\u9633\u7EBF\u540E\u76D8\u6574\u3001\u5438\u7B79\u671F\u4EF7\u683C\u7F13\u6DA8\u3001\u6709Spring\u6D4B\u8BD5\u66F4\u53EF\u4FE1\u3001OI 2M-8M \u662F\u751C\u871C\u533A\uFF1B\u2463dotyyds1234\u7EF4\u5EA6\uFF1A\u6B63\u8D44\u91D1\u8D39\u9AD8=\u5957\u5229\u8005\u805A\u96C6\u6709\u8089\u5403\uFF0C\u8D1F\u8D39\u7387+\u62C9\u76D8=\u63A7\u76D8\u505A\u7A7A\u6392\u9664\uFF1B\u2464\u73A9\u65B0\u4E0D\u73A9\u65E7\uFF1A\u6D3E\u53D1\u540E\u671F\u7684\u65E7\u5E01\u81EA\u52A8\u6392\u9664\uFF1B\u2465\u7EAF\u5C0F\u5E01\u7B5B\u9009\u5668\uFF08\u65E0 BTC \u73AF\u5883\u5F00\u5173\uFF09\u3002\u4EC5\u4F9B\u7814\u7A76\u53C2\u8003\uFF0C\u4E0D\u6784\u6210\u6295\u8D44\u5EFA\u8BAE\u3002</div>';
  H += '</div>';
  root.innerHTML = H;
}

function demonLoad() {
  var root = document.getElementById('root');
  root.innerHTML = '<div class="empty-msg">\u6B63\u5728\u52A0\u8F7D\u5996\u5E01\u6570\u636E (\u5E01\u5B89\u5408\u7EA6\u989D/OI)...</div>';
  fetch(BASE + '/api/demon').then(function (r) { return r.json(); }).then(function (d) {
    demonData = (d.data || []).map(function (r) {
      if (!r.oi_stage) {
        var oi = r.oi_value || 0;
        if (oi < 2e6) { r.oi_stage = 'accumulation'; r.oi_stage_label = '\u23F3\u84C4\u6C34'; }
        else if (oi < 8e6) { r.oi_stage = 'early_pump'; r.oi_stage_label = '\u{1F48E}\u5C0F\u5E01'; }
        else if (oi < 30e6) { r.oi_stage = 'pump'; r.oi_stage_label = '\u{1F680}\u62C9\u5347'; }
        else if (oi < 80e6) { r.oi_stage = 'mid'; r.oi_stage_label = '\u26A1\u4E2D\u671F'; }
        else { r.oi_stage = 'late_distribution'; r.oi_stage_label = '\u26D4\u5927\u540E\u671F'; }
      }
      return r;
    });
    demonUpdated = d.updated || null;
    demonLoaded = true;
    renderDemon();
  }).catch(function (err) {
    root.innerHTML = '<div class="empty-msg">\u5996\u5E01\u6570\u636E\u52A0\u8F7D\u5931\u8D25: ' + e(err.message) + '<br><br><button class="btn" onclick="demonLoad()">\u91CD\u8BD5</button></div>';
  });
}

// \u2500\u2500 \u6392\u5E8F\u5217\u6620\u5C04 \u2500\u2500
function demonSortKey() {
  return { ratio: 'volume_oi_ratio', vol: 'volume_24h_usdt', oi: 'oi_value', chg: 'change_24h_pct', count: 'trade_count' }[dSort] || 'volume_oi_ratio';
}

// \u2500\u2500 \u8FC7\u6EE4 + \u6392\u5E8F \u2500\u2500
function demonFiltered() {
  var q = (dQuery || '').toUpperCase().trim();
  var list = demonData.filter(function (r) {
    var vol = r.volume_24h_usdt || 0, oi = r.oi_value || 0, ratio = r.volume_oi_ratio || 0, chg = r.change_24h_pct || 0;
    if (dVolMin > 0 && vol < dVolMin * 1e6) return false;
    if (dOiMax < 100000 && oi > dOiMax * 1e6) return false;
    if (dRatioMin > 0 && ratio < dRatioMin) return false;
    if (chg < dChgMin || chg > dChgMax) return false;
    if (dPreset === 'tag' && DEMON_MENTIONED.indexOf(r.base_asset) < 0) return false;
    if (q && (r.symbol || '').indexOf(q) < 0 && (r.base_asset || '').indexOf(q) < 0) return false;
    return true;
  });
  var key = demonSortKey();
  list.sort(function (a, b) {
    var av = a[key] || 0, bv = b[key] || 0;
    return dAsc ? av - bv : bv - av;
  });
  return list;
}

function demonSetPreset(p) {
  dPreset = p;
  dVolMin = 0; dOiMax = 100000; dRatioMin = 0; dChgMin = -100; dChgMax = 100; dQuery = ''; dSort = 'ratio'; dAsc = false;
  if (p === 'squeeze') { dRatioMin = 8; dVolMin = 1; }
  else if (p === 'small') { dOiMax = 30; dSort = 'oi'; dAsc = true; }
  else if (p === 'pump') { dChgMin = 5; }
  else if (p === 'dump') { dChgMax = -5; }
  else if (p === 'tag') { dSort = 'vol'; }
  else if (p === 'all') { dSort = 'vol'; dVolMin = 0; dOiMax = 100000; dRatioMin = 0; dChgMin = -100; dChgMax = 100; }
  demonSyncInputs();
  renderDemon();
}

function demonSyncInputs() {
  var g = function (id) { return document.getElementById(id); };
  var set = function (id, v) { var el = g(id); if (el) el.value = v; };
  set('d-vol-min', dVolMin); set('d-oi-max', dOiMax); set('d-ratio-min', dRatioMin);
  set('d-chg-min', dChgMin); set('d-chg-max', dChgMax);
  set('d-vol-min-i', dVolMin); set('d-oi-max-i', dOiMax); set('d-ratio-min-i', dRatioMin);
  set('d-chg-min-i', dChgMin); set('d-chg-max-i', dChgMax);
  set('d-query', dQuery); set('d-sort', dSort);
  if (g('d-preset-' + dPreset)) {
    var all = document.querySelectorAll('.demon-preset');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
    g('d-preset-' + dPreset).classList.add('active');
  }
}

function demonApply() {
  var g = function (id) { return document.getElementById(id); };
  dVolMin = +g('d-vol-min').value || 0;
  dOiMax = +g('d-oi-max').value || 0;
  dRatioMin = +g('d-ratio-min').value || 0;
  var a = +g('d-chg-min').value, b = +g('d-chg-max').value;
  if (a > b) { var t = a; a = b; b = t; }
  dChgMin = a; dChgMax = b;
  dSort = g('d-sort').value; dQuery = g('d-query').value;
  dPreset = '';
  var all = document.querySelectorAll('.demon-preset');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
  demonSyncInputs();
  renderDemon();
}

function demonSortBy(k) {
  if (dSort === k) dAsc = !dAsc; else { dSort = k; dAsc = false; }
  demonSyncInputs();
  renderDemon();
}

// \u2500\u2500 \u4FE1\u53F7\u6807\u7B7E \u2500\u2500
function demonTags(r) {
  var t = [];
  var ratio = r.volume_oi_ratio || 0, oi = r.oi_value || 0, chg = r.change_24h_pct || 0;
  if (ratio > 8) t.push('<span class="sig-badge sig-squeeze">\u{1F525}\u6324\u538B\u7A7A\u95F4</span>');
  if (chg > 5) t.push('<span class="sig-badge sig-pump">\u{1F680}\u62C9\u5347</span>');
  if (chg < -5) t.push('<span class="sig-badge sig-dump">\u{1F4C9}\u6740\u591A</span>');
  if (DEMON_MENTIONED.indexOf(r.base_asset) >= 0) t.push('<span class="sig-badge sig-tag">\u{1F4CC}\u4ED6\u63D0\u8FC7</span>');
  if (oi > 0 && oi < 10e6) t.push('<span class="sig-badge sig-lowoi">\u4F4EOI</span>');
  if (oi > 100e6) t.push('<span class="sig-badge sig-higoi">\u26A0\u9AD8OI</span>');
  return t.join('');
}

// \u2500\u2500 \u56FE\u8868\uFF1A\u989D/OI\u6BD4 Top20 \u2500\u2500
function demonChartRatio(list) {
  var top = list.slice().sort(function (a, b) { return (b.volume_oi_ratio || 0) - (a.volume_oi_ratio || 0); }).slice(0, 20);
  var max = 1; top.forEach(function (r) { if ((r.volume_oi_ratio || 0) > max) max = r.volume_oi_ratio || 0; });
  var h = '';
  top.forEach(function (r) {
    var v = r.volume_oi_ratio || 0;
    h += '<div class="hbar-row"><span class="hbar-label">' + e(r.base_asset) + '</span><div class="hbar-track"><div class="hbar-fill" style="width:' + (v / max * 100) + '%"></div></div><span class="hbar-val">' + v.toFixed(1) + 'x</span></div>';
  });
  return h;
}

// \u2500\u2500 \u56FE\u8868\uFF1A\u6DA8\u5E45\u5206\u5E03\u76F4\u65B9\u56FE \u2500\u2500
function demonChartGain(list) {
  var b = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  list.forEach(function (r) {
    var c = r.change_24h_pct || 0;
    if (c < -40 || c > 40) return;
    var idx = Math.floor((c + 40) / 8);
    if (idx < 0) idx = 0; if (idx > 9) idx = 9;
    b[idx]++;
  });
  var max = 1; b.forEach(function (v) { if (v > max) max = v; });
  var h = '<div class="hist-wrap">';
  for (var i = 0; i < 10; i++) {
    var lo = -40 + i * 8;
    h += '<div class="hist-bar"><div class="hist-fill' + (lo + 4 < 0 ? ' neg' : '') + '" style="height:' + (b[i] / max * 100) + '%"></div><div class="hist-label">' + (lo >= 0 ? '+' : '') + lo + '%</div></div>';
  }
  h += '</div>';
  return h;
}

// \u2500\u2500 \u56FE\u8868\uFF1AOI\u503C\u5206\u5E03\u76F4\u65B9\u56FE \u2500\u2500
function demonChartOi(list) {
  var labels = ['<5M', '5-10M', '10-30M', '30-100M', '>100M'];
  var b = [0, 0, 0, 0, 0];
  list.forEach(function (r) {
    var o = r.oi_value || 0;
    if (o < 5e6) b[0]++; else if (o < 10e6) b[1]++; else if (o < 30e6) b[2]++; else if (o < 100e6) b[3]++; else b[4]++;
  });
  var max = 1; b.forEach(function (v) { if (v > max) max = v; });
  var h = '<div class="hist-wrap">';
  for (var i = 0; i < 5; i++) {
    h += '<div class="hist-bar"><div class="hist-fill" style="height:' + (b[i] / max * 100) + '%"></div><div class="hist-label">' + labels[i] + '</div></div>';
  }
  h += '</div>';
  return h;
}

// \u2500\u2500 \u56FE\u8868\uFF1AOI\u503C vs 24h\u989D \u6C14\u6CE1\u56FE\uFF08\u5BF9\u6570\u5750\u6807\uFF0C\u70B9\u5927\u5C0F=\u989D/OI\u6BD4\uFF09 \u2500\u2500
function demonChartScatter(list) {
  // \u81EA\u9002\u5E94\u5BF9\u6570\u8303\u56F4\uFF08\u4E0E\u5C0F\u5E01\u7B5B\u9009\u5668\u540C\u6B3E\uFF09
  var pts = [];
  list.forEach(function (r) {
    var oi = r.oi_value, vol = r.volume_24h_usdt;
    if (oi == null || oi <= 0 || vol == null || vol <= 0) return;
    pts.push(r);
  });
  if (pts.length < 2) return '<div class="scatter-wrap" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:.7rem">\u6682\u65E0\u8DB3\u591F\u6570\u636E</div>';
  var oiVals = pts.map(function (r) { return r.oi_value; });
  var volVals = pts.map(function (r) { return r.volume_24h_usdt; });
  function niceLogLo(arr) { var mn = Math.min.apply(null, arr); if (mn <= 0) mn = 1e4; return Math.pow(10, Math.floor(Math.log10(mn))); }
  function niceLogHi(arr) { var mx = Math.max.apply(null, arr); return Math.pow(10, Math.ceil(Math.log10(mx))); }
  var xLo = niceLogLo(oiVals), xHi = niceLogHi(oiVals);
  var yLo = niceLogLo(volVals), yHi = niceLogHi(volVals);
  if (xHi / xLo < 4) xHi = xLo * 10; if (yHi / yLo < 4) yHi = yLo * 10;
  var xMin = Math.log10(xLo), xMax = Math.log10(xHi);
  var yMin = Math.log10(yLo), yMax = Math.log10(yHi);
  var stageColor = { accumulation: '#64748b', early_pump: '#3b82f6', pump: '#10b981', mid: '#f59e0b', late_distribution: '#ef4444' };
  var stageLabel = { accumulation: '\u23F3\u84C4\u6C34', early_pump: '\u{1F48E}\u5C0F\u5E01', pump: '\u{1F680}\u62C9\u5347', mid: '\u26A1\u4E2D\u671F', late_distribution: '\u26D4\u5927\u540E\u671F' };
  function ticks(lo, hi) {
    var out = [];
    for (var v = lo; v <= hi * 1.001; v *= 10) out.push(v);
    if (out.length < 3) { out = []; for (var i = 0; i < 5; i++) out.push(lo * Math.pow(Math.pow(hi / lo, 1 / 4), i)); }
    return out;
  }
  var xTicks = ticks(xLo, xHi), yTicks = ticks(yLo, yHi);
  var h = '<div class="scatter-wrap">';
  h += '<div class="scatter-plot">';
  // \u7F51\u683C\u7EBF + \u523B\u5EA6\u6807\u7B7E
  xTicks.forEach(function (tv) {
    var pct = (Math.log10(tv) - xMin) / (xMax - xMin) * 100;
    if (pct < 0 || pct > 100) return;
    h += '<div class="scatter-grid scatter-grid-v" style="left:' + pct + '%"></div>';
    h += '<div class="scatter-tick scatter-tick-x" style="left:' + pct + '%">' + fL(tv) + '</div>';
  });
  yTicks.forEach(function (tv) {
    var pct = 100 - (Math.log10(tv) - yMin) / (yMax - yMin) * 100;
    if (pct < 0 || pct > 100) return;
    h += '<div class="scatter-grid scatter-grid-h" style="top:' + pct + '%"></div>';
    h += '<div class="scatter-tick scatter-tick-y" style="top:' + pct + '%">' + fL(tv) + '</div>';
  });
  // \u6C14\u6CE1\u70B9\uFF08\u6309\u989D/OI\u6BD4\u6392\u5E8F\uFF0C\u53D6 top 80\uFF09
  var top = pts.slice().sort(function (a, b) { return (b.volume_oi_ratio || 0) - (a.volume_oi_ratio || 0); }).slice(0, 80);
  top.forEach(function (r) {
    var oi = Math.max(r.oi_value, xLo), vol = Math.max(r.volume_24h_usdt, yLo);
    var x = (Math.log10(oi) - xMin) / (xMax - xMin) * 100;
    var y = 100 - (Math.log10(vol) - yMin) / (yMax - yMin) * 100;
    x = Math.max(1, Math.min(99, x)); y = Math.max(1, Math.min(99, y));
    var ratio = r.volume_oi_ratio || 0;
    var size = Math.min(20, 4 + ratio / 2);
    var stage = r.oi_stage || 'accumulation';
    var color = stageColor[stage] || '#64748b';
    var tipDir = y < 35 ? 'below' : 'above';
    var tip = e(r.base_asset) + ' | OI ' + fL(r.oi_value) + ' | 24h\u989D ' + fL(r.volume_24h_usdt) + ' | \u989D/OI ' + ratio.toFixed(1) + 'x | ' + (stageLabel[stage] || stage);
    h += '<div class="scatter-dot" data-sym="' + e(r.base_asset) + '" style="left:' + x + '%;top:' + y + '%;width:' + size + 'px;height:' + size + 'px;background:' + color + '"><span class="scatter-tip ' + tipDir + '">' + tip + '</span></div>';
  });
  h += '</div>'; // close scatter-plot
  // \u8F74\u6807\u9898
  h += '<div class="scatter-axis scatter-x">OI\u503C (\u5BF9\u6570) \u2192</div><div class="scatter-axis scatter-y">\u2191 24h\u989D (\u5BF9\u6570)</div>';
  // \u56FE\u4F8B
  h += '<div class="scatter-legend">';
  ['accumulation', 'early_pump', 'pump', 'mid', 'late_distribution'].forEach(function (k) {
    h += '<span class="scatter-legend-item"><i style="background:' + stageColor[k] + '"></i>' + stageLabel[k] + '</span>';
  });
  h += '</div></div>';
  return h;
}

// \u2500\u2500 \u4E3B\u6E32\u67D3 \u2500\u2500
function renderDemon() {
  var root = document.getElementById('root');
  var list = demonFiltered();
  var up = 0; list.forEach(function (r) { if ((r.change_24h_pct || 0) > 0) up++; });
  var totalVol = 0; list.forEach(function (r) { totalVol += r.volume_24h_usdt || 0; });
  var activeMention = 0; demonData.forEach(function (r) {
    if (DEMON_MENTIONED.indexOf(r.base_asset) >= 0 && (r.volume_24h_usdt || 0) >= 1e6) activeMention++;
  });
  var squeezeN = 0; demonData.forEach(function (r) { if ((r.volume_oi_ratio || 0) > 10) squeezeN++; });
  var upPct = list.length > 0 ? (up / list.length * 100).toFixed(1) : '--';
  var us = demonUpdated ? new Date(demonUpdated).toLocaleString('zh-CN') : '--';

  var rows = '';
  list.forEach(function (r) {
    var ratio = r.volume_oi_ratio || 0;
    var cls = ratio > 8 ? 'class="squeeze-row"' : '';
    rows += '<tr ' + cls + '>'
      + '<td><b>' + e(r.base_asset) + '</b></td>'
      + '<td>' + fP(r.price) + '</td>'
      + '<td>' + fL(r.volume_24h_usdt) + '</td>'
      + '<td>' + fC(r.change_24h_pct) + '</td>'
      + '<td>' + fC(r.amplitude_24h_pct) + '</td>'
      + '<td>' + fL(r.oi_value) + '</td>'
      + '<td><b>' + ratio.toFixed(1) + 'x</b></td>'
      + '<td>' + ((r.trade_count || 0) >= 1000 ? Math.round((r.trade_count || 0) / 1000) + 'k' : (r.trade_count || 0)) + '</td>'
      + '<td>' + demonTags(r) + '</td>'
      + '</tr>';
  });

  var H = '';
  H += '<div class="app-header"><h1>\u{1F47A} \u5996\u5E01\u626B\u63CF\u5668</h1><p>\u57FA\u4E8E @derrrrrrrq \u65B9\u6CD5\u8BBA \u2014 \u6362\u624B\u9AD8 \xB7 \u6DA8\u5E45\u5927 \xB7 OI\u4F4E \u2014 \u6570\u636E\u6E90: \u5E01\u5B89\u5408\u7EA6 (\u989D/OI\u6BD4 = \u6324\u538B\u7A7A\u95F4)</p></div>';
  H += '<div class="status-bar ok"><span>\u626B\u63CF ' + demonData.length + ' \u4E2A\u5408\u7EA6 \xB7 \u7B5B\u9009\u547D\u4E2D ' + list.length + '</span><span>\u66F4\u65B0 ' + us + '</span></div>';
  H += '<div class="layout"><div class="sidebar">';
  H += '<div class="demon-preset-row">';
  var presets = [['default', '\u{1F3AF}\u9ED8\u8BA4'], ['squeeze', '\u{1F525}\u6324\u538B\u7A7A\u95F4'], ['small', '\u{1F48E}\u5C0F\u5E01\u5019\u9009'], ['pump', '\u{1F680}\u62C9\u5347'], ['dump', '\u{1F4C9}\u6740\u591A'], ['tag', '\u{1F4CC}\u4ED6\u63D0\u8FC7'], ['all', '\u{1F4CB}\u5168\u90E8']];
  for (var i = 0; i < presets.length; i++) {
    H += '<button class="demon-preset' + (dPreset === presets[i][0] ? ' active' : '') + '" id="d-preset-' + presets[i][0] + '" onclick="demonSetPreset('' + presets[i][0] + '')">' + presets[i][1] + '</button>';
  }
  H += '</div>';
  H += '<div class="demon-filter-card"><div class="label">24h\u6210\u4EA4\u989D (\u767E\u4E07$)</div><div class="input-row"><input type="number" id="d-vol-min-i" class="filter-input" value="0" min="0" step="1" onchange="demonApply()"><span class="range-sep">\u2265</span></div><input type="range" id="d-vol-min" min="0" max="500" value="0" oninput="demonApply()"></div>';
  H += '<div class="demon-filter-card"><div class="label">OI\u503C\u4E0A\u9650 (\u767E\u4E07$)</div><div class="input-row"><input type="number" id="d-oi-max-i" class="filter-input" value="100000" min="0" step="1" onchange="demonApply()"><span class="range-sep">\u2264</span></div><input type="range" id="d-oi-max" min="0" max="500" value="100000" oninput="demonApply()"></div>';
  H += '<div class="demon-filter-card"><div class="label">\u989D/OI\u6BD4\u4E0B\u9650 (x)</div><div class="input-row"><input type="number" id="d-ratio-min-i" class="filter-input" value="0" min="0" step="1" onchange="demonApply()"><span class="range-sep">\u2265</span></div><input type="range" id="d-ratio-min" min="0" max="50" value="0" oninput="demonApply()"></div>';
  H += '<div class="demon-filter-card"><div class="label">24h\u6DA8\u5E45\u8303\u56F4 (%)</div><div class="input-row"><input type="number" id="d-chg-min-i" class="filter-input" value="-100" min="-100" max="500" step="1" onchange="demonApply()"><span class="range-sep">~</span><input type="number" id="d-chg-max-i" class="filter-input" value="100" min="-100" max="500" step="1" onchange="demonApply()"></div><div class="input-row"><input type="range" id="d-chg-min" min="-100" max="100" value="-100" oninput="demonApply()"><input type="range" id="d-chg-max" min="-100" max="100" value="100" oninput="demonApply()"></div></div>';
  H += '<div class="demon-filter-card"><div class="label">\u641C\u7D22\u5E01\u79CD</div><input type="text" id="d-query" class="filter-input" style="width:100%" placeholder="\u5982: BANK" oninput="demonApply()"></div>';
  H += '<div class="demon-filter-card"><div class="label">\u6392\u5E8F\u65B9\u5F0F</div><div class="demon-sort-row"><select id="d-sort" onchange="demonApply()">'
    + '<option value="ratio">\u989D/OI\u6BD4</option><option value="vol">24h\u6210\u4EA4\u989D</option><option value="oi">OI\u503C</option><option value="chg">24h\u6DA8\u5E45</option><option value="count">\u6210\u4EA4\u7B14\u6570</option></select></div></div>';
  H += '<button class="refresh-btn" onclick="demonReload()">\u5237\u65B0\u6570\u636E</button>';
  H += '<div style="font-size:.6rem;color:var(--text-muted);text-align:center;margin-top:8px">\u672C\u5730\u4E2D\u7EE7\u63A8\u9001 \xB7 \u6BCF5\u5206\u949F</div>';
  H += '</div><div class="main">';
  H += '<div class="kpi-row">';
  H += '<div class="kpi-card"><div class="kpi-label">\u626B\u63CF\u5408\u7EA6</div><div class="kpi-value">' + demonData.length + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">\u7B5B\u9009\u547D\u4E2D</div><div class="kpi-value">' + list.length + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">\u4E0A\u6DA8\u5360\u6BD4</div><div class="kpi-value">' + upPct + '%</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">\u4ED6\u5173\u6CE8\u6D3B\u8DC3</div><div class="kpi-value">' + activeMention + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">\u989D/OI&gt;10x</div><div class="kpi-value">' + squeezeN + '</div></div>';
  H += '</div>';
  H += '<div class="table-wrap"><div class="table-title">\u5996\u5E01\u626B\u63CF\u7ED3\u679C <span style="font-weight:400;font-size:.7rem;color:var(--text-muted);margin-left:8px">\u70B9\u51FB\u8868\u5934\u6392\u5E8F \xB7 \u7EA2\u884C=\u6324\u538B\u7A7A\u95F4(\u989D/OI&gt;8x) \xB7 24h\u989D\u5408\u8BA1 $' + fL(totalVol) + '</span></div><div class="table-scroll"><table><thead><tr>';
  H += '<th onclick="demonSortBy('ratio')">\u4EA4\u6613\u5BF9</th><th>\u4EF7\u683C</th><th onclick="demonSortBy('vol')">24h\u989D</th><th onclick="demonSortBy('chg')">24h\u6DA8\u5E45</th><th>\u632F\u5E45</th><th onclick="demonSortBy('oi')">OI\u503C</th><th onclick="demonSortBy('ratio')">\u989D/OI\u6BD4</th><th onclick="demonSortBy('count')">\u6210\u4EA4\u7B14\u6570</th><th>\u4FE1\u53F7</th>';
  H += '</tr></thead><tbody>' + (rows || '<tr><td colspan="9" class="empty-msg">\u65E0\u5339\u914D\u7ED3\u679C</td></tr>') + '</tbody></table></div></div>';
  H += '<div class="demon-chart-wrap"><h4>\u{1F525} \u989D/OI\u6BD4 Top20\uFF08\u6362\u624B\u9AD8\u4F46OI\u672A\u8DDF\u4E0A \u2192 \u5E84\u5BB6\u84C4\u6C34\uFF09</h4>' + demonChartRatio(list) + '</div>';
  H += '<div class="demon-chart-wrap"><h4>\u{1F4CA} 24h\u6DA8\u5E45\u5206\u5E03</h4>' + demonChartGain(list) + '</div>';
  H += '<div class="demon-chart-wrap"><h4>\u{1F4CA} OI\u503C\u5206\u5E03</h4>' + demonChartOi(list) + '</div>';
  H += '<div class="demon-chart-wrap"><h4>\u{1FAE7} OI\u503C vs 24h\u989D\uFF08\u5BF9\u6570\u5750\u6807\uFF0C\u70B9\u5927\u5C0F=\u989D/OI\u6BD4\uFF09</h4>' + demonChartScatter(list) + '</div>';
  H += '<div class="demon-note">\u6838\u5FC3\u6761\u4EF6: \u989D/OI\u6BD4 &gt; 10x\uFF08\u6362\u624B\u9AD8\u4F46OI\u6CA1\u8DDF\u4E0A\uFF09\xB7 \u8F85\u52A9: 24h\u989D &gt; $2M\uFF08\u6D41\u52A8\u6027\u591F\uFF09\xB7 \u6DA8\u5E45 &gt; 5%\uFF08\u76D8\u9762\u6FC0\u6D3B\uFF09\xB7 OI &lt; $30M\uFF08\u5C0F\u5E01\u6324\u538B\u7A7A\u95F4\u5927\uFF09<br>\u6392\u9664: \u5927\u5E01(BTC/ETH/SOL) \xB7 OI &gt; $100M\uFF08\u5E84\u5BB6\u5DF2\u5B8C\u6210\u5E03\u5C40\uFF09\xB7 \u6240\u6709\u4EBA\u6CE8\u610F\u529B\u7684\u5E01 \xB7 \u6D3E\u53D1\u540E\u671F\u7684\u5E01</div>';
  H += '<div class="footer">\u26A0\uFE0F \u4EC5\u4F9B\u7814\u7A76\u53C2\u8003\uFF0C\u4E0D\u6784\u6210\u6295\u8D44\u5EFA\u8BAE<br>\u6700\u540E\u66F4\u65B0 ' + us + '</div>';
  H += '</div></div>';
  root.innerHTML = H;
  demonSyncInputs();
}

function demonReload() {
  demonLoaded = false;
  demonLoad();
}

<\/script><script>
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u{1FA99} \u5C0F\u5E01\u7B5B\u9009\u5668 \u89C6\u56FE\uFF08\u57FA\u4E8E @derrrrrrrq \u65B9\u6CD5\u8BBA\uFF1A\u5C0F\u5E01OI\u533A\u95F4 + \u6362\u624B + \u76D8\u53E3\u6DF1\u5EA6\uFF09
// \u6570\u636E: GET /api/coinfilter\uFF08\u5E01\u5B89\u5408\u7EA6 \u8D44\u8D39\u7387/\u76D8\u53E3\u6DF1\u5EA6/\u4E0A\u7EBF\u65E5\u671F\uFF09
//       \u964D\u7EA7: GET /api/demon\uFF08\u5996\u5E01\u4E2D\u7EE7\u6570\u636E\uFF0C\u65E0\u8D44\u8D39/\u6DF1\u5EA6/\u4E0A\u7EBF\u65E5\u671F\u5219\u663E\u793A N/A\uFF09
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

// \u2500\u2500 \u4ED6\u63A8\u6587\u4E2D\u63D0\u8FC7\u7684 25 \u4E2A\u5E01\uFF08DEMON_MENTIONED \u7684\u515C\u5E95\u526F\u672C\uFF09\u2500\u2500
var CF_MENTIONED = (typeof DEMON_MENTIONED !== 'undefined' && DEMON_MENTIONED) ? DEMON_MENTIONED
  : ['SIREN','RAVE','STO','LAB','TRADOOR','BSB','ESPORTS','BANK','IDOL','UB','BILL','RIVER','PTB','ACE','SAHARA','VELVET','ALLO','BLUAI','AGT','NOM','PIPPIN','WLFI','RESOLV','USR','INX'];

// \u2500\u2500 \u72B6\u6001 \u2500\u2500
if (typeof curTab === 'undefined') var curTab = 'chip';
var coinfilterData = [], coinfilterUpdated = null, coinfilterLoaded = false, coinfilterSource = 'coinfilter';
var cPreset = 'default', cQuery = '', cSort = 'ratio', cAsc = false, cTag = '';
var cRatioMin = 0, cRatioMax = 999, cOiMin = 0, cOiMax = 9999;
var cChgMin = -100, cChgMax = 100, cVolMin = 0, cVolMax = 99999;
var cFundMin = -1, cFundMax = 1, cDepthMin = 0, cDepthMax = 999999;

// \u2500\u2500 \u6302\u63A5 Tab \u5207\u6362\uFF08\u517C\u5BB9\u5DF2\u5B58\u5728\u7684 switchTab / rD \u8986\u76D6\u94FE\uFF09\u2500\u2500
var __cfSwitchTab = (typeof switchTab === 'function') ? switchTab : null;
switchTab = function (t) {
  if (t === 'coinfilter') {
    curTab = t;
    var tb = document.getElementById('tabbar');
    if (tb) {
      tb.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      var btn = tb.querySelector('.tab-coinfilter');
      if (btn) btn.classList.add('active');
    }
    if (!coinfilterLoaded) coinfilterLoad(); else renderCoinfilter();
    return;
  }
  if (__cfSwitchTab) { __cfSwitchTab(t); return; }
  if (t === 'demon' && typeof renderDemon === 'function') { renderDemon(); return; }
  if (typeof rD === 'function') rD();
};

var __cfRD = (typeof rD === 'function') ? rD : null;
rD = function () {
  if (curTab === 'coinfilter') { renderCoinfilter(); return; }
  if (__cfRD) __cfRD();
};

// \u2500\u2500 \u6570\u636E\u52A0\u8F7D\uFF08/api/coinfilter \u2192 \u964D\u7EA7 /api/demon\uFF09\u2500\u2500
function coinfilterLoad() {
  var root = document.getElementById('root');
  root.innerHTML = '<div class="empty-msg">\u{1FA99} \u6B63\u5728\u52A0\u8F7D\u5C0F\u5E01\u7B5B\u9009\u6570\u636E\uFF08\u5E01\u5B89\u5408\u7EA6 \u8D44\u8D39\u7387/\u76D8\u53E3\u6DF1\u5EA6/\u4E0A\u7EBF\u65E5\u671F\uFF09...</div>';
  fetch(BASE + '/api/coinfilter').then(function (r) { return r.json(); }).then(function (d) {
    var coins = d.coins || d.data || [];
    if (d.error && !coins.length) throw new Error(d.error);
    if (!coins.length) throw new Error('coinfilter \u6682\u65E0\u6570\u636E');
    coinfilterData = coins.map(cfEnrich);
    coinfilterUpdated = d.updated || null;
    coinfilterLoaded = true;
    coinfilterSource = 'coinfilter';
    renderCoinfilter();
  }).catch(function (err) {
    // \u964D\u7EA7: \u5996\u5E01\u4E2D\u7EE7\u6570\u636E\uFF08\u65E0\u8D44\u8D39/\u6DF1\u5EA6/\u4E0A\u7EBF\u65E5\u671F\u5B57\u6BB5\uFF09
    fetch(BASE + '/api/demon').then(function (r) { return r.json(); }).then(function (d) {
      var coins = d.data || [];
      if (!coins.length) throw new Error('demon \u4E5F\u65E0\u6570\u636E');
      coinfilterData = coins.map(cfEnrich);
      coinfilterUpdated = d.updated || null;
      coinfilterLoaded = true;
      coinfilterSource = 'demon';
      renderCoinfilter();
    }).catch(function (err2) {
      root.innerHTML = '<div class="empty-msg">\u5C0F\u5E01\u7B5B\u9009\u6570\u636E\u52A0\u8F7D\u5931\u8D25: ' + e(err2.message) + '<br><br><button class="btn" onclick="coinfilterLoad()">\u91CD\u8BD5</button></div>';
    });
  });
}

function cfReload() {
  coinfilterLoaded = false;
  coinfilterLoad();
}

// \u2500\u2500 \u6570\u636E\u8865\u5145: OI\u9636\u6BB5 / \u4E0A\u5E02\u5929\u6570 / \u4FE1\u53F7\u6807\u7B7E\uFF08\u5168\u90E8\u5BA2\u6237\u7AEF\u8BA1\u7B97\uFF09\u2500\u2500
function cfEnrich(r) {
  var oi = r.oi_value || 0;
  var stage = 'accumulation', label = '\u23F3 \u84C4\u6C34\u671F';
  if (oi < 2e6) { stage = 'accumulation'; label = '\u23F3 \u84C4\u6C34\u671F'; }
  else if (oi < 8e6) { stage = 'early_pump'; label = '\u{1F48E} \u5C0F\u5E01\u5019\u9009'; }
  else if (oi < 30e6) { stage = 'pump'; label = '\u{1F680} \u62C9\u5347\u671F'; }
  else if (oi < 80e6) { stage = 'mid'; label = '\u26A1 \u4E2D\u671F'; }
  else { stage = 'late_distribution'; label = '\u26D4 \u5927\u540E\u671F'; }
  r.base_asset = r.base_asset || r.symbol || '';
  r.oi_stage = stage;
  r.oi_stage_label = label;
  if (r.days_since_listing == null && r.listing_date) {
    var ld = new Date(r.listing_date);
    if (!isNaN(ld.getTime())) r.days_since_listing = Math.max(0, Math.floor((Date.now() - ld.getTime()) / 86400000));
  }
  r.tags = cfTags(r);
  return r;
}

// \u2500\u2500 \u4FE1\u53F7\u6807\u7B7E\uFF08\u81EA\u52A8\uFF09\u2500\u2500
var CF_TAG_DEFS = [
  ['squeeze', '\u{1F525}\u6324\u538B'],
  ['small_cap', '\u{1F48E}\u5C0F\u5E01'],
  ['early_pump', '\u{1F680}\u62C9\u5347'],
  ['thin_book', '\u26A0\uFE0F\u8584\u76D8\u53E3'],
  ['distribution', '\u26D4\u5927\u540E\u671F'],
  ['kill_longs', '\u{1F4C9}\u6740\u591A'],
  ['mentioned', '\u{1F4CC}\u4ED6\u63D0\u8FC7'],
  ['new_listing', '\u{1F195}\u65B0\u4E0A'],
  ['funding_anomaly', '\u{1F4B0}\u8D44\u8D39\u5F02']
];

function cfTags(r) {
  var t = {};
  var ratio = r.volume_oi_ratio || 0, oi = r.oi_value || 0, chg = r.change_24h_pct || 0;
  var depth = r.orderbook_depth_usdt, fund = r.funding_rate_pct, days = r.days_since_listing;
  var base = r.base_asset || r.symbol || '';
  t.squeeze = ratio >= 10 && oi > 5e6;
  t.small_cap = oi >= 2e6 && oi < 8e6;
  t.early_pump = oi >= 8e6 && oi < 30e6 && chg > 0;
  t.thin_book = depth != null && depth < 200000;
  t.distribution = oi > 80e6 && ratio < 3 && chg < -10;
  t.kill_longs = chg < -5;
  t.mentioned = CF_MENTIONED.indexOf(base) >= 0;
  t.new_listing = days != null && days <= 30;
  t.funding_anomaly = fund != null && (fund > 0.05 || fund < -0.05);
  return t;
}

function cfTagHtml(r) {
  var h = '';
  for (var i = 0; i < CF_TAG_DEFS.length; i++) {
    var k = CF_TAG_DEFS[i][0];
    if (r.tags && r.tags[k]) h += '<span class="cf-tag cf-tag-' + k + '">' + CF_TAG_DEFS[i][1] + '</span>';
  }
  return h;
}

// \u2500\u2500 5\u6B65\u68C0\u67E5\u6E05\u5355\uFF08\u70B9\u51FB\u5FAA\u73AF \u2713 \u2192 \u2715 \u2192 \u7A7A\u767D\uFF0ClocalStorage \u6301\u4E45\u5316\uFF09\u2500\u2500
var CF_CHECK_STEPS = [
  ['\u{1F4E1} \u626B\u76D8', '\u6362\u624B\u9AD8(\u989D/OI\u226510x)\xB7\u6DA8\u5E45\u5927(>5%)\xB7OI\u4F4E(<30M)'],
  ['\u{1F9F9} \u7B5B\u9009', 'OI 2M-8M \u5C0F\u5E01\u5019\u9009 / 8M-30M \u62C9\u5347\u65E9\u671F'],
  ['\u{1F50D} \u786E\u8BA4', '\u76D8\u53E3\u4E0D\u8584\xB7\u65E0\u6D3E\u53D1\u8FF9\u8C61\xB7\u91CF\u4EF7\u914D\u5408'],
  ['\u{1F3AF} \u5165\u573A', '\u56DE\u8C03\u4E0D\u7834\u4F4D\xB7\u653E\u91CF\u7A81\u7834\u786E\u8BA4'],
  ['\u{1F6E1}\uFE0F \u98CE\u63A7', '\u6B62\u635F\u660E\u786E\xB7\u4ED3\u4F4D\u5408\u7406\xB7\u8D44\u8D39\u6B63\u5E38']
];

function cfGetChecklist(sym) {
  try {
    var d = JSON.parse(localStorage.getItem('cf_checklist_v1') || '{}');
    return d[sym] || [0, 0, 0, 0, 0];
  } catch (e) { return [0, 0, 0, 0, 0]; }
}

function cfCycleCheck(sym, idx) {
  var d = {};
  try { d = JSON.parse(localStorage.getItem('cf_checklist_v1') || '{}'); } catch (e) {}
  var arr = d[sym] || [0, 0, 0, 0, 0];
  arr[idx] = (arr[idx] + 1) % 3;
  d[sym] = arr;
  try { localStorage.setItem('cf_checklist_v1', JSON.stringify(d)); } catch (e) {}
  var mark = document.getElementById('cfm-' + sym + '-' + idx);
  if (mark) {
    var st = arr[idx];
    mark.className = 'cf-check-mark cf-check-' + (st === 1 ? 'ok' : st === 2 ? 'no' : 'blank');
    mark.textContent = st === 1 ? '\u2713' : st === 2 ? '\u2715' : '\xB7';
  }
}

function cfChecklistHtml(sym) {
  var cl = cfGetChecklist(sym);
  var h = '<div class="cf-checklist"><div class="cf-checklist-head"><span>\u{1F4CB} 5\u6B65\u68C0\u67E5\u6E05\u5355</span><span class="cf-checklist-hint">\u70B9\u51FB\u5207\u6362 \u2713 / \u2715 / \u7A7A\u767D \xB7 \u81EA\u52A8\u4FDD\u5B58</span></div><div class="cf-checklist-steps">';
  for (var i = 0; i < CF_CHECK_STEPS.length; i++) {
    var st = cl[i] || 0;
    h += '<div class="cf-check-step" onclick="cfCycleCheck('' + sym + '',' + i + ')">'
      + '<span id="cfm-' + sym + '-' + i + '" class="cf-check-mark cf-check-' + (st === 1 ? 'ok' : st === 2 ? 'no' : 'blank') + '">' + (st === 1 ? '\u2713' : st === 2 ? '\u2715' : '\xB7') + '</span>'
      + '<span class="cf-check-name">' + CF_CHECK_STEPS[i][0] + '</span>'
      + '<span class="cf-check-desc">' + CF_CHECK_STEPS[i][1] + '</span>'
      + '</div>';
  }
  h += '</div></div>';
  return h;
}

// \u2500\u2500 \u5C55\u5F00\u884C: \u5207\u6362\u663E\u793A \u2500\u2500
function cfToggleRow(tr) {
  var detail = tr.nextElementSibling;
  if (!detail || !detail.classList.contains('cf-detail-row')) return;
  var show = detail.style.display === 'none';
  detail.style.display = show ? 'table-row' : 'none';
  var arrow = tr.querySelector('.cf-expand-arrow');
  if (arrow) arrow.textContent = show ? '\u25BE' : '\u25B8';
}

// \u2500\u2500 \u6392\u5E8F\u5217\u6620\u5C04 \u2500\u2500
function cfSortKeyVal(r, k) {
  if (k === 'oi') return r.oi_value || 0;
  if (k === 'chg') return r.change_24h_pct || 0;
  if (k === 'vol') return r.volume_24h_usdt || 0;
  if (k === 'depth') return r.orderbook_depth_usdt || 0;
  if (k === 'sym') return r.base_asset || r.symbol || '';
  return r.volume_oi_ratio || 0;
}

// \u2500\u2500 \u8FC7\u6EE4 + \u6392\u5E8F \u2500\u2500
function cfFiltered() {
  var q = (cQuery || '').toUpperCase().trim();
  var list = coinfilterData.filter(function (r) {
    var ratio = r.volume_oi_ratio || 0, oi = r.oi_value || 0, chg = r.change_24h_pct || 0, vol = r.volume_24h_usdt || 0;
    var fund = r.funding_rate_pct, depth = r.orderbook_depth_usdt;
    if (ratio < cRatioMin || ratio > cRatioMax) return false;
    if (oi < cOiMin * 1e6 || oi > cOiMax * 1e6) return false;
    if (chg < cChgMin || chg > cChgMax) return false;
    if (vol < cVolMin * 1e6 || vol > cVolMax * 1e6) return false;
    if (fund != null && (fund < cFundMin || fund > cFundMax)) return false;
    if (depth != null && (depth < cDepthMin * 1000 || depth > cDepthMax * 1000)) return false;
    if (cTag && !(r.tags && r.tags[cTag])) return false;
    if (q && (r.symbol || '').indexOf(q) < 0 && (r.base_asset || '').indexOf(q) < 0) return false;
    return true;
  });
  list.sort(function (a, b) {
    var k = cSort;
    if (k === 'depth') return cfSortKeyVal(a, k) - cfSortKeyVal(b, k); // \u6DF1\u5EA6\u6052\u4E3A\u5347\u5E8F
    var av = cfSortKeyVal(a, k), bv = cfSortKeyVal(b, k);
    if (typeof av === 'string') return cAsc ? (av < bv ? -1 : av > bv ? 1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0);
    return cAsc ? av - bv : bv - av;
  });
  return list;
}

// \u2500\u2500 8 \u4E2A\u9884\u8BBE \u2500\u2500
var CF_PRESETS = [
  ['default', '\u{1F3AF}\u9ED8\u8BA4'],
  ['small', '\u{1F48E}\u5C0F\u5E012-8M'],
  ['pump', '\u{1F680}\u62C9\u5347\u65E9\u671F8-30M'],
  ['thin', '\u26A0\uFE0F\u8584\u76D8\u53E3'],
  ['kill', '\u{1F4C9}\u6740\u591A'],
  ['late', '\u26D4\u5927\u540E\u671F'],
  ['tag', '\u{1F4CC}\u4ED6\u63D0\u8FC7'],
  ['all', '\u{1F4CB}\u5168\u90E8']
];

function cfSetPreset(p) {
  cPreset = p; cTag = '';
  cRatioMin = 0; cRatioMax = 999; cOiMin = 0; cOiMax = 9999;
  cChgMin = -100; cChgMax = 100; cVolMin = 0; cVolMax = 99999;
  cFundMin = -1; cFundMax = 1; cDepthMin = 0; cDepthMax = 999999;
  cQuery = ''; cSort = 'ratio'; cAsc = false;
  if (p === 'default') { cVolMin = 0.3; }
  else if (p === 'small') { cOiMin = 2; cOiMax = 8; cSort = 'oi'; cAsc = true; }
  else if (p === 'pump') { cOiMin = 8; cOiMax = 30; cChgMin = 0; }
  else if (p === 'thin') { cDepthMax = 200; cSort = 'depth'; }
  else if (p === 'kill') { cChgMax = -5; }
  else if (p === 'late') { cOiMin = 80; cRatioMax = 3; cChgMax = -10; }
  else if (p === 'tag') { cTag = 'mentioned'; cSort = 'vol'; }
  else if (p === 'all') { cVolMin = 0; cSort = 'vol'; }
  cfSyncInputs();
  renderCoinfilter();
}

// \u2500\u2500 \u540C\u6B65\u63A7\u4EF6 \u2500\u2500
function cfSyncInputs() {
  var g = function (id) { return document.getElementById(id); };
  var set = function (id, v) { var el = g(id); if (el) el.value = v; };
  set('c-ratio-min', cRatioMin); set('c-ratio-max', cRatioMax);
  set('c-ratio-min-i', cRatioMin); set('c-ratio-max-i', cRatioMax);
  set('c-oi-min', cOiMin); set('c-oi-max', cOiMax);
  set('c-oi-min-i', cOiMin); set('c-oi-max-i', cOiMax);
  set('c-chg-min', cChgMin); set('c-chg-max', cChgMax);
  set('c-chg-min-i', cChgMin); set('c-chg-max-i', cChgMax);
  set('c-vol-min', cVolMin); set('c-vol-max', cVolMax);
  set('c-vol-min-i', cVolMin); set('c-vol-max-i', cVolMax);
  set('c-fund-min', cFundMin); set('c-fund-max', cFundMax);
  set('c-fund-min-i', cFundMin); set('c-fund-max-i', cFundMax);
  set('c-depth-min', cDepthMin); set('c-depth-max', cDepthMax);
  set('c-depth-min-i', cDepthMin); set('c-depth-max-i', cDepthMax);
  set('c-query', cQuery); set('c-sort', cSort);
  var all = document.querySelectorAll('.cf-preset');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
  var act = g('c-preset-' + cPreset);
  if (act) act.classList.add('active');
}

// \u2500\u2500 \u624B\u52A8\u7B5B\u9009\u5E94\u7528 \u2500\u2500
function cfApply() {
  var g = function (id) { return document.getElementById(id); };
  function num(id, def) { var v = parseFloat(g(id).value); return isNaN(v) ? def : v; }
  function pair(minId, maxId, dMin, dMax) {
    var a = num(minId, dMin), b = num(maxId, dMax);
    if (a > b) { var t = a; a = b; b = t; }
    return [a, b];
  }
  var pr = pair('c-ratio-min-i', 'c-ratio-max-i', 0, 999); cRatioMin = pr[0]; cRatioMax = pr[1];
  var po = pair('c-oi-min-i', 'c-oi-max-i', 0, 9999); cOiMin = po[0]; cOiMax = po[1];
  var pc = pair('c-chg-min-i', 'c-chg-max-i', -100, 100); cChgMin = pc[0]; cChgMax = pc[1];
  var pv = pair('c-vol-min-i', 'c-vol-max-i', 0, 99999); cVolMin = pv[0]; cVolMax = pv[1];
  var pf = pair('c-fund-min-i', 'c-fund-max-i', -1, 1); cFundMin = pf[0]; cFundMax = pf[1];
  var pd = pair('c-depth-min-i', 'c-depth-max-i', 0, 999999); cDepthMin = pd[0]; cDepthMax = pd[1];
  cQuery = g('c-query').value;
  cSort = g('c-sort').value;
  if (cSort === 'depth') cAsc = false;
  cPreset = ''; cTag = '';
  cfSyncInputs();
  renderCoinfilter();
}

function cfSortBy(k) {
  if (k === 'depth') { cSort = k; cAsc = false; }
  else if (cSort === k) cAsc = !cAsc;
  else { cSort = k; cAsc = false; }
  var sel = document.getElementById('c-sort');
  if (sel) sel.value = cSort;
  var all = document.querySelectorAll('.cf-preset');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
  cPreset = '';
  renderCoinfilter();
}

// \u2500\u2500 \u5DE5\u5177\u51FD\u6570 \u2500\u2500
function cfDepth(v) {
  if (v == null) return 'N/A';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return String(Math.round(v));
}

// \u2500\u2500 \u56FE\u8868 1: \u989D/OI\u6BD4 Top20 \u2500\u2500
function cfChartRatio(list) {
  var top = list.slice().sort(function (a, b) { return (b.volume_oi_ratio || 0) - (a.volume_oi_ratio || 0); }).slice(0, 20);
  var max = 1; top.forEach(function (r) { if ((r.volume_oi_ratio || 0) > max) max = r.volume_oi_ratio || 0; });
  var h = '';
  top.forEach(function (r) {
    var v = r.volume_oi_ratio || 0;
    h += '<div class="cf-hbar-row"><span class="cf-hbar-label">' + e(r.base_asset) + '</span><div class="cf-hbar-track"><div class="cf-hbar-fill" style="width:' + (v / max * 100) + '%"></div></div><span class="cf-hbar-val">' + v.toFixed(1) + 'x</span></div>';
  });
  return h;
}

// \u2500\u2500 \u56FE\u8868 2: OI\u533A\u95F4\u5206\u5E03\u76F4\u65B9\u56FE\uFF08\u6309\u9636\u6BB5\u7740\u8272\uFF09\u2500\u2500
function cfChartOi(list) {
  var labels = ['<2M', '2-8M', '8-30M', '30-80M', '>80M'];
  var colors = ['#64748b', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  var b = [0, 0, 0, 0, 0];
  list.forEach(function (r) {
    var o = r.oi_value || 0;
    if (o < 2e6) b[0]++; else if (o < 8e6) b[1]++; else if (o < 30e6) b[2]++; else if (o < 80e6) b[3]++; else b[4]++;
  });
  var max = 1; b.forEach(function (v) { if (v > max) max = v; });
  var h = '<div class="cf-hist-wrap">';
  for (var i = 0; i < 5; i++) {
    h += '<div class="cf-hist-bar"><div class="cf-hist-fill" style="height:' + (b[i] / max * 100) + '%;background:' + colors[i] + '"></div><div class="cf-hist-label">' + labels[i] + '</div></div>';
  }
  h += '</div>';
  return h;
}

// \u2500\u2500 \u56FE\u8868 3: OI\u503C vs 24h\u989D \u6C14\u6CE1\u56FE\uFF08\u5BF9\u6570\u5750\u6807\uFF0C\u70B9\u5927\u5C0F=\u989D/OI\u6BD4\uFF0C\u989C\u8272=OI\u9636\u6BB5\uFF09\u2500\u2500
function cfChartScatter(list) {
  // \u81EA\u9002\u5E94\u5BF9\u6570\u8303\u56F4: \u4ECE\u5B9E\u9645\u6570\u636E\u7B97 min/max\uFF0C\u907F\u514D\u70B9\u5168\u6324\u5728\u5DE6\u4E0B\u89D2
  var pts = [];
  list.forEach(function (r) {
    var oi = r.oi_value, vol = r.volume_24h_usdt;
    if (oi == null || oi <= 0 || vol == null || vol <= 0) return;
    pts.push(r);
  });
  if (pts.length < 2) return '<div class="cf-scatter-wrap" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:.7rem">\u6682\u65E0\u8DB3\u591F\u6570\u636E</div>';
  var oiVals = pts.map(function (r) { return r.oi_value; });
  var volVals = pts.map(function (r) { return r.volume_24h_usdt; });
  function niceLogLo(arr) { var mn = Math.min.apply(null, arr); if (mn <= 0) mn = 1e4; return Math.pow(10, Math.floor(Math.log10(mn))); }
  function niceLogHi(arr) { var mx = Math.max.apply(null, arr); return Math.pow(10, Math.ceil(Math.log10(mx))); }
  var xLo = niceLogLo(oiVals), xHi = niceLogHi(oiVals);
  var yLo = niceLogLo(volVals), yHi = niceLogHi(volVals);
  if (xHi / xLo < 4) xHi = xLo * 10; if (yHi / yLo < 4) yHi = yLo * 10;
  var xMin = Math.log10(xLo), xMax = Math.log10(xHi);
  var yMin = Math.log10(yLo), yMax = Math.log10(yHi);
  var stageColor = { accumulation: '#64748b', early_pump: '#3b82f6', pump: '#10b981', mid: '#f59e0b', late_distribution: '#ef4444' };
  var stageLabel = { accumulation: '\u23F3\u84C4\u6C34', early_pump: '\u{1F48E}\u5C0F\u5E01', pump: '\u{1F680}\u62C9\u5347', mid: '\u26A1\u4E2D\u671F', late_distribution: '\u26D4\u5927\u540E\u671F' };
  function ticks(lo, hi) {
    var out = [];
    for (var v = lo; v <= hi * 1.001; v *= 10) out.push(v);
    if (out.length < 3) { out = []; for (var i = 0; i < 5; i++) out.push(lo * Math.pow(Math.pow(hi / lo, 1 / 4), i)); }
    return out;
  }
  var xTicks = ticks(xLo, xHi), yTicks = ticks(yLo, yHi);
  var h = '<div class="cf-scatter-wrap">';
  h += '<div class="cf-scatter-plot">';
  xTicks.forEach(function (tv) {
    var pct = (Math.log10(tv) - xMin) / (xMax - xMin) * 100;
    if (pct < 0 || pct > 100) return;
    h += '<div class="cf-scatter-grid cf-scatter-grid-v" style="left:' + pct + '%"></div>';
    h += '<div class="cf-scatter-tick cf-scatter-tick-x" style="left:' + pct + '%">' + fL(tv) + '</div>';
  });
  yTicks.forEach(function (tv) {
    var pct = 100 - (Math.log10(tv) - yMin) / (yMax - yMin) * 100;
    if (pct < 0 || pct > 100) return;
    h += '<div class="cf-scatter-grid cf-scatter-grid-h" style="top:' + pct + '%"></div>';
    h += '<div class="cf-scatter-tick cf-scatter-tick-y" style="top:' + pct + '%">' + fL(tv) + '</div>';
  });
  var top = pts.slice().sort(function (a, b) { return (b.volume_oi_ratio || 0) - (a.volume_oi_ratio || 0); }).slice(0, 80);
  top.forEach(function (r) {
    var oi = Math.max(r.oi_value, xLo), vol = Math.max(r.volume_24h_usdt, yLo);
    var x = (Math.log10(oi) - xMin) / (xMax - xMin) * 100;
    var y = 100 - (Math.log10(vol) - yMin) / (yMax - yMin) * 100;
    x = Math.max(1, Math.min(99, x)); y = Math.max(1, Math.min(99, y));
    var ratio = r.volume_oi_ratio || 0;
    var size = Math.min(24, 5 + ratio / 1.8);
    var color = stageColor[r.oi_stage] || '#64748b';
    var tipDir = y < 35 ? 'below' : 'above';
    var tip = e(r.base_asset) + ' | OI ' + fL(r.oi_value) + ' | 24h\u989D ' + fL(r.volume_24h_usdt) + ' | \u989D/OI ' + ratio.toFixed(1) + 'x | ' + (r.oi_stage_label || '');
    h += '<div class="cf-scatter-dot" data-sym="' + e(r.symbol) + '" style="left:' + x + '%;top:' + y + '%;width:' + size + 'px;height:' + size + 'px;background:' + color + '"><span class="cf-scatter-tip ' + tipDir + '">' + tip + '</span></div>';
  });
  h += '</div>';
  h += '<div class="cf-scatter-axis cf-scatter-x">OI\u503C (\u5BF9\u6570) \u2192</div><div class="cf-scatter-axis cf-scatter-y">\u2191 24h\u989D (\u5BF9\u6570)</div>';
  h += '<div class="cf-scatter-legend">';
  ['accumulation', 'early_pump', 'pump', 'mid', 'late_distribution'].forEach(function (k) {
    h += '<span class="cf-scatter-legend-item"><i style="background:' + stageColor[k] + '"></i>' + stageLabel[k] + '</span>';
  });
  h += '</div></div>';
  return h;
}

// \u2500\u2500 \u56FE\u8868 4: \u8D44\u8D39\u7387\u5206\u5E03\u76F4\u65B9\u56FE\uFF08-0.2% ~ +0.2%\uFF0C\u8D1F\u7EA2\u6B63\u7EFF\uFF09\u2500\u2500
function cfChartFunding(list) {
  var nb = 10, step = 0.04;
  var b = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  list.forEach(function (r) {
    var f = r.funding_rate_pct;
    if (f == null) return;
    if (f < -0.2 || f > 0.2) return;
    var idx = Math.floor((f + 0.2) / step);
    if (idx < 0) idx = 0; if (idx > nb - 1) idx = nb - 1;
    b[idx]++;
  });
  var max = 1; b.forEach(function (v) { if (v > max) max = v; });
  var h = '<div class="cf-hist-wrap">';
  for (var i = 0; i < nb; i++) {
    var lo = -0.2 + i * step, mid = lo + step / 2;
    var cls = mid < 0 ? ' neg' : (mid > 0 ? ' pos' : '');
    h += '<div class="cf-hist-bar"><div class="cf-hist-fill' + cls + '" style="height:' + (b[i] / max * 100) + '%"></div><div class="cf-hist-label">' + (lo >= 0 ? '+' : '') + lo.toFixed(2) + '</div></div>';
  }
  h += '</div>';
  return h;
}

// \u2500\u2500 \u4FE1\u53F7\u8BA1\u6570\u7EDF\u8BA1\u6761 \u2500\u2500
function cfStatsBar(list) {
  var keys = ['squeeze', 'small_cap', 'early_pump', 'thin_book', 'distribution', 'kill_longs', 'mentioned', 'new_listing', 'funding_anomaly'];
  var counts = {};
  keys.forEach(function (k) { counts[k] = 0; });
  list.forEach(function (r) {
    var t = r.tags || {};
    keys.forEach(function (k) { if (t[k]) counts[k]++; });
  });
  var names = { squeeze: '\u{1F525}\u6324\u538B', small_cap: '\u{1F48E}\u5C0F\u5E01', early_pump: '\u{1F680}\u62C9\u5347', thin_book: '\u26A0\uFE0F\u8584\u76D8\u53E3', distribution: '\u26D4\u5927\u540E\u671F', kill_longs: '\u{1F4C9}\u6740\u591A', mentioned: '\u{1F4CC}\u4ED6\u63D0\u8FC7', new_listing: '\u{1F195}\u65B0\u4E0A', funding_anomaly: '\u{1F4B0}\u8D44\u8D39\u5F02' };
  var h = '<div class="cf-stats">';
  keys.forEach(function (k) {
    h += '<span class="cf-stat-chip cf-chip-' + k + '">' + names[k] + ' <b>' + counts[k] + '</b></span>';
  });
  h += '</div>';
  return h;
}

// \u2500\u2500 \u5C55\u5F00\u8BE6\u60C5: \u5143\u4FE1\u606F \u2500\u2500
function cfDetailMetaHtml(r) {
  var amp = r.amplitude_pct != null ? r.amplitude_pct : r.amplitude_24h_pct;
  var tc = r.trade_count;
  var h = '<div class="cf-detail-meta">';
  h += '<div class="cf-meta-item"><span class="cf-meta-label">\u4E0A\u7EBF\u65E5\u671F</span><span>' + e(r.listing_date || 'N/A') + '</span></div>';
  h += '<div class="cf-meta-item"><span class="cf-meta-label">\u4E0A\u5E02\u5929\u6570</span><span>' + (r.days_since_listing != null ? r.days_since_listing + ' \u5929' : 'N/A') + '</span></div>';
  h += '<div class="cf-meta-item"><span class="cf-meta-label">24h\u632F\u5E45</span><span>' + (amp != null ? amp.toFixed(1) + '%' : 'N/A') + '</span></div>';
  h += '<div class="cf-meta-item"><span class="cf-meta-label">\u6210\u4EA4\u7B14\u6570</span><span>' + (tc != null ? (tc >= 1000 ? Math.round(tc / 1000) + 'k' : tc) : 'N/A') + '</span></div>';
  h += '<div class="cf-meta-item"><span class="cf-meta-label">OI\u9636\u6BB5</span><span>' + e(r.oi_stage_label) + '</span></div>';
  h += '</div>';
  return h;
}

// \u2500\u2500 \u4E3B\u6E32\u67D3 \u2500\u2500
function renderCoinfilter(container) {
  var root = container || document.getElementById('root');
  if (!root) return;
  if (!coinfilterLoaded) {
    root.innerHTML = '<div class="empty-msg">\u{1FA99} \u6570\u636E\u52A0\u8F7D\u4E2D...\uFF08\u5E01\u5B89\u5408\u7EA6 \u8D44\u8D39\u7387/\u76D8\u53E3\u6DF1\u5EA6/\u4E0A\u7EBF\u65E5\u671F \u6293\u53D6\u4E2D\uFF0C\u6BCF5\u5206\u949F\u66F4\u65B0\uFF09<br><br><button class="btn" onclick="coinfilterLoad()">\u91CD\u8BD5</button></div>';
    return;
  }
  var list = cfFiltered();
  var up = 0; list.forEach(function (r) { if ((r.change_24h_pct || 0) > 0) up++; });
  var totalVol = 0; list.forEach(function (r) { totalVol += r.volume_24h_usdt || 0; });
  var fundN = 0, newN = 0;
  list.forEach(function (r) {
    if (r.tags.funding_anomaly) fundN++;
    if (r.tags.new_listing) newN++;
  });
  var upPct = list.length > 0 ? (up / list.length * 100).toFixed(1) : '--';
  var us = coinfilterUpdated ? new Date(coinfilterUpdated).toLocaleString('zh-CN') : '--';
  var src = coinfilterSource === 'demon' ? '\u5996\u5E01\u4E2D\u7EE7(\u964D\u7EA7, \u65E0\u8D44\u8D39/\u6DF1\u5EA6/\u4E0A\u7EBF\u65E5\u671F)' : '\u5E01\u5B89\u5408\u7EA6(\u8D44\u8D39\u7387/\u76D8\u53E3/\u4E0A\u7EBF\u65E5\u671F)';

  var rows = '';
  list.forEach(function (r) {
    var fund = r.funding_rate_pct != null
      ? '<span class="cf-fund' + (r.funding_rate_pct > 0 ? ' cf-fund-pos' : r.funding_rate_pct < 0 ? ' cf-fund-neg' : '') + '">' + (r.funding_rate_pct > 0 ? '+' : '') + r.funding_rate_pct.toFixed(3) + '%</span>'
      : 'N/A';
    var depth = r.orderbook_depth_usdt != null ? cfDepth(r.orderbook_depth_usdt) : 'N/A';
    var cls = r.tags.squeeze ? ' class="cf-squeeze-row cf-row-click"' : ' class="cf-row-click"';
    rows += '<tr' + cls + ' onclick="cfToggleRow(this)">'
      + '<td class="cf-expand-arrow">\u25B8</td>'
      + '<td><b>' + e(r.base_asset) + '</b></td>'
      + '<td>' + fP(r.price) + '</td>'
      + '<td>' + fL(r.volume_24h_usdt) + '</td>'
      + '<td>' + fC(r.change_24h_pct) + '</td>'
      + '<td>' + fL(r.oi_value) + '</td>'
      + '<td><b>' + (r.volume_oi_ratio || 0).toFixed(1) + 'x</b></td>'
      + '<td>' + fund + '</td>'
      + '<td>' + depth + '</td>'
      + '<td><span class="cf-stage cf-stage-' + e(r.oi_stage) + '">' + e(r.oi_stage_label) + '</span></td>'
      + '<td>' + cfTagHtml(r) + '</td>'
      + '</tr>'
      + '<tr class="cf-detail-row" style="display:none"><td colspan="11">'
      + cfChecklistHtml(r.base_asset)
      + cfDetailMetaHtml(r)
      + '</td></tr>';
  });

  var H = '';
  H += '<div class="app-header"><h1>\u{1FA99} \u5C0F\u5E01\u7B5B\u9009\u5668</h1><p>\u57FA\u4E8E @derrrrrrrq \u65B9\u6CD5\u8BBA \u2014 \u5C0F\u5E01OI\u533A\u95F4 \xB7 \u6362\u624B \xB7 \u76D8\u53E3\u6DF1\u5EA6 \u2014 \u6570\u636E\u6E90: \u5E01\u5B89\u5408\u7EA6 (\u6BCF5\u5206\u949F\u4E2D\u7EE7)</p></div>';
  H += '<div class="status-bar ok"><span>\u626B\u63CF ' + coinfilterData.length + ' \u4E2A\u5408\u7EA6 \xB7 \u7B5B\u9009\u547D\u4E2D ' + list.length + '</span><span>\u6570\u636E\u6E90: ' + src + ' \xB7 \u66F4\u65B0 ' + us + '</span></div>';
  H += '<div class="layout"><div class="sidebar">';
  H += '<div class="cf-preset-row">';
  for (var i = 0; i < CF_PRESETS.length; i++) {
    H += '<button class="cf-preset' + (cPreset === CF_PRESETS[i][0] ? ' active' : '') + '" id="c-preset-' + CF_PRESETS[i][0] + '" onclick="cfSetPreset('' + CF_PRESETS[i][0] + '')">' + CF_PRESETS[i][1] + '</button>';
  }
  H += '</div>';
  H += '<div class="cf-filter-card"><div class="label">\u989D/OI\u6BD4 (x)</div><div class="input-row"><input type="number" id="c-ratio-min-i" class="filter-input" value="0" min="0" step="1" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-ratio-max-i" class="filter-input" value="999" min="0" step="1" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-ratio-min" min="0" max="200" value="0" oninput="cfApply()"><input type="range" id="c-ratio-max" min="0" max="200" value="200" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">OI\u533A\u95F4 (\u767E\u4E07$)</div><div class="input-row"><input type="number" id="c-oi-min-i" class="filter-input" value="0" min="0" step="1" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-oi-max-i" class="filter-input" value="9999" min="0" step="1" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-oi-min" min="0" max="500" value="0" oninput="cfApply()"><input type="range" id="c-oi-max" min="0" max="500" value="500" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">24h\u6DA8\u5E45 (%)</div><div class="input-row"><input type="number" id="c-chg-min-i" class="filter-input" value="-100" min="-100" max="500" step="1" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-chg-max-i" class="filter-input" value="100" min="-100" max="500" step="1" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-chg-min" min="-100" max="100" value="-100" oninput="cfApply()"><input type="range" id="c-chg-max" min="-100" max="100" value="100" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">24h\u6210\u4EA4\u989D (\u767E\u4E07$)</div><div class="input-row"><input type="number" id="c-vol-min-i" class="filter-input" value="0" min="0" step="1" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-vol-max-i" class="filter-input" value="99999" min="0" step="1" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-vol-min" min="0" max="2000" value="0" oninput="cfApply()"><input type="range" id="c-vol-max" min="0" max="2000" value="2000" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">\u8D44\u8D39\u7387 (%)</div><div class="input-row"><input type="number" id="c-fund-min-i" class="filter-input" value="-1" min="-5" max="5" step="0.01" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-fund-max-i" class="filter-input" value="1" min="-5" max="5" step="0.01" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-fund-min" min="-1" max="1" step="0.01" value="-1" oninput="cfApply()"><input type="range" id="c-fund-max" min="-1" max="1" step="0.01" value="1" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">\u76D8\u53E3\u6DF1\u5EA6 (K$)</div><div class="input-row"><input type="number" id="c-depth-min-i" class="filter-input" value="0" min="0" step="1" onchange="cfApply()"><span class="range-sep">~</span><input type="number" id="c-depth-max-i" class="filter-input" value="999999" min="0" step="1" onchange="cfApply()"></div><div class="input-row"><input type="range" id="c-depth-min" min="0" max="2000" value="0" oninput="cfApply()"><input type="range" id="c-depth-max" min="0" max="2000" value="2000" oninput="cfApply()"></div></div>';
  H += '<div class="cf-filter-card"><div class="label">\u641C\u7D22\u5E01\u79CD</div><input type="text" id="c-query" class="filter-input" style="width:100%" placeholder="\u5982: BANK" oninput="cfApply()"></div>';
  H += '<div class="cf-filter-card"><div class="label">\u6392\u5E8F\u65B9\u5F0F</div><div class="cf-sort-row"><select id="c-sort" onchange="cfApply()">'
    + '<option value="ratio">\u989D/OI\u6BD4 \u2193</option><option value="oi">OI\u503C \u2193</option><option value="chg">24h\u6DA8\u5E45 \u2193</option><option value="depth">\u76D8\u53E3\u6DF1\u5EA6 \u2191</option></select></div></div>';
  H += '<button class="refresh-btn" onclick="cfReload()">\u5237\u65B0\u6570\u636E</button>';
  H += '<div style="font-size:.6rem;color:var(--text-muted);text-align:center;margin-top:8px">\u672C\u5730\u4E2D\u7EE7\u63A8\u9001 \xB7 \u6BCF5\u5206\u949F</div>';
  H += '</div><div class="main">';
  H += '<div class="kpi-row">';
  H += '<div class="kpi-card"><div class="kpi-label">\u626B\u63CF\u5408\u7EA6</div><div class="kpi-value">' + coinfilterData.length + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">\u7B5B\u9009\u547D\u4E2D</div><div class="kpi-value">' + list.length + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">\u4E0A\u6DA8\u5360\u6BD4</div><div class="kpi-value">' + upPct + '%</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">\u{1F4B0}\u8D44\u8D39\u5F02</div><div class="kpi-value">' + fundN + '</div></div>';
  H += '<div class="kpi-card"><div class="kpi-label">\u{1F195}\u65B0\u4E0A</div><div class="kpi-value">' + newN + '</div></div>';
  H += '</div>';
  H += cfStatsBar(list);
  H += '<div class="table-wrap"><div class="table-title">\u{1FA99} \u5C0F\u5E01\u7B5B\u9009\u7ED3\u679C <span style="font-weight:400;font-size:.7rem;color:var(--text-muted);margin-left:8px">\u70B9\u51FB\u8868\u5934\u6392\u5E8F \xB7 \u70B9\u51FB\u884C\u5C55\u5F00\u68C0\u67E5\u6E05\u5355 \xB7 24h\u989D\u5408\u8BA1 $' + fL(totalVol) + '</span></div><div class="table-scroll"><table><thead><tr>';
  H += '<th></th><th onclick="cfSortBy('sym')">\u4EA4\u6613\u5BF9</th><th>\u4EF7\u683C</th><th onclick="cfSortBy('vol')">24h\u989D</th><th onclick="cfSortBy('chg')">24h\u6DA8\u5E45</th><th onclick="cfSortBy('oi')">OI\u503C</th><th onclick="cfSortBy('ratio')">\u989D/OI\u6BD4</th><th>\u8D44\u8D39\u7387</th><th onclick="cfSortBy('depth')">\u76D8\u53E3\u6DF1\u5EA6</th><th>\u9636\u6BB5</th><th>\u4FE1\u53F7</th>';
  H += '</tr></thead><tbody>' + (rows || '<tr><td colspan="11" class="empty-msg">\u65E0\u5339\u914D\u7ED3\u679C</td></tr>') + '</tbody></table></div></div>';
  H += '<div class="cf-chart-wrap"><h4>\u{1F525} \u989D/OI\u6BD4 Top20\uFF08\u6362\u624B\u9AD8\u4F46OI\u6CA1\u8DDF\u4E0A \u2192 \u6324\u538B\u7A7A\u95F4\uFF09</h4>' + cfChartRatio(list) + '</div>';
  H += '<div class="cf-chart-wrap"><h4>\u{1F4CA} OI\u533A\u95F4\u5206\u5E03\uFF08\u7070=\u84C4\u6C34 \xB7 \u84DD=\u5C0F\u5E01\u5019\u9009 \xB7 \u7EFF=\u62C9\u5347\u671F \xB7 \u6A59=\u4E2D\u671F \xB7 \u7EA2=\u5927\u540E\u671F\uFF09</h4>' + cfChartOi(list) + '</div>';
  H += '<div class="cf-chart-wrap"><h4>\u{1FAE7} OI\u503C vs 24h\u989D\uFF08\u5BF9\u6570\u5750\u6807 \xB7 \u70B9\u5927\u5C0F=\u989D/OI\u6BD4 \xB7 \u989C\u8272=OI\u9636\u6BB5\uFF09</h4>' + cfChartScatter(list) + '</div>';
  H += '<div class="cf-chart-wrap"><h4>\u{1F4B0} \u8D44\u8D39\u7387\u5206\u5E03\uFF08% \xB7 \u8D1F=\u505A\u591A\u4ED8\u8D39 / \u6B63=\u505A\u7A7A\u4ED8\u8D39\uFF09</h4>' + cfChartFunding(list) + '</div>';
  H += '<div class="cf-note">\u4FE1\u53F7\u89C4\u5219: \u{1F525}\u6324\u538B \u989D/OI\u226510x \u4E14 OI&gt;5M \xB7 \u{1F48E}\u5C0F\u5E01 OI 2M-8M \xB7 \u{1F680}\u62C9\u5347\u65E9\u671F OI 8M-30M \u4E14 24h&gt;0% \xB7 \u26A0\uFE0F\u8584\u76D8\u53E3 \u6DF1\u5EA6&lt;200K \xB7 \u26D4\u5927\u540E\u671F OI&gt;80M \u4E14 \u989D/OI&lt;3x \u4E14 \u8DCC\u5E45&gt;10% \xB7 \u{1F4C9}\u6740\u591A 24h&lt;-5% \xB7 \u{1F4CC}\u4ED6\u63D0\u8FC7 25\u4E2A\u5E01 \xB7 \u{1F195}\u65B0\u4E0A \u226430\u5929 \xB7 \u{1F4B0}\u8D44\u8D39\u5F02\u5E38 \u8D44\u8D39\u7387&gt;+0.05% \u6216 &lt;-0.05%<br>OI\u9636\u6BB5: \u23F3\u84C4\u6C34&lt;2M \xB7 \u{1F48E}\u5C0F\u5E01\u5019\u9009 2M-8M \xB7 \u{1F680}\u62C9\u5347\u671F 8M-30M \xB7 \u26A1\u4E2D\u671F 30M-80M \xB7 \u26D4\u5927\u540E\u671F&gt;80M \xB7 \u8D44\u8D39/\u76D8\u53E3/\u4E0A\u7EBF\u65E5\u671F \u7531\u672C\u5730\u4E2D\u7EE7\u6BCF5\u5206\u949F\u6293\u53D6\uFF08\u672A\u5C31\u7EEA\u65F6\u81EA\u52A8\u964D\u7EA7\u5996\u5E01\u6570\u636E\uFF09</div>';
  H += '<div class="footer">\u26A0\uFE0F \u4EC5\u4F9B\u7814\u7A76\u53C2\u8003\uFF0C\u4E0D\u6784\u6210\u6295\u8D44\u5EFA\u8BAE<br>\u6700\u540E\u66F4\u65B0 ' + us + '</div>';
  H += '</div></div>';
  root.innerHTML = H;
  cfSyncInputs();
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// // \u{1F9ED} \u7B5B\u5E01\u5DE5\u4F5C\u53F0 \u89C6\u56FE\uFF08\u7B2C 5 tab\uFF09\u2014 L0-L5 \u5B8C\u6574\u7B5B\u5E01\u903B\u8F91
// \u6570\u636E: GET /api/screener\uFF08\u670D\u52A1\u7AEF\u5408\u5E76 forward + coinfilter + data\uFF0C\u8BA1\u7B97\u73AF\u5883\u95F8\u95E8/\u6392\u9664\u5C42/\u544A\u8B66\uFF09
// \u89C4\u5219: \u786C\u95E8\u69DB\u4E94\u8981\u7D20(\u4E0B\u884C\u4FDD\u62A4 dn10 3.3%) + \u5F3A\u5EA6\u5206(\u53D9\u4E8B+1) + \u4E8B\u4EF6\u56DE\u907F(-3, fwd5 -1.7%)
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
var scData = [], scLoaded = false, scTag = '', scSort = 'forward_score', scAsc = false;
// OI \u8303\u56F4\u81EA\u5B9A\u4E49\uFF08\u5BA2\u6237\u7AEF\u8FC7\u6EE4\uFF0C\u9ED8\u8BA4\u4E0D\u8BBE\u9650 = \u5168\u5E02\u573A\uFF0C\u903B\u8F91\u4E0D\u53D8\uFF09
var scOiMin = null, scOiMax = null;

var __scSwitchTab = (typeof switchTab === 'function') ? switchTab : null;
switchTab = function (t) {
  if (t === 'watchlist') {
    curTab = t;
    var tb = document.getElementById('tabbar');
    if (tb) {
      tb.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      var btn = tb.querySelector('.tab-watchlist');
      if (btn) btn.classList.add('active');
    }
    if (!scLoaded) scLoad(); else renderScreener();
    return;
  }
  if (__scSwitchTab) { __scSwitchTab(t); return; }
  if (t === 'demon' && typeof renderDemon === 'function') { renderDemon(); return; }
  if (typeof rD === 'function') rD();
};

var __scRD = (typeof rD === 'function') ? rD : null;
rD = function () {
  if (curTab === 'watchlist') { renderScreener(); return; }
  if (__scRD) __scRD();
};

// \u{1F504} \u5168\u5C40\u81EA\u52A8\u5237\u65B0\uFF1A\u6BCF 5 \u5206\u949F\u6309\u5F53\u524D tab \u91CD\u65B0\u62C9\u53D6\uFF08\u4E0E relay \u66F4\u65B0\u5468\u671F\u5BF9\u9F50\uFF09
setInterval(function () {
  try {
    if (curTab === 'chip') { lX(); }
    else if (curTab === 'demon' && typeof demonLoad === 'function') { demonLoad(); }
    else if (curTab === 'coinfilter' && typeof coinfilterLoad === 'function') { coinfilterLoad(); }
    else if (curTab === 'forward' && typeof forwardLoad === 'function') { forwardLoad(); }
    else if (curTab === 'watchlist' && typeof scLoad === 'function') { scLoad(); }
  } catch (e) { /* \u9759\u9ED8\u5931\u8D25\uFF0C\u4E0B\u6B21\u518D\u8BD5 */ }
}, 300000); // 5 \u5206\u949F

function scLoad() {
  var root = document.getElementById('root');
  root.innerHTML = '<div class="empty-msg">\u{1F9ED} \u6B63\u5728\u52A0\u8F7D\u7B5B\u5E01\u5DE5\u4F5C\u53F0\uFF08L0 \u73AF\u5883\u95F8\u95E8 + \u5019\u9009\u6C60 + \u6392\u9664\u5C42 + \u544A\u8B66\uFF09...</div>';
  fetch(BASE + '/api/screener').then(function (r) { return r.json(); }).then(function (d) {
    var rows = d.data || [];
    if (d.error && !rows.length) throw new Error(d.error);
    scData = rows;
    scEnv = d.env || null;
    scLoaded = true;
    renderScreener();
  }).catch(function (err) {
    root.innerHTML = '<div class="empty-msg">\u{1F9ED} \u6570\u636E\u52A0\u8F7D\u5931\u8D25: ' + e(err.message) + '<br><br><button class="btn" onclick="scLoad()">\u91CD\u8BD5</button></div>';
  });
}
var scEnv = null;

function scFiltered() {
  var rows = scData.slice();
  if (scTag === 'acc') rows = rows.filter(function (r) { return r.effective_signal === 'acc_candidate' || r.effective_signal === 'acc_candidate_env_bear'; });
  else if (scTag === 'avoid') rows = rows.filter(function (r) { return r.event_day || r.forward_signal === 'avoid_event'; });
  else if (scTag === 'alerts') rows = rows.filter(function (r) { return r.alerts && r.alerts.length > 0; });
  else if (scTag === 'thin') rows = rows.filter(function (r) { return r.thin_book; });
  // OI \u8303\u56F4\u8FC7\u6EE4\uFF08\u9ED8\u8BA4\u4E0D\u8BBE\u9650\uFF09
  if (scOiMin != null) rows = rows.filter(function (r) { return (r.oi_value || 0) >= scOiMin; });
  if (scOiMax != null) rows = rows.filter(function (r) { return (r.oi_value || 0) <= scOiMax; });
  rows.sort(function (a, b) {
    var va = a[scSort] || 0, vb = b[scSort] || 0;
    return scAsc ? va - vb : vb - va;
  });
  return rows;
}

// OI \u8303\u56F4\u63A7\u4EF6
function scSetOiRange() {
  var minEl = document.getElementById('sc-oi-min');
  var maxEl = document.getElementById('sc-oi-max');
  var minV = minEl ? parseFloat(minEl.value) : NaN;
  var maxV = maxEl ? parseFloat(maxEl.value) : NaN;
  scOiMin = !isNaN(minV) && minV > 0 ? minV * 1e6 : null;
  scOiMax = !isNaN(maxV) && maxV > 0 ? maxV * 1e6 : null;
  renderScreener();
}
function scClearOiRange() {
  scOiMin = null; scOiMax = null;
  var minEl = document.getElementById('sc-oi-min');
  var maxEl = document.getElementById('sc-oi-max');
  if (minEl) minEl.value = '';
  if (maxEl) maxEl.value = '';
  renderScreener();
}

function scSetPreset(t) { scTag = t; renderScreener(); }
function scSortBy(k) { if (scSort === k) scAsc = !scAsc; else { scSort = k; scAsc = false; } renderScreener(); }

function scEnvHtml() {
  if (!scEnv || scEnv.up == null) return '<div class="fwd-hint fwd-hint-na">L0 \u73AF\u5883\u95F8\u95E8\uFF1A\u672A\u77E5\uFF08\u5019\u9009\u6C60\u51BB\u7ED3\uFF0C\u4FDD\u5B88\uFF09</div>';
  if (scEnv.up) return '<div class="fwd-hint fwd-hint-bull">L0 \u73AF\u5883\u95F8\u95E8\uFF1A\u{1F7E2} \u653E\u884C\uFF08BTC ' + fP(scEnv.close) + ' &gt; SMA20 ' + fP(scEnv.sma20) + '\uFF09\u2014 \u84C4\u6C34\u5019\u9009\u53EF\u542F\u7528\uFF08\u9A8C\u8BC1\uFF1A\u6DA8\u5E02 +0.8%/\u80DC\u738756%\uFF09</div>';
  return '<div class="fwd-hint fwd-hint-bear">L0 \u73AF\u5883\u95F8\u95E8\uFF1A\u{1F534} \u51BB\u7ED3\uFF08BTC ' + fP(scEnv.close) + ' &lt; SMA20 ' + fP(scEnv.sma20) + '\uFF09\u2014 \u84C4\u6C34\u5019\u9009\u964D\u7EA7\u4E3A env_bear\uFF0C\u7981\u6B62\u6309\u5019\u9009\u6C60\u8FDB\u573A\uFF08\u9A8C\u8BC1\uFF1A\u8DCC\u5E02 -5.3%/\u80DC\u738731%\uFF09</div>';
}

function scSigTag(r) {
  var t = [];
  if (r.effective_signal === 'acc_candidate') t.push('<span class="tag tag-acc">\u{1F9ED}\u84C4\u6C34\u5019\u9009</span>');
  else if (r.effective_signal === 'acc_candidate_env_bear') t.push('<span class="tag tag-watch">\u{1F9ED}\u5019\u9009(\u73AF\u5883\u51BB\u7ED3)</span>');
  else if (r.forward_signal === 'avoid_event' || r.event_day) t.push('<span class="tag tag-danger">\u26D4\u4E8B\u4EF6\u56DE\u907F</span>');
  else if (r.forward_signal === 'watch') t.push('<span class="tag tag-watch">\u{1F441}\u89C2\u5BDF</span>');
  if (r.thin_book) t.push('<span class="tag tag-watch">\u26A0\uFE0F\u8584\u76D8\u53E3</span>');
  if (r.distribution) t.push('<span class="tag tag-danger">\u26D4\u5927\u540E\u671F</span>');
  if (r.kill_longs) t.push('<span class="tag tag-watch">\u{1F4C9}\u6740\u591A</span>');
  if (r.neg_fund_pump) t.push('<span class="tag tag-danger">\u26D4\u8D1F\u8D39\u7387\u62C9\u76D8</span>');
  if (r.tags && r.tags.indexOf('squeeze') >= 0) t.push('<span class="tag tag-danger">\u{1F525}\u6324\u538B</span>');
  if (r.tags && r.tags.indexOf('small_cap') >= 0) t.push('<span class="tag tag-acc">\u{1F48E}\u5C0F\u5E01</span>');
  if (r.tags && r.tags.indexOf('early_pump') >= 0) t.push('<span class="tag tag-new">\u{1F680}\u62C9\u5347</span>');
  return t.join(' ');
}

function scAlertHtml(r) {
  if (!r.alerts || !r.alerts.length) return '';
  return r.alerts.map(function (a) { return '<span class="tag tag-new">\u{1F514}' + e(a) + '</span>'; }).join(' ');
}

function renderScreener() {
  var root = document.getElementById('root');
  var rows = scFiltered();
  var nAcc = scData.filter(function (r) { return r.effective_signal === 'acc_candidate' || r.effective_signal === 'acc_candidate_env_bear'; }).length;
  var nAvoid = scData.filter(function (r) { return r.event_day || r.forward_signal === 'avoid_event'; }).length;
  var nAlert = scData.filter(function (r) { return r.alerts && r.alerts.length > 0; }).length;
  var nThin = scData.filter(function (r) { return r.thin_book; }).length;

  var H = '<div class="fwd-wrap">';
  H += scEnvHtml();
  H += '<div class="fwd-bar">';
  H += '<button class="btn' + (scTag === '' ? ' btn-active' : '') + '" onclick="scSetPreset('')">\u{1F3AF} \u5168\u90E8 (' + rows.length + ')</button>';
  H += '<button class="btn' + (scTag === 'acc' ? ' btn-active' : '') + '" onclick="scSetPreset('acc')">\u{1F9ED} \u5019\u9009\u6C60 (' + nAcc + ')</button>';
  H += '<button class="btn' + (scTag === 'avoid' ? ' btn-active' : '') + '" onclick="scSetPreset('avoid')">\u26D4 \u56DE\u907F\u540D\u5355 (' + nAvoid + ')</button>';
  H += '<button class="btn' + (scTag === 'alerts' ? ' btn-active' : '') + '" onclick="scSetPreset('alerts')">\u{1F514} \u544A\u8B66 (' + nAlert + ')</button>';
  H += '<button class="btn' + (scTag === 'thin' ? ' btn-active' : '') + '" onclick="scSetPreset(' + "'thin'" + ')">\u26A0\uFE0F \u8584\u76D8\u53E3 (' + nThin + ')</button>';
  H += '</div>';
  H += '<div class="fwd-bar" style="flex-wrap:wrap;gap:6px;align-items:center">';
  H += '<span class="dim">OI \u8303\u56F4 (USDT):</span>';
  H += '<input id="sc-oi-min" type="number" placeholder="\u6700\u5C0F M" style="width:90px;padding:4px 6px;background:var(--surface-alt);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px" value="' + (scOiMin != null ? (scOiMin / 1e6) : '') + '" onkeydown="if(event.key===' + "'Enter'" + ')scSetOiRange()">';
  H += '<span class="dim">\u2014</span>';
  H += '<input id="sc-oi-max" type="number" placeholder="\u6700\u5927 M" style="width:90px;padding:4px 6px;background:var(--surface-alt);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px" value="' + (scOiMax != null ? (scOiMax / 1e6) : '') + '" onkeydown="if(event.key===' + "'Enter'" + ')scSetOiRange()">';
  H += '<button class="btn btn-sm" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-weight:700" onclick="scSetOiRange()">\u2713 \u786E\u5B9A</button>';
  H += '<button class="btn btn-sm" onclick="scClearOiRange()">\u6E05\u9664</button>';
  H += '<span class="dim" id="sc-oi-status">' + (scOiMin != null || scOiMax != null ? '\u{1F50D} \u5DF2\u8FC7\u6EE4 OI ' + (scOiMin != null ? (scOiMin/1e6) : '0') + 'M ~ ' + (scOiMax != null ? (scOiMax/1e6) : '\u221E') + 'M' : '\u672A\u8FC7\u6EE4\uFF08\u5168\u5E02\u573A\uFF09') + '</span>';
  H += '</div>';
  H += '<div class="fwd-stats">\u{1F9ED}\u5019\u9009 ' + nAcc + ' \xB7 \u26D4\u56DE\u907F ' + nAvoid + ' \xB7 \u{1F514}\u544A\u8B66 ' + nAlert + ' \xB7 \u26A0\uFE0F\u8584\u76D8\u53E3 ' + nThin + '</div>';

  if (!rows.length) {
    H += '<div class="empty-msg">\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u5E01\u3002</div>';
  } else {
    H += '<div class="table-wrap"><table class="tbl fwd-tbl"><thead><tr>';
    H += '<th class="sortable" onclick="scSortBy('symbol')">\u5E01\u79CD</th>';
    H += '<th class="sortable" onclick="scSortBy('price')">\u4EF7\u683C</th>';
    H += '<th class="sortable" onclick="scSortBy('change_24h_pct')">24h%</th>';
    H += '<th class="sortable" onclick="scSortBy('market_cap')">\u5E02\u503C</th>';
    H += '<th class="sortable" onclick="scSortBy('oi_value')">OI</th>';
    H += '<th class="sortable" onclick="scSortBy('volume_oi_ratio')">\u989D/OI</th>';
    H += '<th class="sortable" onclick="scSortBy('funding_rate_pct')">\u8D44\u8D39%</th>';
    H += '<th class="sortable" onclick="scSortBy('drawdown_60d')">\u56DE\u64A460d</th>';
    H += '<th class="sortable" onclick="scSortBy('range_20d')">\u6A2A\u76D820d</th>';
    H += '<th class="sortable" onclick="scSortBy('vol_shrink_20d')">\u7F29\u91CF</th>';
    H += '<th class="sortable" onclick="scSortBy('forward_score')">\u8BC4\u5206</th>';
    H += '<th>\u4FE1\u53F7</th><th>\u544A\u8B66</th>';
    H += '</tr></thead><tbody>';
    rows.slice(0, 300).forEach(function (r) {
      var isAvoid = r.event_day || r.forward_signal === 'avoid_event';
      var rowCls = isAvoid ? 'fwd-avoid' : (r.effective_signal === 'acc_candidate' ? 'fwd-acc' : '');
      H += '<tr class="' + rowCls + '">';
      H += '<td class="mono"><b>' + e(r.base_asset) + '</b></td>';
      H += '<td class="mono">' + (r.price != null ? fP(r.price) : '\u2014') + '</td>';
      H += '<td class="' + ((r.change_24h_pct || 0) >= 0 ? 'up' : 'down') + '">' + (r.change_24h_pct != null ? fC(r.change_24h_pct) : '\u2014') + '</td>';
      H += '<td class="mono">' + (r.market_cap != null ? '$' + (r.market_cap / 1e6).toFixed(1) + 'M' : '\u2014') + '</td>';
      H += '<td class="mono">' + (r.oi_value != null ? '$' + (r.oi_value / 1e6).toFixed(1) + 'M' : '\u2014') + '</td>';
      H += '<td class="mono">' + (r.volume_oi_ratio != null ? r.volume_oi_ratio.toFixed(1) + 'x' : '\u2014') + '</td>';
      H += '<td class="mono">' + (r.funding_rate_pct != null ? r.funding_rate_pct.toFixed(3) + '%' : '\u2014') + '</td>';
      H += '<td class="mono">' + (r.drawdown_60d != null ? (r.drawdown_60d * 100).toFixed(0) + '%' : '\u2014') + '</td>';
      H += '<td class="mono">' + (r.range_20d != null ? (r.range_20d * 100).toFixed(0) + '%' : '\u2014') + '</td>';
      H += '<td class="mono">' + (r.vol_shrink_20d != null ? (r.vol_shrink_20d * 100).toFixed(0) + '%' : '\u2014') + '</td>';
      H += '<td class="mono score">' + (r.forward_score != null ? r.forward_score : '\u2014') + '</td>';
      H += '<td>' + scSigTag(r) + '</td>';
      H += '<td>' + scAlertHtml(r) + '</td>';
      H += '</tr>';
    });
    H += '</tbody></table></div>';
  }
  H += '<div class="fwd-foot dim">L0 \u73AF\u5883\u95F8\u95E8\uFF1ABTC vs SMA20\uFF08\u9A8C\u8BC1\uFF1A\u6DA8\u5E02 +0.8%/56%\uFF0C\u8DCC\u5E02 -5.3%/31%\uFF09\xB7 L1 \u5019\u9009\u6C60\uFF1A\u786C\u95E8\u69DB\u4E94\u8981\u7D20\uFF08dn10 3.3% vs 9.7% \u4E0B\u884C\u4FDD\u62A4\uFF09\xB7 L2 \u6392\u9664\uFF1A\u4E8B\u4EF6\u56DE\u907F(\u989D/OI\u22655, fwd5 -1.7%)/\u8584\u76D8\u53E3/\u5927\u540E\u671F/\u6740\u591A/\u8D1F\u8D39\u7387\u62C9\u76D8 \xB7 L4 \u544A\u8B66\uFF1AST-Spring/\u5927\u9633\u7EBF\u540E\u76D8\u6574/\u653E\u91CF+OI\u8DDF\u4E0A/\u6DF1\u8D1F\u8D44\u8D39\u3002\u53D9\u4E8B\u56E0\u5B50\uFF08\u5927\u9633\u7EBF/\u7F13\u6DA8/Spring/\u8D44\u8D39\uFF09\u4E3A +1 \u52A0\u5206\uFF0C\u672A\u7EDF\u8BA1\u9A8C\u8BC1\u3002\u4EC5\u4F9B\u7814\u7A76\u53C2\u8003\uFF0C\u4E0D\u6784\u6210\u6295\u8D44\u5EFA\u8BAE\u3002</div>';
  H += '</div>';
  root.innerHTML = H;
}
<\/script>
</body></html>
`;
  var KV_HTML_KEY = "dashboard_html";
  function json(d, s = 200) {
    return new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
  }
  __name(json, "json");
  function html(c, s = 200) {
    return new Response(c, { status: s, headers: { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
  }
  __name(html, "html");
  function normalizePath(p) {
    for (const pre of ["/screener", ""]) {
      if (p === pre || p === pre + "/") return "/";
      if (p.startsWith(pre + "/")) return p.slice(pre.length);
    }
    return p;
  }
  __name(normalizePath, "normalizePath");
  function matchMarketKey(ba, sym, map) {
    const u = (ba || "").toUpperCase();
    if (map[u]) return map[u];
    if (map[sym]) return map[sym];
    const c = u.replace(/^\d{4,}x?/, "");
    if (c && c !== u && map[c]) return map[c];
    return null;
  }
  __name(matchMarketKey, "matchMarketKey");
  function crossValidateRatio(a, b) {
    if (a == null || b == null) return null;
    const mx = Math.max(a, b), mn = Math.min(a, b);
    if (mx === 0) return null;
    const d = (mx - mn) / mx;
    if (d > 0.3) return { conflicted: true, cmc_ratio: Math.round(a * 1e4) / 1e4, cg_ratio: Math.round(b * 1e4) / 1e4, discrepancy: Math.round(d * 100) };
    return null;
  }
  __name(crossValidateRatio, "crossValidateRatio");
  async function refreshData(kv, env) {
    const pR = await kv.get("exchange_proxy").catch(() => null);
    let pU = null;
    if (pR) {
      try {
        pU = JSON.parse(pR).updated || null;
      } catch (e) {
      }
    }
    const pA = pU ? Date.now() - new Date(pU).getTime() : Infinity, has = pR && pA < 5 * 60 * 1e3;
    let bn = null, bb = null, ok = null, src = 0;
    if (has) {
      try {
        const p = JSON.parse(pR);
        if (p.binance) {
          bn = p.binance;
          src++;
        }
        if (p.bybit) {
          bb = p.bybit;
          src++;
        }
        if (p.okx) {
          ok = p.okx;
          src++;
        }
      } catch (e) {
      }
    }
    if (!has) {
      const [a, b, c] = await Promise.allSettled([fBN(), fBB(), fOK()]);
      if (a.status === "fulfilled") {
        bn = a.value;
        src++;
      }
      if (b.status === "fulfilled") {
        bb = b.value;
        src++;
      }
      if (c.status === "fulfilled") {
        ok = c.value;
        src++;
      }
    }
    const dbg = {};
    dbg.Binance = bn ? { t: bn.length, ok: true } : { e: "unavail" };
    dbg.Bybit = bb ? { t: bb.length, ok: true } : { e: "unavail" };
    dbg.OKX = ok ? { t: ok.length, ok: true } : { e: "unavail" };
    dbg.proxy = { active: has, s: src };
    await kv.put("exchange_debug", JSON.stringify(dbg)).catch(() => {
    });
    const cmc = await fCMC(env).catch(() => null);
    let cg = null;
    const lC = await kv.get("last_cg_fetch").catch(() => null);
    if (!lC || Date.now() - new Date(lC).getTime() > 36e5) {
      cg = await fCG(env).catch(() => null);
      if (cg) await kv.put("last_cg_fetch", (/* @__PURE__ */ new Date()).toISOString()).catch(() => {
      });
    }
    const ex = [];
    {
      const s = {};
      for (const r of [bn, bb, ok]) if (r) for (const row of r) {
        const sym = row.symbol;
        if (!s[sym] || (row.volume_24h_usdt || 0) > (s[sym].volume_24h_usdt || 0)) s[sym] = row;
      }
      for (const k of Object.keys(s)) ex.push(s[k]);
    }
    function va(coin, k) {
      if (!cg) return coin;
      const g = cg[k] || matchMarketKey(coin.base_asset, coin.symbol, cg);
      if (!g) return coin;
      const cf = crossValidateRatio(coin.circulating_ratio, g.circulating_ratio);
      if (cf) {
        coin.data_conflict = true;
        coin.discrepancy_pct = cf.discrepancy;
        coin.cmc_ratio = cf.cmc_ratio;
        coin.cg_ratio = cf.cg_ratio;
        if (coin.market_cap != null && g.market_cap != null && cf.cg_ratio < cf.cmc_ratio * 0.5 && g.market_cap < coin.market_cap * 0.5) coin.stale_cg_data = true;
        coin.unlock_risk = uL((coin.circulating_ratio + g.circulating_ratio) / 2);
      }
      return coin;
    }
    __name(va, "va");
    if (ex.length > 0 && cmc && src >= 2) {
      const m = [];
      for (const row of ex) {
        const ba = (row.base_asset || "").toUpperCase(), c = matchMarketKey(ba, row.symbol, cmc), mcap = c ? c.market_cap : null, cr = c ? c.circulating_ratio : null;
        let coin = { symbol: row.symbol, name: c ? c.name : ba, base_asset: row.base_asset, price: row.price, market_cap: mcap, circulating_supply: c ? c.circulating_supply : null, total_supply: c ? c.total_supply : null, max_supply: c ? c.max_supply : null, circulating_ratio: cr, cmc_rank: c ? c.cmc_rank : null, volume_24h_usdt: row.volume_24h_usdt, percent_change_7d: c ? c.percent_change_7d : null, change_24h_pct: row.change_24h_pct, amplitude_24h_pct: row.amplitude_24h_pct, star_rating: aS(mcap, cr, false), unlock_risk: uL(cr), momentum_alert: !!(c && c.percent_change_7d != null && c.percent_change_7d > 0 && row.amplitude_24h_pct > 10) };
        coin = va(coin, ba);
        coin.star_rating = aS(coin.market_cap, coin.circulating_ratio, coin.data_conflict, coin.stale_cg_data);
        m.push(coin);
      }
      const f = m.filter((r) => r.market_cap != null && r.market_cap >= 15e6);
      if (f.length > 0) {
        await kv.put("data", JSON.stringify(f));
        await kv.put("last_updated", (/* @__PURE__ */ new Date()).toISOString());
        await kv.put("count", String(f.length));
        console.log("B1:", f.length, "coins");
        return;
      }
    }
    if (cmc) {
      const exMap = {};
      for (const row of ex) {
        const k = (row.base_asset || "").toUpperCase();
        exMap[k] = row;
        exMap[row.symbol] = row;
      }
      ;
      const coins = [];
      for (const [sym, c] of Object.entries(cmc)) {
        if (c.market_cap == null || c.market_cap < 15e6) continue;
        const xr = exMap[sym] || exMap[(c.symbol || "").toUpperCase()] || matchMarketKey((c.symbol || "").toUpperCase(), sym, exMap);
        let coin = { symbol: c.symbol || "", name: c.name || (c.symbol || "").toUpperCase(), base_asset: (c.symbol || "").toUpperCase(), price: xr ? xr.price : c.price, market_cap: c.market_cap, circulating_supply: c.circulating_supply, total_supply: c.total_supply, max_supply: c.max_supply, circulating_ratio: c.circulating_ratio, cmc_rank: c.cmc_rank, volume_24h_usdt: xr ? xr.volume_24h_usdt : c.volume_24h_usdt, percent_change_7d: c.percent_change_7d, change_24h_pct: xr ? xr.change_24h_pct : null, amplitude_24h_pct: xr ? xr.amplitude_24h_pct : null, star_rating: aS(c.market_cap, c.circulating_ratio, false), unlock_risk: uL(c.circulating_ratio), momentum_alert: !!(xr && c.percent_change_7d > 0 && xr.amplitude_24h_pct > 10) };
        coin = va(coin, sym);
        if (coin.circulating_ratio > 1) {
          coin.supply_data_error = true;
          coin.circulating_ratio = 1;
        }
        ;
        if (coin.circulating_ratio >= 1 && (!coin.volume_24h_usdt || coin.volume_24h_usdt < 100)) {
          coin.low_confidence_supply = true;
        }
        ;
        coin.star_rating = aS(coin.market_cap, coin.circulating_ratio, coin.data_conflict || coin.supply_data_error, coin.stale_cg_data);
        coins.push(coin);
      }
      if (coins.length > 0) {
        await kv.put("data", JSON.stringify(coins));
        await kv.put("last_updated", (/* @__PURE__ */ new Date()).toISOString());
        await kv.put("count", String(coins.length));
        console.log("B2:", coins.length, "coins");
        return;
      }
    }
    if (ex.length > 0) {
      const coins = ex.map((r) => ({ symbol: r.symbol, name: (r.base_asset || "").toUpperCase(), base_asset: r.base_asset, price: r.price, market_cap: null, circulating_supply: null, total_supply: null, max_supply: null, circulating_ratio: null, cmc_rank: null, volume_24h_usdt: r.volume_24h_usdt, percent_change_7d: null, change_24h_pct: r.change_24h_pct, amplitude_24h_pct: r.amplitude_24h_pct, star_rating: 0, unlock_risk: uL(null), momentum_alert: false }));
      await kv.put("data", JSON.stringify(coins));
      await kv.put("last_updated", (/* @__PURE__ */ new Date()).toISOString());
      await kv.put("count", String(coins.length));
      console.log("B3:", coins.length, "coins");
    }
  }
  __name(refreshData, "refreshData");
  async function fBB() {
    const c = new AbortController(), t = setTimeout(() => c.abort(), 15e3);
    try {
      const [i, tk] = await Promise.all([fetch("https://api.bybit.com/v5/market/instruments-info?category=linear", { signal: c.signal }), fetch("https://api.bybit.com/v5/market/tickers?category=linear", { signal: c.signal })]);
      if (!i.ok) throw new Error("BB i:" + i.status);
      if (!tk.ok) throw new Error("BB t:" + tk.status);
      const id = await i.json(), syms = new Set(id.result.list.filter((s) => s.status === "Trading" && s.quoteCoin === "USDT" && s.contractType === "LinearPerpetual").map((s) => s.symbol)), td = await tk.json(), map = /* @__PURE__ */ new Map();
      for (const t2 of td.result.list) map.set(t2.symbol, t2);
      const rows = [];
      for (const s of syms) {
        const t2 = map.get(s);
        if (!t2) continue;
        const p = parseFloat(t2.lastPrice), h = parseFloat(t2.highPrice24h), l = parseFloat(t2.lowPrice24h), pc = parseFloat(t2.price24hPcnt || "0") * 100;
        if (isNaN(p) || p <= 0) continue;
        rows.push({ symbol: s, base_asset: s.replace("USDT", ""), price: p, change_24h_pct: Math.round(pc * 100) / 100, amplitude_24h_pct: Math.round((h - l) / p * 100 * 100) / 100, volume_24h_usdt: parseFloat(t2.turnover24h || "0") });
      }
      return rows;
    } finally {
      clearTimeout(t);
    }
  }
  __name(fBB, "fBB");
  async function fBN() {
    const c = new AbortController(), t = setTimeout(() => c.abort(), 15e3);
    try {
      const r = await fetch("https://fapi.binance.com/fapi/v1/ticker/24hr", { signal: c.signal });
      if (!r.ok) throw new Error("BN:" + r.status);
      const d = await r.json(), rows = [];
      for (const t2 of d) {
        if (!t2.symbol.endsWith("USDT")) continue;
        const p = parseFloat(t2.lastPrice), h = parseFloat(t2.highPrice), l = parseFloat(t2.lowPrice);
        if (isNaN(p) || p <= 0) continue;
        rows.push({ symbol: t2.symbol, base_asset: t2.symbol.replace("USDT", ""), price: p, change_24h_pct: Math.round(parseFloat(t2.priceChangePercent || "0") * 100) / 100, amplitude_24h_pct: h && l && h > 0 && l > 0 ? Math.round((h - l) / p * 100 * 100) / 100 : 0, volume_24h_usdt: parseFloat(t2.quoteVolume || "0") });
      }
      return rows;
    } finally {
      clearTimeout(t);
    }
  }
  __name(fBN, "fBN");
  async function fOK() {
    const c = new AbortController(), t = setTimeout(() => c.abort(), 15e3);
    try {
      const r = await fetch("https://www.okx.com/api/v5/market/tickers?instType=SWAP", { signal: c.signal });
      if (!r.ok) throw new Error("OK:" + r.status);
      const d = await r.json();
      if (!d.data) return [];
      const rows = [];
      for (const t2 of d.data) {
        if (!t2.instId.endsWith("-USDT-SWAP")) continue;
        const p = parseFloat(t2.last), h = parseFloat(t2.high24h), l = parseFloat(t2.low24h), o = parseFloat(t2.open24h);
        if (isNaN(p) || p <= 0) continue;
        const ba = t2.instId.replace("-USDT-SWAP", "");
        rows.push({ symbol: ba + "USDT", base_asset: ba, price: p, change_24h_pct: o && o > 0 ? Math.round((p - o) / o * 100 * 100) / 100 : 0, amplitude_24h_pct: h && l && h > 0 && l > 0 ? Math.round((h - l) / p * 100 * 100) / 100 : 0, volume_24h_usdt: parseFloat(t2.volCcy24h || "0") });
      }
      return rows;
    } finally {
      clearTimeout(t);
    }
  }
  __name(fOK, "fOK");
  async function fCMC(env) {
    const k = env?.CMC_API_KEY || (typeof CMC_API_KEY !== `undefined` ? CMC_API_KEY : null);
    if (!k) return null;
    try {
      const c = new AbortController(), t = setTimeout(() => c.abort(), 1e4);
      try {
        const r = await fetch("https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=1000&convert=USD", { headers: { "X-CMC_PRO_API_KEY": k, "Accept": "application/json" }, signal: c.signal });
        if (r.ok) {
          const d = await r.json();
          return pC(d);
        }
        try {
          const e = await r.json();
          console.error("CMC err:", r.status, e);
        } catch (e) {
        }
      } finally {
        clearTimeout(t);
      }
    } catch (e) {
      console.error("CMC fetch err:", e);
    }
    return null;
  }
  __name(fCMC, "fCMC");
  function pC(d) {
    const m = {};
    for (const c of d.data) {
      const q = c.quote.USD, cs = c.circulating_supply, ts = c.total_supply, ms = c.max_supply;
      let cr = null;
      if (ts && ts > 0 && cs != null) cr = cs / ts;
      else if (ms && ms > 0 && cs != null) cr = cs / ms;
      m[c.symbol.toUpperCase()] = { symbol: c.symbol, market_cap: q.market_cap || null, circulating_supply: cs, total_supply: ts, max_supply: ms, circulating_ratio: cr != null ? Math.round(cr * 1e4) / 1e4 : null, cmc_rank: c.cmc_rank || null, name: c.name || c.symbol, percent_change_7d: q.percent_change_7d != null ? Math.round(q.percent_change_7d * 100) / 100 : null, price: q.price != null ? Math.round(q.price * 1e4) / 1e4 : null, volume_24h_usdt: q.volume_24h != null ? Math.round(q.volume_24h * 100) / 100 : null };
    }
    return m;
  }
  __name(pC, "pC");
  async function fCG(env) {
    const c = new AbortController();
    try {
      const h = { "User-Agent": "CryptoScreener/5.0" };
      const cgK = env?.COINGECKO_API_KEY || (typeof COINGECKO_API_KEY !== `undefined` ? COINGECKO_API_KEY : null);
      if (cgK) h["x-cg-demo-api-key"] = cgK;
      const pages = [1, 2, 3, 4, 5, 6, 7, 8];
      const r = [];
      for (const p of pages) {
        const t = setTimeout(() => c.abort(), 15e3);
        try {
          const x = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=" + p + "&sparkline=false&price_change_percentage=7d", { headers: h, signal: c.signal });
          if (!x.ok) throw new Error("CG p" + p + " " + x.status);
          try {
            r.push({ status: "fulfilled", value: await x.json() });
          } catch (e) {
            r.push({ status: "rejected", reason: e });
          }
        } catch (e) {
          r.push({ status: "rejected", reason: e });
        } finally {
          clearTimeout(t);
        }
        await new Promise((d) => setTimeout(d, 1300));
      }
      const m = {};
      for (const result of r) {
        if (result.status !== "fulfilled" || !Array.isArray(result.value)) continue;
        for (const c2 of result.value) {
          const sym = (c2.symbol || "").toUpperCase();
          if (m[sym]) continue;
          const cs = c2.circulating_supply, ts = c2.total_supply;
          let cr = null;
          if (ts && ts > 0 && cs != null) cr = cs / ts;
          m[sym] = { symbol: sym, market_cap: c2.market_cap || null, circulating_supply: cs, total_supply: ts, max_supply: c2.max_supply || null, circulating_ratio: cr != null ? Math.round(cr * 1e4) / 1e4 : null, cmc_rank: c2.market_cap_rank || null, name: c2.name || sym, percent_change_7d: c2.price_change_percentage_7d_in_currency != null ? Math.round(c2.price_change_percentage_7d_in_currency * 100) / 100 : null, price: c2.current_price != null ? Math.round(c2.current_price * 1e4) / 1e4 : null, volume_24h_usdt: c2.total_volume != null ? Math.round(c2.total_volume * 100) / 100 : null };
        }
      }
      console.log("CG:" + Object.keys(m).length + " coins");
      return Object.keys(m).length > 0 ? m : null;
    } catch (e) {
      console.error("CG err:", e);
      return null;
    }
  }
  __name(fCG, "fCG");
  function aS(mcap, cr, conflicted, staleCg) {
    if (mcap == null || cr == null || mcap < 15e6) return 0;
    const raw = cS(mcap, cr);
    if (conflicted) return staleCg ? Math.max(1, raw - 1) : raw;
    return raw;
  }
  __name(aS, "aS");
  function cS(mcap, cr) {
    if (mcap <= 5e8 && cr < 0.3) return 5;
    if (mcap <= 1e8 && cr < 0.5) return 4;
    if (mcap <= 5e8 && cr < 0.5) return 3;
    if (mcap <= 2e9 && cr < 0.5) return 3;
    if (mcap > 2e9) return cr >= 0.5 ? 1 : 2;
    if (cr >= 0.8) return 1;
    return 2;
  }
  __name(cS, "cS");
  function uL(cr) {
    if (cr == null) return "\u26A0\uFE0F \u672A\u77E5";
    if (cr < 0.3) return "\u{1F534} \u9AD8\u901A\u80C0\u98CE\u9669";
    if (cr < 0.5) return "\u{1F7E1} \u89E3\u9501\u98CE\u9669";
    return "\u{1F7E2} \u4F4E\u98CE\u9669";
  }
  __name(uL, "uL");
  addEventListener("fetch", (event) => {
    const url = new URL(event.request.url), path = normalizePath(url.pathname);
    if (event.request.method === "OPTIONS") return event.respondWith(new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,X-Auth-Key" } }));
    if (path === "/api/debug-exchange") return event.respondWith(hDD(MARKET_DATA));
    if (path === "/api/data") return event.respondWith(hDA(MARKET_DATA));
    if (path === "/api/refresh" && event.request.method === "POST") return event.respondWith(hRF(MARKET_DATA));
    if (path === "/api/upload" && event.request.method === "POST") return event.respondWith(hUP(event.request, MARKET_DATA));
    if (path === "/api/relay-tickers" && event.request.method === "POST") return event.respondWith(hRL(event.request, MARKET_DATA));
    if (path === "/api/demon") return event.respondWith(hDM(MARKET_DATA));
    if (path === "/api/relay-demon" && event.request.method === "POST") return event.respondWith(hRD(event.request, MARKET_DATA));
    if (path === "/api/coinfilter") return event.respondWith(hCF(MARKET_DATA));
    if (path === "/api/relay-coinfilter" && event.request.method === "POST") return event.respondWith(hRCF(event.request, MARKET_DATA));
    if (path === "/api/forward") return event.respondWith(hFW(MARKET_DATA));
    if (path === "/api/forward-history") return event.respondWith(hFH(MARKET_DATA, event.request.url));
    if (path === "/api/overlap-stats") return event.respondWith(hOV(MARKET_DATA, event.request.url));
    if (path === "/api/events") return event.respondWith(hEV(MARKET_DATA, event.request.url));
    if (path === "/api/day-gainers") return event.respondWith(hDG(MARKET_DATA, event.request.url));
    if (path === "/api/perf") return event.respondWith(hPA(MARKET_DATA, event.request.url));
    if (path === "/api/relay-forward" && event.request.method === "POST") return event.respondWith(hRWF(event.request, MARKET_DATA));
    if (path === "/api/mentioned") return event.respondWith(hML(MARKET_DATA));
    if (path === "/api/screener") return event.respondWith(hSC(MARKET_DATA));
    if (path === "/api/status") return event.respondWith(hST(MARKET_DATA));
    event.respondWith(hDB(MARKET_DATA));
  });
  addEventListener("scheduled", (event) => {
    event.waitUntil((async () => {
      console.log("Refresh start");
      await refreshData(MARKET_DATA, {});
      await hDD(MARKET_DATA).catch(() => {
      });
      await healGainerArchive(MARKET_DATA).catch((e) => console.log("heal error:", e.message));
      console.log("Refresh done");
    })());
  });
  async function healGainerArchive(kv) {
    const bj = new Date(Date.now() + 8 * 3600 * 1e3);
    const day = bj.toISOString().slice(0, 10);
    const dayKey = "gainer_hist_" + day.replace(/-/g, "");
    const prev = await kv.get(dayKey);
    let count = 0;
    if (prev) {
      try {
        count = (JSON.parse(prev).gainers || []).length;
      } catch (e) {
      }
    }
    if (count > 0) return;
    const pR = await kv.get("exchange_proxy").catch(() => null);
    if (!pR) return;
    let p;
    try {
      p = JSON.parse(pR);
    } catch (e) {
      return;
    }
    if (!Array.isArray(p.binance) || p.binance.length === 0) return;
    const n = p.updated || (/* @__PURE__ */ new Date()).toISOString();
    const bySym = /* @__PURE__ */ new Map();
    for (const t of p.binance) {
      if (!t || !t.symbol || t.symbol.indexOf("USDT") < 0) continue;
      const chg = parseFloat(t.change_24h_pct != null ? t.change_24h_pct : t.priceChangePercent);
      const vol = parseFloat(t.volume_24h_usdt != null ? t.volume_24h_usdt : t.quoteVolume);
      const px = parseFloat(t.price != null ? t.price : t.lastPrice);
      if (isNaN(chg)) continue;
      bySym.set(t.symbol, { symbol: t.symbol, base_asset: t.symbol.replace("USDT", ""), change_24h_pct: chg, volume_24h_usdt: vol, last_price: isNaN(px) ? null : px });
    }
    if (bySym.size === 0) return;
    await kv.put(dayKey, JSON.stringify({ date: day, gainers: Array.from(bySym.values()), updated: n, healed: true }));
    console.log("healed gainer_hist", day, bySym.size);
  }
  __name(healGainerArchive, "healGainerArchive");
  async function hDA(kv) {
    const r = await kv.get("data"), u = await kv.get("last_updated");
    if (!r) return json({ ok: false, error: "no data", data: [], updated: null });
    const p = JSON.parse(r);
    return json({ ok: true, updated: u, data: p, count: p.length });
  }
  __name(hDA, "hDA");
  async function hDB(kv) {
    const h = await kv.get(KV_HTML_KEY);
    if (h) return html(h);
    if (globalThis.INLINE_HTML) return html(globalThis.INLINE_HTML);
    return new Response("No dashboard", { status: 503 });
  }
  __name(hDB, "hDB");
  async function hRF(kv) {
    const mem = await kv.get("data");
    console.log("Refresh start, current:", mem ? JSON.parse(mem).length : 0);
    await refreshData(kv, {});
    const u = await kv.get("last_updated"), c = await kv.get("count");
    return json({ ok: true, updated: u, coins: parseInt(c || "0") });
  }
  __name(hRF, "hRF");
  async function hUP(req, kv) {
    const k = UPLOAD_AUTH_KEY, a = req.headers.get("X-Auth-Key");
    if (!k || a !== k) return json({ ok: false, error: "Unauthorized" }, 401);
    try {
      const b = await req.json();
      if (!Array.isArray(b)) return json({ ok: false, error: "Must be array" }, 400);
      await kv.put("data", JSON.stringify(b));
      const n = (/* @__PURE__ */ new Date()).toISOString();
      await kv.put("last_updated", n);
      await kv.put("count", String(b.length));
      return json({ ok: true, coins: b.length, updated: n });
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  __name(hUP, "hUP");
  async function hRL(req, kv) {
    const k = RELAY_AUTH_KEY, a = req.headers.get("X-Auth-Key");
    if (!k || a !== k) return json({ ok: false, error: "Unauthorized" }, 401);
    try {
      const b = await req.json();
      if (!b || typeof b !== "object") return json({ ok: false, error: "Must be object" }, 400);
      const n = (/* @__PURE__ */ new Date()).toISOString();
      await kv.put("exchange_proxy", JSON.stringify({ ...b, updated: n }));
      try {
        if (Array.isArray(b.binance) && b.binance.length > 0) {
          const bj = new Date(new Date(n).getTime() + 8 * 3600 * 1e3);
          const day = bj.toISOString().slice(0, 10);
          const dayKey = "gainer_hist_" + day.replace(/-/g, "");
          const prev = await kv.get(dayKey);
          const hist = prev ? JSON.parse(prev) : { date: day, gainers: [], updated: n };
          const bySym = new Map((hist.gainers || []).map((g) => [g.symbol, g]));
          for (const t of b.binance) {
            if (!t || typeof t !== "object" || !t.symbol) continue;
            if (t.symbol.indexOf("USDT") < 0) continue;
            const chg = parseFloat(t.change_24h_pct != null ? t.change_24h_pct : t.priceChangePercent);
            const vol = parseFloat(t.volume_24h_usdt != null ? t.volume_24h_usdt : t.quoteVolume);
            const px = parseFloat(t.price != null ? t.price : t.lastPrice);
            if (isNaN(chg)) continue;
            const ex = bySym.get(t.symbol);
            if (ex) {
              if (chg > ex.change_24h_pct) {
                ex.change_24h_pct = chg;
                ex.volume_24h_usdt = vol;
              }
              if (!isNaN(px)) ex.last_price = px;
            } else bySym.set(t.symbol, { symbol: t.symbol, base_asset: t.symbol.replace("USDT", ""), change_24h_pct: chg, volume_24h_usdt: vol, last_price: isNaN(px) ? null : px });
          }
          hist.gainers = Array.from(bySym.values());
          hist.updated = n;
          await kv.put(dayKey, JSON.stringify(hist));
        }
      } catch (e) {
        console.log("gainer_hist archive error:", e.message);
      }
      const s = [];
      if (b.binance) s.push("binance:" + b.binance.length);
      if (b.bybit) s.push("bybit:" + b.bybit.length);
      if (b.okx) s.push("okx:" + b.okx.length);
      return json({ ok: true, sources: s.join(", "), updated: n });
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  __name(hRL, "hRL");
  async function hRD(req, kv) {
    const k = DEMON_RELAY_KEY, a = req.headers.get("X-Auth-Key");
    if (!k || a !== k) return json({ ok: false, error: "Unauthorized" }, 401);
    try {
      const b = await req.json();
      if (!b || !Array.isArray(b.data)) return json({ ok: false, error: "Must be {data:[...]}" }, 400);
      const n = (/* @__PURE__ */ new Date()).toISOString();
      await kv.put("demon_data", JSON.stringify({ data: b.data, updated: n, count: b.data.length }));
      return json({ ok: true, coins: b.data.length, updated: n });
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  __name(hRD, "hRD");
  async function hDM(kv) {
    const r = await kv.get("demon_data");
    if (!r) return json({ ok: false, error: "no demon data", data: [], updated: null });
    const p = JSON.parse(r);
    const arr = Array.isArray(p) ? p : p.data || [];
    return json({ ok: true, updated: p.updated || null, data: arr, count: p.count || arr.length });
  }
  __name(hDM, "hDM");
  async function hRCF(req, kv) {
    const k = DEMON_RELAY_KEY, a = req.headers.get("X-Auth-Key");
    if (!k || a !== k) return json({ ok: false, error: "Unauthorized" }, 401);
    try {
      const b = await req.json();
      if (!b || !Array.isArray(b.data)) return json({ ok: false, error: "Must be {data:[...]}" }, 400);
      const n = b.updated || (/* @__PURE__ */ new Date()).toISOString();
      await kv.put("coinfilter_data", JSON.stringify({ data: b.data, updated: n, count: b.data.length }));
      if (Array.isArray(b.mentioned) && b.mentioned.length > 0) {
        await kv.put("mentioned_list", JSON.stringify(b.mentioned)).catch(() => {
        });
      }
      return json({ ok: true, coins: b.data.length, updated: n });
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  __name(hRCF, "hRCF");
  async function hCF(kv) {
    const r = await kv.get("coinfilter_data");
    if (!r) return json({ ok: false, error: "no coinfilter data", data: [], updated: null, count: 0 });
    const p = JSON.parse(r);
    const arr = Array.isArray(p) ? p : p.data || [];
    return json({ ok: true, updated: p.updated || null, count: p.count || arr.length, data: arr });
  }
  __name(hCF, "hCF");
  async function hRWF(req, kv) {
    const k = DEMON_RELAY_KEY, a = req.headers.get("X-Auth-Key");
    if (!k || a !== k) return json({ ok: false, error: "Unauthorized" }, 401);
    try {
      const b = await req.json();
      if (!b || !Array.isArray(b.data)) return json({ ok: false, error: "Must be {data:[...]}" }, 400);
      const n = b.updated || (/* @__PURE__ */ new Date()).toISOString();
      const payload = { data: b.data, updated: n, count: b.data.length, env: b.env || null };
      await kv.put("forward_data", JSON.stringify(payload));
      try {
        const bj = new Date(new Date(n).getTime() + 8 * 3600 * 1e3);
        const day = bj.toISOString().slice(0, 10);
        const dayKey = "fwd_hist_" + day.replace(/-/g, "");
        const prev = await kv.get(dayKey);
        const hist = prev ? JSON.parse(prev) : { date: day, candidates: [], updated: n };
        const bySym = new Map((hist.candidates || []).map((c) => [c.symbol, c]));
        for (const c of b.data) {
          if (c.signal !== "acc_candidate") continue;
          const ex = bySym.get(c.symbol);
          if (ex) {
            ex.last_seen = n;
            if (c.forward_score != null && (ex.forward_score == null || c.forward_score > ex.forward_score)) ex.forward_score = c.forward_score;
          } else {
            bySym.set(c.symbol, { symbol: c.symbol, base_asset: c.base_asset, forward_score: c.forward_score, first_seen: n, last_seen: n });
          }
        }
        hist.candidates = Array.from(bySym.values());
        hist.updated = n;
        await kv.put(dayKey, JSON.stringify(hist));
      } catch (e) {
        console.log("fwd_hist archive error:", e.message);
      }
      return json({ ok: true, coins: b.data.length, updated: n });
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  __name(hRWF, "hRWF");
  async function hFH(kv, url) {
    const days = Math.min(parseInt(new URL(url).searchParams.get("days") || "7", 10) || 7, 60);
    const out = {};
    const now = /* @__PURE__ */ new Date();
    for (let i = 0; i < days; i++) {
      const bj = new Date(now.getTime() + 8 * 3600 * 1e3 - i * 864e5);
      const ds = bj.toISOString().slice(0, 10);
      const r = await kv.get("fwd_hist_" + ds.replace(/-/g, ""));
      if (r) {
        try {
          const p = JSON.parse(r);
          out[ds] = { candidates: p.candidates || [], updated: p.updated || null, count: (p.candidates || []).length, seed: p.seed || false };
        } catch (e) {
        }
      }
    }
    return json({ ok: true, days, tz: "UTC+8", history: out });
  }
  __name(hFH, "hFH");
  async function hOV(kv, url) {
    const u = new URL(url);
    const days = Math.min(parseInt(u.searchParams.get("days") || "14", 10) || 14, 60);
    const topn = Math.min(parseInt(u.searchParams.get("topn") || "20", 10) || 20, 100);
    const minvol = parseFloat(u.searchParams.get("minvol") || "0");
    const out = {};
    const now = /* @__PURE__ */ new Date();
    const daysArr = [];
    for (let i = 0; i < days; i++) {
      const bj = new Date(now.getTime() + 8 * 3600 * 1e3 - i * 864e5);
      daysArr.push(bj.toISOString().slice(0, 10));
    }
    const raw = {};
    for (const ds of daysArr) {
      const fk = "fwd_hist_" + ds.replace(/-/g, "");
      const gk = "gainer_hist_" + ds.replace(/-/g, "");
      const [fr, gr] = await Promise.all([kv.get(fk), kv.get(gk)]);
      raw[ds] = { cands: null, gainers: null, cand_seed: false, gainer_seed: false };
      if (fr) {
        try {
          const p = JSON.parse(fr);
          raw[ds].cands = (p.candidates || []).map((c) => ({ symbol: c.symbol, base_asset: c.base_asset, forward_score: c.forward_score }));
          raw[ds].cand_seed = !!p.seed;
        } catch (e) {
        }
      }
      if (gr) {
        try {
          const p = JSON.parse(gr);
          let gs = (p.gainers || []).slice();
          if (minvol > 0) gs = gs.filter((g) => (g.volume_24h_usdt || 0) >= minvol);
          gs.sort((a, b) => (b.change_24h_pct || 0) - (a.change_24h_pct || 0));
          gs = gs.slice(0, topn);
          raw[ds].gainers = gs;
          raw[ds].gainer_seed = !!p.seed;
        } catch (e) {
        }
      }
    }
    const firstSeen = {};
    for (const ds of daysArr) {
      if (!raw[ds].cands) continue;
      for (const c of raw[ds].cands) {
        if (!firstSeen[c.base_asset] || ds < firstSeen[c.base_asset]) firstSeen[c.base_asset] = ds;
      }
    }
    const bestScore = {};
    for (const ds of daysArr) {
      if (!raw[ds].cands) continue;
      for (const c of raw[ds].cands) {
        if (c.forward_score != null && (bestScore[c.base_asset] == null || c.forward_score > bestScore[c.base_asset])) bestScore[c.base_asset] = c.forward_score;
      }
    }
    for (const ds of daysArr) {
      const day = { date: ds, candidates: raw[ds].cands, total_candidates: raw[ds].cands ? raw[ds].cands.length : 0, gainers: raw[ds].gainers, total_gainers: raw[ds].gainers ? raw[ds].gainers.length : 0, overlap: [], overlap_count: 0, pct: null, candidate_seed: raw[ds].cand_seed, gainer_seed: raw[ds].gainer_seed };
      if (raw[ds].cands && raw[ds].gainers) {
        const candSet = new Set(raw[ds].cands.map((c) => c.base_asset));
        day.overlap = raw[ds].gainers.filter((g) => candSet.has(g.base_asset)).map((g) => ({ base_asset: g.base_asset, change_24h_pct: g.change_24h_pct, rank: raw[ds].gainers.indexOf(g) + 1, first_seen: firstSeen[g.base_asset] }));
        day.overlap_count = day.overlap.length;
        day.pct = raw[ds].gainers.length > 0 ? Math.round(day.overlap.length / raw[ds].gainers.length * 1e3) / 10 : null;
      }
      out[ds] = day;
    }
    const leadEvents = [];
    for (const ds of daysArr) {
      if (!raw[ds].gainers) continue;
      for (let k = 0; k < raw[ds].gainers.length; k++) {
        const g = raw[ds].gainers[k];
        const fs = firstSeen[g.base_asset];
        if (!fs) continue;
        if (fs < ds) {
          leadEvents.push({ base_asset: g.base_asset, first_seen: fs, gain_day: ds, lead_days: (Date.parse(ds) - Date.parse(fs)) / 864e5, change_24h_pct: g.change_24h_pct, rank: k + 1 });
        }
      }
    }
    const leadUnion = {};
    for (const e of leadEvents) {
      if (!leadUnion[e.base_asset]) leadUnion[e.base_asset] = { times: 0, best_gain: null, first_seen: e.first_seen };
      leadUnion[e.base_asset].times++;
      if (leadUnion[e.base_asset].best_gain == null || e.change_24h_pct > leadUnion[e.base_asset].best_gain) leadUnion[e.base_asset].best_gain = e.change_24h_pct;
    }
    return json({ ok: true, days, topn, minvol, tz: "UTC+8", history: out, lead_events: leadEvents, lead_union: leadUnion });
  }
  __name(hOV, "hOV");
  async function hEV(kv, url) {
    const u = new URL(url);
    const days = Math.min(parseInt(u.searchParams.get("days") || "14", 10) || 14, 60);
    const topn = Math.min(parseInt(u.searchParams.get("topn") || "20", 10) || 20, 100);
    const big = parseFloat(u.searchParams.get("big") || "20");
    const now = /* @__PURE__ */ new Date();
    const daysArr = [];
    for (let i = 0; i < days; i++) {
      const bj = new Date(now.getTime() + 8 * 3600 * 1e3 - i * 864e5);
      daysArr.push(bj.toISOString().slice(0, 10));
    }
    const raw = {};
    for (const ds of daysArr) {
      const fk = "fwd_hist_" + ds.replace(/-/g, "");
      const gk = "gainer_hist_" + ds.replace(/-/g, "");
      const [fr, gr] = await Promise.all([kv.get(fk), kv.get(gk)]);
      raw[ds] = { cands: null, gainers: null, cand_seed: false, gainer_seed: false };
      if (fr) {
        try {
          const p = JSON.parse(fr);
          raw[ds].cands = (p.candidates || []).map((c) => ({ symbol: c.symbol, base_asset: c.base_asset, forward_score: c.forward_score }));
          raw[ds].cand_seed = !!p.seed;
        } catch (e) {
        }
      }
      if (gr) {
        try {
          const p = JSON.parse(gr);
          const gs = (p.gainers || []).slice();
          gs.sort((a, b) => (b.change_24h_pct || 0) - (a.change_24h_pct || 0));
          raw[ds].gainers = gs;
          raw[ds].gainer_seed = !!p.seed;
        } catch (e) {
        }
      }
    }
    const firstSeen = {};
    for (const ds of daysArr) {
      if (!raw[ds].cands) continue;
      for (const c of raw[ds].cands) {
        if (!firstSeen[c.base_asset] || ds < firstSeen[c.base_asset]) firstSeen[c.base_asset] = ds;
      }
    }
    const bestScore = {};
    for (const ds of daysArr) {
      if (!raw[ds].cands) continue;
      for (const c of raw[ds].cands) {
        if (c.forward_score != null && (bestScore[c.base_asset] == null || c.forward_score > bestScore[c.base_asset])) bestScore[c.base_asset] = c.forward_score;
      }
    }
    const events = [];
    for (const ds of daysArr) {
      const day = raw[ds];
      if (!day.gainers) continue;
      const candSet = new Set((day.cands || []).map((c) => c.base_asset));
      for (let k = 0; k < day.gainers.length; k++) {
        const g = day.gainers[k];
        const rank = k + 1;
        const chg = g.change_24h_pct || 0;
        const isTop = rank <= topn;
        const isBig = chg >= big;
        if (!isTop && !isBig) continue;
        const isCand = !!candSet.has(g.base_asset);
        const fs = firstSeen[g.base_asset];
        const everCand = !!fs;
        const leadDays = fs && fs < ds ? Math.round((Date.parse(ds) - Date.parse(fs)) / 864e5) : 0;
        const trigger = isTop && isBig ? "both" : isTop ? "top" : "big";
        events.push({ date: ds, base_asset: g.base_asset, change_24h_pct: chg, rank: isTop ? rank : null, trigger, is_candidate: isCand, ever_candidate: everCand, lead_days: leadDays, first_seen: fs || null, forward_score: bestScore[g.base_asset] != null ? bestScore[g.base_asset] : null });
      }
    }
    const byDay = {};
    const byCoin = {};
    let nTop = 0, nBig = 0, nBoth = 0, nEver = 0, leadSum = 0, leadN = 0;
    for (const e of events) {
      byDay[e.date] = byDay[e.date] || { total: 0, top: 0, big: 0, both: 0 };
      byDay[e.date].total++;
      if (e.trigger === "top") {
        byDay[e.date].top++;
        nTop++;
      } else if (e.trigger === "big") {
        byDay[e.date].big++;
        nBig++;
      } else {
        byDay[e.date].both++;
        nBoth++;
      }
      if (e.ever_candidate) {
        nEver++;
        if (e.lead_days > 0) {
          leadSum += e.lead_days;
          leadN++;
        }
      }
      byCoin[e.base_asset] = byCoin[e.base_asset] || { events: 0, top: 0, big: 0, both: 0, ever_candidate: false, first_seen: null, max_chg: -999 };
      const c = byCoin[e.base_asset];
      c.events++;
      c.ever_candidate = c.ever_candidate || e.ever_candidate;
      if (!c.first_seen || e.first_seen && e.first_seen < c.first_seen) c.first_seen = e.first_seen || c.first_seen;
      if (e.change_24h_pct > c.max_chg) c.max_chg = e.change_24h_pct;
      if (e.trigger === "top") c.top++;
      else if (e.trigger === "big") c.big++;
      else c.both++;
    }
    const leadByDays = {};
    for (const e of events) {
      if (e.ever_candidate && e.lead_days > 0) {
        leadByDays[e.lead_days] = (leadByDays[e.lead_days] || 0) + 1;
      }
    }
    return json({ ok: true, days, topn, big, tz: "UTC+8", events, by_day: byDay, by_coin: byCoin, kpi: { total_events: events.length, top_events: nTop, big_events: nBig, both_events: nBoth, ever_candidate: nEver, ever_rate: events.length ? Math.round(nEver / events.length * 1e3) / 10 : 0, avg_lead: leadN ? Math.round(leadSum / leadN * 10) / 10 : 0, lead_by_days: leadByDays } });
  }
  __name(hEV, "hEV");
  async function hDG(kv, url) {
    const u = new URL(url);
    const date = (u.searchParams.get("date") || "").trim();
    const topn = Math.min(parseInt(u.searchParams.get("topn") || "20", 10) || 20, 100);
    const window = Math.min(parseInt(u.searchParams.get("window") || "30", 10) || 30, 90);
    const now = /* @__PURE__ */ new Date();
    const todayBJ = new Date(now.getTime() + 8 * 3600 * 1e3).toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayBJ) return json({ ok: false, error: "invalid date" }, 400);
    const gk = "gainer_hist_" + date.replace(/-/g, "");
    const gr = await kv.get(gk);
    if (!gr) return json({ ok: true, date, topn, tz: "UTC+8", gainers: [], candidates: {}, note: "no gainer archive for " + date });
    let gs = [];
    let gSeed = false;
    try {
      const p = JSON.parse(gr);
      gs = (p.gainers || []).slice();
      gSeed = !!p.seed;
    } catch (e) {
    }
    gs.sort((a, b) => (b.change_24h_pct || 0) - (a.change_24h_pct || 0));
    gs = gs.slice(0, topn);
    const firstSeen = {};
    const bestScore = {};
    let dayCands = null;
    const winDates = [];
    for (let i = 0; i < window; i++) {
      const bj = new Date(now.getTime() + 8 * 3600 * 1e3 - i * 864e5);
      winDates.push(bj.toISOString().slice(0, 10));
    }
    const winFrs = await Promise.all(winDates.map((ds) => kv.get("fwd_hist_" + ds.replace(/-/g, ""))));
    winDates.forEach((ds, idx) => {
      const fr = winFrs[idx];
      if (!fr) return;
      try {
        const p = JSON.parse(fr);
        const cs = p.candidates || [];
        if (ds === date) dayCands = new Set(cs.map((c) => c.base_asset));
        for (const c of cs) {
          if (!firstSeen[c.base_asset] || ds < firstSeen[c.base_asset]) firstSeen[c.base_asset] = ds;
          if (c.forward_score != null && (bestScore[c.base_asset] == null || c.forward_score > bestScore[c.base_asset])) bestScore[c.base_asset] = c.forward_score;
        }
      } catch (e) {
      }
    });
    const winGrs = await Promise.all(winDates.map((ds) => kv.get("gainer_hist_" + ds.replace(/-/g, ""))));
    const priceByDate = {};
    winDates.forEach((ds, idx) => {
      const gr2 = winGrs[idx];
      if (!gr2) return;
      try {
        const p = JSON.parse(gr2);
        const m = {};
        for (const g of p.gainers || []) {
          if (g.last_price != null) m[g.base_asset] = g.last_price;
        }
        priceByDate[ds] = m;
      } catch (e) {
      }
    });
    const out = gs.map((g, k) => {
      const ba = g.base_asset;
      const fs = firstSeen[ba];
      const ever = !!fs;
      const lead = fs && fs < date ? Math.round((Date.parse(date) - Date.parse(fs)) / 864e5) : 0;
      const gainPx = priceByDate[date] ? priceByDate[date][ba] : null;
      const entryPx = ever && fs && priceByDate[fs] ? priceByDate[fs][ba] : null;
      let entryGain = null;
      if (entryPx && gainPx && entryPx > 0) entryGain = Math.round((gainPx / entryPx - 1) * 1e4) / 1e4;
      return { base_asset: ba, change_24h_pct: g.change_24h_pct, rank: k + 1, volume_24h_usdt: g.volume_24h_usdt || null, is_candidate: dayCands ? dayCands.has(ba) : false, ever_candidate: ever, first_seen: fs || null, lead_days: lead, forward_score: bestScore[ba] != null ? bestScore[ba] : null, entry_price: entryPx, gain_price: gainPx, entry_gain_pct: entryGain };
    });
    const candMeta = {};
    Object.keys(firstSeen).forEach((ba) => {
      candMeta[ba] = { first_seen: firstSeen[ba], forward_score: bestScore[ba] != null ? bestScore[ba] : null };
    });
    return json({ ok: true, date, topn, window, tz: "UTC+8", gainers: out, candidates: candMeta, gainer_seed: gSeed, total_archived: gs.length });
  }
  __name(hDG, "hDG");
  async function hPA(kv, url) {
    const u = new URL(url);
    const days = Math.min(parseInt(u.searchParams.get("days") || "14", 10) || 14, 60);
    const now = /* @__PURE__ */ new Date();
    const daysArr = [];
    for (let i = 0; i < days; i++) {
      const bj = new Date(now.getTime() + 8 * 3600 * 1e3 - i * 864e5);
      daysArr.push(bj.toISOString().slice(0, 10));
    }
    const raw = {};
    const allFrs = await Promise.all(daysArr.flatMap((ds) => ["fwd_hist_" + ds.replace(/-/g, ""), "gainer_hist_" + ds.replace(/-/g, "")].map((k) => kv.get(k))));
    daysArr.forEach((ds, idx) => {
      raw[ds] = { cands: null, gainers: null };
      const fr = allFrs[idx * 2];
      const gr = allFrs[idx * 2 + 1];
      if (fr) {
        try {
          const p = JSON.parse(fr);
          raw[ds].cands = (p.candidates || []).map((c) => ({ base_asset: c.base_asset, forward_score: c.forward_score }));
        } catch (e) {
        }
      }
      if (gr) {
        try {
          const p = JSON.parse(gr);
          raw[ds].gainers = p.gainers || [];
        } catch (e) {
        }
      }
    });
    const priceByDay = {};
    for (const ds of daysArr) {
      const gs = raw[ds].gainers;
      if (!gs) continue;
      const m = {};
      for (const g of gs) {
        if (g.last_price != null) m[g.base_asset] = g.last_price;
      }
      priceByDay[ds] = m;
    }
    const pxSeries = {};
    for (const ds of daysArr) {
      const m = priceByDay[ds];
      if (!m) continue;
      for (const ba of Object.keys(m)) {
        if (!pxSeries[ba]) pxSeries[ba] = {};
        pxSeries[ba][ds] = m[ba];
      }
    }
    const btcSeries = pxSeries["BTC"] || {};
    function fwdRet(series, ds, horizon) {
      const daysSorted = Object.keys(series).sort();
      const i = daysSorted.indexOf(ds);
      if (i < 0) return null;
      const p0 = series[ds];
      if (!p0) return null;
      const j = i + horizon;
      if (j >= daysSorted.length) return null;
      const pn = series[daysSorted[j]];
      if (!pn || p0 <= 0) return null;
      return pn / p0 - 1;
    }
    __name(fwdRet, "fwdRet");
    const daily = [];
    for (const ds of daysArr) {
      const cands = raw[ds].cands || [];
      if (!cands.length) continue;
      const rets = { f1: [], f3: [], f5: [] };
      const baseRet = { f1: null, f3: null, f5: null };
      for (const h of [1, 3, 5]) {
        baseRet["f" + h] = fwdRet(btcSeries, ds, h);
      }
      const scored = cands.filter((c) => c.forward_score != null && c.forward_score >= 4);
      const pool = scored.length ? scored : cands;
      for (const c of pool) {
        const s = pxSeries[c.base_asset];
        if (!s) continue;
        for (const h of [1, 3, 5]) {
          const r = fwdRet(s, ds, h);
          if (r != null) rets["f" + h].push(r);
        }
      }
      const stats = { date: ds, n_candidates: cands.length, scored: pool.length };
      for (const h of [1, 3, 5]) {
        const arr = rets["f" + h];
        stats["f" + h + "_mean"] = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 1e4) / 1e4 : null;
        stats["f" + h + "_n"] = arr.length;
        stats["f" + h + "_win"] = arr.length ? Math.round(arr.filter((x) => x > 0).length / arr.length * 1e3) / 10 : null;
        stats["btc_" + h] = baseRet["f" + h] != null ? Math.round(baseRet["f" + h] * 1e4) / 1e4 : null;
      }
      stats.excess_f3 = stats.f3_mean != null && stats.btc_3 != null ? Math.round((stats.f3_mean - stats.btc_3) * 1e4) / 1e4 : null;
      daily.push(stats);
    }
    const agg = { f1: [], f3: [], f5: [], ex3: [] };
    let nDays = 0;
    for (const d of daily) {
      if (d.f1_mean != null) {
        agg.f1.push(d.f1_mean);
        nDays++;
      }
      if (d.f3_mean != null) agg.f3.push(d.f3_mean);
      if (d.f5_mean != null) agg.f5.push(d.f5_mean);
      if (d.excess_f3 != null) agg.ex3.push(d.excess_f3);
    }
    const mean = /* @__PURE__ */ __name((a) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 1e4) / 1e4 : null, "mean");
    const summary = { n_days: nDays, f1_mean: mean(agg.f1), f3_mean: mean(agg.f3), f5_mean: mean(agg.f5), excess_f3_mean: mean(agg.ex3), win3: mean(daily.filter((d) => d.f3_mean != null).map((d) => d.f3_win)) };
    return json({ ok: true, days, tz: "UTC+8", daily, summary, note: "fwd \u6536\u76CA\u57FA\u4E8E\u6BCF\u65E5\u6536\u76D8\u4EF7\u5FEB\u7167\uFF08last_price\uFF09\uFF1Bfwd \u4E3A\u5165\u9009\u65E5\u6536\u76D8\u5230 +N \u65E5\u6536\u76D8\uFF1Bexcess=\u5019\u9009\u5747\u503C-BTC" });
  }
  __name(hPA, "hPA");
  async function hFW(kv) {
    const r = await kv.get("forward_data");
    if (!r) return json({ ok: false, error: "no forward data", data: [], updated: null, count: 0 });
    const p = JSON.parse(r);
    const arr = Array.isArray(p) ? p : p.data || [];
    return json({ ok: true, updated: p.updated || null, count: p.count || arr.length, env: p.env || null, data: arr });
  }
  __name(hFW, "hFW");
  async function hML(kv) {
    const r = await kv.get("mentioned_list");
    if (!r) return json({ ok: false, error: "no mentioned list", mentioned: [] });
    try {
      return json({ ok: true, mentioned: JSON.parse(r) });
    } catch (e) {
      return json({ ok: false, error: e.message, mentioned: [] });
    }
  }
  __name(hML, "hML");
  async function hSC(kv) {
    const [dr, cr, fr] = await Promise.all([kv.get("data"), kv.get("coinfilter_data"), kv.get("forward_data")]);
    const base = {};
    if (dr) {
      try {
        const p = JSON.parse(dr);
        (Array.isArray(p) ? p : p.data || []).forEach((c) => {
          if (c.base_asset) base[c.base_asset] = { market_cap: c.market_cap, volume_24h_usdt: c.volume_24h_usdt, cmc_rank: c.cmc_rank, circulating_ratio: c.circulating_ratio, unlock_risk: c.unlock_risk };
        });
      } catch (e) {
      }
    }
    const cf = {};
    if (cr) {
      try {
        const p = JSON.parse(cr);
        (Array.isArray(p) ? p : p.data || []).forEach((c) => {
          if (c.base_asset) cf[c.base_asset] = c;
        });
      } catch (e) {
      }
    }
    const fw = {};
    if (fr) {
      try {
        const p = JSON.parse(fr);
        (Array.isArray(p) ? p : p.data || []).forEach((c) => {
          if (c.base_asset) fw[c.base_asset] = c;
        });
      } catch (e) {
      }
    }
    let env = null;
    try {
      const p = JSON.parse(fr || "{}");
      env = p.env || null;
    } catch (e) {
    }
    const envUp = env ? env.up : null;
    const rows = [];
    const allSyms = /* @__PURE__ */ new Set([...Object.keys(cf), ...Object.keys(fw)]);
    for (const sym of allSyms) {
      const c = cf[sym] || {}, f = fw[sym] || {}, b = base[sym] || {};
      const oi = c.oi_value != null ? c.oi_value : f.oi_value != null ? f.oi_value : null;
      const volOi = c.volume_oi_ratio != null ? c.volume_oi_ratio : f.volume_oi_ratio != null ? f.volume_oi_ratio : null;
      const fund = c.funding_rate_pct != null ? c.funding_rate_pct : f.funding_rate_pct != null ? f.funding_rate_pct : null;
      const chg = c.change_24h_pct != null ? c.change_24h_pct : f.change_24h_pct != null ? f.change_24h_pct : null;
      const price = c.price != null ? c.price : f.price != null ? f.price : null;
      const vol = c.volume_24h_usdt != null ? c.volume_24h_usdt : b.volume_24h_usdt != null ? b.volume_24h_usdt : null;
      const score = f.forward_score != null ? f.forward_score : 0;
      const sig = f.signal || "noise";
      let effSig = sig;
      if (sig === "acc_candidate" && envUp === false) effSig = "acc_candidate_env_bear";
      const thinBook = c.orderbook_depth_usdt != null && c.orderbook_depth_usdt < 2e5;
      const distribution = oi != null && volOi != null && chg != null && oi > 8e7 && volOi < 3 && chg < -10;
      const killLongs = oi != null && chg != null && chg < -5;
      const eventDay = volOi != null && volOi >= 5;
      const negFundPump = fund != null && fund < -0.05 && chg != null && chg > 0;
      const alerts = [];
      if (f.spring_test) alerts.push("ST/Spring");
      if (f.breakout_consolidation) alerts.push("\u5927\u9633\u7EBF\u540E\u76D8\u6574");
      if (c.oi_24h_change_pct != null && c.oi_24h_change_pct > 2 && volOi != null && volOi >= 5) alerts.push("\u653E\u91CF+OI\u8DDF\u4E0A");
      if (fund != null && fund < -0.05) alerts.push("\u6DF1\u8D1F\u8D44\u8D39");
      rows.push({
        symbol: sym,
        base_asset: sym.replace("USDT", ""),
        price,
        change_24h_pct: chg,
        volume_24h_usdt: vol,
        market_cap: b.market_cap != null ? b.market_cap : null,
        oi_value: oi,
        volume_oi_ratio: volOi,
        funding_rate_pct: fund,
        orderbook_depth_usdt: c.orderbook_depth_usdt != null ? c.orderbook_depth_usdt : null,
        oi_stage_label: c.oi_stage_label || null,
        tags: c.tags || [],
        forward_score: score,
        forward_signal: sig,
        effective_signal: effSig,
        drawdown_60d: f.drawdown_60d,
        range_20d: f.range_20d,
        vol_shrink_20d: f.vol_shrink_20d,
        near_low_20d: f.near_low_20d,
        big_move_5d: f.big_move_5d,
        spring_test: !!f.spring_test,
        breakout_consolidation: !!f.breakout_consolidation,
        oi_24h_change_pct: c.oi_24h_change_pct != null ? c.oi_24h_change_pct : null,
        thin_book: thinBook,
        distribution,
        kill_longs: killLongs,
        event_day: eventDay,
        neg_fund_pump: negFundPump,
        alerts
      });
    }
    return json({ ok: true, updated: (/* @__PURE__ */ new Date()).toISOString(), count: rows.length, env, data: rows });
  }
  __name(hSC, "hSC");
  async function hST(kv) {
    const r = await kv.get("data"), u = await kv.get("last_updated"), c = await kv.get("count"), dr = await kv.get("demon_data"), cr = await kv.get("coinfilter_data"), fw = await kv.get("forward_data");
    let dc = 0, du = null, cc = 0, cu = null;
    if (dr) {
      try {
        const dp = JSON.parse(dr);
        dc = dp.count || (Array.isArray(dp) ? dp.length : 0);
        du = dp.updated || null;
      } catch (e) {
      }
    }
    if (cr) {
      try {
        const cp = JSON.parse(cr);
        cc = cp.count || (Array.isArray(cp) ? cp.length : 0);
        cu = cp.updated || null;
      } catch (e) {
      }
    }
    const ml = await kv.get("mentioned_list");
    let mentioned = [];
    if (ml) {
      try {
        mentioned = JSON.parse(ml);
      } catch (e) {
      }
    }
    return json({ project: "\u7B79\u7801\u7B5B\u9009", ok: !!r, coins: parseInt(c || "0"), updated: u, demon: { ok: !!dr, coins: parseInt(dc || "0"), updated: du }, coinfilter: { ok: !!cr, coins: parseInt(cc || "0"), updated: cu }, forward: { ok: !!fw, coins: fw ? (() => {
      try {
        return JSON.parse(fw).count || 0;
      } catch (e) {
        return 0;
      }
    })() : 0, updated: fw ? (() => {
      try {
        return JSON.parse(fw).updated || null;
      } catch (e) {
        return null;
      }
    })() : null }, mentioned });
  }
  __name(hST, "hST");
  async function hDD(kv) {
    const eps = [{ n: "BN", u: "https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT" }, { n: "BN spot", u: "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT" }, { n: "BB", u: "https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT" }, { n: "OKX", u: "https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT-SWAP" }];
    const r = {};
    for (const ep of eps) {
      const c = new AbortController(), t = setTimeout(() => c.abort(), 1e4);
      try {
        const res = await fetch(ep.u, { signal: c.signal });
        clearTimeout(t);
        const txt = await res.text().catch(() => "");
        r[ep.n] = { s: res.status, p: txt.slice(0, 100) };
      } catch (e) {
        clearTimeout(t);
        r[ep.n] = { e: e.message };
      }
    }
    await kv.put("debug_exchange", JSON.stringify(r)).catch(() => {
    });
    return json(r);
  }
  __name(hDD, "hDD");
})();
//# sourceMappingURL=worker_v10_inline.js.map

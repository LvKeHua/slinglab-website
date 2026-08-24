/**
 * 构建自包含前端：将 messages/OHLCV 数据直接嵌入 HTML
 * 生成的文件可以在 GitHub Pages / 任何静态托管上直接运行
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── 读取文件 ───
const html = readFileSync(resolve(ROOT, 'frontend', 'index.html'), 'utf-8');
const messages = readFileSync(resolve(ROOT, 'data', 'messages_enriched.json'), 'utf-8');
const btc = readFileSync(resolve(ROOT, 'data', 'btc_ohlcv_1d.json'), 'utf-8');
const eth = readFileSync(resolve(ROOT, 'data', 'eth_ohlcv_1d.json'), 'utf-8');
const btc4h = readFileSync(resolve(ROOT, 'data', 'btc_ohlcv_4h.json'), 'utf-8');

// ─── 计算 daily ───
const msgs = JSON.parse(messages);
const dailyMap = {};
for (const m of msgs) {
  if (m.date) dailyMap[m.date] = (dailyMap[m.date] || 0) + 1;
}
const totalDays = Object.keys(dailyMap).length;
const dailyJson = JSON.stringify(dailyMap);

// ─── 替换 loadAll() ───
// 找到 loadAll 函数并替换 (match the new signature with btc4hR)
const oldLoadAll = `async function loadAll() {
  try {
    const [msgsR, dailyR, btcR, ethR, btc4hR] = await Promise.all([
      fetch('/api/messages').then(r=>r.json()),
      fetch('/api/daily').then(r=>r.json()),
      fetch('/api/btc').then(r=>r.json()),
      fetch('/api/eth').then(r=>r.json()),
      fetch('/api/btc4h').then(r=>r.json()).catch(()=>({data:[]})),
    ]);
    S.messages = msgsR.data || [];
    S.dailyMsgs = dailyR.data || {};
    S.btcData = btcR.data || [];
    S.ethData = ethR.data || [];
    S.btc4hData = btc4hR.data || [];

    classifyAllPosts();

    if (!S.btc4hData.length) {
      document.querySelectorAll('.tf-btn[data-tf="4h"]').forEach(b => {
        b.disabled = true; b.style.opacity='0.3'; b.title='4H data not available';
      });
    }

    document.getElementById('msgCount').textContent = msgsR.total?.toLocaleString() || S.messages.length.toLocaleString();
    document.getElementById('dayCount').textContent = dailyR.total_days || '—';
    document.getElementById('tlCount').textContent = S.messages.length;

    updateStats();
    renderTimeline(S.messages);
    initChart();
  } catch (e) {
    document.getElementById('msgList').innerHTML = '<div class="empty-state">Failed to load data</div>';
  }
}`;

const newLoadAll = `// ─── EMBEDDED DATA (no API needed) ───
const __DATA__ = {
  messages: ${messages},
  btc: ${btc},
  eth: ${eth},
  btc4h: ${btc4h},
};
const __DAILY__ = ${dailyJson};
const __TOTAL_DAYS__ = ${totalDays};

function loadAll() {
  S.messages = __DATA__.messages;
  S.dailyMsgs = __DAILY__;
  S.btcData = __DATA__.btc;
  S.ethData = __DATA__.eth;
  S.btc4hData = __DATA__.btc4h;

  classifyAllPosts();

  document.getElementById('msgCount').textContent = S.messages.length.toLocaleString();
  document.getElementById('dayCount').textContent = __TOTAL_DAYS__;
  document.getElementById('tlCount').textContent = S.messages.length;

  if (S.btc4hData.length) {
    document.querySelectorAll('.tf-btn[data-tf="4h"]').forEach(b => { b.disabled = false; b.style.opacity=''; b.title=''; });
  }

  updateStats();
  renderTimeline(S.messages);
  initChart();
}`;

if (!html.includes(oldLoadAll)) {
  console.error('ERROR: Could not find the loadAll() function in the HTML.');
  console.error('The HTML may have been modified. Check the source.');
  process.exit(1);
}

const outputHtml = html.replace(oldLoadAll, newLoadAll);

// ─── 写入 docs/（GitHub Pages 默认目录） ───
const outDir = resolve(ROOT, 'docs');
const outPath = resolve(outDir, 'index.html');
writeFileSync(outPath, outputHtml, 'utf-8');

const sizeKB = (outputHtml.length / 1024).toFixed(1);
const dataKB = (messages.length / 1024).toFixed(1);
console.log(`✓ Self-contained HTML generated`);
console.log(`  Size: ${sizeKB}KB (data: ${dataKB}KB)`);
console.log(`  Path: ${outPath}`);

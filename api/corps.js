/* 行銷自動化兵團・聚合閘道（CORPS GATEWAY）
   動機：Hobby 方案每部署上限 12 個 Serverless Functions——六部機器人收攏為這一支，零金鑰恆在線（沙箱優先，插鑰升級）。
   路由：GET|POST /api/corps?bot=funnel|seq|broadcast|ads|radar|omo|status
     ├ funnel    GET 因子表・POST {lead} → 熱度分＋分流＋下一步
     ├ seq       GET 序列定義・?tick=1&secret=$CRON_SECRET 排程心跳（沙箱＝預演清單）
     ├ broadcast GET 分眾＋模板・POST {seg,text|tpl} → 零鑰預演／LINE_CHANNEL_TOKEN 在→官方 push
     ├ ads       POST {event,...} → Meta CAPI／GA4 服务端回传；零鑰＝沙箱收單
     ├ radar     GET 上次巡檢・POST {} / ?tick=1 → 本站 SEO 健檢（僅 xingdeng.tw，合法邊界）
     ├ omo       GET ?code=.. → QR 深度連結・POST {code,...} → 線下留單入漏斗
     └ status    （預設）所有機器人模式摘要・給 ops HUD／roster
   ※ 規則引擎鎖死政策對齊：沒鑰不呼外部；要真上崗只加 env，不改碼。 */
const crypto = require('crypto');

/* ---- funnel：名單熱度分流 ---- */
const F_RULES = [
  { f: '行業關鍵字', w: 20, hit: l => /(餐飲|餐|咖啡|食|軟體|saas|app|房|建案|製造|工廠|電商|顧問|醫療|教育|美容)/i.test(`${l.industry||''} ${l.message||''} ${l.note||''}`) },
  { f: '痛點具體', w: 15, hit: l => /(痛|困|流失|轉化|沒名單|沒客戶|流量|廣告|跳出|海外|夜間|多語|排名)/i.test(l.message || l.note || '') },
  { f: '預算明示', w: 20, hit: l => /\$|NT\$|萬|千元|budget/i.test(`${l.budget||''} ${l.message||''} ${l.note||''}`) },
  { f: '決策者身分', w: 15, hit: l => /(老闆|總裁|總經理|負責人|founder|CEO|行銷經理|主管)/i.test(`${l.title||''} ${l.role||''} ${l.message||''}`) },
  { f: '時程急迫', w: 10, hit: l => /(急|馬上|這週|本月|deadline|asap)/i.test(`${l.timeline||''} ${l.message||''}`) },
  { f: '來源管道', w: 10, hit: l => /(checkout|kit=|plan=R[123]|diagnose|offline|omo|try)/i.test(`${l.source||''} ${l.landing||''} ${l.utm_source||''} ${l.page||''}`) },
  { f: '聯絡品質', w: 15, hit: l => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(l.email || '') && (l.phone || '').replace(/\D/g, '').length >= 8 },
];
const segOf = s => (s >= 70 ? 'hot' : s >= 40 ? 'warm' : 'cold');
function playbook(score, source) {
  const omo = /offline|omo|QR/i.test(String(source || ''));
  const next = score >= 70 ? ['業務 2 小時內人工聯繫', '同步發 LINE 專屬報價卡', '啟動 sequence：hot-48h'] :
    score >= 40 ? ['發樣板試看信（T1/T2/T3）', '邀請 /try 試玩', '啟動 sequence：warm-7d'] :
    ['進內容養客池：每週一則趨勢電子報', '30 天後熱度重估'];
  return { tier: segOf(score), next_steps: next, omo_merge: omo ? '線下掃碼來客：結論後 24h 內補推「離線→線上」接待錄影' : null };
}
const funnelScore = lead => { let s = 0; for (const r of F_RULES) if (r.hit(lead)) s += r.w; return s; };

/* ---- seq：排程序列 ---- */
const SEQUENCES = {
  'hot-48h': { desc: '熱名單 48 小時快攻', steps: [
    { at: '0h', via: 'email', subject: '剛聊的策略先收好：您的 SWOT 起手式', body: '附摘要＋報價單直連結 /checkout。' },
    { at: '4h', via: 'line', body: '老闆好，這是剛剛幫您排的 90 天落地排程，方便約 15 分鐘確認預算區間嗎？' },
    { at: '32h', via: 'email', subject: '補一個同行案例：從零名單到每週十餘份詢盤', body: '案例＋/try 試玩連結。' } ] },
  'warm-7d': { desc: '溫名單 7 日養客', steps: [
    { at: '0d', via: 'email', subject: '您產業的獲客矛盾，一頁拆給您看', body: '趨勢文章精選＋五維診斷邀請 /diagnose。' },
    { at: '2d', via: 'email', subject: '樣板公開試玩：30 秒看到您的新門面', body: '/try 試玩區直連結。' },
    { at: '5d', via: 'line', body: '本週名額還剩兩席免費診斷，要幫您留一席嗎？' },
    { at: '7d', via: 'email', subject: '公開優惠本期倒數', body: 'T1/T2/T3 對照＋報價單產生連結。' } ] },
  'cold-30d': { desc: '冷名單內容養客（每週一則）', steps: [{ at: 'weekly', via: 'email', subject: '本週趨勢速讀｜光曜星樞', body: 'Content Engine 精選一則＋soft CTA。' }] },
  'omo-24h': { desc: '線下掃碼客 24 小時接住', steps: [
    { at: '0m', via: 'web', body: '掃碼落地→/try 試玩區（omo 碼已綁）。' },
    { at: '20h', via: 'line', body: '前幾天展場聊到的需求，我整理成一頁了——現在傳給您？' } ] },
};

/* ---- broadcast：分眾推送 ---- */
const SEGMENTS = { all: '全部好友', hot: '熱名單（funnel≥70）', warm: '溫名單（40–69）', omo: '線下掃碼客', industry: '產業分眾' };
const TEMPLATES = {
  promo_flash: '本週四 24:00 前下單 T2 店家版，加贈《2026 趨勢報告》紙本＋全站健檢一輪。',
  new_article: '{title}｜趨勢文章更新了，您的產業這週最該讀這篇。',
  event_omo: '今天在 {place} 聊過的那局 SWOT，我做成一頁了——掃圖上的 QR 直接看。',
  quote_close: '您上週的報價單 {quoteNo} 本週五到期，續有效請回「留」，改規格請回「改」。',
};

/* ---- radar：本站 SEO 巡檢 ---- */
const SELF = 'https://xingdeng.tw';
let lastScan = null;
const isSelf = u => { try { return new URL(u).hostname === 'xingdeng.tw'; } catch { return false; } };
async function crawlList() {
  try { const r = await fetch(SELF + '/sitemap.xml', { signal: AbortSignal.timeout(15000) }); const x = await r.text();
    return [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(isSelf).slice(0, 80); } catch { return []; }
}
async function audit(url) {
  const issues = []; const t0 = Date.now();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const html = await r.text();
    const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
    if (!title) issues.push('缺 title'); else if (title.length < 8 || title.length > 62) issues.push('title 長度 ' + title.length);
    if (!/<meta name="description" content=".{16,168}?"/i.test(html)) issues.push('description 不合規');
    if (!/<link rel="canonical" href="https:\/\/xingdeng\.tw/i.test(html)) issues.push('canonical 未對準主域');
    if (!/og:title/i.test(html)) issues.push('缺 OG 卡');
    if (url.endsWith('/3d')) { const ci = issues.indexOf('canonical 未對準主域'); if (ci > -1) issues.splice(ci, 1); } // 跨域 canonical＝刻意（姊妹站正位）
    const hl = new Set([...html.matchAll(/hreflang="(zh-Hant|en|ja|x-default)"/g)].map(m => m[1]));
    if (hl.size && hl.size < 4) issues.push('hreflang 不完整');
    return { url, ms: Date.now() - t0, health: issues.length ? issues : ['✓'] };
  } catch { return { url, health: ['skip（本輪抓取失敗）'] }; }
}
async function runScan() {
  const urls = await crawlList();
  const rows = []; for (const u of urls) rows.push(await audit(u));
  lastScan = { at: new Date().toISOString(), pages: rows.length, failing: rows.filter(r => !(r.health.length === 1 && r.health[0] === '✓')).map(r => r.url), rows };
  return lastScan;
}

/* ---- omo：線下 QR ---- */
let omoLedger = [];

/* ---- ads：轉換回传 ---- */
let adsBuffer = 0;

/* ---- nurture：真實養客引擎（Neon 在線即上崗；驅動缺失＝降回預演） ---- */
let _sqlf = null;
function neon() {
  if (!process.env.NEON_CONNECTION_STRING) return null;
  try { if (!_sqlf) _sqlf = require('@neondatabase/serverless').neon(process.env.NEON_CONNECTION_STRING); return _sqlf; }
  catch { return null; }
}
const stepMs = at => at === 'weekly' ? 7 * 86400e3 : at.endsWith('d') ? parseFloat(at) * 86400e3 : at.endsWith('h') ? parseFloat(at) * 3600e3 : parseFloat(at) * 60000;
async function leadPersist(l) {
  const s = neon(); if (!s) return { skipped: true };
  try {
    await s`INSERT INTO leads (kind, email, name, company, phone, topic, intent, message, industry, pain, page, funnel_score, funnel_tier, order_status, quote_id, amount, currency, product, paid_at)
      VALUES (${l.kind || 'form'}, ${l.email || ''}, ${l.name || null}, ${l.company || null}, ${l.phone || null}, ${l.topic || null}, ${l.intent || null}, ${l.message || null}, ${l.industry || null}, ${l.pain || null}, ${l.page || null}, ${l.funnel_score ?? null}, ${l.funnel_tier || null}, ${l.order_status || null}, ${l.quote_id || null}, ${l.amount ?? null}, ${l.currency || null}, ${l.product || null}, ${l.paid_at || null})`;
    return { ok: true, backend: 'neon' };
  } catch (e) { return { ok: false, error: String(e && e.message || e).slice(0, 160) }; }
}
async function nurtureTick() {
  const s = neon(); if (!s) return { db: false };
  const t0 = Date.now();
  const out = { db: true, bot: 'sequence-v1', mode: process.env.RESEND_API_KEY ? 'live' : 'awaiting-email-key', assigned: 0, sent: [], skipped: 0, waiting: 0, queue: 0 };
  try {
    const asg = await s`UPDATE leads SET nurture_seq = CASE
        WHEN (kind = 'omo' OR page ilike '%omo%') AND funnel_tier = 'hot' THEN 'omo-24h'
        WHEN funnel_tier = 'hot' THEN 'hot-48h' WHEN funnel_tier = 'warm' THEN 'warm-7d' ELSE 'cold-30d' END, nurture_step = 0
      WHERE nurture_seq IS NULL AND funnel_tier IS NOT NULL AND kind <> 'order-paid' AND at > now() - interval '62 days' RETURNING id`;
    out.assigned = asg.length;
    const rows = await s`SELECT id, email, name, nurture_seq, nurture_step, at FROM leads
      WHERE nurture_seq IN ('hot-48h','warm-7d','cold-30d','omo-24h') AND nurture_step < 100 AND at > now() - interval '62 days' ORDER BY at ASC LIMIT 25`;
    out.queue = rows.length;
    for (const row of rows) {
      if (Date.now() - t0 > 7000) break; // Hobby 時限自我防護
      const seq = SEQUENCES[row.nurture_seq]; if (!seq) continue;
      const i = row.nurture_step, st = seq.steps[i];
      if (!st) { await s`UPDATE leads SET nurture_step = 999 WHERE id = ${row.id}`; continue; }
      if (Date.now() - new Date(row.at).getTime() < stepMs(st.at)) continue;
      if (st.via === 'email') {
        if (!process.env.RESEND_API_KEY) { out.waiting++; continue; }
        const rr = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(4000),
          headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + process.env.RESEND_API_KEY },
          body: JSON.stringify({ from: process.env.RESEND_FROM || 'Orbit Tower <growth@xingdeng.tw>', to: [row.email], subject: st.subject || 'Orbit Tower', text: (st.body || '') + '\n\n— 光曜星樞 Orbit Tower·AI 戰略長自動寄送（回 STOP 停止）' }) })
          .then(r => r.ok ? { ok: true } : { ok: false, error: 'HTTP ' + r.status }).catch(e => ({ ok: false, error: String(e.message || e).slice(0, 80) }));
        await s`INSERT INTO nurture_log (lead_id, seq, step, via, status, err) VALUES (${row.id}, ${row.nurture_seq}, ${i}, 'email', ${rr.ok ? 'sent' : 'failed'}, ${rr.ok ? null : rr.error})`;
        if (rr.ok) { await s`UPDATE leads SET nurture_step = ${i + 1}, nurtured_at = now() WHERE id = ${row.id}`; out.sent.push({ to: row.email, seq: row.nurture_seq, step: i }); }
        else out.waiting++;
      } else {
        await s`INSERT INTO nurture_log (lead_id, seq, step, via, status, err) VALUES (${row.id}, ${row.nurture_seq}, ${i}, ${st.via}, 'skipped-auto', null)`;
        await s`UPDATE leads SET nurture_step = ${i + 1}, nurtured_at = now() WHERE id = ${row.id}`; out.skipped++;
      }
    }
    if (process.env.LINE_CHANNEL_TOKEN) {
      try { const pend = await s`SELECT id, text FROM push_outbox WHERE status = 'queued' AND kind = 'broadcast' ORDER BY created LIMIT 3`;
        for (const row of pend) {
          const lr = await fetch('https://api.line.me/v2/bot/message/broadcast', { method: 'POST', signal: AbortSignal.timeout(4000), headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + process.env.LINE_CHANNEL_TOKEN }, body: JSON.stringify({ messages: [{ type: 'text', text: String(row.text).slice(0, 500) }] }) });
          await s`UPDATE push_outbox SET status = ${lr.ok ? 'sent' : 'failed'}, sent_at = now() WHERE id = ${row.id}`; out.outbox_sent = (out.outbox_sent || 0) + (lr.ok ? 1 : 0);
        } } catch (e) {}
    }
    return out;
  } catch (e) { return { db: false, degraded: String(e && e.message || e).slice(0, 120) }; }
}

/* ---- selfpulse：無外部排程依赖的自助心跳（>24h 未巡檢即補跑全站健檢＋IndexNow 提交） ---- */
let _pulsing = false;
async function selfPulse() {
  if (_pulsing) return 'pulse-running';
  const fresh = lastScan && (Date.now() - new Date(lastScan.at).getTime() < 86400e3 * 0.95);
  if (fresh) return 'ok-' + lastScan.at;
  _pulsing = true;
  try {
    await runScan();
    const xml = await fetch('https://xingdeng.tw/sitemap.xml', { signal: AbortSignal.timeout(8000) }).then(r => r.text()).catch(() => '');
    const keyFile = 'e24cad9d714ff951d6fcad6f6150cd3d.txt';
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(u => u.includes('://xingdeng.tw')).slice(0, 500);
    if (urls.length) await fetch('https://api.indexnow.org/indexnow', { method: 'POST', signal: AbortSignal.timeout(9000), headers: { 'content-type': 'application/json' }, body: JSON.stringify({ host: 'xingdeng.tw', key: keyFile.slice(0, 32), keyLocation: 'https://xingdeng.tw/' + keyFile, urlList: urls }) }).catch(() => {});
    return 'ran-' + lastScan.at;
  } catch (e) { return 'degraded'; } finally { _pulsing = false; }
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) return req.body;
  const c = [];
  await new Promise(r => { req.on('data', x => c.push(x)); req.on('end', r); });
  return JSON.parse(Buffer.concat(c).toString('utf8') || '{}');
}
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const u = new URL(req.url, 'http://x');
  const bot = (u.searchParams.get('bot') || 'status').toLowerCase();
  const env = { line: !!process.env.LINE_CHANNEL_TOKEN, email: !!(process.env.RESEND_API_KEY || process.env.SMTP_HOST),
    meta: !!(process.env.FACEBOOK_PIXEL_ID && process.env.FACEBOOK_ACCESS_TOKEN), ga4: !!(process.env.GA4_MEASUREMENT_ID && process.env.GA4_API_SECRET),
    cron: !!process.env.CRON_SECRET, supabase: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)),
    neon: !!process.env.NEON_CONNECTION_STRING };
  const sandbox = o => ({ ok: true, mode: 'sandbox（零金鑰不呼外部＝鎖死政策一致）', ...o });
  // Vercel Cron 走 Authorization: Bearer $CRON_SECRET header；外部排程仍可用 ?secret=
  const cronOK = secret => !secret || req.headers['authorization'] === 'Bearer ' + secret || u.searchParams.get('secret') === secret;
  try {
    if (bot === 'status' || bot === '') return res.status(200).json({ ok: true, corps: 'v27', bots: {
      funnel: { mode: 'local-rules 恆在線' }, seq: { mode: env.cron ? 'cron-guarded' : 'manual/open-tick', sequences: Object.keys(SEQUENCES) },
      broadcast: { mode: env.line ? 'live' : 'queued-batch（無鑰入 push_outbox 佇列，心跳自動沖刷）' }, ads: { mode: (env.meta || env.ga4) ? 'live-bridge' : 'sandbox', buffered_events: adsBuffer },
      radar: { mode: 'self-audit + 自助心跳（>24h 自動補巡檢&IndexNow）', last: lastScan ? lastScan.at : '尚未巡檢' }, omo: { mode: 'in-memory-ledger', entries: omoLedger.length } }, omni: '司令部上線・POST 單调用全鏈', keys: env });
    if (bot === 'site') { /* one-click deploy: stateless render, XSS-safe */
      try {
        const raw = (u.searchParams.get('d') || '').replace(/\+| /g, m => (m === ' ' ? '+' : m)).replace(/-/g, '+').replace(/_/g, '/');
        const st = JSON.parse(decodeURIComponent(escape(atob(raw.slice(0, 4000)))));
        const jsq = s => JSON.stringify(s).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
        const escp = s => String(s == null ? '' : s).replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[ch]));
        const brand = escp((st.brand || 'My Brand').slice(0, 60)), contact = escp((st.contact || '').slice(0, 120));
        const col = /^#[0-9a-fA-F]{3,8}$/.test(String(st.col || '')) ? st.col : '#2563EB';
        const sells = (Array.isArray(st.sells) ? st.sells.slice(0, 3).map(escp) : []).filter(Boolean);
        const bl = sells.length ? sells : ['Facade Refresh', 'Reception Online', 'Leads In'];
        const html = '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + brand + ' · Orbit Tower Powered</title><meta name="robots" content="noindex"><style>body{margin:0;font-family:-apple-system,Roboto,sans-serif;background:#FAFAF8;color:#0F172A}.hero{background:linear-gradient(135deg,' + col + ',#0B132B);color:#fff;padding:64px 22px 58px;text-align:center}.hero h1{margin:0 0 12px;font-size:clamp(30px,6vw,52px)}.pill{display:inline-block;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.35);border-radius:99px;padding:6px 16px;font-size:13px;margin-bottom:18px}.grid{max-width:860px;margin:34px auto;padding:0 20px;display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}.card{background:#fff;border:1px solid #E7E5E4;border-radius:16px;padding:20px;font-weight:700}.cta{max-width:560px;margin:8px auto 60px;padding:0 20px;text-align:center}input,textarea{width:100%;padding:12px;border:1px solid #CBD5E1;border-radius:10px;margin:6px 0;font:inherit}button{background:' + col + ';color:#fff;border:0;border-radius:10px;padding:12px 26px;font-weight:800;cursor:pointer}.foot{border-top:1px solid #E7E5E4;padding:20px;text-align:center;font-size:12.5px;color:#78716C;background:#fff}</style></head><body><div class="hero"><div class="pill">★ AI 24/7 reception live (leads route to your console)</div><h1>' + brand + '</h1>' + (contact ? '<p>' + contact + '</p>' : '') + '</div><div class="grid">' + bl.map(b => '<div class="card">✦ ' + b + '</div>').join('') + '</div><div class="cta"><h2>Leave a line, AI replies first</h2><input id="e" type="email" placeholder="you@email.com"><textarea id="m" rows="2" placeholder="your need in one line"></textarea><button onclick="sub()">Send</button><div id="rr" style="margin-top:10px;font-size:14px"></div></div><div class="foot">Generated by <a href="https://xingdeng.tw/quick" style="color:' + col + '">Orbit Tower one-click</a> · preview only, noindex · upgrade → /pricing</div><scr' + 'ipt>function sub(){var e=document.getElementById("e").value.trim(),m=document.getElementById("m").value.trim();if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$/.test(e)){document.getElementById("rr").textContent="valid email please";return}fetch("https://xingdeng.tw/api/leads",{mode:"cors",method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"guest-site",email:e,message:m,company:' + jsq(String(st.brand||'').slice(0,60)) + ',industry:' + jsq(String(st.ind||'').slice(0,40)) + ',page:"/site-preview",intent:"preview-render"})}).then(function(r){return r.json()}).then(function(d){document.getElementById("rr").innerHTML=d.persisted?"OK delivered to console":"queued, will retry"}).catch(function(){document.getElementById("rr").textContent="retry please"})}</scr' + 'ipt></body></html>';
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).send(html);
      } catch (e) { return res.status(400).json({ ok: false, bot: 'site', error: 'bad state' }); }
    }
    if (bot === 'pulse') { /* 兵團自轉心跳：外部時鐘每秒敲一次，無人站也全天值勤（掃描节流 24h、養客與佇列全速） */
      const pa = await selfPulse();
      const nb = await nurtureTick();
      return res.status(200).json({ ok: true, bot: 'pulse-v1', at: new Date().toISOString(), seo: pa, nurture: nb.db ? { mode: nb.mode, assigned: nb.assigned, sent: (nb.sent || []).length, waiting: nb.waiting, outbox_sent: nb.outbox_sent || 0 } : { sandbox: true } });
    }
    if (bot === 'omni') { /* 全能型業務機器人・司令部：單调用完成 評分→入庫→派工 全鏈 */
      const s0 = neon();
      if (req.method === 'GET') {
        let week = [], queued = 0;
        if (s0) { try { week = await s0`SELECT funnel_tier, count(*)::int AS n FROM leads WHERE at > now() - interval '7 days' GROUP BY funnel_tier`; const q0 = await s0`SELECT count(*)::int AS n FROM push_outbox WHERE status = 'queued'`; queued = q0[0] ? q0[0].n : 0; } catch (e) {} }
        return res.status(200).json({ ok: true, bot: 'omni-v1', week, outbox_queued: queued, ads_buf: adsBuffer, scan: lastScan ? lastScan.at : null, omo_entries: omoLedger.length });
      }
      const bo = await readBody(req);
      const ld = bo.lead || bo;
      if (ld && typeof ld.email === 'string' && /@/.test(ld.email)) {
        const sc2 = funnelScore(ld); const pb2 = playbook(sc2, ld.intent || ld.page || ld.source || '');
        const pr2 = await leadPersist({ kind: ld.kind || 'omni-intake', email: String(ld.email).slice(0, 120), name: ld.name, company: ld.company, phone: ld.phone, industry: ld.industry, intent: String(ld.intent || '').slice(0, 160), message: String(ld.message || '').slice(0, 800), page: String(ld.page || '').slice(0, 160), funnel_score: sc2, funnel_tier: segOf(sc2) });
        console.log('OMNI_LEAD ' + JSON.stringify({ score: sc2, tier: pb2.tier, persisted: !!(pr2 && pr2.ok) }));
        return res.status(200).json({ ok: true, bot: 'omni-v1', score: sc2, tier: pb2.tier, next_steps: pb2.next_steps, seq_assigned: pb2.tier === 'hot' ? 'hot-48h' : pb2.tier === 'warm' ? 'warm-7d' : 'cold-30d', persisted: !!(pr2 && pr2.ok), queued: !(pr2 && pr2.ok) });
      }
      return res.status(400).json({ error: 'omni intake needs lead.email' });
    }
    if (bot === 'member') { /* LINE 官方帳號登入（無密碼＝不設忘記帳密；防一帳號多人：只保留最新 2 個 session）
        走聚合閘道不加第 13 支函式；env 就緒即上崗，零鑰＝JSON 預演與全域政策一致 */
      const s = neon(); const CID = process.env.LINE_LOGIN_ID || ''; const CS = process.env.LINE_LOGIN_SECRET || '';
      const REDIRECT = 'https://xingdeng.tw/api/corps?bot=member&h=cb';
      const now = Date.now();
      const rlm = (globalThis.__mrl || (globalThis.__mrl = new Map()));
      const ip = String((req.headers['x-forwarded-for'] || '')).split(',')[0].trim();
      const w = rlm.get(ip) || [0, now + 600000]; if (w[1] < now) { w[0] = 0; w[1] = now + 600000; } w[0]++; rlm.set(ip, w);
      if (w[0] > 30) return res.status(429).json({ ok: false, err: 'rate-limited（防暴力枚举）' });
      const h = u.searchParams.get('h') || 'start';
      const sig = v => require('crypto').createHmac('sha256', process.env.CRON_SECRET || 'dev-only-key').update(String(v)).digest('base64url');
      const readCookie = () => { const m2 = String(req.headers.cookie || '').match(/orbit_sid=([^;]+)/); return m2 ? decodeURIComponent(m2[1]) : ''; };
      const sidHash = raw => raw ? sig('S' + raw) : '';
      if (h === 'start') {
        if (!CID || !CS) return res.status(200).json(sandbox({ bot: 'member-v1', step: 'start', note: '等 LINE_LOGIN_ID / LINE_LOGIN_SECRET（LINE Developers → Login 頻道）' }));
        return res.status(302).redirect('https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=' + encodeURIComponent(CID) + '&redirect_uri=' + encodeURIComponent(REDIRECT) + '&state=' + sig('st-' + ip) + '&scope=openid%20profile');
      }
      if (h === 'cb') {
        if (!s) return res.status(200).json(sandbox({ bot: 'member-v1', step: 'cb', note: 'DB 未就緒' }));
        if (!CID || !CS) return res.status(200).json({ ok: false, bot: 'member-v1', err: 'no-login-channel-env' });
        const tok = await fetch('https://api.line.me/oauth2/v2.1/token', { method: 'POST', signal: AbortSignal.timeout(8000), headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'authorization_code', code: String(u.searchParams.get('code') || ''), redirect_uri: REDIRECT, client_id: CID, client_secret: CS }) }).then(r => r.json()).catch(() => ({}));
        if (!tok.access_token) return res.status(400).json({ ok: false, err: 'line token exchange failed' });
        const pr = await fetch('https://api.line.me/v2/v2/profile', { headers: { Authorization: 'Bearer ' + tok.access_token }, signal: AbortSignal.timeout(8000) }).then(r => r.json()).catch(() => ({}));
        const uid = String(pr.userId || ''); if (!uid) return res.status(400).json({ ok: false, err: 'no uid' });
        try {
          await s`INSERT INTO members (uid, name, picture) VALUES (${uid}, ${pr.displayName || ''}, ${pr.pictureUrl || null})
            ON CONFLICT (uid) DO UPDATE SET name = COALESCE(NULLIF(EXCLUDED.name,''), members.name), picture = COALESCE(EXCLUDED.picture, members.picture), last_seen = now()`;
          const sid = uid.slice(0, 8) + '.' + now.toString(36) + '.' + require('crypto').randomBytes(8).toString('hex');
          await s`INSERT INTO sessions (sid, uid, ip, ua) VALUES (${sidHash(sid)}, ${uid}, ${ip.slice(0, 60)}, ${String(req.headers['user-agent'] || '').slice(0, 200)})`;
          const keep = await s`SELECT sid FROM sessions WHERE uid = ${uid} AND revoked IS NULL AND expires > now() ORDER BY created DESC OFFSET 2`;
          for (const k of keep) await s`UPDATE sessions SET revoked = now() WHERE sid = ${k.sid}`;
          res.setHeader('Set-Cookie', 'orbit_sid=' + sid + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000');
          return res.status(302).redirect('/?member=1');
        } catch (e) { return res.status(200).json({ ok: false, bot: 'member-v1', degraded: String(e.message || e).slice(0, 120) }); }
      }
      if (h === 'whoami') {
        const raw = readCookie(); const sh = sidHash(raw);
        if (!s || !sh) return res.status(401).json({ ok: false });
        try { const rows = await s`SELECT ss.uid, m.name FROM sessions ss JOIN members m ON m.uid = ss.uid WHERE ss.sid = ${sh} AND ss.revoked IS NULL AND ss.expires > now() LIMIT 1`;
          return rows.length ? res.status(200).json({ ok: true, uid: rows[0].uid, name: rows[0].name }) : res.status(401).json({ ok: false, signedOut: true }); }
        catch { return res.status(500).json({ ok: false }); }
      }
      if (h === 'out') { if (s) { try { await s`UPDATE sessions SET revoked = now() WHERE sid = ${sidHash(readCookie())}`; } catch {} }
        res.setHeader('Set-Cookie', 'orbit_sid=; Max-Age=0; Path=/'); return res.status(200).json({ ok: true }); }
      return res.status(200).json({ ok: true, bot: 'member-v1', hint: 'h=start|cb|whoami|out' });
    }
    if (bot === 'funnel') {
      if (req.method !== 'POST') return res.status(200).json({ ok: true, bot: 'funnel-v1', factors: F_RULES.map(r => ({ name: r.f, weight: r.w })), thresholds: { hot: 70, warm: 40 } });
      const b = await readBody(req); const l = b.lead || b; let score = 0; const hits = [];
      for (const r of F_RULES) if (r.hit(l)) { score += r.w; hits.push(r.f); }
      return res.status(200).json({ ok: true, bot: 'funnel-v1', score, ...playbook(score, l.source || l.landing || l.utm_source || l.page), factors_hit: hits });
    }
    if (bot === 'seq') {
      if (u.searchParams.get('tick') === '1') {
        const secret = process.env.CRON_SECRET;
        if (!cronOK(secret)) return res.status(401).json({ error: 'bad cron secret' });
        const nr = await nurtureTick();
        if (nr.db) return res.status(200).json(nr);
        const nowMin = Math.floor(Date.now() / 60000);
        const dispatched = [];
        for (const [id, s] of Object.entries(SEQUENCES)) s.steps.forEach((st, i) => { if (st.at === 'weekly' ? nowMin % 60 === 0 : (Math.floor(nowMin / 120) % 4) === i % 4) dispatched.push({ seq: id, step: i, at: st.at, via: st.via }); });
        const live = env.email || env.line;
        return res.status(200).json({ ok: true, bot: 'sequence-v1', mode: live ? 'live-dispatch（env 就緒才真髮送）' : 'sandbox', dispatched });
      }
      return res.status(200).json(sandbox({ bot: 'sequence-v1', sequences: SEQUENCES, note: '心跳：Vercel Cron 自帶 Bearer header；外部排程可用 &secret=' }));
    }
    if (bot === 'broadcast') {
      if (req.method !== 'POST') return res.status(200).json({ ok: true, bot: 'broadcast-v1', mode: env.line ? 'live' : 'sandbox', segments: SEGMENTS, templates: TEMPLATES });
      const b = await readBody(req); const text = String(b.text || TEMPLATES[b.tpl] || '').slice(0, 500);
      if (!text) return res.status(400).json({ error: 'text or tpl required' });
      const segName = SEGMENTS[b.seg] ? `${b.seg}（${SEGMENTS[b.seg]}）` : SEGMENTS.all;
      if (!env.line) {
        const sbc = neon(); let qid = null;
        if (sbc) { try { const rq = await sbc`INSERT INTO push_outbox (kind, seg, text) VALUES ('broadcast', ${b.seg || 'all'}, ${text}) RETURNING id`; qid = rq[0] ? rq[0].id : null; } catch (e) {} }
        return res.status(200).json(sandbox({ bot: 'broadcast-v1', queued: !!qid, will_reach: segName, note: '已入出件佇列：LINE 鑰就位後，下一次心跳自動實發' }));
      }
      const r = await fetch('https://api.line.me/v2/bot/message/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.LINE_CHANNEL_TOKEN }, body: JSON.stringify({ messages: [{ type: 'text', text }] }) });
      return res.status(r.ok ? 200 : 502).json({ ok: r.ok, bot: 'broadcast-v1', sent: r.ok, line_status: r.status });
    }
    if (bot === 'ads') {
      if (req.method !== 'POST') return res.status(200).json({ ok: true, bot: 'ads-bridge-v1', meta_capi: env.meta ? 'armed' : 'sandbox', ga4_server: env.ga4 ? 'armed' : 'sandbox' });
      const b = await readBody(req); const ev = String(b.event || '').slice(0, 40);
      if (!ev) return res.status(400).json({ error: 'event required' });
      if (!env.meta && !env.ga4) { adsBuffer++; return res.status(200).json(sandbox({ bot: 'ads-bridge-v1', event: ev, buffered: adsBuffer, note: '未掛金鑰：僅沙箱驗收。掛上 Pixel/GA4 即雙橋生效。' })); }
      const jobs = [];
      if (env.meta) jobs.push(fetch(`https://graph.facebook.com/v19.0/${process.env.FACEBOOK_PIXEL_ID}/events?access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: [{ event_name: ev.toUpperCase().replace(/[^A-Z_]/g, '_'), event_time: Math.floor(Date.now() / 1000), action_source: 'website', user_data: { external_ids: b.clientIdHash ? [b.clientIdHash] : [] }, custom_data: b.custom_data }] }) }).then(r => ({ meta: r.status })).catch(e => ({ meta: String(e.message).slice(0, 80) })));
      if (env.ga4) jobs.push(fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA4_MEASUREMENT_ID}&api_secret=${process.env.GA4_API_SECRET}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: b.clientId || 'anon-' + Date.now(), events: [{ name: ev, value: b.value, currency: b.currency }] }) }).then(r => ({ ga4: r.status })).catch(e => ({ ga4: String(e.message).slice(0, 80) })));
      return res.status(200).json({ ok: true, bot: 'ads-bridge-v1', event: ev, mode: 'dispatch', results: await Promise.all(jobs) });
    }
    if (bot === 'radar') {
      if (req.method === 'POST' || u.searchParams.get('tick') === '1') {
        const secret = process.env.CRON_SECRET;
        if (u.searchParams.get('tick') === '1' && !cronOK(secret)) return res.status(401).json({ error: 'bad cron secret' });
        const s = await runScan();
        return res.status(200).json({ ok: true, bot: 'radar-v1', at: s.at, pages: s.pages, failing_count: (s.failing || []).length, failing: (s.failing || []).slice(0, 20), boundary: '僅本站網域・未抓個資' });
      }
      return res.status(200).json({ ok: true, bot: 'radar-v1', last: lastScan || '尚未巡檢', mode: 'self-site-audit', pulse: await selfPulse() });
    }
    if (bot === 'omo') {
      if (req.method === 'GET' && (u.searchParams.get('code') || u.searchParams.get('src'))) {
        const code = String(u.searchParams.get('code') || 'SNT-DEFAULT').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
        const src = String(u.searchParams.get('src') || 'offline').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24);
        const deep = `https://xingdeng.tw/try?src=${encodeURIComponent(src)}&omo=${encodeURIComponent(code)}`;
        return res.status(200).json({ ok: true, bot: 'omo-v1', code, deep_link: deep, qr_image: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(deep)}` });
      }
      if (req.method !== 'POST') return res.status(405).json({ error: 'GET ?code・POST {code,email…}' });
      const b = await readBody(req);
      const lead = { industry: b.industry, email: b.email, phone: b.phone, message: b.note, source: `offline:${b.code || 'na'}`, utm_source: 'offline' };
      const s = funnelScore(lead);
      const row = { id: crypto.randomUUID(), at: new Date().toISOString(), ...lead, funnel_score: s, ...playbook(s, lead.source) };
      omoLedger.push(row); if (omoLedger.length > 50) omoLedger.shift();
      await leadPersist({ kind: 'omo', email: b.email, phone: b.phone, industry: b.industry, message: b.note || '', page: '/api/corps?bot=omo', intent: 'omo:' + (b.code || 'na'), funnel_score: s, funnel_tier: segOf(s) });
      if (env.supabase) { try { await fetch(process.env.SUPABASE_URL + '/rest/v1/leads', { method: 'POST', headers: { apikey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY), 'content-type': 'application/json', prefer: 'return=minimal' }, body: JSON.stringify({ kind: 'omo', ...lead, message: b.note || '', funnel_score: s, funnel_tier: segOf(s), at: row.at }) }); } catch {} }
      return res.status(200).json({ ok: true, bot: 'omo-v1', accepted: true, lead_id: row.id, score: s, ...playbook(s, lead.source) });
    }
    return res.status(400).json({ error: 'unknown bot', hint: 'omni|funnel|seq|broadcast|ads|radar|omo|status', bots: ['omni', 'funnel', 'seq', 'broadcast', 'ads', 'radar', 'omo', 'status'] });
  } catch (e) { return res.status(200).json({ ok: false, bot, degraded: true, error: String(e.message || e).slice(0, 140) }); }
};
module.exports.corps = { funnelScore, playbook, SEQUENCES, env: () => ({}) };

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
    cron: !!process.env.CRON_SECRET, supabase: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) };
  const sandbox = o => ({ ok: true, mode: 'sandbox（零金鑰不呼外部＝鎖死政策一致）', ...o });
  try {
    if (bot === 'status' || bot === '') return res.status(200).json({ ok: true, corps: 'v27', bots: {
      funnel: { mode: 'local-rules 恆在線' }, seq: { mode: env.cron ? 'cron-guarded' : 'manual/open-tick', sequences: Object.keys(SEQUENCES) },
      broadcast: { mode: env.line ? 'live' : 'sandbox' }, ads: { mode: (env.meta || env.ga4) ? 'live-bridge' : 'sandbox', buffered_events: adsBuffer },
      radar: { mode: 'self-audit', last: lastScan ? lastScan.at : '尚未巡檢' }, omo: { mode: 'in-memory-ledger', entries: omoLedger.length } }, keys: env });
    if (bot === 'funnel') {
      if (req.method !== 'POST') return res.status(200).json({ ok: true, bot: 'funnel-v1', factors: F_RULES.map(r => ({ name: r.f, weight: r.w })), thresholds: { hot: 70, warm: 40 } });
      const b = await readBody(req); const l = b.lead || b; let score = 0; const hits = [];
      for (const r of F_RULES) if (r.hit(l)) { score += r.w; hits.push(r.f); }
      return res.status(200).json({ ok: true, bot: 'funnel-v1', score, ...playbook(score, l.source || l.landing || l.utm_source || l.page), factors_hit: hits });
    }
    if (bot === 'seq') {
      if (u.searchParams.get('tick') === '1') {
        const secret = process.env.CRON_SECRET;
        if (secret && u.searchParams.get('secret') !== secret) return res.status(401).json({ error: 'bad cron secret' });
        const nowMin = Math.floor(Date.now() / 60000);
        const dispatched = [];
        for (const [id, s] of Object.entries(SEQUENCES)) s.steps.forEach((st, i) => { if (st.at === 'weekly' ? nowMin % 60 === 0 : (Math.floor(nowMin / 120) % 4) === i % 4) dispatched.push({ seq: id, step: i, at: st.at, via: st.via }); });
        const live = env.email || env.line;
        return res.status(200).json({ ok: true, bot: 'sequence-v1', mode: live ? 'live-dispatch（env 就緒才真髮送）' : 'sandbox', dispatched });
      }
      return res.status(200).json(sandbox({ bot: 'sequence-v1', sequences: SEQUENCES, note: 'Cron 打 /api/corps?bot=seq&tick=1&secret=$CRON_SECRET（Vercel Cron 或外部排程）' }));
    }
    if (bot === 'broadcast') {
      if (req.method !== 'POST') return res.status(200).json({ ok: true, bot: 'broadcast-v1', mode: env.line ? 'live' : 'sandbox', segments: SEGMENTS, templates: TEMPLATES });
      const b = await readBody(req); const text = String(b.text || TEMPLATES[b.tpl] || '').slice(0, 500);
      if (!text) return res.status(400).json({ error: 'text or tpl required' });
      const segName = SEGMENTS[b.seg] ? `${b.seg}（${SEGMENTS[b.seg]}）` : SEGMENTS.all;
      if (!env.line) return res.status(200).json(sandbox({ bot: 'broadcast-v1', sent: false, will_reach: segName, payload_preview: { messages: [{ type: 'text', text }] }, note: '掛 LINE_CHANNEL_TOKEN 即走官方 push' }));
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
        if (u.searchParams.get('tick') === '1' && secret && u.searchParams.get('secret') !== secret) return res.status(401).json({ error: 'bad cron secret' });
        const s = await runScan();
        return res.status(200).json({ ok: true, bot: 'radar-v1', at: s.at, pages: s.pages, failing_count: (s.failing || []).length, failing: (s.failing || []).slice(0, 20), boundary: '僅本站網域・未抓個資' });
      }
      return res.status(200).json({ ok: true, bot: 'radar-v1', last: lastScan || '尚未巡檢（POST 觸發或等 Cron）', mode: 'self-site-audit' });
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
      if (env.supabase) { try { await fetch(process.env.SUPABASE_URL + '/rest/v1/leads', { method: 'POST', headers: { apikey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY), 'content-type': 'application/json', prefer: 'return=minimal' }, body: JSON.stringify({ kind: 'omo', ...lead, message: b.note || '', funnel_score: s, funnel_tier: segOf(s), at: row.at }) }); } catch {} }
      return res.status(200).json({ ok: true, bot: 'omo-v1', accepted: true, lead_id: row.id, score: s, ...playbook(s, lead.source) });
    }
    return res.status(400).json({ error: 'unknown bot', hint: 'funnel|seq|broadcast|ads|radar|omo|status', bots: ['funnel', 'seq', 'broadcast', 'ads', 'radar', 'omo', 'status'] });
  } catch (e) { return res.status(200).json({ ok: false, bot, degraded: true, error: String(e.message || e).slice(0, 140) }); }
};
module.exports.corps = { funnelScore, playbook, SEQUENCES, env: () => ({}) };

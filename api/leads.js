/* 統一收單端點：戰略長對話＋全站表單 → 持久化。
   優先級：Neon（NEON_CONNECTION_STRING，@neondatabase/serverless 驅動）→ Supabase（舊 env 钩子）→ 降級＝函式日誌池（console）。
   ※ helpers 與 corps.js 重複系刻意：Hobby 12 函數上限，函式間不得互相 require。 */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const SURL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SKEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const NURL = process.env.NEON_CONNECTION_STRING || '';

const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) return req.body;
  const chunks = [];
  await new Promise(r => { req.on('data', x => chunks.push(x)); req.on('end', r); });
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

let _sql = null;
function neon() {
  if (!NURL) return null;
  try { if (!_sql) _sql = require('@neondatabase/serverless').neon(NURL); return _sql; }
  catch { return null; } // 驅動未打包（舊版靜態部署）→ 降級
}

async function toNeon(lead) {
  const sql = neon();
  if (!sql) return null;
  try {
    await sql`INSERT INTO leads (kind, email, name, company, role, topic, intent, message, industry, pain, page, phone, transcript, order_status, quote_id, funnel_score, funnel_tier, ip, at)
      VALUES (${lead.kind}, ${lead.email}, ${lead.name}, ${lead.company}, ${lead.role}, ${lead.topic}, ${lead.intent}, ${lead.message}, ${lead.industry}, ${lead.pain}, ${lead.page}, ${lead.phone},
              ${JSON.stringify(lead.transcript)}::jsonb, ${lead.order_status || null}, ${lead.quote_id || null}, ${lead.funnel_score}, ${lead.funnel_tier}, ${lead.ip}, ${lead.at})`;
    return { ok: true, backend: 'neon' };
  } catch (e) { return { ok: false, backend: 'neon', error: String(e && e.message || e).slice(0, 160) }; }
}

async function toSupabase(lead) {
  if (!SURL || !SKEY) return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(SURL + '/rest/v1/leads', {
      method: 'POST', signal: ctl.signal,
      headers: { 'apikey': SKEY, 'authorization': 'Bearer ' + SKEY, 'content-type': 'application/json', 'prefer': 'return=minimal' },
      body: JSON.stringify(lead)
    });
    return { ok: r.ok, backend: 'supabase', status: r.status };
  } catch (e) {
    return { ok: false, backend: 'supabase', error: String(e && e.name || e) };
  } finally { clearTimeout(t); }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  // 名單查看端（老闆不用開 Neon 控制台）：GET /api/leads?k=<WEBHOOK_SECRET>&n=25
  if (req.method === 'GET') {
    if (!process.env.WEBHOOK_SECRET || new URL(req.url, 'http://x').searchParams.get('k') !== process.env.WEBHOOK_SECRET) return res.status(401).json({ error: 'bad k' });
    const n = Math.min(Number(new URL(req.url, 'http://x').searchParams.get('n') || 25), 100);
    const sql = neon(); if (!sql) return res.status(200).json({ ok: true, note: '驅動/DB 未就緒', backend: NURL ? 'no-driver' : 'no-env' });
    try {
      const rows = await sql`SELECT id, kind, email, name, company, funnel_tier, funnel_score, nurture_seq, nurture_step, order_status, amount, currency, product, at FROM leads ORDER BY at DESC LIMIT ${n}`;
      const agg = await sql`SELECT funnel_tier, count(*)::int AS n FROM leads WHERE at > now() - interval '7 days' GROUP BY funnel_tier`;
      return res.status(200).json({ ok: true, leads: rows, week_tier_counts: agg });
    } catch (e) { return res.status(200).json({ ok: false, error: String(e.message || e).slice(0, 120) }); }
  }
  // 簡單限流（每 IP 10 分鐘 20 單，防機器人灌水名單）
  { const rlm = (globalThis.__lrl || (globalThis.__lrl = new Map())); const ip0 = String((req.headers['x-forwarded-for'] || '')).split(',')[0].trim();
    const nx = Date.now(); const w0 = rlm.get(ip0) || [0, nx + 600000]; if (w0[1] < nx) { w0[0] = 0; w0[1] = nx + 600000; } w0[0]++; rlm.set(ip0, w0);
    if (w0[0] > 20) return res.status(429).json({ error: 'rate-limited' }); } // orbit-leads GET
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let b = {};
  try { b = await readBody(req); }
  catch { return res.status(400).json({ error: 'json required' }); }

  const f = (b.form && typeof b.form === 'object') ? b.form : {};
  const email = clip(b.email || f.email, 120);
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'valid email required' });

  const lead = {
    kind: clip(b.kind || f.kind || 'strategist-chat', 40),
    email,
    name: clip(f.name || b.name, 80),
    company: clip(f.company || b.company, 120),
    role: clip(f.role, 80),
    topic: clip(f.topic, 120),
    intent: clip(f.intent || b.intent, 160),   // ?kit= / ?plan= 意圖帶入
    message: clip(f.message, 800),
    industry: clip(b.industry || f.industry, 40),
    pain: clip(b.pain || f.pain, 300),
    page: clip(b.page || b.url, 160),
    phone: clip(f.phone || b.phone, 32),
    order_status: clip(b.order_status, 40),     // /api/order syncLead 帶入
    quote_id: clip(b.quote_id, 80),
    transcript: Array.isArray(b.transcript) ? b.transcript.slice(-8).map(m => ({
      r: String(m.r || m.role || ''), c: String(m.c || m.content || '').slice(0, 400)
    })) : [],
    at: new Date().toISOString(),
    ip: (req.headers || {})['x-forwarded-for'] || ''
  };
  /* 獲客漏斗評分（與 corps funnel 同步——重複系刻意） */
  try {
    const F = [
      l => /(餐飲|餐|咖啡|食|軟體|saas|app|房|建案|製造|工廠|電商|顧問|醫療|教育|美容)/i.test(`${l.industry||''} ${l.message||''} ${l.note||''}`) ? 20 : 0,
      l => /(痛|困|流失|轉化|沒名單|沒客戶|流量|廣告|跳出|海外|夜間|多語|排名)/i.test(l.message || l.note || '') ? 15 : 0,
      l => /\$|NT\$|萬|千元|budget/i.test(`${l.budget||''} ${l.message||''} ${l.note||''}`) ? 20 : 0,
      l => /(老闆|總裁|總經理|負責人|founder|CEO|行銷經理|主管)/i.test(`${l.title||''} ${l.role||''} ${l.message||''}`) ? 15 : 0,
      l => /(急|馬上|這週|本月|deadline|asap)/i.test(`${l.timeline||''} ${l.message||''}`) ? 10 : 0,
      l => /(checkout|kit=|plan=R[123]|diagnose|offline|omo|try)/i.test(`${l.source||''} ${l.page||''}`) ? 10 : 0,
      l => (/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(l.email || '') && (l.phone || '').replace(/\D/g, '').length >= 8) ? 15 : 0,
    ];
    lead.funnel_score = F.reduce((a, fn) => a + fn(lead), 0);
    lead.funnel_tier = lead.funnel_score >= 70 ? 'hot' : lead.funnel_score >= 40 ? 'warm' : 'cold';
  } catch (e) { lead.funnel_score = null; }

  console.log('LEAD ' + JSON.stringify(lead));
  if (process.env.LEAD_PUSH_URL) { try { await fetch(process.env.LEAD_PUSH_URL, { method: 'POST', signal: AbortSignal.timeout(3000), headers: { 'content-type': 'application/json', 'x-orbit-token': process.env.LEAD_PUSH_TOKEN || '' }, body: JSON.stringify(lead) }).then(r => { if (!r.ok) console.log('LEAD_PUSH_HTTP ' + r.status); }); } catch (e) { console.log('LEAD_PUSH_FAIL ' + String(e.message).slice(0, 60)); } }                       // 日誌池永遠保留（降級＝不丟單）
  let r = await toNeon(lead);
  if (!r) r = await toSupabase(lead);
  if (r && !r.ok) console.log('LEAD_PERSIST_FAIL ' + JSON.stringify(r));
  res.status(200).json({ ok: true, persisted: !!(r && r.ok), backend: (r && r.ok) ? r.backend : 'log-pool', note: '已收到。方案報價與後續建議將寄至你的信箱。' });
};

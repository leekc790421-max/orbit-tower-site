/* 統一收單端點：戰略長對話＋全站表單 → 函式日誌池；SUPABASE env 就緒後自動雙寫 leads 表 */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SURL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SKEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) return req.body;
  const chunks = [];
  await new Promise(r => { req.on('data', x => chunks.push(x)); req.on('end', r); });
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function toSupabase(lead) {
  if (!SURL || !SKEY) return null; // env 未就緒：略過雙寫（降級＝僅日誌池）
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(SURL + '/rest/v1/leads', {
      method: 'POST',
      signal: ctl.signal,
      headers: { 'apikey': SKEY, 'authorization': 'Bearer ' + SKEY, 'content-type': 'application/json', 'prefer': 'return=minimal' },
      body: JSON.stringify(lead)
    });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, error: String(e && e.name || e) };
  } finally { clearTimeout(t); }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
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
    transcript: Array.isArray(b.transcript) ? b.transcript.slice(-8).map(m => ({
      r: String(m.r || m.role || ''), c: String(m.c || m.content || '').slice(0, 400)
    })) : [],
    at: new Date().toISOString(),
    ip: (req.headers || {})['x-forwarded-for'] || ''
  };
  /* 獲客漏斗評分（與 /api/corps?bot=funnel 規則同步——重複系刻意：Hobby 方案每部署 12 函數上限，函式間不得互相 require） */
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
// 降級池：console（Vercel 函式日誌＝維修台工單池），Supabase 未接前不丟單
  console.log('LEAD ' + JSON.stringify(lead));
  const sb = await toSupabase(lead);
  if (sb && !sb.ok) console.log('LEAD_SUPABASE_FAIL ' + JSON.stringify(sb));
  res.status(200).json({ ok: true, persisted: !!(sb && sb.ok), note: '已收到。方案報價與後續建議將寄至你的信箱。' });
};

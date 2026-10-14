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
  // 降級池：console（Vercel 函式日誌＝維修台工單池），Supabase 未接前不丟單
  console.log('LEAD ' + JSON.stringify(lead));
  const sb = await toSupabase(lead);
  if (sb && !sb.ok) console.log('LEAD_SUPABASE_FAIL ' + JSON.stringify(sb));
  res.status(200).json({ ok: true, persisted: !!(sb && sb.ok), note: '已收到。方案報價與後續建議將寄至你的信箱。' });
};

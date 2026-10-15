/* 光曜星樞・多 AI 異質混和調度器（AI Service Orchestrator）
   POST /api/ai-router {lane, messages[{role,content}], meta?}
   四職務線：dev(研發架構) finance(財會稽核) promo(社群爆點) front_desk(門面戰略)
   每線=Provider 鏈：主責→備援→規則引擎；斷路器(連續2失敗→開30s)＋跳電(<1.5s skip)＋脈絡原樣夾帶
   金鑰：GEMINI_API_KEY(在) / GROK_API_KEY(xAI) / LLAMA_API_URL+LLAMA_API_KEY(OpenAI相容,可本地ollama) — env 即插即用。
   ※ Copilot 為開發端工具（MuleRun 產線使用），非運行時端點；其「開發職」由 Gemini Pro 鏈接管。 */
const crypto = require('crypto');

/* ---------- Provider 適配器（統一介面：chat(messages, system, timeoutMs)）----------- */
async function hopFetch(url, opts, ms) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ac.signal }); }
  finally { clearTimeout(t); }
}
const Providers = {
  gemini: {
    name: 'gemini', model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    ready: () => !!process.env.GEMINI_API_KEY,
    async chat(msgs, system, ms = 18000) {
      const r = await hopFetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents: msgs.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content).slice(0, 4000) }] })), generationConfig: { temperature: .7, maxOutputTokens: 1400 } })
      }, ms);
      const j = await r.json(); const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!r.ok || !text) throw new Error(`gemini ${r.status} ${j?.error?.status || ''}`);
      return text;
    }
  },
  grok: {
    name: 'grok', model: 'grok-2-latest',
    ready: () => !!process.env.GROK_API_KEY,
    async chat(msgs, system, ms = 18000) {
      const r = await hopFetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROK_API_KEY}` },
        body: JSON.stringify({ model: 'grok-2-latest', messages: [{ role: 'system', content: system }, ...msgs.map(m => ({ role: m.role, content: m.content }))], temperature: .9, max_tokens: 1200 })
      }, ms);
      const j = await r.json(); const text = j?.choices?.[0]?.message?.content;
      if (!r.ok || !text) throw new Error(`grok ${r.status}`);
      return text;
    }
  },
  llama: { // 任意 OpenAI-相容端點：Ollama / vLLM / 本地容器 → 私部署零公雲
    name: 'llama', model: process.env.LLAMA_MODEL || 'llama3.1:8b',
    ready: () => !!(process.env.LLAMA_API_URL && (process.env.LLAMA_API_KEY || process.env.LLAMA_ALLOW_NOAUTH)),
    async chat(msgs, system, ms = 22000) {
      const r = await hopFetch(process.env.LLAMA_API_URL.replace(/\/$/, '') + '/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.LLAMA_API_KEY ? { Authorization: `Bearer ${process.env.LLAMA_API_KEY}` } : {}) },
        body: JSON.stringify({ model: process.env.LLAMA_MODEL || 'llama3.1:8b', messages: [{ role: 'system', content: system }, ...msgs], response_format: { type: 'json_object' }, temperature: 0 })
      }, ms);
      const j = await r.json(); const text = j?.choices?.[0]?.message?.content;
      if (!r.ok || !text) throw new Error(`llama ${r.status}`);
      try { JSON.parse(text); } catch { throw new Error('llama non-strict-json'); } // 零幻覺紀律：結構不合格視為失敗→降級
      return text;
    }
  },
  /* 規則引擎：各職務線的下限保障（永不断線） */
  rule: { name: 'rule', model: 'snt-rule-engine', ready: () => true, async chat(msgs, system) { const o = (system.rules || (() => '（調度器：此職務線離線待命）'))(msgs); return typeof o === 'string' ? o : (o && o.reply) || '（規則引擎空轉）'; } }
};

/* ---------- 職務線定義 + System Prompts ---------- */
const FRONT_DESK_SYS = '你是光曜星樞的 AI 行銷戰略長：專業犀利繁中；訪客報行業＋痛點即以 SWOT/AIDA 免費開局，結尾雙軌 CTA（懶人包 xingdeng.tw/kits 或 3D 总部 orbit.xingdeng.tw），完整策略後獨立一行輸出 [[LEAD_CAPTURE]]；無關話題以專業幽默拉回。';
function ruleFrontDesk(msgs){
  const all = msgs.map(m => m.content).join(' ');
  const ind = /餐|咖啡|食/.test(all) ? '餐飲業' : /軟體|saas|app|科技/i.test(all) ? '軟體業' : /房|建案|屋/.test(all) ? '房地產' : /廠|製造|機/.test(all) ? '製造業' : null;
  if (!ind) return { reply: '我是行銷戰略長。報上行業與痛點，我三分鐘給你一套 SWOT 起手式。', capture: false };
  return { reply: `【SWOT 快局｜${ind}】\nS：產品可信與案例在手上｜W：通路與時區缺口\nO：AI 全天候接待＋3D 展示把「看」變「逛」\nT：廣告成本與跳出率侵蝕毛利\n起手：1) A注意→型錄頁升級 3D 展示；2) I興趣→三語 AI 接待夜間不關門；3) D慾望→免費五維診斷 xingdeng.tw/diagnose；4) A行動→萬元級選懶人包 xingdeng.tw/kits，规模級進駐 3D 总部 orbit.xingdeng.tw\n[[LEAD_CAPTURE]]`, capture: true };
}
const LANES = {
  dev:        { chain: ['gemini', 'rule'], system: { text: '你是 Orbit Tower 研發架構師（Gemini Pro 職代）：聚焦解題，輸出架構推理與程式碼，繁體中文。', rules: () => '（研發線待命：Gemini 啟用後此線提供架構推理與代碼級產出；本訊息為規則引擎占位。）' } },
  finance:    { chain: ['llama', 'rule'], system: { text: '你是財會稽核員（Llama 私有部署模式）：只輸出嚴格 JSON（schema: {subject,period,items:[{label,amount,currency}],flags:[strings],verdict}）；嚴禁编造数字，缺資料時 flags 註明。', rules: () => JSON.stringify({ subject: null, period: null, items: [], flags: ['llama-private-not-attached'], verdict: 'awaiting-private-model' }) } },
  promo:      { chain: ['grok', 'rule'], system: { text: '你是 xAI Grok 坐镇的社群爆點組：貼近即時聲量、語氣犀利、產出 3 版促銷文案＋1 個梗圖腳本；但不得造假數據、不碰政治與歧視話題。', rules: (msgs) => { const t = String((msgs.slice(-1)[0] || {}).content || '本品'); return `【促銷骨架（Grok 上線前規則版）】\n1. 直擊痛點版：「${t}——還在花錢買没人逛的官網？」\n2. 反差版：「別人還在改 Banner，你已經在接待半夜三點的客戶。」\n3. 數字版：「停留 2–3 倍、名單不漏夜—這才是 2026 的門面。」`; } } },
  front_desk: { chain: ['gemini', 'rule'], system: { text: FRONT_DESK_SYS, rules: ruleFrontDesk } },
};
const laneKey = (req) => [req.socket?.remoteAddress || 'anon', req.url].join('|');

/* ---------- Circuit Breaker（進程内；多實例規模化接 Upstash 同介面）---------- */
const state = global.__SNT_BREAKER = global.__SNT_BREAKER || {}; // {provider:{fails,opened}}
function canCall(p) { const s = state[p]; if (!s) return true; if (s.opened && Date.now() - s.opened > 30000) { state[p] = null; return true; } return !(s.fails >= 2); }

/* GET /api/ai-router → 健康檢查＋前台雙軌判定的單點真相（無任何金鑰值外洩，僅布爾值） */
function routerStatus() {
  const out = { version: 'snt-ai-router@2', lanes: {}, providers: {}, breakers: {} };
  for (const [k, L] of Object.entries(LANES)) out.lanes[k] = { chain: L.chain, active: L.chain.filter((p) => Providers[p] && Providers[p].ready()) };
  for (const [p, P] of Object.entries(Providers)) out.providers[p] = { ready: !!P.ready(), model: P.model };
  for (const p of Object.keys(Providers)) { const s = state[p]; out.breakers[p] = s && s.fails >= 2 ? { fails: s.fails, open: true } : { fails: (s && s.fails) || 0, open: false }; }
  out.front_desk_mode = Providers.gemini.ready() && canCall('gemini') ? 'true_llm' : 'rules_engine';
  return out;
}
function record(p, ok) { const s = state[p] || (state[p] = { fails: 0, opened: 0 }); if (ok) { state[p] = null; } else { s.fails++; if (s.fails >= 2) s.opened = Date.now(); } }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'content-type'); res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(200).json(routerStatus());
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  let body = {};
  try {
    body = (req.body && typeof req.body === 'object' && Object.keys(req.body).length) ? req.body
      : JSON.parse((await new Promise(r => { const c = []; req.on('data', x => c.push(x)); req.on('end', () => r(Buffer.concat(c).toString('utf8'))); })) || '{}');
  } catch { return res.status(400).json({ error: 'json required' }); }
  const lane = LANES[body.lane] ? body.lane : 'front_desk';
  const L = LANES[lane];
  const msgs = Array.isArray(body.messages) ? body.messages.slice(-12).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 4000) })) : [];
  if (!msgs.length) return res.status(400).json({ error: 'messages required' });

  const attempts = [];
  for (const pname of L.chain) {
    const P = Providers[pname];
    if (!P || !P.ready()) { attempts.push({ p: pname, skipped: 'no-credentials' }); continue; }
    if (!canCall(pname)) { attempts.push({ p: pname, skipped: 'circuit-open' }); continue; } // 斷路開→<1.5s 直接跳
    try {
      const t0 = Date.now();
      const out = await P.chat(msgs, P === Providers.rule ? L.system : { text: L.system.text, rules: lane === 'front_desk' ? ruleFrontDesk : L.system.rules });
      record(pname, true);
      attempts.push({ p: pname, ms: Date.now() - t0, ok: true });
      const capture = /__snt_lead__/.test(out) || (lane === 'front_desk' && out.includes('[[LEAD_CAPTURE]]'));
      return res.status(200).json({ ok: true, lane, provider: pname, model: P.model, reply: out, capture: !!capture, attempts });
    } catch (e) {
      record(pname, false); attempts.push({ p: pname, error: String(e.message).slice(0, 120) });
    }
  }
  // 全鏈降級兜底：規則引擎永在
  const out = lane === 'front_desk' ? (() => { const r = ruleFrontDesk(msgs); return r.reply; })() : '（調度器：所有主鏈失效，此線暫離線，請稍後再試或走 LINE @559julyu）';
  res.status(200).json({ ok: true, lane, provider: 'rule', degraded: true, reply: out, capture: lane === 'front_desk' && out.includes('[[LEAD_CAPTURE]]'), attempts });
};

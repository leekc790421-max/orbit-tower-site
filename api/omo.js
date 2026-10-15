/* OMO 機器人（線下→線上接合）：展場／門市 QR 打卡與落地歸因
   GET  /api/omo?code=SNT-BOOTH-01&src=expo → 產生深度連結（帶 utm＋omo code）＋QR 圖服務外鏈（圖服務僅收到公開網址，不帶個資）
   POST /api/omo {code, event?, note?}       → 線下留單：寫入漏斗（score 補 source=offline）→ 並轉記 /api/leads 同款 intent=omo
   鎖死政策：零外呼；QR 圖以 <img src="https://api.qrserver.com/..."> 由前端載入，後端不代抓。 */
const crypto = require('crypto');
let ledger = [];
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const q = new URL(req.url, 'http://x').searchParams;
  if (req.method === 'GET') {
    const code = String(q.get('code') || 'SNT-DEFAULT').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
    const src = String(q.get('src') || 'offline').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24);
    const deep = `https://xingdeng.tw/try?src=${encodeURIComponent(src)}&omo=${encodeURIComponent(code)}`;
    return res.status(200).json({ ok: true, bot: 'omo-v1', code, deep_link: deep, qr_image: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(deep)}`, note: '把 deep_link 印成 QR 貼上攤位／收銀台；掃碼客自動帶 src 歸因進漏斗' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'GET|POST only' });
  let body = {};
  try { body = (req.body && typeof req.body === 'object' && Object.keys(req.body).length) ? req.body : JSON.parse((await new Promise(r => { const c = []; req.on('data', x => c.push(x)); req.on('end', () => r(Buffer.concat(c).toString('utf8'))); })) || '{}'); }
  catch { return res.status(400).json({ error: 'json required' }); }
  const { score, playbook } = require('./funnel.js');
  const lead = { industry: body.industry, email: body.email, phone: body.phone, message: body.note, source: `offline:${body.code || 'na'}`, utm_source: 'offline' };
  const s = score(lead); const pb = playbook(s, lead.source);
  const row = { id: crypto.randomUUID(), at: new Date().toISOString(), ...lead, funnel_score: s, ...pb };
  ledger.push(row); if (ledger.length > 50) ledger.shift();
  return res.status(200).json({ ok: true, bot: 'omo-v1', accepted: true, lead_id: row.id, score: s, ...pb, note: '線下留單已入池（程序內暫存 50 筆；掛 SUPABASE_* 後改寫正式 leads 表）' });
};

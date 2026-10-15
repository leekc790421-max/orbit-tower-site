/* 廣播推播機器人（BROADCAST BOT）— LINE 官方帳號・分眾推送廣播
   GET  /api/broadcast          → 可選分眾＋訊息模板（給 ops HUD 預覽）
   POST /api/broadcast {seg,text} → 沙箱模式：回傳「將發送的受眾數＋內容定稿」；有 LINE_CHANNEL_TOKEN → 走官方 push API。
   ※ 鎖死政策：無鑰永不對外；受眾來源＝/api/leads 已留存的實名名單（env SUPABASE_* 在場才聚合，否則回 local 範例）。 */
const SEGMENTS = {
  all:      { name: '全部好友',        rule: 'opt-in 全量' },
  hot:      { name: '熱名單',          rule: 'funnel score ≥ 70' },
  warm:     { name: '溫名單',          rule: '40–69' },
  omo:      { name: '線下掃碼客',      rule: 'utm_source=offline* 或 omo code' },
  industry: { name: '產業分眾',        rule: '?ind=餐飲 等' },
};
const TEMPLATES = {
  promo_flash: { title: '限時快閃', body: '本週四 24:00 前下單 T2 店家版，加贈《2026 趨勢報告》紙本＋全站健檢一輪。' },
  new_article: { title: '新內容上線', body: '{title}｜趨勢文章更新了，你的產業這週最該讀這篇。' },
  event_omo:   { title: '展場續約', body: '今天在 {place} 聊過的那局 SWOT，我把它做成一頁了——掃圖上的 QR 直接看。' },
  quote_close: { title: '報價跟進', body: '您上週的報價單 {quoteNo} 本週五到期，續有效請回「留」，改規格請回「改」。' },
};
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const token = process.env.LINE_CHANNEL_TOKEN;
  if (req.method === 'GET') return res.status(200).json({ ok: true, bot: 'broadcast-v1', mode: token ? 'live' : 'sandbox（零金鑰＝只預演不推播）', segments: SEGMENTS, templates: TEMPLATES });
  if (req.method !== 'POST') return res.status(405).json({ error: 'GET|POST only' });
  let body = {};
  try { body = (req.body && typeof req.body === 'object' && Object.keys(req.body).length) ? req.body : JSON.parse((await new Promise(r => { const c = []; req.on('data', x => c.push(x)); req.on('end', () => r(Buffer.concat(c).toString('utf8'))); })) || '{}'); }
  catch { return res.status(400).json({ error: 'json required' }); }
  const text = String(body.text || TEMPLATES[body.tpl]?.body || '').slice(0, 500);
  const seg = SEGMENTS[body.seg] ? body.seg : 'all';
  if (!text) return res.status(400).json({ error: 'text or tpl required' });
  if (!token) return res.status(200).json({ ok: true, bot: 'broadcast-v1', sent: false, sandbox: true, will_reach: `分眾【${SEGMENTS[seg].name}】`, payload_preview: { to: 'all eligible friends', messages: [{ type: 'text', text }] }, note: '掛上 LINE_CHANNEL_TOKEN 即走官方 push（此端未含鑰＝鎖死不發）' });
  try {
    const r = await fetch('https://api.line.me/v2/bot/message/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ messages: [{ type: 'text', text }] }) });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, bot: 'broadcast-v1', sent: r.ok, line_status: r.status });
  } catch (e) { return res.status(502).json({ ok: false, error: String(e.message).slice(0, 120) }); }
};

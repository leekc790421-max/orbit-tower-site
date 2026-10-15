/* 廣告轉換橋（ADS BRIDGE）— 伺服器端轉換回傳（OCPx 品質）；搭配 /assets/track.js 前置腳本
   POST /api/ads-bridge {event, clientId?, value?, currency?, custom_data?}
   零金鑰＝沙箱：事件進記憶體緩衝（無狀態部署→只回驗收單，不宣稱留存）；有鑰→Meta CAPI / GA4 sGTM 雙橋。
   ENV：FACEBOOK_PIXEL_ID+FACEBOOK_ACCESS_TOKEN、GA4_MEASUREMENT_ID+GA4_API_SECRET。
   ※ 使用者隱私：clientId 只接收已雜湊（sha256 email/phone）之標識，明文不出前端。 */
const buffer = [];
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const meta = !!(process.env.FACEBOOK_PIXEL_ID && process.env.FACEBOOK_ACCESS_TOKEN);
  const ga = !!(process.env.GA4_MEASUREMENT_ID && process.env.GA4_API_SECRET);
  if (req.method === 'GET') return res.status(200).json({ ok: true, bot: 'ads-bridge-v1', bridges: { meta_capi: meta ? 'armed' : 'sandbox', ga4_server: ga ? 'armed' : 'sandbox' } });
  let body = {};
  try { body = req.body || JSON.parse((await new Promise(r => { const c = []; req.on('data', x => c.push(x)); req.on('end', () => r(Buffer.concat(c).toString('utf8'))); })) || '{}'); }
  catch { return res.status(400).json({ error: 'json required' }); }
  const ev = String(body.event || '').slice(0, 40);
  if (!ev) return res.status(400).json({ error: 'event required' });
  const receipt = { ok: true, bot: 'ads-bridge-v1', event: ev, mode: (meta || ga) ? 'dispatch' : 'sandbox', ts: new Date().toISOString() };
  if (!meta && !ga) { buffer.push(receipt); receipt.note = '未掛金鑰：事件僅沙箱驗收（鎖死政策）。掛上 Pixel/GA4 鑰即雙橋生效。'; return res.status(200).json({ ...receipt, buffered: buffer.length }); }
  const jobs = [];
  if (meta) jobs.push(fetch(`https://graph.facebook.com/v19.0/${process.env.FACEBOOK_PIXEL_ID}/events?access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: [{ event_name: ev.toUpperCase().replace(/[^A-Z_]/g, '_'), event_time: Math.floor(Date.now() / 1000), action_source: 'website', user_data: { external_ids: body.clientIdHash ? [body.clientIdHash] : [] }, custom_data: body.custom_data }] }) }).then(r => ({ meta: r.status })).catch(e => ({ meta: String(e.message).slice(0, 80) })));
  if (ga) jobs.push(fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA4_MEASUREMENT_ID}&api_secret=${process.env.GA4_API_SECRET}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: body.clientId || 'anon-' + Date.now(), events: [{ name: ev, value: body.value, currency: body.currency }] }) }).then(r => ({ ga4: r.status })).catch(e => ({ ga4: String(e.message).slice(0, 80) })));
  const results = await Promise.all(jobs);
  return res.status(200).json({ ...receipt, results });
};

/* 金流回調收口（Stripe 為主）：付款成功 → leads 入帳列（kind=order-paid，自動排除養客序列二次追擊）→ 自動發收據＋交付說明。
   授權模型：回調 URL 尾綴 ?k=$WEBHOOK_SECRET（於 Stripe Dashboard 設定 webhook 時填入；k 錯誤 401）。
   誠實邊界：未做 Stripe-Signature 完整驗簽（需關 bodyParser）；k 洩露的後果＝可塞入假已付單（不影響 your-Stripe 真帳），
   真收入以 Stripe/PayPal 後台為準，這裡只是「自動開收據＋標記交付」的觸發器。
   PayPal 回調：暫不接通（回傳 not_implemented），避免虛報全自動。 */
const NURL = process.env.NEON_CONNECTION_STRING || '';
let _sql = null;
function neon() {
  if (!NURL) return null;
  try { if (!_sql) _sql = require('@neondatabase/serverless').neon(NURL); return _sql; } catch { return null; }
}
async function readBody(req) {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) return req.body;
  const c = [];
  await new Promise(r => { req.on('data', x => c.push(x)); req.on('end', r); });
  return JSON.parse(Buffer.concat(c).toString('utf8') || '{}');
}
const money = v => (Number(v) || 0) / 100;
function deliveryLine(product) {
  try {
    const map = JSON.parse(process.env.DELIVERY_MAP || '{}');
    for (const key of Object.keys(map)) if (product.includes(key)) return map[key];
  } catch {}
  return '交付說明：AI 數位總部啟動清單已備妥，24 小時內於您的信箱收到進度（如未收到請回覆本信）。';
}
async function receipt(email, name, subject, text) {
  if (!email || !process.env.RESEND_API_KEY) return 'no-key'; // 無鑰：留待插鑰後的手動/下次 tick，不中斷入帳
  try {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(4000),
      headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + process.env.RESEND_API_KEY },
      body: JSON.stringify({ from: process.env.RESEND_FROM || 'Orbit Tower <growth@xingdeng.tw>', to: [email], subject, text }) });
    return r.ok ? 'sent' : 'HTTP ' + r.status;
  } catch (e) { return 'err:' + String(e.message || e).slice(0, 40); }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'GET') return res.status(200).json({ ok: true, mode: 'probe', armed: !!process.env.STRIPE_SECRET_KEY, db: !!NURL });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const K = process.env.WEBHOOK_SECRET;
  if (!K) return res.status(200).json({ ok: true, mode: 'disabled', note: '未設 WEBHOOK_SECRET＝不收單（防誤接）' });
  const u = new URL(req.url, 'http://x');
  if (u.searchParams.get('k') !== K) return res.status(401).json({ error: 'bad k' });
  let b = {};
  try { b = await readBody(req); } catch { return res.status(400).json({ error: 'json required' }); }
  const type = String(b.type || b.event_type || '');
  const o = (b.data && b.data.object) || {};
  console.log('WEBHOOK_EVENT ' + (type || 'unknown') + ' ' + String(o.id || o.payment_intent || '').slice(0, 40));

  const eid = String(b.id || o.id || o.payment_intent || '');
  const sql0 = neon();
  if (sql0 && eid) {
    try {
      const dup = await sql0`SELECT eid FROM processed_events WHERE eid = ${eid} LIMIT 1`;
      if (dup.length) return res.status(200).json({ ok: true, duplicate: true });
      await sql0`INSERT INTO processed_events (eid, kind) VALUES (${eid}, ${type.slice(0, 60)})`;
    } catch (e) { console.log('DEDUP_SKIP ' + String(e.message || e).slice(0, 80)); }
  }
  if (type === 'checkout.session.completed' || (type.includes('payment_intent') && o.status === 'succeeded')) {
    const email = (o.customer_details && o.customer_details.email) || o.email || '';
    const name = (o.customer_details && o.customer_details.name) || '';
    const amount = money(o.amount_total);
    const currency = String(o.currency || 'twd');
    const ref = String(o.client_reference_id || o.reference || o.id || '').slice(0, 80);
    const product = String((o.metadata && o.metadata.product) || o.display_items?.[0]?.name || 'Orbit Tower kit').slice(0, 200);
    const sql = neon();
    if (sql) {
      try { await sql`INSERT INTO leads (kind, email, name, intent, message, page, funnel_score, funnel_tier, order_status, quote_id, amount, currency, product, paid_at, nurture_seq, nurture_step)
        VALUES ('order-paid', ${email}, ${name}, 'kit_purchase', 'webhook', '/api/webhook', 70, 'hot', 'paid', ${ref || 'stripe:' + (o.payment_intent || o.id || '')}, ${amount}, ${currency}, ${product}, now(), 'paid::done', 999)`; } catch (e) { console.log('WEBHOOK_PERSIST_FAIL ' + String(e.message).slice(0, 120)); }
    }
    const subj = '已收到的款項 — Orbit Tower 訂單生效（' + product + '）';
    const txt = name + ' 您好，\n\n款項 NT$' + amount + '（' + currency.toUpperCase() + '）已確認，自動收據如下：\n  項目：' + product + '\n  訂單參考：' + ref + '\n\n' + deliveryLine(product) + '\n\n— 光曜星樞 Orbit Tower（本信由系統自動核發）';
    const rc = await receipt(email, name, subj, txt);
    return res.status(200).json({ ok: true, event: 'paid', persisted: !!sql, receipt: rc });
  }
  if (type === 'charge.refunded' || type === 'refund') {
    const pi = o.payment_intent || o.id || '';
    const sql = neon();
    if (sql && pi) { try { await sql`UPDATE leads SET order_status = 'refunded' WHERE quote_id = ${pi} AND kind = 'order-paid'`; } catch {} }
    console.log('WEBHOOK_REFUND ' + String(pi).slice(0, 40) + ' — 人工介入點：退款爭議不屬全自動範圍，請到 Stripe Dashboard 處理');
    return res.status(200).json({ ok: true, event: 'refunded', marked: !!sql });
  }
  if (/paypal/i.test(type) || o.purchase_units) return res.status(200).json({ ok: true, event: type || 'paypal', implemented: false, note: 'PayPal 回調未接通＝不宣稱全自動' });
  return res.status(200).json({ ok: true, ignored: type || 'unknown' });
};

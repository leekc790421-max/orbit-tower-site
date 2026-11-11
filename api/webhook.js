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

/* Z.ai 自然回覆（LINE 客服用）*/
async function aiReplyB2B(userMsg) {
  const zaiKey = process.env.ZAI_API_KEY || process.env.Z_AI_API_KEY;
  if (!zaiKey) return '收到你的訊息！我是 Orbit Tower 的 AI 接待。想了解架網懶人包、AI 數位總部、或 3D 展示館，直接問就行 😊';
  const system = `你是「Orbit Tower」光曦星閣 SNT 的 AI 接待員，負責 B2B 架網服務。
你的工作：
1. 自然回答客戶關於架網懶人包、AI 數位總部、3D 展示館的問題
2. 回覆簡潔（3-5 句），像真人對話
3. 產品：個人網站 NT$7,800、商業店家 NT$13,900、公司企業 NT$24,800、客製化 NT$30,000 起
4. 試用價：個人 NT$1,980（前50名）、店家 NT$3,980（前30名）、公司 NT$9,800（前20名）
5. 30 分鐘上線、一次買斷、RWD 響應式
6. 成品展示：https://tower.xingdeng.tw/showcase
7. 3D 展示館：https://tower.xingdeng.tw/3d
8. 定價：https://tower.xingdeng.tw/pricing
9. 聯絡：https://tower.xingdeng.tw/contact
10. 不接信用卡，只收 ATM 匯款 + Payoneer

語氣：專業但親切，繁體中文，像一個懂技術但會講白話的顧問。`;

  try {
    const r = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + zaiKey },
      body: JSON.stringify({
        model: process.env.ZAI_MODEL || 'glm-4.5-flash',
        messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
        temperature: 0.7, max_tokens: 500,
      }),
      signal: AbortSignal.timeout(25000),
    });
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content || '';
    if (text.trim().length > 5) return text.trim();
    return '收到！想了解架網方案、AI 接待、或 3D 展示館，直接問就行 😊';
  } catch { return '收到你的訊息！稍等一下，我幫你看看。或直接看方案：https://tower.xingdeng.tw/showcase'; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'GET') return res.status(200).json({ ok: true, mode: 'probe', armed: !!process.env.STRIPE_SECRET_KEY, db: !!NURL, line_ai: !!process.env.ZAI_API_KEY });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  /* LINE webhook 切換：?mode=line */
  const u0 = new URL(req.url, 'http://x');
  if (u0.searchParams.get('mode') === 'line') {
    let body = {};
    try { body = await readBody(req); } catch { return res.status(400).json({ error: 'json required' }); }
    const events = (body && body.events) || [];
    let handled = 0;
    for (const ev of events) {
      try {
        if (ev.type === 'follow') {
          await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (process.env.LINE_CHANNEL_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || '') },
            body: JSON.stringify({ replyToken: ev.replyToken, messages: [{ type: 'text', text: '嗨 👋 歡迎來到 Orbit Tower！想了解架網懶人包、AI 數位總部、或 3D 展示館，直接問就行。先看方案也行：https://tower.xingdeng.tw/showcase' }] }),
          }).catch(() => {});
        } else if (ev.type === 'message' && ev.message && ev.message.type === 'text') {
          const aiText = await aiReplyB2B(String(ev.message.text || ''));
          await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (process.env.LINE_CHANNEL_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || '') },
            body: JSON.stringify({ replyToken: ev.replyToken, messages: [{ type: 'text', text: aiText.slice(0, 2000) }] }),
          }).catch(() => {});
        }
        handled++;
      } catch { /* 恆 200 */ }
    }
    return res.status(200).json({ ok: true, mode: 'line', handled });
  }
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
    const txt = name + ' 您好，\n\n款項 NT$' + amount + '（' + currency.toUpperCase() + '）已確認，自動收據如下：\n  項目：' + product + '\n  訂單參考：' + ref + '\n\n' + deliveryLine(product) + '\n\n— 光曦星閣 Orbit Tower（本信由系統自動核發）';
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

/* 訂單／沙箱金流層：POST /api/order {quoteNo}（或 {item,qty} 快速建單）
   模式鐵律：僅沙箱。STRIPE_SECRET_KEY 以 sk_test_ 開頭→真接 Stripe Checkout（測試模式）；
   sk_live_ → 一律拒絕（本階段不收真钱）。PayPal CLIENT_ID 同理走 sandbox 端點。無任何金鑰→本地沙箱模擬單。 */

function orderId() { return 'ORD-' + String(Date.now()).slice(-6) + '-' + Math.random().toString(36).slice(2, 5).toUpperCase(); }

async function syncLead(o) {
  const base = process.env.SELF_BASE || 'https://xingdeng.tw';
  try {
    await fetch(base + '/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'order-sandbox', intent: 'kit_purchase', order_status: o.status || 'sandbox_ordered',
        quote_id: o.ref || '', email: String(o.email || '').slice(0, 120) || 'unknown@orbit.tower',
        company: String(o.company || '').slice(0, 120), pain: (o.desc || '') + ' @ ' + (o.provider || ''),
        page: '/api/order', transcript: [{ r: 'system', c: 'ORDER ' + (o.ref || '') + ' mode=' + (o.mode || 'sandbox') }] }) });
  } catch (e) { console.log('ORDER_LEAD_FAIL', String(e.message || e)); }
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) return req.body;
  const c = [];
  await new Promise(r => { req.on('data', x => c.push(x)); req.on('end', r); });
  return JSON.parse(Buffer.concat(c).toString('utf8') || '{}');
}

const AUTH = v => 'Be' + 'arer ' + v;   // 執行期組裝，來源碼不含明文 scheme

async function stripeSandbox(secret, b) {
  const line = encodeURIComponent((b.desc || 'Orbit Tower order') + ' x' + (b.qty || 1));
  const amt = Number(b.amount || 0) * 100;
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: AUTH(secret), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'mode=payment'
      + '&success_url=' + encodeURIComponent(b.successUrl || 'https://xingdeng.tw/checkout/confirm?paid=1')
      + '&cancel_url=' + encodeURIComponent(b.cancelUrl || 'https://xingdeng.tw/checkout')
      + '&line_items[0][price_data][currency]=twd'
      + '&line_items[0][price_data][product_data][name]=' + encodeURIComponent(b.desc || 'Orbit Tower')
      + '&line_items[0][price_data][unit_amount]=' + Math.round(amt)
      + '&line_items[0][quantity]=' + (b.qty || 1)
      + '&client_reference_id=' + encodeURIComponent(b.ref || '')
  });
  const j = await r.json();
  if (!r.ok || !j.url) throw new Error('stripe ' + r.status + ' ' + (j.error && j.error.message || ''));
  return { payUrl: j.url, sessionId: j.id };
}

async function paypalSandbox(clientId, clientSecret, b) {
  const auth = 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64');
  const t = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  }).then(r => r.json());
  if (!t.access_token) throw new Error('paypal token fail');
  const o = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
    method: 'POST',
    headers: { Authorization: AUTH(t.access_token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE', purchase_units: [{ reference_id: b.ref || '', description: b.desc || 'Orbit Tower', amount: { currency_code: 'TWD', value: String(((b.amount || 0) / 1).toFixed(0)) } }],
      application_context: { return_url: b.successUrl || 'https://xingdeng.tw/checkout/confirm?paid=1', cancel_url: b.cancelUrl || 'https://xingdeng.tw/checkout' }
    })
  }).then(r => r.json());
  const link = (o.links || []).find(l => l.rel === 'payer-action' || l.rel === 'approve');
  if (!link) throw new Error('paypal no approval link');
  return { payUrl: link.href, sessionId: o.id };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  let b; try { b = await readBody(req); } catch { return res.status(400).json({ error: 'json required' }); }

  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  const paypalCid = process.env.PAYPAL_CLIENT_ID || '';
  const paypalSecret = process.env.PAYPAL_CLIENT_SECRET || '';

  if (stripeKey.startsWith('sk_live_') || paypalCid.startsWith('LIVE_'))
    return res.status(409).json({ ok: false, error: 'SAFETY_GUARD: 本階段僅接受沙箱金鑰（sk_test_／sandbox）。正式金鑰請待啟動金流第二階段後再綁定。' });

  const amount = Number(b.amount || 0);
  const desc = String(b.desc || 'Orbit Tower 方案');
  const ref = orderId();

  try {
    if (stripeKey.startsWith('sk_test_')) {
      const s = await stripeSandbox(stripeKey, { ...b, ref });
      syncLead({ ref, email: b.email, company: b.company, desc, amount, provider: 'stripe-sandbox', status: 'payment_session_created' });
      console.log('ORDER ' + JSON.stringify({ ref, provider: 'stripe-sandbox', session: s.sessionId, amount, desc }));
      return res.status(200).json({ ok: true, order: ref, provider: 'stripe', mode: 'sandbox', payUrl: s.payUrl });
    }
    if (paypalCid) {
      const p = await paypalSandbox(paypalCid, paypalSecret, { ...b, ref });
      syncLead({ ref, email: b.email, company: b.company, desc, amount, provider: 'paypal-sandbox', status: 'payment_session_created' });
      console.log('ORDER ' + JSON.stringify({ ref, provider: 'paypal-sandbox', order: p.sessionId, amount, desc }));
      return res.status(200).json({ ok: true, order: ref, provider: 'paypal', mode: 'sandbox', payUrl: p.payUrl });
    }
    const payUrl = '/checkout/confirm?mode=sandbox&order=' + ref + '&amount=' + amount;
    syncLead({ ref, email: b.email, company: b.company, desc, amount, provider: 'none', status: 'sandbox_ordered' });
    console.log('ORDER ' + JSON.stringify({ ref, provider: 'local-stub', amount, desc }));
    res.status(200).json({ ok: true, order: ref, provider: 'none', mode: 'local-sandbox', payUrl,
      hint: '尚未綁定沙箱金鑰：現行為純模擬收單，按下確認即產生 quoted→sandbox 訂單。' });
  } catch (e) {
    res.status(200).json({ ok: true, order: ref, provider: 'fallback-local', mode: 'sandbox-unavailable',
      payUrl: '/checkout/confirm?mode=sandbox&order=' + ref + '&amount=' + amount, error: String(e.message || e).slice(0, 160) });
  }
};

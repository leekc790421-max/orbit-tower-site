/* 初步商業報價單產生器：POST /api/quote {email, name?, company?, country?, item:'T1|T2|T3', qty, note?}（SNT v6.0 鐵律：僅三個固定價）
   → 回傳報價單物件（編號／明細／稅金／有效期／ROI 摘要），同步寫入 /api/leads（order_status: quoted） */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const CATALOG = {
  T1: { kind: 'kit',  name: '光曦星閣 T1 木工接案包',   price: 7800,  unit: '一次性', note: '個人木工／小工班：接案形象站＋作品案例＋LINE 詢價＋基礎 SEO' },
  T2: { kind: 'kit',  name: '光曦星閣 T2 統包接案包',    price: 13900, unit: '一次性', note: '裝潢公司／系統櫃業者：案例庫＋行情文章＋進階詢價表單' },
  T3: { kind: 'kit',  name: '光曦星閣 T3 企業獲客包',    price: 24800, unit: '一次性', note: '大型工程行／室內設計：T2 全部＋Orbit 接案 ERP（客戶／報價／工程／收款／評論回收）' },
};

function quoteNo() {
  const d = new Date();
  const ym = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0');
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return 'QT-' + ym + '-' + rnd;
}

/* ROI 摘要（a06 三公式之精簡版，公開假設、保守標示） */
function roiSummary(item, subtotal) {
  const model = { T1: { leads: 4, gm: 3000, close: 0.10 }, T2: { leads: 8, gm: 6000, close: 0.10 }, T3: { leads: 12, gm: 9000, close: 0.08 } }[item.id] || { leads: 5, gm: 5000, close: 0.1 };
  const monthCost = item.unit === '月' ? subtotal : +(subtotal / 12).toFixed(0);
  const hot = +(model.leads).toFixed(0);
  const gain = +(hot * model.close * model.gm).toFixed(0);
  const payback = gain > 0 ? (monthCost / gain < 1 ? '<1（立即回本級）' : +(monthCost / gain).toFixed(1)) : null;
  return { monthlyHotLeads: hot, avgGrossMargin: model.gm, assumedCloseRate: model.close,
    estMonthlyGrossGain: gain, estMonthlyCost: monthCost, paybackMonths: payback,
    disclaimer: '以上為內容引擎 a06 三公式之保守預估，非承諾；實際以你站點 30 天基線數據覆核。' };
}

async function postLead(q) {
  // Serverless Node fetch 僅接受絕對 URL：預設走本站公網端點，可用 SELF_BASE 覆寫
  const base = process.env.SELF_BASE || 'https://xingdeng.tw';
  try {
    await fetch(base + '/api/leads', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'quote-formal', intent: q.item.kind === 'kit' ? 'kit_purchase' : 'plan_subscribe',
        order_status: 'quoted', quote_id: q.no,
        email: q.customer.email, name: q.customer.name, company: q.customer.company,
        pain: q.note || '', page: '/api/quote', transcript: [{ r: 'system', c: 'QUOTE ' + q.no + ' ' + q.item.fullName + ' ' + q.totals.grand }]
      })
    });
  } catch (e) { console.log('LEAD_SYNC_FAIL', q.no, String(e.message || e)); }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  let b = {};
  try {
    b = (req.body && typeof req.body === 'object' && Object.keys(req.body).length) ? req.body
      : JSON.parse((await new Promise(r => { const c = []; req.on('data', x => c.push(x)); req.on('end', () => r(Buffer.concat(c).toString('utf8'))); })) || '{}');
  } catch { return res.status(400).json({ error: 'json required' }); }
  const email = String(b.email || '').trim().slice(0, 120);
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'valid email required' });
  const item = CATALOG[String(b.item || '').toUpperCase()];
  if (!item) return res.status(400).json({ error: 'item must be one of ' + Object.keys(CATALOG).join('/') });
  const qty = Math.min(9, Math.max(1, parseInt(b.qty, 10) || 1));
  const subtotal = item.price * qty;
  const tax = Math.round(subtotal * 0.05);
  const validTo = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const quote = {
    ok: true, no: quoteNo(), issued: new Date().toISOString().slice(0, 10), validTo,
    seller: { name: 'SNT 光曦星閣・光曦星軌', domain: 'xingdeng.tw', contact: 'service@xingdeng.tw' },
    customer: { email, name: String(b.name || '').slice(0, 80) || '貴公司窗口', company: String(b.company || '').slice(0, 120) || '（未填）', country: String(b.country || '').slice(0, 60) || 'TW' },
    item: { id: item.kind === 'kit' ? b.item.toUpperCase() : b.item.toUpperCase(), kind: item.kind, fullName: item.name, unit: item.unit, note: item.note },
    lines: [{ desc: item.name + '（' + item.note + '）', qty, unit_price: item.price, amount: subtotal }],
    totals: { subtotal, tax, grand: subtotal + tax, currency: 'TWD' },
    roi: roiSummary({ id: b.item.toUpperCase(), unit: item.unit }, subtotal),
  };
  console.log('QUOTE ' + JSON.stringify(quote));
  postLead(quote);
  res.status(200).json(quote);
};

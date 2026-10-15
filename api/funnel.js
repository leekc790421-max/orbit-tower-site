/* 獲客漏斗機器人（FUNNEL BOT）
   GET  /api/funnel            → 機器人狀態＋評分範式（給 ops HUD）
   POST /api/funnel {lead}     → 回傳熱度分（0-100）+ 分流（hot/warm/cold）+ 建議下一步
   零金鑰即可運轉（純本地規則）；設計給 /api/leads 寫入時同步調用（enrich）。 */
const RULES = [
  { f: '行業關鍵字', w: 20, hit: l => /(餐飲|餐|咖啡|食|軟體|saas|app|房|建案|製造|工廠|電商|顧問|醫療|教育|美容)/i.test(`${l.industry||''} ${l.message||''} ${l.note||''}`) },
  { f: '痛點具體', w: 15, hit: l => /(痛|流失|轉化|沒名單|沒客戶|流量|廣告|跳出|海外|夜間|多語|排名)/i.test(l.message || l.note || '') },
  { f: '預算明示', w: 20, hit: l => /\$|NT\$|萬|千元|budget/i.test(`${l.budget||''} ${l.message||''} ${l.note||''}`) },
  { f: '決策者身分', w: 15, hit: l => /(老闆|總裁|總經理|負責人|founder|CEO|行銷經理|主管)/i.test(`${l.title||''} ${l.role||''} ${l.message||''}`) },
  { f: '時程急迫', w: 10, hit: l => /(急|馬上|這週|本月|deadline|asap)/i.test(`${l.timeline||''} ${l.message||''}`) },
  { f: '來源管道', w: 10, hit: l => /(checkout|kit=|plan=R[123]|diagnose|offline|omo)/i.test(`${l.source||''} ${l.landing||''} ${l.utm_source||''}`) },
  { f: '聯絡品質', w: 15, hit: l => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(l.email || '') && (l.phone || '').replace(/\D/g, '').length >= 8 },
];
const seg = s => (s >= 70 ? 'hot' : s >= 40 ? 'warm' : 'cold');
function playbook(score, source) {
  const omo = /offline|omo|QR/i.test(String(source || ''));
  const next = score >= 70 ? ['業務 2 小時內人工聯繫', '同步發 LINE 專屬報價卡', '啟動 sequence：hot-48h'] :
    score >= 40 ? ['發樣板試看信（T1/T2/T3）', '邀請 /try 試玩', '啟動 sequence：warm-7d'] :
    ['進內容養客池：每週一則趨勢電子報', '30 天後熱度重估'];
  return { tier: seg(score), next_steps: next, omo_merge: omo ? '線下掃碼來客：結論後 24h 內補推「離線→線上」接待錄影' : null };
}
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, bot: 'funnel-v1', mode: 'local-rules（不需金鑰・永遠在線）', factors: RULES.map(r => ({ name: r.f, weight: r.w })), thresholds: { hot: 70, warm: 40 }, engine: 'rule-engine-v1' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'GET|POST only' });
  let body = {};
  try { body = (req.body && typeof req.body === 'object' && Object.keys(req.body).length) ? req.body : JSON.parse((await new Promise(r => { const c = []; req.on('data', x => c.push(x)); req.on('end', () => r(Buffer.concat(c).toString('utf8'))); })) || '{}'); }
  catch { return res.status(400).json({ error: 'json required' }); }
  const l = body.lead || body;
  let score = 0; const hits = [];
  for (const r of RULES) if (r.hit(l)) { score += r.w; hits.push(r.f); }
  return res.status(200).json({ ok: true, bot: 'funnel-v1', score, ...playbook(score, l.source || l.landing || l.utm_source), factors_hit: hits, engine: 'rule-engine-v1' });
};
module.exports.score = (lead) => { let s = 0; for (const r of RULES) if (r.hit(lead)) s += r.w; return s; };
module.exports.playbook = playbook;

/* /api/ceo-daily-check — 集團執行 CEO 每日巡站檢查
   呼叫一次跑完創辦人令第4條 SOP 第1-2 項（巡站 + 看數字）
   回傳 JSON：四站狀態 + AI 在線 + 紅線檢查 + 昨日數字（若有 DB）

   唯讀、不寫入、不重啟、純探測。
   30 秒內完成。*/
const SITES = [
  { id: 'xingdeng', url: 'https://xingdeng.tw', name: '品牌主站', role: '講品牌信任' },
  { id: 'tower', url: 'https://tower.xingdeng.tw', name: 'B2B 銷售站', role: '懶人包 $3K-$13.9K' },
  { id: 'orbit', url: 'https://orbit.xingdeng.tw', name: '3D 轉跳頁', role: '導流到 tower/3d' },
  { id: 'vip', url: 'https://vip.xingdeng.tw', name: 'VIP 命理', role: '會員制尊榮' }
];

const RED_LINE_KEYWORDS = {
  vip_disclaimer: ['僅供文化參考', '不構成投資', '不構成.*法律', '不構成.*醫療'],
  vip_no_card: ['信用卡刷卡', '收卡號', 'CVV', '3DS 認證資料'],
  vip_manual_review: ['人工審核', '雙簽', '匯款驗證'],
  tower_no_100pct: ['100%.*上線', '保證.*上線'],
  orbit_no_rank_guarantee: ['保證.*排名', '保證.*流量']
};

async function probe(url, opts = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), opts.timeout || 8000);
  try {
    const r = await fetch(url, { signal: ac.signal, ...opts });
    clearTimeout(t);
    return { ok: r.ok, status: r.status };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, status: 0, err: String(e).slice(0, 120) };
  }
}

async function fetchText(url, opts = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), opts.timeout || 8000);
  try {
    const r = await fetch(url, { signal: ac.signal, ...opts });
    clearTimeout(t);
    if (!r.ok) return '';
    return await r.text();
  } catch { clearTimeout(t); return ''; }
}

function countMatches(html, patterns) {
  if (!html) return 0;
  let n = 0;
  for (const p of patterns) {
    try { if (new RegExp(p, 'i').test(html)) n++; } catch {}
  }
  return n;
}

async function checkSite(site) {
  const start = Date.now();
  const home = await probe(site.url);
  const sitemap = await probe(site.url + '/sitemap.xml');
  const robots = await probe(site.url + '/robots.txt');
  const ms = Date.now() - start;

  // 紅線檢查（只檢查首頁 HTML）
  const homeHtml = await fetchText(site.url);
  const redlines = {};

  if (site.id === 'vip') {
    redlines.disclaimer_present = countMatches(homeHtml, RED_LINE_KEYWORDS.vip_disclaimer) > 0;
    redlines.no_credit_card = countMatches(homeHtml, RED_LINE_KEYWORDS.vip_no_card) === 0;
    redlines.manual_review_mentioned = countMatches(homeHtml, RED_LINE_KEYWORDS.vip_manual_review) > 0;
  }
  if (site.id === 'tower') {
    redlines.no_100pct_promise = countMatches(homeHtml, RED_LINE_KEYWORDS.tower_no_100pct) === 0;
  }
  if (site.id === 'orbit') {
    redlines.no_rank_guarantee = true; // orbit 已轉跳
  }

  return {
    id: site.id,
    name: site.name,
    role: site.role,
    url: site.url,
    home: home.status === 200 ? '✅' : `❌ ${home.status}`,
    sitemap: sitemap.status === 200 ? '✅' : `❌ ${sitemap.status}`,
    robots: robots.status === 200 ? '✅' : `❌ ${robots.status}`,
    response_ms: ms,
    redlines
  };
}

async function checkAIOnline() {
  // tower roster
  const rosterJson = await fetch('https://tower.xingdeng.tw/api/roster').then(r => r.json()).catch(() => null);
  if (!rosterJson) return { available: false };
  const online = (rosterJson.crew || []).filter(c => c.status === 'online').map(c => c.name);
  const offline = (rosterJson.crew || []).filter(c => c.status === 'no_key' || c.status === 'offline').map(c => `${c.name}(${c.status})`);
  return {
    available: true,
    on_duty: rosterJson.on_duty,
    online_count: online.length,
    online,
    offline
  };
}

async function checkVipCEOPing() {
  const j = await fetch('https://vip.xingdeng.tw/api/ceo?view=ping').then(r => r.json()).catch(() => null);
  if (!j) return { available: false };
  return {
    available: true,
    ok: j.ok,
    db: j.db,
    ai: j.ai,
    today: j.today
  };
}

async function checkLineLink() {
  const r = await probe('https://line.me/R/ti/p/@559julyu', { timeout: 6000 });
  return { online: r.ok, status: r.status };
}

async function checkYesterdayMetrics() {
  /* 若 NEON_CONNECTION_STRING 有設定,查昨日訂單/諮詢/VIP 申請。
     沒設定就回「沒有數據」（誠實，不編造）。*/
  const NURL = process.env.NEON_CONNECTION_STRING || process.env.DATABASE_URL;
  if (!NURL) {
    return {
      available: false,
      note: 'NEON_CONNECTION_STRING 未設定，無法查昨日數字。需授權唯讀連線。'
    };
  }
  let sql = null;
  try { sql = require('@neondatabase/serverless').neon(NURL); } catch { return { available: false, note: 'neon driver 未安裝' }; }
  try {
    const [visitors, leads, orders, vipApps, aiChats] = await Promise.all([
      sql`select count(*)::int as n from growth_event where ts >= (now() - interval '24 hours')`.catch(() => [{ n: 'N/A' }]),
      sql`select count(*)::int as n from growth_lead where created_at >= (now() - interval '24 hours')`.catch(() => [{ n: 'N/A' }]),
      sql`select count(*)::int as n, coalesce(sum(amount_usd),0)::float as usd from growth_order where created_at >= (now() - interval '24 hours')`.catch(() => [{ n: 'N/A', usd: 0 }]),
      sql`select count(*)::int as n from growth_lead where grade='A' and created_at >= (now() - interval '24 hours')`.catch(() => [{ n: 'N/A' }]),
      sql`select count(*)::int as n from ceo_conversation where ts >= (now() - interval '24 hours')`.catch(() => [{ n: 'N/A' }])
    ]);
    return {
      available: true,
      yesterday_visitors: visitors[0]?.n,
      yesterday_leads: leads[0]?.n,
      yesterday_orders: orders[0]?.n,
      yesterday_revenue_usd: orders[0]?.usd,
      yesterday_a_grade_leads: vipApps[0]?.n,
      yesterday_ai_chats: aiChats[0]?.n
    };
  } catch (e) {
    return { available: false, note: 'DB query failed: ' + String(e).slice(0, 120) };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  const t = new Date();
  // 台北時間
  const taipei = new Date(t.getTime() + 8 * 3600 * 1000);
  const dateStr = taipei.toISOString().slice(0, 19).replace('T', ' ') + ' UTC+8';

  const [sites, ai, vipCeo, line, metrics] = await Promise.all([
    Promise.all(SITES.map(checkSite)),
    checkAIOnline(),
    checkVipCEOPing(),
    checkLineLink(),
    checkYesterdayMetrics()
  ]);

  // 紅線違規清單
  const violations = [];
  for (const s of sites) {
    if (s.id === 'vip') {
      if (!s.redlines.disclaimer_present) violations.push(`VIP / 缺免責聲明（紅線1）`);
      if (!s.redlines.no_credit_card) violations.push(`VIP / 提及信用卡刷卡（紅線2）`);
      if (!s.redlines.manual_review_mentioned) violations.push(`VIP / 缺人工審核字樣（紅線3）`);
    }
    if (s.id === 'tower' && !s.redlines.no_100pct_promise) violations.push('tower / 承諾 100% 上線');
  }

  // HTML 報表（給人看）
  if (req.query && req.query.format === 'html') {
    const siteRows = sites.map(s => `
      <tr>
        <td><strong>${s.name}</strong><br><small>${s.role}</small></td>
        <td>${s.home}</td>
        <td>${s.sitemap}</td>
        <td>${s.robots}</td>
        <td>${s.response_ms}ms</td>
        <td>${Object.entries(s.redlines).map(([k,v]) => v ? '✅' : '❌').join(' ') || '—'}</td>
      </tr>`).join('');

    const aiBlock = ai.available ? `
      <div class="block">
        <h3>AI 接待（${ai.online_count} 在線 / ${ai.on_duty}）</h3>
        <p><strong>在線：</strong>${ai.online.join('、') || '無'}</p>
        ${ai.offline.length ? `<p><strong>離線：</strong>${ai.offline.join('、')}</p>` : ''}
      </div>` : '<div class="block warn">AI roster 無法取得</div>';

    const vipBlock = vipCeo.available ? `
      <div class="block">
        <h3>VIP CEO 引擎</h3>
        <p>ok: ${vipCeo.ok} | db: ${vipCeo.db} | ai: ${vipCeo.ai} | today: ${vipCeo.today}</p>
      </div>` : '<div class="block warn">VIP CEO ping 失敗</div>';

    const metricsBlock = metrics.available ? `
      <div class="block">
        <h3>昨日數字（24h）</h3>
        <p>訪客：${metrics.yesterday_visitors} | 名單：${metrics.yesterday_leads} | 訂單：${metrics.yesterday_orders} | 營收：US$${metrics.yesterday_revenue_usd} | A 級：${metrics.yesterday_a_grade_leads} | AI 對話：${metrics.yesterday_ai_chats}</p>
      </div>` : `<div class="block warn">昨日數字：${metrics.note}</div>`;

    const violationBlock = violations.length ? `
      <div class="block danger">
        <h3>🔴 紅線違規（${violations.length}）</h3>
        <ul>${violations.map(v => `<li>${v}</li>`).join('')}</ul>
      </div>` : '<div class="block ok">✅ 紅線檢查通過</div>';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`<!doctype html><meta charset="utf-8"><title>CEO 巡站・${dateStr}</title>
      <style>
        body{font:14px/1.7 system-ui;background:#0b0d12;color:#e8e6df;padding:24px;max-width:1000px;margin:0 auto}
        h1{color:#fbbf24;font-size:22px;margin:0 0 6px}
        h3{color:#94a3b8;font-size:14px;margin:14px 0 6px}
        table{border-collapse:collapse;width:100%;margin:10px 0}
        td,th{border-bottom:1px solid #2a2f3a;padding:8px 10px;text-align:left;font-size:13px}
        th{color:#94a3b8;font-size:11px;letter-spacing:.1em;text-transform:uppercase}
        small{color:#64748b}
        .block{background:#11151c;border:1px solid #1f2937;border-radius:10px;padding:12px 16px;margin:8px 0}
        .block.ok{border-color:#10b981;background:#052e16;color:#86efac}
        .block.warn{border-color:#f59e0b;background:#2a1f0a;color:#fde68a}
        .block.danger{border-color:#ef4444;background:#2a0f0f;color:#fca5a5}
        .meta{color:#64748b;font-size:12px;margin-bottom:14px}
      </style>
      <h1>📋 集團執行 CEO・每日巡站</h1>
      <p class="meta">${dateStr} | 自動探測，30 秒內完成</p>
      <table>
        <tr><th>站</th><th>首頁</th><th>sitemap</th><th>robots</th><th>回應</th><th>紅線</th></tr>
        ${siteRows}
      </table>
      ${violationBlock}
      ${aiBlock}
      ${vipBlock}
      <div class="block"><h3>LINE 連結</h3><p>${line.online ? '✅ 在線 (HTTP ' + line.status + ')' : '❌ 離線'}</p></div>
      ${metricsBlock}
      <p class="meta">— 集團執行 CEO 自動回報 —</p>`);
  }

  // JSON（給 API 用）
  res.status(200).json({
    schema: 'ceo-daily-check-v1',
    reported_at: dateStr,
    sites,
    ai,
    vip_ceo: vipCeo,
    line,
    metrics,
    violations,
    summary: {
      sites_ok: sites.filter(s => s.home.startsWith('✅')).length + '/' + sites.length,
      red_line_violations: violations.length,
      ai_online: ai.online_count,
      yesterday_data_available: metrics.available
    }
  });
};

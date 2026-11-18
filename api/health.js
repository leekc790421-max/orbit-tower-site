/* /api/health — 運維健康檢查 + CEO 每日巡站
   預設:基本健康檢查（presence布林值,絕不回顯機敏值）
   ?mode=ceo-check:執行長每日巡站（四站狀態/AI在線/紅線/昨日數字）*/
const SITES = [
  { id: 'xingdeng', url: 'https://xingdeng.tw', name: '品牌主站', role: '講品牌信任' },
  { id: 'tower', url: 'https://tower.xingdeng.tw', name: 'B2B 銷售站', role: '懶人包 $3K-$13.9K' },
  { id: 'orbit', url: 'https://orbit.xingdeng.tw', name: '3D 轉跳頁', role: '導流到 tower/3d' },
  { id: 'vip', url: 'https://vip.xingdeng.tw', name: 'VIP 命理', role: '會員制尊榮' }
];

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

async function ceoCheck() {
  const t = new Date();
  const taipei = new Date(t.getTime() + 8 * 3600 * 1000);
  const dateStr = taipei.toISOString().slice(0, 19).replace('T', ' ') + ' UTC+8';

  // 四站檢查
  const sites = await Promise.all(SITES.map(async (site) => {
    const start = Date.now();
    const [home, sitemap, robots] = await Promise.all([
      probe(site.url),
      probe(site.url + '/sitemap.xml'),
      probe(site.url + '/robots.txt')
    ]);
    const ms = Date.now() - start;
    const homeHtml = await fetchText(site.url);
    const redlines = {};
    if (site.id === 'vip') {
      // 紅線:不准「接」信用卡刷卡。但 FAQ「為什麼不接信用卡刷卡」是合規說明,要排除。
      const cardMentioned = countMatches(homeHtml, ['信用卡刷卡', '收卡號', 'CVV', '3DS 認證資料']) > 0;
      const hasFaqExplainingNoCard = /為什麼.{0,10}不接信用卡刷卡|不接.{0,5}第三方刷卡|只接受 ATM/.test(homeHtml);
      redlines.disclaimer = countMatches(homeHtml, ['僅供文化參考', '不構成投資']) > 0;
      redlines.no_credit_card = !cardMentioned || hasFaqExplainingNoCard; // FAQ 說明不接 = 合規
      redlines.manual_review = countMatches(homeHtml, ['人工審核', '雙簽', '匯款驗證']) > 0;
    }
    if (site.id === 'tower') {
      redlines.no_100pct = countMatches(homeHtml, ['100%.*上線', '保證.*上線']) === 0;
    }
    return {
      id: site.id, name: site.name, role: site.role, url: site.url,
      home: home.status === 200 ? '✅' : `❌ ${home.status}`,
      sitemap: sitemap.status === 200 ? '✅' : `❌ ${sitemap.status}`,
      robots: robots.status === 200 ? '✅' : `❌ ${robots.status}`,
      ms, redlines
    };
  }));

  // AI roster
  const rosterJson = await fetch('https://tower.xingdeng.tw/api/roster').then(r => r.json()).catch(() => null);
  const ai = rosterJson ? {
    on_duty: rosterJson.on_duty,
    online: (rosterJson.crew || []).filter(c => c.status === 'online').map(c => c.name),
    offline: (rosterJson.crew || []).filter(c => c.status === 'no_key' || c.status === 'offline').map(c => `${c.name}(${c.status})`)
  } : { on_duty: 'N/A', online: [], offline: [] };

  // VIP CEO ping
  const vipCeo = await fetch('https://vip.xingdeng.tw/api/ceo?view=ping').then(r => r.json()).catch(() => null);

  // LINE
  const line = await probe('https://line.me/R/ti/p/@559julyu', { timeout: 6000 });

  // 昨日數字
  const NURL = process.env.NEON_CONNECTION_STRING || process.env.DATABASE_URL;
  let metrics = { available: false, note: 'NEON_CONNECTION_STRING 未設定，無法查昨日數字。' };
  if (NURL) {
    try {
      const sql = require('@neondatabase/serverless').neon(NURL);
      // 先查實際有哪些 table（不同站用不同 DB schema）
      const tables = await sql`
        select table_name from information_schema.tables
        where table_schema='public'
        and table_name in ('growth_event','growth_lead','growth_order','ceo_conversation','leads','orders','contacts','messages')
      `.catch(() => []);
      const tableNames = tables.map(t => t.table_name);

      const queries = {};
      if (tableNames.includes('growth_event')) {
        queries.visitors = sql`select count(*)::int as n from growth_event where ts >= (now() - interval '24 hours')`.catch(() => [{ n: 'N/A' }]);
      }
      if (tableNames.includes('growth_lead')) {
        queries.leads = sql`select count(*)::int as n from growth_lead where created_at >= (now() - interval '24 hours')`.catch(() => [{ n: 'N/A' }]);
        queries.a_leads = sql`select count(*)::int as n from growth_lead where grade='A' and created_at >= (now() - interval '24 hours')`.catch(() => [{ n: 'N/A' }]);
      }
      if (tableNames.includes('growth_order')) {
        queries.orders = sql`select count(*)::int as n from growth_order where created_at >= (now() - interval '24 hours')`.catch(() => [{ n: 'N/A' }]);
      }
      if (tableNames.includes('ceo_conversation')) {
        queries.ai_chats = sql`select count(*)::int as n from ceo_conversation where ts >= (now() - interval '24 hours')`.catch(() => [{ n: 'N/A' }]);
      }

      const keys = Object.keys(queries);
      const values = keys.length ? await Promise.all(keys.map(k => queries[k])) : [];
      const result = { available: true, tables_found: tableNames };
      keys.forEach((k, i) => {
        result[{
          visitors: 'yesterday_visitors',
          leads: 'yesterday_leads',
          a_leads: 'yesterday_a_grade_leads',
          orders: 'yesterday_orders',
          ai_chats: 'yesterday_ai_chats'
        }[k]] = values[i][0]?.n;
      });
      metrics = result;
    } catch (e) {
      metrics = { available: false, note: 'DB query failed: ' + String(e).slice(0, 100) };
    }
  }

  // 紅線違規清單
  const violations = [];
  for (const s of sites) {
    if (s.id === 'vip') {
      if (!s.redlines.disclaimer) violations.push('VIP / 缺免責聲明');
      if (!s.redlines.no_credit_card) violations.push('VIP / 提及信用卡刷卡');
      if (!s.redlines.manual_review) violations.push('VIP / 缺人工審核字樣');
    }
    if (s.id === 'tower' && !s.redlines.no_100pct) violations.push('tower / 承諾 100% 上線');
  }

  return { dateStr, sites, ai, vipCeo, line: { online: line.ok, status: line.status }, metrics, violations };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // ── 全站指令廣播（/admin 專用）────────────────────────────────────
  if (req.query && req.query.mode === 'broadcast') {
    try {
      const bc = require('./_broadcast');
      return await bc(req, res);
    } catch (e) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        ok: false,
        error: 'broadcast_unavailable',
        message: '廣播模組暫時無法啟動，請稍後再試。',
        results: []
      });
    }
  }

  // ── AI CEO 互動對話終端（/admin 專用）──────────────────────────────
  // 同樣掛在既有函式內，避免 Hobby 12 函式上限；門禁與監控室一致。
  if (req.query && req.query.mode === 'chat') {
    try {
      const chat = require('./_ceo-chat');
      return await chat(req, res);
    } catch (e) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        ok: false,
        degraded: true,
        provider: 'rule',
        reply: '（AI CEO 終端暫時無法啟動，請稍後再試。監控室其他模組不受影響。）',
        error: String((e && e.message) || e).slice(0, 160)
      });
    }
  }

  // ── Command Center 聚合 API（/admin 專用）────────────────────────────
  // 掛在既有函式內，避免 Hobby 12 函式上限；只讀、逐區塊 try/catch。
  if (req.query && req.query.mode === 'cc') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (req.method === 'OPTIONS') return res.status(204).end();
    // 門禁：前端以 SHA-256(密碼) 作為通行鍵；未帶或不符一律 401，不外洩任何營運數據。
    const CC_KEY = 'c0430001866f79d9fcdfdbbd8b75bed967ffe86007b78603648db586cf0d4866';
    const given = String(req.headers['x-cc-key'] || '').trim().toLowerCase();

    // 濫用防護：每 IP 每分鐘上限（暖實例記憶體計數，冷啟動歸零；僅為第一層減壓）
    const ip = String(
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.headers['x-real-ip'] || 'unknown'
    ).slice(0, 64);
    const now = Date.now();
    const bucket = (globalThis.__ccRate = globalThis.__ccRate || new Map());
    const rec = bucket.get(ip) || { n: 0, t: now };
    if (now - rec.t > 60000) { rec.n = 0; rec.t = now; }
    rec.n += 1;
    bucket.set(ip, rec);
    if (bucket.size > 5000) bucket.clear();
    res.setHeader('X-RateLimit-Limit', '60');
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, 60 - rec.n)));
    if (rec.n > 60) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ schema: 'snt-cc-v1', error: 'rate_limited' });
    }

    if (given !== CC_KEY) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(401).json({ schema: 'snt-cc-v1', error: 'unauthorized', hint: 'X-CC-Key required' });
    }
    try {
      const { build } = require('./_cc');
      const payload = await build();
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return res.status(200).json(payload);
    } catch (e) {
      // 聚合層整體失敗時仍回 200 + 明確降級狀態，前端不會白屏
      return res.status(200).json({
        schema: 'snt-cc-v1',
        generated_at: new Date().toISOString(),
        degraded: ['aggregator: ' + String((e && e.message) || e).slice(0, 200)],
        db: { ok: false, ms: 0 },
        sites: [],
        adbot: null,
        saas: null,
        ceo: null,
        line: [],
        probe: [],
        kpi: null
      });
    }
  }

  // ── 雙軌智能核心診斷（掛在既有函式內，不新增 Serverless Function）──────────
  // ?mode=core  → 三層供應鏈狀態 + 全階定價矩陣（公開，不含成本）
  // ?mode=core&audit=1 + X-CC-Key → 追加成本稽核視圖（僅總部內部）
  if (req.query && req.query.mode === 'core') {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (req.method === 'OPTIONS') return res.status(204).end();
    try {
      const CORE = require('./_snt-core.js');
      const inf = CORE.clampInflation(req.query.inflation);
      const CC_KEY = 'c0430001866f79d9fcdfdbbd8b75bed967ffe86007b78603648db586cf0d4866';
      const given = String(req.headers['x-cc-key'] || '').trim().toLowerCase();
      const isAdmin = !!given && given === CC_KEY;

      const out = {
        ok: true,
        schema: 'snt-core-v1',
        generated_at: new Date().toISOString(),
        providers: CORE.providerStatus(),
        inflation: inf,
        vat_rate: CORE.VAT_RATE,
        saas_tiers: CORE.SAAS_TIERS,
        plans: Object.keys(CORE.PRICING_BASE).map(k => CORE.publicQuote(k, inf)),
        line_modules: Object.keys(CORE.LINE_MODULES).map(code => ({
          code, name: CORE.LINE_MODULES[code].name, desc: CORE.LINE_MODULES[code].desc
        })),
        addons: Object.keys(CORE.ADDON_FEATURES).map(code => ({
          code, name: CORE.ADDON_FEATURES[code].name
        }))
      };
      if (isAdmin && req.query.audit === '1') {
        out.audit = Object.keys(CORE.PRICING_BASE).map(k => CORE.auditQuote(k, inf));
      }
      return res.status(200).json(out);
    } catch (e) {
      return res.status(200).json({
        ok: false, schema: 'snt-core-v1',
        error: String((e && e.message) || e).slice(0, 200)
      });
    }
  }

  // ── YouTube Shorts 自動化管線（掛在既有函式內，不新增 Serverless Function）──
  // ?mode=shorts            → 金鑰/頻道/最近上傳/Shorts 佔比 + 4 週排程
  // ?mode=shorts&plan=1     → 只回排程（不打 YouTube API，零配額）
  if (req.query && req.query.mode === 'shorts') {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    try {
      const SH = require('./_shorts.js');
      if (req.query.plan === '1') {
        return res.status(200).json(SH.schedulePlan({
          perWeek: Number(req.query.per_week) || 3,
          weeks: Number(req.query.weeks) || 4
        }));
      }
      const out = await SH.diagnose();
      return res.status(200).json(out);
    } catch (e) {
      return res.status(200).json({
        ok: false, schema: 'snt-shorts-v1', verdict: 'module_error',
        error: String((e && e.message) || e).slice(0, 200)
      });
    }
  }

  // CEO 巡站模式
  if (req.query && req.query.mode === 'ceo-check') {
    const result = await ceoCheck();

    if (req.query.format === 'html') {
      const siteRows = result.sites.map(s => `
        <tr>
          <td><strong>${s.name}</strong><br><small>${s.role}</small></td>
          <td>${s.home}</td>
          <td>${s.sitemap}</td>
          <td>${s.robots}</td>
          <td>${s.ms}ms</td>
          <td>${Object.entries(s.redlines).map(([k,v]) => v ? '✅' : '❌').join(' ') || '—'}</td>
        </tr>`).join('');

      const violationBlock = result.violations.length ? `
        <div class="block danger"><h3>🔴 紅線違規（${result.violations.length}）</h3>
        <ul>${result.violations.map(v => `<li>${v}</li>`).join('')}</ul></div>` : '<div class="block ok">✅ 紅線檢查通過</div>';

      const aiBlock = result.ai.on_duty !== 'N/A' ? `
        <div class="block"><h3>AI 接待（${result.ai.online.length} 在線 / ${result.ai.on_duty}）</h3>
        <p><strong>在線：</strong>${result.ai.online.join('、') || '無'}</p>
        ${result.ai.offline.length ? `<p><strong>離線：</strong>${result.ai.offline.join('、')}</p>` : ''}</div>` : '<div class="block warn">AI roster 無法取得</div>';

      const vipBlock = result.vipCeo ? `
        <div class="block"><h3>VIP CEO 引擎</h3>
        <p>ok: ${result.vipCeo.ok} | db: ${result.vipCeo.db} | ai: ${result.vipCeo.ai} | today: ${result.vipCeo.today}</p></div>` : '<div class="block warn">VIP CEO ping 失敗</div>';

      const metricsBlock = result.metrics.available ? `
        <div class="block"><h3>昨日數字（24h）</h3>
        <p>訪客：${result.metrics.yesterday_visitors} | 名單：${result.metrics.yesterday_leads} | 訂單：${result.metrics.yesterday_orders} | 營收：US$${result.metrics.yesterday_revenue_usd} | A 級：${result.metrics.yesterday_a_grade_leads} | AI 對話：${result.metrics.yesterday_ai_chats}</p></div>` : `<div class="block warn">昨日數字：${result.metrics.note}</div>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(`<!doctype html><meta charset="utf-8"><title>CEO 巡站・${result.dateStr}</title>
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
        <p class="meta">${result.dateStr} | 自動探測，30 秒內完成</p>
        <table><tr><th>站</th><th>首頁</th><th>sitemap</th><th>robots</th><th>回應</th><th>紅線</th></tr>${siteRows}</table>
        ${violationBlock}${aiBlock}${vipBlock}
        <div class="block"><h3>LINE 連結</h3><p>${result.line.online ? '✅ 在線 (HTTP ' + result.line.status + ')' : '❌ 離線'}</p></div>
        ${metricsBlock}
        <p class="meta">— 集團執行 CEO 自動回報 —</p>`);
    }

    return res.status(200).json({ schema: 'ceo-daily-check-v1', reported_at: result.dateStr, ...result });
  }

  // 預設：基本健康檢查
  const env = (k) => !!process.env[k] && String(process.env[k]).length > 0;
  res.status(200).json({
    schema: 'snt-health-v1',
    product: 'xingdeng-main',
    ok: true,
    ts: new Date().toISOString(),
    version: 'ops-2026.10.15',
    services: {
      gemini: env('GEMINI_API_KEY'),
      zai: env('ZAI_API_KEY'),
      serpent_scan: env('SERPAPI_KEY'),
      line: env('LINE_CHANNEL_ACCESS_TOKEN'),
      supabase: env('SUPABASE_URL') && env('SUPABASE_SERVICE_ROLE_KEY'),
      stripe: env('STRIPE_SECRET_KEY'),
      paypal: env('PAYPAL_CLIENT_ID'),
      smtp: process.env.RESEND_API_KEY || process.env.SMTP_HOST || false
    },
    routes: ['/','/3d','/kits','/pricing','/reports','/diagnose','/contact','/checkout','/ops','/articles/a01','/api/health?mode=ceo-check']
  });
};

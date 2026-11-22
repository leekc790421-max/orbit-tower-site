'use strict';
/* SNT v6.0 — AI CEO 互動對話終端後端（Command Chat Terminal）
   POST /api/ceo-chat  { messages:[{role,content}], stream?:boolean }
   設計原則：
   1. 門禁與監控室一致：X-CC-Key = SHA-256(密碼)，不符一律 401。
   2. Context Awareness：每次對話前即時讀取 Neon（leads / ad_bot_tasks / ad_bot_dispatch / ad_bot_quota / growth_event / subscription_events），
      以「真實數字」餵給 LLM，禁止模型自行編造。
   3. v7.1 整合：LLM 層委派 _snt-core.js 的三層無縫切換（L1 免費閘道 → L2 Z.ai → L3 本地規則），
      與 @580ctuew 總部 LINE 機器人、站內 Concierge 共用同一套語感與定價引擎。
   4. 全程 try/catch；LLM 或 DB 逾時回傳友善提示，HTTP 仍為 200。
   5. 串流：text/event-stream（SSE），逐字輸出；不支援時自動退回一次性 JSON。 */

const CORE = require('./_snt-core.js');

const CC_KEY = 'c0430001866f79d9fcdfdbbd8b75bed967ffe86007b78603648db586cf0d4866';
const TZ = 'Asia/Taipei';
const TODAY = `((now() at time zone '${TZ}')::date)`;
const localDate = (col) => `((${col}) at time zone '${TZ}')::date`;

/* ---------- 速率限制（每 IP 每分鐘 20 次對話） ---------- */
function rateLimit(req, res, limit) {
  const ip = String((req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.headers['x-real-ip'] || 'unknown').slice(0, 64);
  const now = Date.now();
  const bucket = (globalThis.__ceoChatRate = globalThis.__ceoChatRate || new Map());
  const rec = bucket.get(ip) || { n: 0, t: now };
  if (now - rec.t > 60000) { rec.n = 0; rec.t = now; }
  rec.n += 1;
  bucket.set(ip, rec);
  if (bucket.size > 5000) bucket.clear();
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - rec.n)));
  if (rec.n > limit) { res.setHeader('Retry-After', '60'); return false; }
  return true;
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout:' + label)), ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

/* ---------- 即時營運 Context ---------- */
async function buildContext() {
  const url = process.env.NEON_CONNECTION_STRING || process.env.DATABASE_URL;
  if (!url) return { ok: false, error: 'no-db', text: '（資料庫未連線，以下無即時數據）' };
  let sql;
  try {
    const { neon } = require('@neondatabase/serverless');
    sql = neon(url);
  } catch (e) {
    return { ok: false, error: 'driver', text: '（資料庫驅動載入失敗）' };
  }

  const q = async (label, fn, fallback) => {
    try { return await withTimeout(fn(), 6000, label); }
    catch (e) { return fallback; }
  };

  const [traffic, leads, tasks, dispatch, quota, subs, assets] = await Promise.all([
    q('traffic', () => sql.query(`
      select site,
             count(*) filter (where type='pageview')::int pv,
             count(*) filter (where type='pageview' and ${localDate('ts')} = ${TODAY})::int pv_today,
             count(distinct vid) filter (where type='pageview')::int uniq,
             round(avg(dwell) filter (where type='dwell' and dwell between 1 and 1800))::int dwell
        from growth_event where site in ('decoration.xingdeng.tw','xingdeng.tw','tower.xingdeng.tw','orbit.xingdeng.tw','vip.xingdeng.tw') group by site`), []),
    q('leads', () => sql.query(`
      select count(*)::int total,
             count(*) filter (where ${localDate('at')} = ${TODAY})::int today,
             count(*) filter (where kind='liff-quote' or page ilike 'decoration%')::int quote,
             count(*) filter (where coalesce(company,'')<>'')::int named
        from leads`), []),
    q('tasks', () => sql.query(`
      select site, kind, status, attempts, created_at from ad_bot_tasks order by created_at desc limit 6`), []),
    q('dispatch', () => sql.query(`
      select site, channel, status, err, created_at from ad_bot_dispatch order by created_at desc limit 6`), []),
    q('quota', () => sql.query(`
      select day, youtube_units, line_pushes from ad_bot_quota order by day desc limit 1`), []),
    q('subs', () => sql.query(`
      with t as (select tenant_id, min(created_at) started from subscription_events where event_type='trial_started' and tenant_id is not null group by 1),
           p as (select distinct tenant_id from subscription_events where event_type in ('payment_received','plan_changed') and tenant_id is not null)
      select count(*)::int started, count(*) filter (where t.started + interval '14 days' > now() and p.tenant_id is null)::int active_trial
        from t left join p on p.tenant_id=t.tenant_id`), []),
    q('assets', () => sql.query(`
      select site, kind, count(*)::int n from ad_bot_assets where ${localDate('created_at')} = ${TODAY} group by 1,2`), [])
  ]);

  const L = [];
  L.push('【即時營運數據（Neon PostgreSQL，' + new Date().toLocaleString('zh-TW', { timeZone: TZ }) + '）】');
  L.push('');
  L.push('■ 五站流量（growth_event）');
  if (traffic.length) {
    for (const r of traffic) L.push(`  - ${r.site}：累計瀏覽 ${r.pv}、今日 ${r.pv_today}、不重複訪客 ${r.uniq}、平均停留 ${r.dwell === null ? '無樣本' : r.dwell + ' 秒'}`);
  } else L.push('  （尚無 growth_event 資料）');

  const ld = leads[0] || {};
  L.push('');
  L.push('■ 名單與商機（leads）');
  L.push(`  - 累計 ${ld.total || 0} 筆、今日 ${ld.today || 0} 筆、估價單 ${ld.quote || 0} 筆、具名企業 ${ld.named || 0} 筆`);

  const sb = subs[0] || {};
  L.push('');
  L.push('■ SaaS 訂閱（subscription_events）');
  L.push(`  - 累計試用 ${sb.started || 0} 家、14 天內試用中 ${sb.active_trial || 0} 家`);

  const qq = quota[0];
  L.push('');
  L.push('■ Omni-Ad Bot 配額（ad_bot_quota）');
  L.push(qq ? `  - ${qq.day}：YouTube ${qq.youtube_units} / 8000 units、LINE 推播 ${qq.line_pushes} 則` : '  - 今日尚無配額紀錄');

  L.push('');
  L.push('■ 素材產出（ad_bot_assets，今日）');
  if (assets.length) for (const a of assets) L.push(`  - ${a.site} / ${a.kind}：${a.n} 件`);
  else L.push('  - 今日尚無產出紀錄');

  L.push('');
  L.push('■ 最近任務（ad_bot_tasks）');
  if (tasks.length) for (const t of tasks) L.push(`  - ${t.site} ${t.kind} → ${t.status}（嘗試 ${t.attempts} 次，${new Date(t.created_at).toLocaleString('zh-TW', { timeZone: TZ })}）`);
  else L.push('  - 尚無任務');

  L.push('');
  L.push('■ 最近派發（ad_bot_dispatch）');
  if (dispatch.length) for (const d of dispatch) L.push(`  - ${d.site} / ${d.channel} → ${d.status}${d.err ? '（錯誤：' + String(d.err).slice(0, 40) + '）' : ''}`);
  else L.push('  - 尚無派發紀錄');

  return { ok: true, text: L.join('\n'), raw: { traffic, leads: ld, subs: sb, quota: qq, tasks, dispatch, assets } };
}

/* ---------- System Prompt ---------- */
function systemPrompt(ctxText) {
  const inf = CORE.clampInflation(process.env.SNT_INFLATION);
  const infTxt = inf.toFixed(2);
  const q = (k) => CORE.calculateDynamicQuote(k, inf).price_ex_vat.toLocaleString();

  return `你是「SNT v6.0 光曜星樞」的 AI CEO，代號 A.C LEE。你正在中央營運監控室（Command Center）與最高指揮官對話。

【角色與語氣】
- 繁體中文、精準、務實、像一位真正的營運長在向老闆回報。
- 先給結論，再給依據；能用數字就用數字。
- 不要客套、不要重複問題、不要編造。
- 用平常講話的方式寫，不要公文腔。用「你」不用「您」。
- 不要用「賦能」「一站式」「全方位」「打造生態系」這類詞填空；講不出具體內容就說講不出來。

【絕對紀律】
1. 只能使用下方【即時營運數據】中的數字。資料沒有的項目，明確說「目前無此資料源」，絕不猜測或編造。
2. 若指揮官要求「調整排程／派發／修改設定」等寫入動作：你必須說明這需要實際執行，並列出「建議動作 + 影響範圍 + 風險」，然後請指揮官確認。你不可聲稱已經執行完成。
3. 回答長度：一般 3–8 行；需要分析時可用條列，但不要長篇大論。
4. 涉及金額一律標明幣別（NT$）。
5. 絕不洩漏底層成本、毛利公式或內部試算表。

【核准公開定價（物調係數 ${infTxt}，未稅，已自動校準至千元）】
- SaaS 訂閱（含 14 天免綁約試用）：Starter NT$${CORE.SAAS_TIERS.Starter.price.toLocaleString()}/月、Pro NT$${CORE.SAAS_TIERS.Pro.price.toLocaleString()}/月、Enterprise NT$${CORE.SAAS_TIERS.Enterprise.price.toLocaleString()}/月。
- 系統建置／買斷：Personal NT$${q('Personal')} 起｜LINE 商業擴編（22w 級）NT$${q('LINE_22W')} 起｜Business NT$${q('Business')} 起｜Store 旗艦 NT$${q('Store')} 起｜Professional NT$${q('Professional')} 起｜Enterprise NT$${q('Enterprise')} 起。
- LINE 擴編模組（可單點加購或無限疊加）：L-01 多租戶 OA 矩陣｜L-02 LIFF 微商城與估價｜L-03 動態選單分眾｜L-04 裂變推薦與二級分潤｜L-05 AI 看圖估價與自動跟單。
- 中部木作行情：衣櫃 NT$6,200–7,500/尺起；收納櫃 NT$5,000–12,000/尺；系統櫃高櫃 NT$4,500–9,000/尺。

【五大站點職責】
- decoration.xingdeng.tw：中部屋主精裝修／木作獲客，LINE @580ctuew
- xingdeng.tw：B2B 數位總部，統包商夥伴
- tower.xingdeng.tw：3D 空間展館（本監控室所在）
- orbit.xingdeng.tw：企業方案與人工評估 /quote
- vip.xingdeng.tw：CosmoSphere 高淨值黑卡會所

${ctxText}`;
}

/* ---------- LLM 呼叫：委派雙軌智能核心（三層無縫切換） ----------
   注意：核心在「定價／方案意圖」時會刻意回傳 local_strategist（避免 LLM 編造價格），
   那是「正確且有內容」的回覆，不可視為失敗而掉進營運總覽保底。
   因此只要核心有給出實質內容，就採用它；只有完全空回覆才算降級。 */
async function callLLM(messages, system, ms) {
  const out = await CORE.generateSmartResponse(messages, {
    inflation: CORE.clampInflation(process.env.SNT_INFLATION),
    site: 'hq',
    systemOverride: system
  });
  const text = String(out.reply || '').trim();
  const pricingIntent = CORE.isPricingIntent(
    [...messages].reverse().find(m => m.role === 'user')?.content || ''
  );
  /* 定價意圖走策略引擎是設計行為，視為成功；其他情況 local_strategist 才算降級 */
  const ok = text.length > 20 && (out.engine !== 'local_strategist' || pricingIntent);
  return {
    ok,
    provider: out.engine,
    text,
    ms: 0,
    attempts: out.attempts || []
  };
}

/* ---------- 規則引擎（LLM 全掛時的保底，仍用真實數據） ---------- */
function ruleReply(question, ctx) {
  const q = String(question || '');
  const raw = ctx.raw || {};
  const traffic = raw.traffic || [];
  const l = raw.leads || {};
  const sb = raw.subs || {};
  const qq = raw.quota;
  const tasks = raw.tasks || [];
  const dispatch = raw.dispatch || [];
  const assets = raw.assets || [];
  const L = [];

  const pvTotal = traffic.reduce((a, r) => a + Number(r.pv || 0), 0);
  const pvToday = traffic.reduce((a, r) => a + Number(r.pv_today || 0), 0);
  const uniqTotal = traffic.reduce((a, r) => a + Number(r.uniq || 0), 0);
  const top = traffic.slice().sort((a, b) => Number(b.pv || 0) - Number(a.pv || 0))[0];
  const failed = tasks.filter((t) => t.status === 'failed').length;
  const open = tasks.filter((t) => ['queued', 'pending', 'running'].includes(t.status)).length;
  const dispErr = dispatch.filter((d) => d.err).length;
  const quotaPct = qq ? Math.round((Number(qq.youtube_units || 0) / 8000) * 1000) / 10 : null;

  const head = (t) => { L.push('【' + t + '】'); };

  if (/流量|瀏覽|訪客|人次|traffic/i.test(q)) {
    head('五站流量快照');
    if (traffic.length) {
      for (const r of traffic.slice().sort((a, b) => Number(b.pv || 0) - Number(a.pv || 0))) {
        L.push(`· ${r.site}：累計 ${r.pv}、今日 ${r.pv_today}、不重複 ${r.uniq}、平均停留 ${r.dwell === null ? '無樣本' : r.dwell + ' 秒'}`);
      }
      L.push('');
      L.push(`合計瀏覽 ${pvTotal} 次、不重複訪客 ${uniqTotal} 人、今日 ${pvToday} 次。`);
      if (top) L.push(`流量最高為 ${top.site}（${top.pv} 次，佔 ${pvTotal ? Math.round((top.pv / pvTotal) * 100) : 0}%）。`);
      if (pvToday === 0) L.push('注意：今日尚無新的 pageview 寫入，建議確認各站追蹤碼是否正常上報。');
    } else L.push('· 目前無 growth_event 資料源。');
  } else if (/名單|估價|leads|商機|轉換/i.test(q)) {
    head('名單與商機');
    L.push(`· 累計 ${l.total || 0} 筆、今日 ${l.today || 0} 筆`);
    L.push(`· 估價單 ${l.quote || 0} 筆、具名企業 ${l.named || 0} 筆`);
    if (l.total) L.push(`· 具名比例 ${Math.round(((l.named || 0) / l.total) * 100)}%（統包商夥伴辨識度）`);
    if (!l.today) L.push('· 今日尚無新名單，建議檢查 decoration 的 LIFF 估價流程與 LINE 導流。');
  } else if (/配額|quota|youtube|api/i.test(q)) {
    head('YouTube API 配額');
    if (qq) {
      const dayStr = qq.day instanceof Date ? qq.day.toISOString().slice(0, 10) : String(qq.day || '').slice(0, 10);
      L.push(`· ${dayStr}：已用 ${qq.youtube_units} / 8000 units（${quotaPct}%）`);
      L.push(`· LINE 推播 ${qq.line_pushes} 則`);
      L.push(`· 判定：${quotaPct >= 90 ? '接近上限，建議暫停非必要搜尋' : quotaPct >= 70 ? '需注意，優先使用快取' : '正常，餘裕充足'}`);
    } else L.push('· 今日尚無配額紀錄（ad_bot_quota 未寫入）。');
  } else if (/訂閱|試用|tenant|方案|saas|營收/i.test(q)) {
    head('SaaS 訂閱');
    L.push(`· 累計試用 ${sb.started || 0} 家、14 天內試用中 ${sb.active_trial || 0} 家`);
    L.push('· 三階方案：NT$7,800 入門 / NT$13,900 專業 / NT$24,800 旗艦');
    if (!sb.active_trial) L.push('· 目前無進行中的試用，建議啟動新一波統包商招募。');
  } else if (/排程|派發|任務|dispatch|task|錯誤|防呆/i.test(q)) {
    head('Omni-Ad Bot 執行狀態');
    L.push(`· 最近任務 ${tasks.length} 筆：失敗 ${failed}、進行中 ${open}`);
    for (const t of tasks.slice(0, 5)) L.push(`  - ${t.site} ${t.kind} → ${t.status}（嘗試 ${t.attempts} 次）`);
    L.push(`· 最近派發 ${dispatch.length} 筆，含錯誤 ${dispErr} 筆`);
    for (const d of dispatch.filter((x) => x.err).slice(0, 3)) L.push(`  - ${d.site}/${d.channel}：${String(d.err).slice(0, 40)}`);
    if (!failed && !dispErr) L.push('· 目前無錯誤攔截紀錄，冪等性防呆運作正常。');
  } else if (/素材|圖卡|分鏡|shorts|產出/i.test(q)) {
    head('今日素材產出');
    if (assets.length) for (const a of assets) L.push(`· ${a.site} / ${a.kind}：${a.n} 件`);
    else L.push('· 今日尚無素材產出紀錄。');
  } else {
    head('營運總覽');
    L.push(`· 五站瀏覽 ${pvTotal} 次（不重複 ${uniqTotal} 人，今日 ${pvToday} 次）`);
    L.push(`· 名單累計 ${l.total || 0} 筆（今日 ${l.today || 0}），估價單 ${l.quote || 0} 筆`);
    L.push(`· 試用中租戶 ${sb.active_trial || 0} 家`);
    L.push(`· YouTube 配額 ${qq ? qq.youtube_units + ' / 8000 units' : '今日無紀錄'}`);
    L.push(`· 任務失敗 ${failed} 筆、派發錯誤 ${dispErr} 筆`);
    L.push('');
    L.push('建議優先關注：' + (failed || dispErr ? '派發錯誤與失敗任務的根因。' : pvToday === 0 ? '各站追蹤碼上報是否中斷。' : '維持現有節奏，持續觀察估價單轉換。'));
  }

  L.push('');
  L.push('（LLM 引擎目前無法連線，以上為即時資料庫直出分析。可稍後重試取得完整語意回覆。）');
  return L.join('\n');
}

/* ---------- Handler ---------- */
module.exports = async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,x-cc-key');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // 門禁
  const given = String(req.headers['x-cc-key'] || '').trim().toLowerCase();
  if (given !== CC_KEY) return res.status(401).json({ error: 'unauthorized' });

  if (!rateLimit(req, res, 20)) return res.status(429).json({ error: 'rate_limited', message: '對話過於頻繁，請稍候一分鐘。' });

  // 解析 body
  let body = {};
  try {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) body = req.body;
    else {
      const raw = await new Promise((resolve) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      });
      body = JSON.parse(raw || '{}');
    }
  } catch (e) {
    return res.status(400).json({ error: 'invalid_json' });
  }

  const messages = Array.isArray(body.messages)
    ? body.messages.slice(-10).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').slice(0, 2000)
      })).filter((m) => m.content)
    : [];
  if (!messages.length) return res.status(400).json({ error: 'messages_required' });

  const lastUser = messages.filter((m) => m.role === 'user').slice(-1)[0] || { content: '' };
  const wantStream = body.stream !== false;

  // 1) 取即時 Context（失敗不中斷）
  let ctx;
  try {
    ctx = await withTimeout(buildContext(), 9000, 'context');
  } catch (e) {
    ctx = { ok: false, error: String(e.message).slice(0, 80), text: '（即時數據讀取逾時，請以既有畫面數據為準）', raw: {} };
  }

  const system = systemPrompt(ctx.text || '');

  // 2) 呼叫 LLM
  let result;
  try {
    result = await withTimeout(callLLM(messages, system, 7000), 11000, 'llm');
  } catch (e) {
    result = { ok: false, provider: null, text: null, attempts: [{ p: 'llm', error: String(e.message).slice(0, 80) }] };
  }

  const degraded = !result.ok;
  const reply = result.ok ? result.text : ruleReply(lastUser.content, ctx);

  const meta = {
    provider: result.provider || 'rule',
    degraded,
    attempts: result.attempts || [],
    ctx_ok: !!ctx.ok,
    ctx_error: ctx.error || null,
    ms: result.ms || 0
  };

  // 3) 串流輸出（SSE）；失敗則退回 JSON
  if (wantStream) {
    try {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.status(200);
      if (typeof res.flushHeaders === 'function') res.flushHeaders();

      const send = (obj) => res.write('data: ' + JSON.stringify(obj) + '\n\n');
      send({ type: 'meta', ...meta });

      // 以詞為單位漸進輸出，模擬即時串流（上游為非串流 API）
      const chunks = String(reply).match(/[\s\S]{1,18}/g) || [String(reply)];
      for (const c of chunks) {
        send({ type: 'delta', text: c });
        await new Promise((r) => setTimeout(r, 12));
      }
      send({ type: 'done' });
      return res.end();
    } catch (e) {
      // 串流失敗 → 若尚未送出內容，改回 JSON
      try {
        if (!res.headersSent) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          return res.status(200).json({ ok: true, reply, ...meta });
        }
        return res.end();
      } catch (e2) { return res.end(); }
    }
  }

  return res.status(200).json({ ok: true, reply, ...meta });
};
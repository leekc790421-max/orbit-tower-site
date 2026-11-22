'use strict';
/* SNT v6.0 — Command Center 聚合層（Multi-Tenant Aggregation）
   設計原則：
   1. 每個資料區塊獨立 try/catch + 逾時，任一來源失敗只降級該區塊，絕不讓整個儀表板白屏。
   2. 只讀（SELECT），不寫入、不改動前台任何資料。
   3. 無資料的指標回傳 null 並附 state:'no_source'，前端顯示「—」，不以 0 或假值冒充。
   4. 本檔以 _ 開頭，Vercel 不視為 Serverless Function（Hobby 12 函式上限保護）。 */

const TZ = 'Asia/Taipei';
// 以「本地日期」直接比對，避免 timestamptz 來回轉換造成 8 小時偏移
const TODAY = `((now() at time zone '${TZ}')::date)`;
const localDate = (col) => `((${col}) at time zone '${TZ}')::date`;

const SITE_META = [
  { id: 'decoration', host: 'decoration.xingdeng.tw', name: '光曜星閣・木作統包', role: '中部屋主獲客', accent: '#C9A227' },
  { id: 'xingdeng', host: 'xingdeng.tw', name: 'SNT 光曜星樞・數位總部', role: 'B2B 品牌總部', accent: '#4F8CFF' },
  { id: 'tower', host: 'tower.xingdeng.tw', name: '星閣 3D 展館', role: '3D 空間體驗', accent: '#A78BFA' },
  { id: 'orbit', host: 'orbit.xingdeng.tw', name: '星軌企業總部', role: '企業方案', accent: '#38BDF8' },
  { id: 'vip', host: 'vip.xingdeng.tw', name: 'CosmoSphere 黑卡會所', role: '高淨值 VIP', accent: '#D4AF37' }
];

const TIERS = [
  { key: 'starter', name: '入門', price: 7800 },
  { key: 'pro', name: '專業', price: 13900 },
  { key: 'enterprise', name: '旗艦', price: 24800 }
];

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout:' + label)), ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

async function safe(label, fn, fallback, ms) {
  const started = Date.now();
  try {
    const value = await withTimeout(fn(), ms || 6000, label);
    return { ok: true, value, ms: Date.now() - started };
  } catch (e) {
    return { ok: false, value: fallback, ms: Date.now() - started, error: String((e && e.message) || e).slice(0, 160) };
  }
}

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);

function getSql() {
  const url = process.env.NEON_CONNECTION_STRING || process.env.DATABASE_URL;
  if (!url) return null;
  try {
    const { neon } = require('@neondatabase/serverless');
    return neon(url);
  } catch (e) {
    return null;
  }
}

/* ---------- 1. 五站流量（growth_event + hits） ---------- */
async function trafficBlock(sql) {
  const rows = await sql.query(`
    select site,
           count(*) filter (where type = 'pageview')::int as pv_all,
           count(*) filter (where type = 'pageview' and ${localDate('ts')} = ${TODAY})::int as pv_today,
           count(distinct vid) filter (where type = 'pageview')::int as uniq_all,
           count(*) filter (where type = 'dwell')::int as dwell_n,
           round(avg(dwell) filter (where type = 'dwell' and dwell between 1 and 1800))::int as dwell_avg,
           count(*) filter (where type = 'form_start')::int as form_start,
           max(ts) as last_seen
      from growth_event
     where site in ('decoration.xingdeng.tw','xingdeng.tw','tower.xingdeng.tw','orbit.xingdeng.tw','vip.xingdeng.tw')
     group by site`);
  const map = {};
  for (const r of rows) map[r.site] = r;
  return map;
}

async function hitsBlock(sql) {
  const rows = await sql.query(`
    select key, sum(n)::int as n
      from hits
     where kind = 'page'
       and day = to_char((now() at time zone '${TZ}'), 'YYYYMMDD')::int
     group by key`);
  const map = {};
  for (const r of rows) map[r.key] = r.n;
  return map;
}

/* ---------- 2. 名單 / 商機 ---------- */
async function leadsBlock(sql) {
  const rows = await sql.query(`
    select
      count(*)::int as total,
      count(*) filter (where ${localDate('at')} = ${TODAY})::int as today,
      count(*) filter (where kind = 'liff-quote' or page ilike 'decoration%')::int as quote_total,
      count(*) filter (where (kind = 'liff-quote' or page ilike 'decoration%')
                        and ${localDate('at')} = ${TODAY})::int as quote_today,
      count(*) filter (where page ilike '%quote%')::int as quote_page_total,
      count(*) filter (where coalesce(company,'') <> '')::int as named_company,
      count(*) filter (where coalesce(industry,'') ~ '統包|工程|木作|裝修|營造|設計')::int as partner_industry
      from leads`);
  return rows[0] || {};
}

async function growthLeadBlock(sql) {
  const rows = await sql.query(`
    select site,
           count(*)::int as n,
           count(*) filter (where grade = 'A')::int as a,
           count(*) filter (where plan ~ '黑卡')::int as black_card,
           count(*) filter (where status = 'sla_breach')::int as sla_breach
      from growth_lead
     group by site`);
  const map = {};
  for (const r of rows) map[r.site] = r;
  return map;
}

async function lineTargetBlock(sql) {
  const rows = await sql.query(`select id, kind, label, hits, last_seen from ceo_line_target order by hits desc nulls last limit 10`);
  return rows;
}

/* ---------- 3. Omni-Ad Bot ---------- */
async function adBotBlock(sql) {
  const quota = await sql.query(`
    select day, youtube_units, line_pushes, updated_at
      from ad_bot_quota
     order by day desc limit 1`);
  const assets = await sql.query(`
    select site, kind, count(*)::int as n, max(created_at) as last_at
      from ad_bot_assets
     where ${localDate('created_at')} = ${TODAY}
     group by site, kind
     order by site, kind`);
  const tasks = await sql.query(`
    select id, site, kind, status, attempts, max_attempts, idem_key, scheduled_at, created_at
      from ad_bot_tasks
     order by created_at desc limit 8`);
  const dispatch = await sql.query(`
    select id, site, channel, status, attempts, idem_key, err, scheduled_at, sent_at, created_at
      from ad_bot_dispatch
     order by created_at desc limit 8`);
  const logs = await sql.query(`
    select ts, site, level, event, units
      from ad_bot_logs
     order by ts desc limit 12`);
  const counts = await sql.query(`
    select
      count(*) filter (where status = 'done')::int as done,
      count(*) filter (where status = 'failed')::int as failed,
      count(*) filter (where status in ('queued','pending','running'))::int as open,
      count(*) filter (where attempts > 1)::int as retried
      from ad_bot_tasks`);
  return { quota: quota[0] || null, assets, tasks, dispatch, logs, counts: counts[0] || {} };
}

/* ---------- 4. SaaS 訂閱 ---------- */
async function saasBlock(sql) {
  const trials = await sql.query(`
    with t as (
      select tenant_id, min(created_at) as started_at
        from subscription_events
       where event_type = 'trial_started' and tenant_id is not null
       group by tenant_id
    ), paid as (
      select distinct tenant_id from subscription_events
       where event_type in ('payment_received','plan_changed') and tenant_id is not null
    )
    select
      count(*)::int as started_total,
      count(*) filter (where t.started_at + interval '14 days' > now())::int as within_14d,
      count(*) filter (where t.started_at + interval '14 days' > now() and p.tenant_id is null)::int as active_trial
      from t left join paid p on p.tenant_id = t.tenant_id`);
  const payments = await sql.query(`
    select coalesce((payload->>'amount_twd')::numeric, 0)::int as amount,
           count(*)::int as events,
           count(distinct coalesce(payload->>'order_no', payload->>'order_id', id::text))::int as orders
      from subscription_events
     where event_type = 'payment_received'
     group by 1 order by 1 desc`);
  const events = await sql.query(`
    select event_type, count(*)::int as n, max(created_at) as last_at
      from subscription_events group by 1 order by 2 desc`);
  return { trials: trials[0] || {}, payments, events };
}

/* ---------- 5. AI CEO ---------- */
async function ceoBlock(sql) {
  const daemon = await sql.query(`
    select at, trigger, ms, scanned, rescored, actions, ai_ok, err
      from ceo_daemon_run order by at desc limit 1`);
  const decisions = await sql.query(`
    select day, code, title, priority, severity, action
      from ceo_decision_log
     where day >= ${TODAY} - 1
     order by case priority when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end, at desc
     limit 6`);
  const board = await sql.query(`
    select column_id, count(*)::int as n from ceo_action_board group by 1`);
  const conv = await sql.query(`
    select count(*)::int as n from ceo_conversation
     where ${localDate('at')} = ${TODAY}`);
  return { daemon: daemon[0] || null, decisions, board, conversations_today: (conv[0] || {}).n || 0 };
}

/* ---------- 6. 雙 LINE OA 健康 ---------- */
async function lineHealth() {
  const pick = (...names) => {
    for (const n of names) { if (process.env[n]) return process.env[n]; }
    return null;
  };
  const targets = [
    {
      id: '@580ctuew',
      label: '光曜星棧・中部裝潢木作獲客',
      token: pick('LINE_OA_1_TOKEN', 'LINE_BOT1_TOKEN', 'LINE_CHANNEL_TOKEN')
    },
    {
      id: '@580ctuew',
      label: '光曜星樞 SNT・B2B/VIP 服務',
      token: pick('LINE_OA_2_TOKEN', 'LINE_BOT2_TOKEN')
    }
  ];
  return Promise.all(targets.map(async (t) => {
    if (!t.token) return { id: t.id, label: t.label, ok: false, state: 'no_token', status: 0, ms: 0 };
    const started = Date.now();
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 4500);
      const r = await fetch('https://api.line.me/v2/bot/info', {
        headers: { authorization: 'Bearer ' + t.token },
        signal: ac.signal
      });
      clearTimeout(timer);
      let body = null;
      try { body = await r.json(); } catch (e) { body = null; }
      return {
        id: t.id,
        label: t.label,
        ok: r.ok,
        state: r.ok ? 'online' : 'error',
        status: r.status,
        ms: Date.now() - started,
        display: body && body.displayName ? String(body.displayName).slice(0, 40) : null
      };
    } catch (e) {
      return { id: t.id, label: t.label, ok: false, state: 'unreachable', status: 0, ms: Date.now() - started };
    }
  }));
}

/* ---------- 7. 五站前台可達性（輕量 HEAD，不影響前台） ---------- */
async function siteProbe() {
  return Promise.all(SITE_META.map(async (s) => {
    const started = Date.now();
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 4000);
      const r = await fetch('https://' + s.host + '/', { method: 'GET', signal: ac.signal, redirect: 'follow' });
      clearTimeout(timer);
      return { id: s.id, host: s.host, ok: r.ok, status: r.status, ms: Date.now() - started };
    } catch (e) {
      return { id: s.id, host: s.host, ok: false, status: 0, ms: Date.now() - started };
    }
  }));
}

/* ---------- 組裝 ---------- */
function buildSiteCards(traffic, hits, leads, glead, lineTargets) {
  const t = (host) => traffic[host] || {};
  const dec = t('decoration.xingdeng.tw');
  const xd = t('xingdeng.tw');
  const tw = t('tower.xingdeng.tw');
  const ob = t('orbit.xingdeng.tw');
  const vp = t('vip.xingdeng.tw');

  const line580 = (lineTargets || []).find((x) => String(x.id || '').includes('580') || String(x.label || '').includes('580'));
  const towerHitsToday = (hits['/3d'] || 0) + (hits['/'] || 0);

  const cards = [];

  cards.push({
    id: 'decoration',
    metrics: [
      {
        key: 'quote', label: '精裝修／木作估價單', value: num(leads.quote_total), unit: '筆',
        sub: '今日 +' + (num(leads.quote_today) || 0), state: 'live'
      },
      {
        key: 'line', label: 'LINE @580ctuew 點擊', value: line580 ? num(line580.hits) : null, unit: '次',
        sub: line580 ? '最後 ' + String(line580.last_seen || '').slice(0, 10) : '尚無點擊事件資料源',
        state: line580 ? 'live' : 'no_source'
      },
      {
        key: 'pv', label: '站內瀏覽', value: num(dec.pv_all), unit: '次',
        sub: dec.pv_all ? '今日 ' + (num(dec.pv_today) || 0) : '尚未回傳 growth_event',
        state: dec.pv_all ? 'live' : 'no_source'
      }
    ]
  });

  cards.push({
    id: 'xingdeng',
    metrics: [
      {
        key: 'pv', label: 'B2B 總部瀏覽量', value: num(xd.pv_all), unit: '次',
        sub: '今日 ' + (num(xd.pv_today) || 0) + ' ・ 不重複 ' + (num(xd.uniq_all) || 0), state: 'live'
      },
      {
        key: 'partner', label: '統包商夥伴佔比', value: pct(num(leads.named_company) || 0, num(leads.total) || 0), unit: '%',
        sub: '具名企業 ' + (num(leads.named_company) || 0) + ' / ' + (num(leads.total) || 0) + ' 筆名單', state: 'live'
      },
      {
        key: 'dwell', label: '平均停留', value: num(xd.dwell_avg), unit: '秒',
        sub: '樣本 ' + (num(xd.dwell_n) || 0) + ' 筆', state: xd.dwell_avg ? 'live' : 'no_source'
      }
    ]
  });

  cards.push({
    id: 'tower',
    metrics: [
      {
        key: 'pv', label: '3D 展館瀏覽人次', value: num(tw.pv_all), unit: '人次',
        sub: '今日 ' + (num(tw.pv_today) || 0) + ' ・ 不重複 ' + (num(tw.uniq_all) || 0), state: 'live'
      },
      {
        key: 'hits', label: '展館頁面計數（今日）', value: towerHitsToday, unit: '次',
        sub: '/3d ' + (hits['/3d'] || 0) + ' ・ / ' + (hits['/'] || 0), state: 'live'
      },
      {
        key: 'dwell', label: '互動停留時間', value: num(tw.dwell_avg), unit: '秒',
        sub: '樣本 ' + (num(tw.dwell_n) || 0) + ' 筆', state: tw.dwell_avg ? 'live' : 'no_source'
      }
    ]
  });

  cards.push({
    id: 'orbit',
    metrics: [
      {
        key: 'pv', label: '企業方案訪問', value: num(ob.pv_all), unit: '次',
        sub: '今日 ' + (num(ob.pv_today) || 0) + ' ・ 不重複 ' + (num(ob.uniq_all) || 0), state: 'live'
      },
      {
        key: 'quote', label: '人工評估（/quote）請求', value: num(leads.quote_page_total), unit: '筆',
        sub: 'leads.page 含 quote 之累計', state: 'live'
      },
      {
        key: 'dwell', label: '平均停留', value: num(ob.dwell_avg), unit: '秒',
        sub: '樣本 ' + (num(ob.dwell_n) || 0) + ' 筆', state: ob.dwell_avg ? 'live' : 'no_source'
      }
    ]
  });

  const vipLead = glead['vip.xingdeng.tw'] || {};
  cards.push({
    id: 'vip',
    metrics: [
      {
        key: 'pv', label: '高淨值訪客造訪', value: num(vp.pv_all), unit: '次',
        sub: '不重複 ' + (num(vp.uniq_all) || 0) + ' ・ 今日 ' + (num(vp.pv_today) || 0), state: 'live'
      },
      {
        key: 'orb', label: '3D 水晶球互動率', value: pct(num(vp.dwell_n) || 0, num(vp.pv_all) || 0), unit: '%',
        sub: '停留事件 ' + (num(vp.dwell_n) || 0) + ' / 瀏覽 ' + (num(vp.pv_all) || 0), state: vp.pv_all ? 'live' : 'no_source'
      },
      {
        key: 'black', label: '黑卡席位申請', value: num(vipLead.black_card), unit: '筆',
        sub: 'A 級 ' + (num(vipLead.a) || 0) + ' ・ 逾 SLA ' + (num(vipLead.sla_breach) || 0), state: 'live'
      }
    ]
  });

  return cards.map((c) => {
    const meta = SITE_META.find((m) => m.id === c.id);
    return Object.assign({}, meta, { metrics: c.metrics });
  });
}

async function build() {
  const started = Date.now();
  const sql = getSql();
  const out = {
    schema: 'snt-cc-v1',
    generated_at: new Date().toISOString(),
    tz: TZ,
    degraded: [],
    db: { ok: false, ms: 0 }
  };

  if (!sql) {
    out.degraded.push('NEON_CONNECTION_STRING 未設定');
    out.sites = SITE_META.map((m) => ({ ...m, metrics: [] }));
    out.adbot = null; out.saas = null; out.ceo = null;
    out.line = await safe('line', lineHealth, [], 6000).then((r) => r.value);
    out.probe = await safe('probe', siteProbe, [], 6000).then((r) => r.value);
    return out;
  }

  const dbStart = Date.now();
  const ping = await safe('ping', () => sql.query('select 1 as ok'), null, 5000);
  out.db = { ok: ping.ok, ms: Date.now() - dbStart, error: ping.error || null };
  if (!ping.ok) out.degraded.push('Neon 連線失敗：' + (ping.error || 'unknown'));

  const [traffic, hits, leads, glead, lineTargets, adbot, saas, ceo, line, probe] = await Promise.all([
    safe('traffic', () => trafficBlock(sql), {}, 7000),
    safe('hits', () => hitsBlock(sql), {}, 5000),
    safe('leads', () => leadsBlock(sql), {}, 5000),
    safe('growth_lead', () => growthLeadBlock(sql), {}, 5000),
    safe('line_target', () => lineTargetBlock(sql), [], 5000),
    safe('adbot', () => adBotBlock(sql), null, 8000),
    safe('saas', () => saasBlock(sql), null, 6000),
    safe('ceo', () => ceoBlock(sql), null, 6000),
    safe('line', lineHealth, [], 6000),
    safe('probe', siteProbe, [], 6000)
  ]);

  for (const [name, r] of Object.entries({ traffic, hits, leads, growth_lead: glead, line_target: lineTargets, adbot, saas, ceo, line, probe })) {
    if (!r.ok) out.degraded.push(name + '：' + (r.error || 'failed'));
  }

  out.sites = buildSiteCards(traffic.value || {}, hits.value || {}, leads.value || {}, glead.value || {}, lineTargets.value || []);
  out.probe = probe.value || [];
  out.line = line.value || [];

  const ab = adbot.value;
  if (ab) {
    const limit = Number(process.env.AD_BOT_YT_DAILY_UNITS || 8000);
    const used = ab.quota ? Number(ab.quota.youtube_units || 0) : 0;
    const p = pct(used, limit) || 0;
    out.adbot = {
      quota: {
        used, limit, pct: p,
        state: p >= 90 ? 'critical' : p >= 70 ? 'warn' : 'ok',
        day: ab.quota ? ab.quota.day : null,
        updated_at: ab.quota ? ab.quota.updated_at : null,
        line_pushes: ab.quota ? ab.quota.line_pushes : 0
      },
      assets: ab.assets || [],
      tasks: ab.tasks || [],
      dispatch: ab.dispatch || [],
      logs: ab.logs || [],
      counts: ab.counts || {}
    };
  }

  const sb = saas.value;
  if (sb) {
    const byAmount = {};
    for (const p of sb.payments || []) byAmount[Number(p.amount)] = p;
    out.saas = {
      trials: sb.trials || {},
      tiers: TIERS.map((t) => {
        const hit = byAmount[t.price] || {};
        return { name: t.name, price: t.price, orders: Number(hit.orders || 0), events: Number(hit.events || 0), revenue: Number(hit.orders || 0) * t.price };
      }),
      events: sb.events || []
    };
  }

  out.ceo = ceo.value || null;

  const totalPv = (traffic.value ? Object.values(traffic.value).reduce((a, r) => a + Number(r.pv_all || 0), 0) : 0);
  const totalPvToday = (traffic.value ? Object.values(traffic.value).reduce((a, r) => a + Number(r.pv_today || 0), 0) : 0);
  out.kpi = {
    pv_total: totalPv,
    pv_today: totalPvToday,
    leads_total: num((leads.value || {}).total),
    leads_today: num((leads.value || {}).quote_today),
    quote_total: num((leads.value || {}).quote_total),
    trials_active: num((sb || {}).trials ? sb.trials.active_trial : null),
    sites_up: (probe.value || []).filter((x) => x.ok).length,
    sites_total: SITE_META.length
  };

  out.ms = Date.now() - started;
  return out;
}

module.exports = { build, SITE_META, TIERS };

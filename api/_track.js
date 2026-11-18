/* POST /api/track — 匿名流量事件收口（不收集個資）
   GET  /api/track?days=7 — 成效彙總（需 X-CC-Key）
   對接既有 growth_event 表結構：id, vid, ts, site, type, path, dwell, meta(jsonb)
   無 DB 時降級為記憶體計數（僅供即時觀察，重啟即清空）。
*/
'use strict';

const CC_KEY = 'c0430001866f79d9fcdfdbbd8b75bed967ffe86007b78603648db586cf0d4866';
const NURL = process.env.NEON_CONNECTION_STRING || process.env.DATABASE_URL || '';

let _sql = null;
function neon() {
  if (!NURL) return null;
  try { if (!_sql) _sql = require('@neondatabase/serverless').neon(NURL); return _sql; } catch { return null; }
}

const MEM = { events: [], bySite: {}, byEvent: {}, bySource: {} };

function readBody(req) {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    const c = [];
    req.on('data', x => c.push(x));
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(c).toString('utf8') || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-cc-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  /* ---------- 寫入 ---------- */
  if (req.method === 'POST') {
    let b = {};
    try { b = await readBody(req); } catch { return res.status(400).json({ ok: false }); }

    const site = clip(b.site, 24) || 'unknown';
    const type = clip(b.event, 40) || 'unknown';
    const path = clip(b.path, 200);
    const vid = clip(b.vid, 40);
    const dwell = Number(b.dwell) || 0;
    const meta = {
      title: clip(b.title, 120),
      ref: clip(b.ref, 300),
      utm_source: clip(b.utm_source, 60),
      utm_medium: clip(b.utm_medium, 60),
      utm_campaign: clip(b.utm_campaign, 80),
      utm_content: clip(b.utm_content, 80),
      landing: clip(b.landing, 200),
      target: clip(b.target, 200)
    };

    const sql = neon();
    if (sql) {
      try {
        await sql`INSERT INTO growth_event (vid, ts, site, type, path, dwell, meta)
          VALUES (${vid}, now(), ${site}, ${type}, ${path}, ${dwell}, ${JSON.stringify(meta)}::jsonb)`;
        return res.status(200).json({ ok: true, backend: 'neon' });
      } catch (e) {
        /* 降級記憶體，不中斷前端 */
      }
    }

    MEM.events.push({ site, type, path, vid, meta, at: Date.now() });
    if (MEM.events.length > 5000) MEM.events.shift();
    MEM.bySite[site] = (MEM.bySite[site] || 0) + 1;
    MEM.byEvent[type] = (MEM.byEvent[type] || 0) + 1;
    const src = meta.utm_source || 'direct';
    MEM.bySource[src] = (MEM.bySource[src] || 0) + 1;
    return res.status(200).json({ ok: true, backend: 'memory' });
  }

  /* ---------- 讀取彙總（管理端） ---------- */
  if (req.method === 'GET') {
    const key = String(req.headers['x-cc-key'] || '').trim().toLowerCase();
    if (key !== CC_KEY) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const days = Math.min(90, Math.max(1, Number(new URL(req.url, 'http://x').searchParams.get('days')) || 7));
    const sql = neon();

    if (sql) {
      try {
        const bySite = await sql`SELECT site, count(*)::int AS n FROM growth_event WHERE ts > now() - (${days} || ' days')::interval GROUP BY site ORDER BY n DESC`;
        const byEvent = await sql`SELECT type AS event, count(*)::int AS n FROM growth_event WHERE ts > now() - (${days} || ' days')::interval GROUP BY type ORDER BY n DESC`;
        const bySource = await sql`SELECT COALESCE(NULLIF(meta->>'utm_source',''),'direct') AS src, count(*)::int AS n FROM growth_event WHERE ts > now() - (${days} || ' days')::interval GROUP BY 1 ORDER BY n DESC LIMIT 20`;
        const byDay = await sql`SELECT to_char(ts AT TIME ZONE 'Asia/Taipei','YYYY-MM-DD') AS d, count(*)::int AS n FROM growth_event WHERE ts > now() - (${days} || ' days')::interval GROUP BY 1 ORDER BY 1`;
        const topPages = await sql`SELECT path, count(*)::int AS n FROM growth_event WHERE ts > now() - (${days} || ' days')::interval AND type='page_view' GROUP BY 1 ORDER BY n DESC LIMIT 15`;
        const byCampaign = await sql`SELECT COALESCE(NULLIF(meta->>'utm_campaign',''),'(none)') AS c, count(*)::int AS n FROM growth_event WHERE ts > now() - (${days} || ' days')::interval GROUP BY 1 ORDER BY n DESC LIMIT 15`;
        let leads = [{ n: null }];
        try { leads = await sql`SELECT count(*)::int AS n FROM leads WHERE at > now() - (${days} || ' days')::interval`; } catch (e) {}
        return res.status(200).json({ ok: true, backend: 'neon', days, bySite, byEvent, bySource, byDay, topPages, byCampaign, leads: leads[0]?.n ?? null });
      } catch (e) {
        return res.status(200).json({ ok: false, backend: 'neon', error: String(e.message).slice(0, 160) });
      }
    }

    return res.status(200).json({
      ok: true, backend: 'memory', days,
      bySite: Object.entries(MEM.bySite).map(([site, n]) => ({ site, n })),
      byEvent: Object.entries(MEM.byEvent).map(([event, n]) => ({ event, n })),
      bySource: Object.entries(MEM.bySource).map(([src, n]) => ({ src, n })),
      total: MEM.events.length
    });
  }

  return res.status(405).json({ ok: false, error: 'GET or POST only' });
};

'use strict';
/* SNT v6.0 — 全站指令廣播（Fleet Broadcast）
   POST /api/health?mode=broadcast
   body: { command:string, sites?:string[], kind?:string, dryRun?:boolean }

   設計原則：
   1. 門禁與監控室一致（X-CC-Key）。
   2. 一次對五站所有 AI／機器人下達同一道指令 → 逐站寫入 ad_bot_tasks（Omni-Ad Bot 的既有工作佇列）。
   3. 冪等性：idem_key = sha256(site|kind|command|bucket)，同一指令在 10 分鐘窗口內重複送出不會重複建立任務。
   4. 逐站獨立 try/catch：任一站失敗不影響其他站，回傳每站接收狀態。
   5. 只寫入 ad_bot_tasks / ad_bot_logs，不改動前台任何資料。 */

const crypto = require('crypto');

const CC_KEY = 'c0430001866f79d9fcdfdbbd8b75bed967ffe86007b78603648db586cf0d4866';

const SITES = [
  { id: 'decoration', host: 'decoration.xingdeng.tw', name: '光曜星閣・木作統包' },
  { id: 'xingdeng', host: 'xingdeng.tw', name: 'SNT 光曜星樞・數位總部' },
  { id: 'tower', host: 'tower.xingdeng.tw', name: '星閣 3D 展館' },
  { id: 'orbit', host: 'orbit.xingdeng.tw', name: '星軌企業總部' },
  { id: 'vip', host: 'vip.xingdeng.tw', name: 'CosmoSphere 黑卡會所' }
];

const ALLOWED_KINDS = ['full', 'card', 'script', 'copy', 'audit', 'pause', 'resume'];

function rateLimit(req, res, limit) {
  const ip = String((req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.headers['x-real-ip'] || 'unknown').slice(0, 64);
  const now = Date.now();
  const bucket = (globalThis.__bcRate = globalThis.__bcRate || new Map());
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

function getSql() {
  const url = process.env.NEON_CONNECTION_STRING || process.env.DATABASE_URL;
  if (!url) return null;
  try {
    const { neon } = require('@neondatabase/serverless');
    return neon(url);
  } catch (e) { return null; }
}

function idemFor(site, kind, command) {
  // 10 分鐘時間桶：同一指令在窗口內重送不會重複建任務
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
  return crypto.createHash('sha256').update(`${site}|${kind}|${command}|${bucket}`).digest('hex');
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,x-cc-key');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const given = String(req.headers['x-cc-key'] || '').trim().toLowerCase();
  if (given !== CC_KEY) return res.status(401).json({ error: 'unauthorized' });
  if (!rateLimit(req, res, 10)) return res.status(429).json({ error: 'rate_limited', message: '廣播過於頻繁，請稍候一分鐘。' });

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

  const command = String(body.command || '').trim().slice(0, 500);
  if (!command) return res.status(400).json({ error: 'command_required', message: '請輸入要廣播的指令內容。' });

  const kind = ALLOWED_KINDS.includes(String(body.kind)) ? String(body.kind) : 'full';
  const dryRun = body.dryRun === true;
  const wanted = Array.isArray(body.sites) && body.sites.length
    ? SITES.filter((s) => body.sites.includes(s.id))
    : SITES;

  const sql = getSql();
  if (!sql) {
    return res.status(200).json({
      ok: false,
      error: 'no_db',
      message: '資料庫未連線，無法派發指令。',
      results: wanted.map((s) => ({ site: s.id, name: s.name, state: 'failed', error: 'no_db' }))
    });
  }

  const results = [];
  let accepted = 0, duplicated = 0, failed = 0;

  for (const s of wanted) {
    const idem = idemFor(s.id, kind, command);
    const started = Date.now();
    try {
      if (dryRun) {
        results.push({ site: s.id, name: s.name, state: 'dry_run', idem_key: idem.slice(0, 12), ms: 0 });
        continue;
      }

      // 冪等檢查：同 idem_key 已存在則不重複建立
      const existing = await sql.query(
        `select id, status from ad_bot_tasks where idem_key = $1 limit 1`,
        [idem]
      );
      if (existing.length) {
        duplicated += 1;
        results.push({
          site: s.id, name: s.name, state: 'duplicate',
          task_id: existing[0].id, status: existing[0].status,
          idem_key: idem.slice(0, 12), ms: Date.now() - started
        });
        continue;
      }

      const payload = {
        source: 'command-center-broadcast',
        command,
        kind,
        issued_at: new Date().toISOString(),
        issued_by: 'AI CEO / Command Center'
      };

      const rows = await sql.query(
        `insert into ad_bot_tasks (idem_key, site, kind, status, payload, attempts, max_attempts, scheduled_at)
         values ($1, $2, $3, 'queued', $4::jsonb, 0, 3, now())
         returning id, status, scheduled_at`,
        [idem, s.id, kind, JSON.stringify(payload)]
      );

      // 稽核日誌（失敗不影響任務建立）
      try {
        await sql.query(
          `insert into ad_bot_logs (site, level, event, detail, units)
           values ($1, 'info', 'broadcast_queued', $2::jsonb, 0)`,
          [s.id, JSON.stringify({ command, kind, task_id: rows[0].id })]
        );
      } catch (e) { /* 日誌失敗不阻斷 */ }

      accepted += 1;
      results.push({
        site: s.id, name: s.name, state: 'accepted',
        task_id: rows[0].id, status: rows[0].status,
        scheduled_at: rows[0].scheduled_at,
        idem_key: idem.slice(0, 12), ms: Date.now() - started
      });
    } catch (e) {
      failed += 1;
      results.push({
        site: s.id, name: s.name, state: 'failed',
        error: String((e && e.message) || e).slice(0, 120),
        idem_key: idem.slice(0, 12), ms: Date.now() - started
      });
    }
  }

  return res.status(200).json({
    ok: failed === 0,
    dry_run: dryRun,
    command,
    kind,
    summary: { total: wanted.length, accepted, duplicated, failed },
    results,
    at: new Date().toISOString()
  });
};

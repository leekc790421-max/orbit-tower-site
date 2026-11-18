/* POST /api/pricing — 隱蔽式動態物調定價 API（公開端點，只回售價）
   GET  /api/pricing — 全階套餐矩陣（不含成本）
   ----------------------------------------------------------------------------
   v7.1 整合：所有計算委派 _snt-core.js（與 LINE 機器人、Concierge、AI CEO 終端
   共用同一份 PRICING_BASE 與 calculateDynamicQuote）。

   支援模式（全部併入本檔，不新增 Serverless Function）：
   - GET              → 全階矩陣（Personal / LINE_22W / Business / Store /
                        Professional / Enterprise / Custom）+ SaaS 三階
   - POST mode=plan   → 單一套餐報價
   - POST mode=stack  → 無限擴編疊加（基礎方案 + L-01~L-05 + 其他模組 + extra_hours）
   - POST mode=custom → 純工時客變報價
   - POST mode=matrix → 全階矩陣
   - POST mode=strategist → 本地策略引擎試跑（後台驗證語感用）

   設計原則
   1. 成本、毛利結構、每小時費率永不回傳；公開路徑走 publicQuote() / quoteStack()
      白名單，杜絕欄位外洩。
   2. 物調係數由後端參數控制（1.00~1.03），前端不可指定任意值。
   3. 管理端（X-CC-Key）可讀取成本稽核視圖，供總部內部核價。
*/
'use strict';

const CORE = require('./_snt-core.js');

const CC_KEY = 'c0430001866f79d9fcdfdbbd8b75bed967ffe86007b78603648db586cf0d4866'; // SHA-256(700045Kc)

function isAdmin(req) {
  const k = String(req.headers['x-cc-key'] || '').trim().toLowerCase();
  return !!k && k === CC_KEY;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    const c = [];
    req.on('data', x => c.push(x));
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(c).toString('utf8') || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const PLAN_KEYS = Object.keys(CORE.PRICING_BASE);

/* 模組目錄（公開：只有名稱與說明，無工時、無成本） */
function moduleCatalog() {
  return Object.keys(CORE.ALL_ADDONS).map(code => {
    const m = CORE.ALL_ADDONS[code];
    return { code, name: m.name, desc: m.desc || '', group: CORE.LINE_MODULES[code] ? 'LINE' : 'ADDON' };
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-cc-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method === 'OPTIONS') return res.status(204).end();

  /* ---------- GET：全階矩陣（公開，不含成本） ---------- */
  if (req.method === 'GET') {
    const inf = CORE.clampInflation(new URL(req.url, 'http://x').searchParams.get('inflation'));
    const out = {
      ok: true,
      inflation: inf,
      vat_rate: CORE.VAT_RATE,
      saas_tiers: CORE.SAAS_TIERS,
      plans: PLAN_KEYS.map(k => CORE.publicQuote(k, inf)),
      modules: moduleCatalog()
    };
    /* 管理端稽核視圖：含成本與實得毛利（僅限 X-CC-Key） */
    if (isAdmin(req)) {
      out.audit = PLAN_KEYS.map(k => CORE.auditQuote(k, inf));
    }
    return res.status(200).json(out);
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'GET or POST only' });

  let b = {};
  try { b = await readBody(req); } catch { return res.status(400).json({ ok: false, error: 'json required' }); }

  const mode = String(b.mode || 'plan').toLowerCase();
  const inf = CORE.clampInflation(b.inflation);

  /* ---------- 單一套餐報價 ---------- */
  if (mode === 'plan') {
    const key = String(b.plan || '').trim();
    if (!CORE.PRICING_BASE[key]) {
      return res.status(400).json({ ok: false, error: 'unknown_plan', plans: PLAN_KEYS });
    }
    return res.status(200).json({ ok: true, mode: 'plan', ...CORE.publicQuote(key, inf) });
  }

  /* ---------- 無限擴編疊加（基礎方案 + 模組 + 額外工時） ---------- */
  if (mode === 'stack') {
    const basePlan = String(b.base_plan || b.plan || 'Business').trim();
    if (!CORE.PRICING_BASE[basePlan]) {
      return res.status(400).json({ ok: false, error: 'unknown_base_plan', plans: PLAN_KEYS });
    }
    const modules = Array.isArray(b.modules) ? b.modules : [];
    const unknown = modules
      .map(m => String(m).trim().toUpperCase())
      .filter(m => !CORE.ALL_ADDONS[m]);
    if (unknown.length) {
      return res.status(400).json({
        ok: false, error: 'unknown_modules', unknown,
        available: Object.keys(CORE.ALL_ADDONS)
      });
    }
    const q = CORE.quoteStack(basePlan, modules, b.extra_hours, inf);
    return res.status(200).json({ ok: true, mode: 'stack', ...q });
  }

  /* ---------- 純工時客變報價 ---------- */
  if (mode === 'custom') {
    const hours = Math.max(0, Number(b.hours) || 0);
    const extra = Math.max(0, Number(b.extra_hours) || 0);
    const totalHours = hours + extra;
    if (!totalHours) {
      return res.status(400).json({ ok: false, error: 'hours_required', note: '請提供 hours（客變總工時）或 extra_hours' });
    }
    const cost = totalHours * CORE.HOURLY_COST;
    const exVat = CORE.priceFromCost(cost, inf);
    const vat = Math.round(exVat * CORE.VAT_RATE);
    return res.status(200).json({
      ok: true,
      mode: 'custom',
      total_hours: Math.round(totalHours * 10) / 10,
      inflation: Number(inf.toFixed(2)),
      price_ex_vat: exVat,
      vat,
      price_incl_vat: exVat + vat,
      currency: 'TWD'
    });
  }

  /* ---------- 全階矩陣 ---------- */
  if (mode === 'matrix') {
    return res.status(200).json({
      ok: true,
      mode: 'matrix',
      inflation: inf,
      saas_tiers: CORE.SAAS_TIERS,
      plans: PLAN_KEYS.map(k => CORE.publicQuote(k, inf)),
      modules: moduleCatalog()
    });
  }

  /* ---------- 本地策略引擎試跑（供後台驗證語感，不含成本） ---------- */
  if (mode === 'strategist') {
    const msg = String(b.message || '').slice(0, 400);
    return res.status(200).json({
      ok: true,
      mode: 'strategist',
      inflation: inf,
      reply: CORE.runLocalStrategistEngine(msg, { inflation: inf })
    });
  }

  return res.status(400).json({ ok: false, error: 'mode must be plan|stack|custom|matrix|strategist' });
};

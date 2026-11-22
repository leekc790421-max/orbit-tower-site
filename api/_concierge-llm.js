/* POST /api/concierge-llm — 站內 AI 接待顧問的 LLM 代理（金鑰集中於本專案 env）
   ----------------------------------------------------------------------------
   v7 整合：三層切換（L1 免費 LLM 閘道 → L2 Z.ai → L3 本地規則引擎）全部委派
   _snt-core.js，與 @580ctuew 總部 LINE 機器人、/admin AI CEO 終端共用同一套
   語感與定價邏輯。任何一處改語感或價格，只改核心一檔。

   設計：金鑰永不外流；人格與事實由核心的 buildSystemPrompt 定義，此處只做
   站點對應、傳輸與供應商調度。
*/

'use strict';

const CORE = require('./_snt-core.js');

/* 站點 → 核心 site key（核心已內建 hq/lumi/decoration/xingdeng/tower/orbit/vip） */
const SITE_ALIAS = {
  decoration: 'decoration',
  xingdeng: 'xingdeng',
  tower: 'tower',
  orbit: 'orbit',
  vip: 'vip',
  hq: 'hq',
  lumi: 'lumi'
};

/* 各站 CTA（前端按鈕用，非 LLM 生成） */
const SITE_CTA = {
  decoration: { label: '預約免費丈量', url: 'https://decoration.xingdeng.tw/contact' },
  xingdeng:   { label: '申請 14 天免費試用', url: 'https://xingdeng.tw/pricing' },
  tower:      { label: '進入 3D 互動展館', url: 'https://tower.xingdeng.tw/3d' },
  orbit:      { label: '取得標準化評估', url: 'https://orbit.xingdeng.tw/contact' },
  vip:        { label: '申請 VIP 席位', url: 'https://vip.xingdeng.tw/apply' }
};

const SITE_LINE = {
  decoration: { id: '@580ctuew', label: 'LINE 木作諮詢' },
  xingdeng:   { id: '@580ctuew', label: 'LINE 企業諮詢' },
  tower:      { id: '@580ctuew', label: 'LINE 企業諮詢' },
  orbit:      { id: '@580ctuew', label: 'LINE 企業諮詢' },
  vip:        { id: '@580ctuew', label: 'LINE 企業諮詢' }
};

function readBody(req) {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    const c = [];
    req.on('data', x => c.push(x));
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(c).toString('utf8') || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method === 'OPTIONS') return res.status(204).end();

  /* GET：供應商健康探針（不洩漏金鑰，只回布林） */
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, providers: CORE.providerStatus() });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let b = {};
  try { b = await readBody(req); } catch { return res.status(400).json({ error: 'json required' }); }

  const rawSite = String(b.site || 'xingdeng').toLowerCase();
  const site = SITE_ALIAS[rawSite] || 'xingdeng';
  const message = String(b.message || '').trim().slice(0, 800);
  if (!message) return res.status(400).json({ error: 'empty_message' });

  const history = Array.isArray(b.history)
    ? b.history
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-8)
        .map(m => ({ role: m.role, content: m.content.slice(0, 1200) }))
    : [];

  const inf = CORE.clampInflation(b.inflation != null ? b.inflation : process.env.SNT_INFLATION);

  const out = await CORE.generateSmartResponse(
    [...history, { role: 'user', content: message }],
    { inflation: inf, site }
  );

  return res.status(200).json({
    ok: true,
    site,
    reply: String(out.reply).slice(0, 1600),
    provider: out.engine,
    inflation: inf,
    cta: SITE_CTA[site] || SITE_CTA.xingdeng,
    line: (() => {
      const l = SITE_LINE[site] || SITE_LINE.xingdeng;
      return { id: l.id, label: l.label, url: `https://line.me/R/ti/p/${l.id}` };
    })(),
    attempts: out.attempts
  });
};

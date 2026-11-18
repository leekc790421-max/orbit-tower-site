'use strict';
/* SNT v6.0 — LINE 總部 AI CEO 語感層（@559julyu 光曜星樞 SNT 總部 / @580ctuew 光曜星稜）
   ----------------------------------------------------------------------------
   v7 整合：所有定價、語感、三層 LLM 切換全部委派給 _snt-core.js（雙軌智能核心）。
   本檔只負責：OA 身分、意圖偵測、LINE 發送、歡迎語。

   設計原則
   1. 拒絕機械化與罐頭回覆：不得出現「你好我是機器人」「請輸入 1 查詢」等制式對話。
   2. 語感＝高階經理人：富含商業思維、俐落，具中彰投苗新木作行情與數位行銷實戰經驗。
   3. 報價一律經後端定價引擎（物調係數 × 35% 毛利鎖定 × ROUND(-3)），成本與毛利永不外流。
   4. 三層無縫切換：L1 免費 LLM 閘道 → L2 Z.ai → L3 本地規則引擎（永不斷線）。
*/

const CORE = require('./_snt-core.js');

/* ---------- 兩個 OA 的身分 ---------- */
const OAS = {
  hq: {
    id: '@559julyu',
    name: '光曜星樞 SNT 總部',
    role: '對外、對內唯一指定總部與自動化對口',
    tokenEnv: ['LINE_BOT1_TOKEN', 'LINE_CHANNEL_TOKEN', 'LINE_CHANNEL_ACCESS_TOKEN']
  },
  lumi: {
    id: '@580ctuew',
    name: '光曜星稜',
    role: '中部木作精裝修獲客端',
    tokenEnv: ['LINE_BOT2_TOKEN']
  }
};

function tokenFor(oaKey) {
  const oa = OAS[oaKey] || OAS.hq;
  for (const k of oa.tokenEnv) {
    if (process.env[k]) return process.env[k];
  }
  return '';
}

/* ---------- 意圖偵測（供 log 與規則引擎選路） ---------- */
function detectIntent(text) {
  const t = String(text || '');
  if (/(統包|包商|工班|同業|合作|代理|分銷|派單|接單|B2B|夥伴)/i.test(t)) return 'b2b';
  if (/(多少錢|報價|價格|費用|預算|估價|一坪|每尺|行情|算一下|試算|授權|買斷)/i.test(t)) return 'price';
  if (/(裝修|木作|櫃|衣櫃|系統櫃|天花板|地板|設計|丈量|施工|工期)/i.test(t)) return 'decoration';
  if (/(訂閱|方案|試用|SaaS|系統|自動化|廣告|獲客|名單|AI)/i.test(t)) return 'saas';
  if (/(應徵|工作|職缺|徵才)/i.test(t)) return 'hiring';
  return 'general';
}

/* ---------- 情境規則回覆（委派核心，僅補 hiring 與 lumi 專屬語氣） ---------- */
function ruleReply(intent, text, oaKey) {
  if (intent === 'hiring') {
    return '我們找的是能自己把問題定義清楚的人，不是等指令的人。\n\n目前以工程與成長兩個方向為主。你把擅長的部分和作品傳過來，我看過就直接回你適不適合，不會讓你空等。';
  }

  /* lumi（@580ctuew）是木作獲客端：一律走裝修／行情語氣 */
  if (oaKey === 'lumi') {
    if (intent === 'price' || intent === 'decoration') {
      return [
        '中部木作目前行情：收納櫃 $5,000–12,000／尺、衣櫃 $6,200–7,500／尺、系統櫃高櫃 $4,500–9,000／尺。實際落在哪個區間，取決於板材、五金與現場條件。',
        '',
        '你把坪數、想做的櫃體類型傳給我，我直接幫你抓一個可執行的預算帶；要精準就得現場丈量，丈量免費。'
      ].join('\n');
    }
    if (intent === 'b2b') {
      return '這裡是光曜星稜，中部木作與精裝修的對口。\n\n我們手上的案源會依區域與工種分派，木作、系統櫃、全室統包各有對應工班。你目前主力接哪一區、手邊有幾組人？直接說，我判斷接不接得上。';
    }
    return '這裡是光曜星稜，中部木作與精裝修的對口。\n\n你可以直接說想做什麼空間、大概幾坪，我先幫你把預算帶抓出來；要真的做再安排免費丈量。';
  }

  /* hq：完全交給核心的本地策略引擎（六情境 + 預設開場白） */
  return CORE.runLocalStrategistEngine(text, { inflation: CORE.clampInflation(process.env.SNT_INFLATION) });
}

/* ---------- 跟進（follow）歡迎語：非罐頭 ---------- */
function welcomeText(oaKey) {
  if (oaKey === 'lumi') {
    return '光曜星稜，中部木作與精裝修的對口。\n\n我們的做法很直接：先確認空間條件與預算帶，再談櫃體形式，最後才進丈量與報價——這樣不會出現「做了才發現超預算」。\n\n你手上目前是哪一種案子？新成屋、老屋翻修，還是單一空間改造？';
  }
  return '光曜星樞 SNT 總部。\n\n我們把「木作交付」與「數位獲客」放在同一套系統裡跑：前端用 AI 接單與分流，後端用標準化報價與派單把案子落地。\n\n你現在是想找客人，還是想把接單流程自動化？直接說，我幫你判斷。';
}

/* ---------- 對外主入口：三層無縫切換 ---------- */
async function reply({ oaKey, text, history }) {
  const intent = detectIntent(text);
  const inf = CORE.clampInflation(process.env.SNT_INFLATION);

  const msgs = [
    ...(Array.isArray(history) ? history : []),
    { role: 'user', content: String(text || '') }
  ];

  const out = await CORE.generateSmartResponse(msgs, { inflation: inf, site: oaKey === 'lumi' ? 'lumi' : 'hq' });

  /* 若 LLM 全掛，核心已回傳 local_strategist；此處僅在 lumi 情境補上專屬語氣 */
  if (out.engine === 'local_strategist' && oaKey === 'lumi') {
    return { text: ruleReply(intent, text, 'lumi'), provider: 'local_strategist', intent, attempts: out.attempts };
  }

  return { text: out.reply, provider: out.engine, intent, attempts: out.attempts };
}

/* ---------- LINE 發送 ---------- */
async function lineReply(replyToken, text, oaKey) {
  const token = tokenFor(oaKey);
  if (!token) return { ok: false, error: 'no_token' };
  try {
    const r = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ replyToken, messages: [{ type: 'text', text: String(text).slice(0, 4900) }] }),
      signal: AbortSignal.timeout(8000)
    });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, error: String(e.message).slice(0, 60) };
  }
}

module.exports = {
  OAS, tokenFor, detectIntent, ruleReply, welcomeText, reply, lineReply,
  CEO_PERSONA: CORE.buildSystemPrompt({ site: 'hq' })
};

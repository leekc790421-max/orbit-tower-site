/* 雲端辦公室・值勤狀態 API（GET /api/roster）
   只讀探測：env 有無金鑰＋各家 API 實測健康度，60 秒記憶體快取。
   status: online 在崗 / api_disabled 鑰匙有但未啟用 / no_key 待配鑰 / dev_tool 開發工具 / honorary 名譽職員
   本檔不寫入、不重啟、不觸碰任何現有路由。 */
const sysText = (v) => String(v || '');
let cache = { at: 0, data: null };

async function probe(name, url, headers, expectOk) {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 4500);
    const r = await fetch(url, { headers: headers || {}, signal: ac.signal });
    clearTimeout(t);
    if (r.ok) return 'online';
    if (r.status === 403) return 'api_disabled';
    if (r.status === 401) return 'no_key';
    return expectOk || 'offline';
  } catch { return 'offline'; }
}

function crewDef() {
  const G = process.env.GEMINI_API_KEY, X = process.env.GROK_API_KEY;
  const L = process.env.LLAMA_API_URL, LK = process.env.LLAMA_API_KEY || process.env.LLAMA_ALLOW_NOAUTH;
  return [
    /* ===== 5F・決策層 ===== */
    { id:'zai', name:'Z.ai (GLM)', role:'數位幕僚長・AI 戰長主力・多語對話', floors:['5F'], kind:'staff', prepared: !!(process.env.ZAI_API_KEY || process.env.Z_AI_API_KEY), probeUrl: 'https://api.z.ai/api/paas/v4/models', header: () => ({ Authorization: 'Bearer ' + sysText(process.env.ZAI_API_KEY || process.env.Z_AI_API_KEY) }), note:'派任:AI 戰長主力(strategist.js)+ CEO 對話備援。模型 glm-4.5-flash。每日 09:00 巡站後若 Z.ai 在線,自動接客戶對話。' },
    { id:'gemini', name:'Google Gemini', role:'研發架構・程式智庫備援', floors:['5F','3F'], kind:'staff', prepared: !!G, probeUrl: G ? 'https://generativelanguage.googleapis.com/v1beta/models?key='+encodeURIComponent(G) : null, note:'派任:研發線(dev)主力。Z.ai 失敗時備援。待創辦人補 GEMINI_API_KEY 即激活。' },
    { id:'mulerun', name:'MuleRun（已由 Z.ai 接任）', role:'數位幕僚長（退休）', floors:['5F'], kind:'honorary', status:'retired', note:'2026-11-09 由 Z.ai 接任。保留編制供歷史查詢。' },

    /* ===== 3F・營運層 ===== */
    { id:'qwenwork', name:'QwenWork 千問办公', role:'行政營運・每日巡站值星', floors:['3F','雲端排程'], kind:'staff', status:'online', note:'派任:每日 09:00 自動跑 /api/health?mode=ceo-check,產生巡站報告。數據診斷 + 排程值星。' },
    { id:'rule', name:'SNT 規則引擎', role:'門面戰略長保底・永不中斷線', floors:['1F'], kind:'staff', status:'online', model:'snt-rule-engine-v1', note:'派任:Z.ai 掛掉時即刻接手 AI 戰長。任何情況都在線,合規保底。' },
    { id:'meta', name:'Meta Llama（OpenAI 相容端）', role:'資料分析・私部署出口', floors:['3F'], kind:'staff', prepared: !!(L && LK), probeUrl: L ? L.replace(/\/+$/,'')+'/models' : null, note:'派任:財會稽核線(finance)。需 Llama/Ollama/vLLM 端點,目前待業主提供。' },
    { id:'radar', name:'SEO 健康雷達', role:'3F Content Engine・每日 SEO 巡檢', floors:['3F'], kind:'staff', status:'online', note:'派任:每日巡檢四站 title/hreflang/JSON-LD/canonical。僅自查合法邊界,不自動改。' },
    { id:'manus', name:'Manus', role:'政務代班・CEO 交接執行', floors:['3F 備援'], kind:'honorary', status:'honorary', note:'派任:CEO 不在時接手執行交接文件（download/handover-2026-11-07.md）。待接 API/Webhook 即轉正式編制。' },

    /* ===== 4F・行銷層 ===== */
    { id:'grok', name:'xAI Grok', role:'社群爆點・廣播機器人文案大腦', floors:['4F'], kind:'staff', prepared: !!X, probeUrl: X ? 'https://api.x.ai/v1/models' : null, header: () => ({ Authorization: 'Bearer '+sysText(process.env.GROK_API_KEY) }), note:'派任:廣播推播機器人背後的文案產生。待業主提供 xai- 金鑰即激活。' },
    { id:'broadcast', name:'廣播推播機器人', role:'4F 分眾推送・新文章/優惠', floors:['4F'], kind:'staff', status:'online', note:'派任:新文章/優惠推送。沙箱預演,掛 LINE_ADMIN_GROUP_ID 即走官方 push。' },
    { id:'adsbridge', name:'廣告轉換橋', role:'4F・Meta CAPI／GA4 伺服器端回傳', floors:['4F'], kind:'staff', status:'online', note:'派任:廣告回傳。埋點上線(site.js),掛 Meta Pixel ID 即雙橋生效。' },

    /* ===== 2F・業務層 ===== */
    { id:'funnel', name:'名單分流機器人', role:'2F 商業情報・AIDA 熱度分流', floors:['2F','1F'], kind:'staff', status:'online', note:'派任:leads 入池即打分分流(A/B/C 級)。本地規則評分,零金鑰恆在線。' },
    { id:'sequence', name:'排程序列機器人', role:'2F 業務跟進・EDM/LINE 養客序列', floors:['2F'], kind:'staff', status:'online', note:'派任:名單進來後 24h/3d/7d 自動 follow-up。掛 RESEND/LINE 鑰即轉真發送。' },

    /* ===== 1F・門市層 ===== */
    { id:'omo', name:'OMO 門市機器人', role:'1F 迎賓・線下 QR 接合', floors:['1F'], kind:'staff', status:'online', note:'派任:線下活動 QR 接合,深度連結 + 線下留單直入漏斗。' },

    /* ===== 產線・開發 ===== */
    { id:'copilot', name:'GitHub Copilot', role:'開發職（IDE 工具,非線上客服）', floors:['產線'], kind:'dev_tool', status:'dev_tool', note:'派任:程式開發用,非運行時。其運行時職務由 Z.ai/Gemini 鏈代板。' },
  ];
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  const now = Date.now();
  if (!cache.data || now - cache.at > 60000) {
    const defs = crewDef();
    const probed = await Promise.all(defs.map(async (c) => {
      if (c.status) return c;
      if (!c.prepared || !c.probeUrl) return { ...c, status: 'no_key' };
      const st = await probe(c.id, c.probeUrl, c.header ? c.header() : {});
      return { ...c, status: st };
    }));
    const online = probed.filter(c => c.status === 'online').length;
    cache = { at: now, data: { as_of: new Date().toISOString(), on_duty: online + '/' + probed.length, crew: probed } };
  }
  if (req.query && req.query.format === 'html') {
    const icon = { online:'🟢', no_key:'🟡', api_disabled:'🟠', dev_tool:'🛠', honorary:'⚪', offline:'🔴' };
    const rows = cache.data.crew.map(c => `<tr><td>${icon[c.status]||'⚪'} ${c.name}</td><td>${c.role}</td><td>${(c.floors||[]).join(' ')}</td><td><code>${c.status}</code></td><td>${c.note||''}</td></tr>`).join('');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><meta charset="utf-8"><title>值勤表・雲端辦公室</title><style>body{font:15px/1.8 system-ui;background:#0b0d12;color:#e8e6df;padding:32px}table{border-collapse:collapse}td,th{border-bottom:1px solid #2a2f3a;padding:6px 14px 6px 0}code{color:#d4af37}</style><h1>☁ 雲端辦公室・即時值勤表 ${cache.data.on_duty} 在線</h1><p>每 60 秒自動更新｜探測不經後端重啟</p><table><tr><th>職員</th><th>職務</th><th>樓層</th><th>狀態</th><th>備註</th></tr>${rows}</table>`);
    return;
  }
  res.status ? res.status(200).json(cache.data) : res.end(JSON.stringify(cache.data));
};

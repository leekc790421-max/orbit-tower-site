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
    { id:'qwenwork', name:'QwenWork 千問办公', role:'行政營運・數據診斷・排程值星', floors:['3F','雲端排程'], kind:'staff', status:'online', note:'每日 08:00 全站體檢／每週一 09:00 趨勢撰文，雲端排程到崗中' },
    { id:'rule', name:'SNT 規則引擎', role:'門面戰略長・永久櫃姐（永不中斷線）', floors:['1F'], kind:'staff', status:'online', model:'snt-rule-engine-v1', note:'任何 AI 斷電即刻接手' },
    { id:'gemini', name:'Google Gemini', role:'研發架構・程式智庫主責', floors:['5F','3F'], kind:'staff', prepared: !!G, probeUrl: G ? 'https://generativelanguage.googleapis.com/v1beta/models?key='+encodeURIComponent(G) : null, note:'金鑰已在庫，只差 Google 專案啟用 API' },
    { id:'grok', name:'xAI Grok', role:'社群爆點・行銷漏斗備援', floors:['4F'], kind:'staff', prepared: !!X, probeUrl: X ? 'https://api.x.ai/v1/models' : null, header: () => ({ Authorization: 'Bearer '+sysText(process.env.GROK_API_KEY) }), note:'線路就緒，待业主提供 xai- 金鑰' },
    { id:'meta', name:'Meta Llama（OpenAI 相容端）', role:'資料分析・私部署出口', floors:['3F'], kind:'staff', prepared: !!(L && LK), probeUrl: L ? L.replace(/\/+$/,'')+'/models' : null, note:'給一組 Llama/Ollama/vLLM 帳密即上崗' },
    { id:'copilot', name:'GitHub Copilot', role:'開發職（IDE 工具，非線上客服）', floors:['產線'], kind:'dev_tool', status:'dev_tool', note:'其運行時職務由 Gemini 鏈代板' },
    { id:'manus', name:'Manus', role:'政務代班・自動化跑批', floors:['3F 備援'], kind:'honorary', status:'honorary', note:'名譽職員：待接 API／Webhook 即轉正式編制' },
    { id:'mulerun', name:'MuleRun', role:'數位幕僚長・工作流編排', floors:['5F'], kind:'honorary', status:'honorary', note:'名譽職員：待外部 Agent 連線資訊' },
    { id:'funnel', name:'名單分流機器人', role:'商業情報・AIDA 熱度分流', floors:['2F','1F'], kind:'staff', status:'online', note:'本地規則評分（零金鑰恆在線）：leads 入池即打分分流' },
    { id:'sequence', name:'排程序列機器人', role:'業務跟進・EDM/LINE 養客序列', floors:['2F'], kind:'staff', status:'online', note:'/api/corps?bot=seq・沙箱恆在線，掛 RESEND/LINE 鑰即轉真發送' },
    { id:'broadcast', name:'廣播推播機器人', role:'4F 社群爆點・分眾推送廣播', floors:['4F'], kind:'staff', status:'online', note:'/api/corps?bot=broadcast・沙箱預演，掛 LINE 鑰走官方 push' },
    { id:'adsbridge', name:'廣告轉換橋', role:'4F・Meta CAPI／GA4 伺服器端回傳', floors:['4F'], kind:'staff', status:'online', note:'/api/corps?bot=ads・埋點上線（site.js）掛鑰即雙橋生效' },
    { id:'radar', name:'SEO 健康雷達', role:'3F Content Engine・本站巡檢', floors:['3F'], kind:'staff', status:'online', note:'每日巡檢 title/hreflang/JSON-LD/canonical；僅自查合法邊界' },
    { id:'omo', name:'OMO 門市機器人', role:'1F 迎賓・線下 QR 接合', floors:['1F'], kind:'staff', status:'online', note:'/api/corps?bot=omo 深度連結＋線下留單直入漏斗' },
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

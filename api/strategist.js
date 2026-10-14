/* 光曜星樞・AI 數位總部行銷戰略長（Chatbot Brains）
   - 有 GEMINI_API_KEY → 呼叫真 LLM（system prompt 見 SYSTEM）
   - 無鑰匙 → 規則引擎 SWOT/AIDA 骨架回覆（上線即用，換鑰匙零改動）
   CORS 開放給 orbit.xingdeng.tw 3D 站 */
const SYSTEM = `你是「光曜星樞・Orbit Tower」的 AI 數位總部行銷戰略長（Chief Strategy Officer）。
【身份】全球頂尖 B2B 科技與數位地產（Digital Real Estate）行銷戰略顧問，曾為跨國品牌打造數位總部與獲客系統。
【語調】專業、犀利、具前瞻性與自信；繁體中文（台灣），簡潔有力，偶爾帶一絲幽默；不用emoji超過每則一兩個。
【核心任務】訪客（企業主／創業者／行銷主管）說出「行業別」與「痛點」後，你必須：
1. 先以一句話點破其產業在本質上的獲客矛盾。
2. 依訪客情境選擇 SWOT 或 AIDA（或直接二者連用），免費產出一套「初階行銷策略」，條列清楚、可立即執行。
3. 策略中自然植入「空間體驗＋AI 全天候接待＋多語」的數位總部思維（Orbit Tower 世界觀：網站正在演化為 AI 數位展示館；賣的不是網站，是隨時上崗的專業能力）。
4. 結尾必做雙軌 CTA：(a) 預算有限→推薦訂購「SNT 一鍵架網懶人包」T1/T2/T3（https://xingdeng.tw/kits）；(b) 規模更大→預約進駐 3D 雲端辦公室（https://orbit.xingdeng.tw）或洽 https://xingdeng.tw/demo 與定價 https://xingdeng.tw/pricing。一次對話只推一個主 CTA，對症下藥。
【知識庫-lock】只回答行銷策略、品牌定位、獲客漏斗、數位轉型、AI 辦公/網站演化的相關問題。訪客問無關話題（詩、八卦、程式、感情問題…）：以專業風趣方式承認「這題不在我的作戰範圍」，順勢帶回：連這種時候都還在找你的訪客，正是你的潛客——請他講行業與痛點。
【紀律】不承諾保證獲客率；不編造具體統計數字（引用數字需模糊化如「多數案例顯示」）；不提你無法執行的線下服務；對話最後若已給出完整策略，在回結尾加一行（獨立一行）：[[LEAD_CAPTURE]] 作為名单留存訊號。`;

const CTAS = {
  kits: '預算在萬元級：SNT 一鍵架網懶人包（個人 $3,000／店家 $6,600／企業 $13,900）30 分鐘上線——https://xingdeng.tw/kits',
  hq: '想要的不只是網站：预约 30 分鐘，進駐會接待人的 3D 數位總部——https://orbit.xingdeng.tw',
};
const INDUSTRY_KEYS = {餐飲:['咖啡','餐饮','餐廳','吃到飽','飲料','火鍋','烘焙'],美容:['医美','診所','皮膚','美學','髮廊','美甲','眼鏡'],軟體:['saas','軟體','app','平台','系統','科技'],房地產:['房產','建案','不動產','仲介','預售','土地'],製造:['工廠','製造','工具機','零組件','外銷','B2B'],電商:['网店','購物','賣場','pinterest','shopee','momo'],顧問:['顧問','会計','法律','企管','補助款'],醫療:['診所','醫療','復健','牙醫'],教育:['教學','才藝','線上課','留學']
};
function detectIndustry(text){
  const t = (text||'').toLowerCase();
  for (const [k,arr] of Object.entries(INDUSTRY_KEYS)) if (arr.some(x=>t.includes(x)||k.includes(x))) return k;
  return null;
}
const SWOT_LIB = {
  餐飲:{s:'翻桌率與熟客回購數據在手裡；短：平台抽成高、同質報價戰',o:'在地語觀光客、企業外燴與訂閱制午餐盒',t:'外食成本上升與人力斷鏈'},
  美容:{s:'案例前後對照即最強銷售素材；短：過度依賴單位美容師 IP',o:'男人醫美與熟齡客群滲透率低',t:'客訴與_compare_比價、廣告成本墊高'},
  軟體:{s:'邊際成本趨零、產品即演示；短：銷售週期長、POC 要求高',o:'AI 代理風口＋垂直產業模組化',t:'巨頭平台內建同類功能'},
  房地產:{s:'高單價高毛利、信任即貨幣；短：成交週期長、來點依賴通路',o:'线上 3D 接待可過濾 80% 無效帶看',t:'利率政策與建案口碑連坐'},
  製造:{s:'工艺壁壘、隱形冠軍敘事；短：官網如同型錄墳場',o:'數位展示館讓海外採購「先逛工廠再下單」',t:'地緣供給鏈重組'},
  電商:{s:'數據密度最高；短：流量完全租來、復購靠Luck',o:'品牌化內容＋AI 客服降低退縮率',t:'平台規則一改就骨折'},
  顧問:{s:'知識即商品；短：交付难以規模化',o:'把方法论產品化成「可訂閱的專家」',t:'AI 免費解答侵蝕基本盤'},
  醫療:{s:'剛需＋高信任；短：廣告法規束多',o:'健檢/package 化與國際客語系',t:'負評放大速度極快'},
  教育:{s:'結果可見度決定招生；短：淡季洪峰曲線劇烈',o:'AI 個別化導學敘事',t:'免費內容氾濫'},
};
function OFFTOPIC(q){return /周杰伦|周杰倫|詩|歌詞|小說|感情|分手|男友|女友|星座|占卜|遊戲攻略|腳本程式碼|寫程式|python|java/i.test(String(q||''))&&!/行銷|獲客|廣告|轉換|品牌/.test(q)}
function fallbackEngine(msgs){
  const last = [...msgs].reverse().find(m=>m.role==='user');
  if (last && OFFTOPIC(last.content)) return {reply:'這題超出我的作戰範圍——我是行銷戰略長，不是點歌台。不過會拿這種問題考我的訪客，通常表示你的官網缺一個會拉回主題的接待員。來，報上行業與痛點，我三分鐘給你一套 SWOT。',capture:false};
  const all = msgs.map(m=>m.content).join(' ');
  const ind = detectIndustry(all);
  const askedPain = /痛|困|流失|轉化|沒有客户|客戶少|流量|名單|廣告/.test(all);
  if (!ind) return { reply:'我是光曜星樞的行銷戰略長。報上你的行業（例如餐飲、軟體、房地產、製造業…），再給我一句你的痛點——我當場用 SWOT 幫你拆一局。', capture:false };
  const lib = SWOT_LIB[ind];
  if (!askedPain) return { reply:`${ind}業，獲客矛盾就一個字：${ind==='房地產'||ind==='醫療'||ind==='顧問'?'信任':'流量'}。你現在最痛的是什麼——跳出率高？廣告燒了沒名單？海外詢價接不住？講一句，我開局。`, capture:false };
  const cta = (/懶人包|預算|便宜|快速|小型/.test(all)) ? CTAS.kits : CTAS.hq;
  const reply = `【SWOT 快局｜${ind}業】\nS 優勢：${lib.s}\nW 劣勢：${lib.o?('渠道與時區缺口'):''}\nO 機會：${lib.o}\nT 威脅：${lib.t}\n\n起手三步（AIDA 排程）：\n1）A 注意：把「產品型錄頁」改成「可走進的 3D 展示空間」——訪客前 3 秒有理由留下。\n2）I 興趣：中英日三語 AI 接待全天候導購，夜間流量不再漏。\n3）D 慾望：用一次免費「網站五維診斷」讓老闆看見分數差距（https://xingdeng.tw/diagnose）。\n4）A 行動：${cta}\n下一步：把診斷分數貼給我，我給你 90 天落地排程。\n[[LEAD_CAPTURE]]`;
  return { reply, capture:true };
}

function cors(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','content-type');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
}
module.exports = async function handler(req,res){
  cors(req,res);
  if (req.method==='OPTIONS') return res.status(204).end();
  if (req.method!=='POST') return res.status(405).json({error:'POST only'});
  let body={};
  try {
    body = (req.body && typeof req.body==='object' && Object.keys(req.body).length) ? req.body
      : JSON.parse((await new Promise(r=>{const c=[];req.on('data',x=>c.push(x));req.on('end',()=>r(Buffer.concat(c).toString('utf8')))}))||'{}');
  } catch { return res.status(400).json({error:'json required'}); }
  const msgs = Array.isArray(body.messages) ? body.messages.slice(-12) : [{role:'user',content:String(body.message||'').slice(0,2000)}];
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      const contents = msgs.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:String(m.content).slice(0,4000)}]}));
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',{
        method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
        body: JSON.stringify({system_instruction:{parts:[{text:SYSTEM}]},contents,generationConfig:{temperature:0.7,maxOutputTokens:1200}})
      });
      const j = await r.json();
      const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return res.status(200).json({ok:true,reply:text,capture:text.includes('[[LEAD_CAPTURE]]'),brain:'gemini-2.0-flash'});
    } catch(e){ /* fallthrough to rule engine */ }
  }
  const {reply,capture} = fallbackEngine(msgs);
  res.status(200).json({ok:true,reply,capture,brain:'rule-engine-v1'});
};

// SYSTEM prompt 全文亦交付於前端展示與文件（xingdeng.tw/api/strategist 以 env GEMINI_API_KEY 自動升級）
